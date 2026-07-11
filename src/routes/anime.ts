// Ports pages/anime.php. Episodes, Characters, and Related/Recommendations
// tabs are populated entirely client-side (fetching Jikan/AniList directly,
// same as the PHP version) -- that whole 19KB tail of JS is carried over
// verbatim in anime-tail.ts. This route only needs to server-render the
// skeleton: poster, meta, genres, action buttons, and tab containers.
import { Hono } from 'hono';
import type { Env } from '../index';
import { Db } from '../lib/db';
import { Session } from '../lib/session';
import { Auth } from '../lib/auth';
import { MalAPI } from '../lib/mal-api';
import { AnimeTracker } from '../lib/tracker';
import { Notification } from '../lib/notification';
import { h, statusBadge } from '../lib/helpers';
import { renderHeader, renderFooter, CurrentUser } from '../render/layout';
import { streamWatchOn } from '../lib/stream-services';
import { animeTailScript } from '../render/anime-tail';
import { getBannerData } from '../lib/settings';

export const animeRoutes = new Hono<{ Bindings: Env }>();

const SERIES_RELATION_TYPES = ['Sequel', 'Prequel', 'Alternative Version', 'Alternative Setting', 'Side Story', 'Parent Story', 'Full Story', 'Summary', 'Movie', 'Spin-off'];

animeRoutes.get('/anime', async (c) => {
  const db = new Db(c.env.DB);
  const lifetime = Number(c.env.SESSION_LIFETIME_SECONDS ?? 86400);
  const session = await Session.load(c, db, lifetime);
  const auth = new Auth(db, session, c.env as any, c.req.header('cf-connecting-ip') ?? 'unknown');
  const mal = new MalAPI(c.env, c.env.API_CACHE, db);
  const siteUrl = c.env.SITE_URL;

  const id = parseInt(c.req.query('id') ?? '0', 10) || 0;
  if (!id) return c.redirect(siteUrl + '/');

  const result = await mal.getAnime(id);
  const anime = result.data;
  if (!anime) {
    return c.html(`<script>location.replace(${JSON.stringify(siteUrl + '/')});</script>`);
  }

  const streaming = await mal.getAnimeStreaming(id);
  const streamLinks: { name?: string; url?: string }[] = streaming.data ?? [];

  let videoEpRows: { episode_num: number; qualities: string | null }[] = [];
  try {
    videoEpRows = await db.fetchAll('SELECT episode_num, qualities FROM episode_videos WHERE anime_id = ? AND is_active = 1', [id]);
  } catch { /* table may not exist on fresh install */ }

  const videoEpSet: Record<number, { sub: boolean; dub: boolean }> = {};
  for (const row of videoEpRows) {
    let hasDub = false;
    if (row.qualities) {
      try { hasDub = !!JSON.parse(row.qualities).dub; } catch { /* ignore */ }
    }
    videoEpSet[row.episode_num] = { sub: true, dub: hasDub };
  }

  let animeDubConfirmed = false;
  try {
    const dubRow = await db.fetchOne('SELECT has_dub FROM anime_dub_status WHERE anime_id = ? AND has_dub = 1', [id]);
    animeDubConfirmed = !!dubRow;
    if (animeDubConfirmed) {
      for (const epNum of Object.keys(videoEpSet)) videoEpSet[Number(epNum)].dub = true;
    }
  } catch { /* ignore */ }

  const title = anime.title_english && anime.title_english !== anime.title ? anime.title_english : anime.title || 'Unknown';

  const seriesEntries = (anime.related_anime ?? [])
    .filter((rel: any) => SERIES_RELATION_TYPES.includes(rel.relation_type_formatted ?? ''))
    .map((rel: any) => ({ id: rel.entry?.mal_id ?? 0, title: rel.entry?.title ?? '', type: rel.relation_type_formatted ?? '' }));
  const hasSeriesLinks = seriesEntries.length > 0;

  const jpTitle = anime.title_japanese || null;
  const image = anime.images?.jpg?.large_image_url ?? '';
  const totalEps = anime.episodes ?? 0;

  const currentUser = auth.check() ? await auth.getCurrentUser() : null;
  let userEntry: any = null;
  let isFav = false;
  if (currentUser) {
    userEntry = await AnimeTracker.getUserEntry(db, currentUser.id, id);
    isFav = await AnimeTracker.isFavorite(db, currentUser.id, id);
  }
  const unreadCount = currentUser ? await Notification.unreadCount(db, currentUser.id) : 0;
  const layoutUser: CurrentUser | null = currentUser
    ? { id: currentUser.id, username: currentUser.username, avatar_url: currentUser.avatar_url, role: currentUser.role }
    : null;

  const __banner = await getBannerData(db);
  let html = renderHeader({
    ...__banner,    siteUrl, siteName: c.env.SITE_NAME, pageTitle: title, currentPage: 'anime', currentUser: layoutUser, unreadCount,
    requestUrl: c.req.url,
    ogData: {
      title, description: (anime.synopsis ?? '').substring(0, 200), image, image_width: 600, image_height: 850,
      url: `${siteUrl}/anime?id=${id}`, type: 'video.tv_show',
    },
  });

  const jTitle = JSON.stringify(title);
  const jImage = JSON.stringify(image);

  html += `
<div class="container section">
  <div class="anime-detail-header">
    <style>
      .anime-detail-header { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; align-items: flex-start; }
      .anime-poster-col { width: 220px; flex-shrink: 0; }
      .stream-hidden { display: none !important; }
      .stream-region-tip { position:relative; display:inline-flex; align-items:center; cursor:default; }
      .stream-region-tip .stream-tooltip { display:none; position:absolute; bottom:calc(100% + 5px); left:50%; transform:translateX(-50%); background:#1a1a1a; color:#fff; font-size:0.7rem; white-space:nowrap; padding:4px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); pointer-events:none; z-index:99; }
      .stream-region-tip:hover .stream-tooltip { display:block; }
      .stream-under-poster { display: block; }
      .stream-in-overview  { display: none;  }
      @media (max-width: 600px) {
        .anime-detail-header { flex-direction: column; gap: 1rem; }
        .anime-poster-col { width: 100%; }
        .stream-under-poster { display: none;  }
        .stream-in-overview  { display: block; }
      }
    </style>
    ${image ? `
    <div class="anime-poster-col">
      <img src="${h(image)}" alt="${h(title)}" style="width:100%;border-radius:var(--radius-lg);border:1px solid var(--border);display:block;">
      ${streamLinks.length > 0 ? `
      <div class="stream-under-poster" style="margin-top:12px;">
        ${streamWatchOn(streamLinks, id, siteUrl)}
      </div>` : ''}
    </div>` : ''}

    <div style="flex:1;min-width:260px;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
        <h1 style="font-size:1.8rem;margin:0;">${h(title)}</h1>
        ${hasSeriesLinks ? `
        <div id="series-dropdown-wrap" style="position:relative;flex-shrink:0;">
          <button id="series-dropdown-btn" onclick="toggleSeriesDropdown(event)"
            style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.07);border:1px solid var(--border);color:var(--text-main);padding:5px 12px 5px 14px;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;transition:background .15s;white-space:nowrap;"
            onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.07)'"
            aria-haspopup="listbox" aria-expanded="false">
            <span id="series-btn-label">Season …</span>
            <svg id="series-dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition:transform .2s;flex-shrink:0;"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div id="series-dropdown-menu" style="display:none;position:absolute;top:calc(100% + 6px);left:0;z-index:200;background:var(--bg-card,#1a1a1a);border:1px solid var(--border);border-radius:10px;min-width:220px;max-width:300px;box-shadow:0 8px 24px rgba(0,0,0,.5);overflow:hidden;" role="listbox">
            <div id="series-menu-loading" style="padding:12px 14px;font-size:0.82rem;color:var(--text-muted);text-align:center;">Loading series…</div>
          </div>
        </div>
        <script>window.__seriesData = ${JSON.stringify({ currentId: id, currentTitle: title, siteUrl, entries: seriesEntries })};</script>` : ''}
      </div>
      ${jpTitle && jpTitle !== title ? `<p class="text-muted mb-1">${h(jpTitle)}</p>` : ''}

      <div class="flex flex-wrap gap-1 mb-2" style="gap:8px;">
        ${anime.score ? `<span style="background:rgba(245,200,66,0.15);color:var(--gold);padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:600;">⭐ ${anime.score.toFixed(2)}/10 <span style="color:var(--text-muted);font-weight:400;">(${(anime.scored_by || anime.members || 0).toLocaleString('en-US')} users)</span></span>` : ''}
        ${anime.rank ? `<span class="genre-tag">🏆 Rank #${anime.rank}</span>` : ''}
        ${anime.popularity ? `<span class="genre-tag">🔥 #${anime.popularity} Popular</span>` : ''}
      </div>

      <div class="anime-detail-meta-grid" style="display:grid;grid-template-columns:130px 1fr;gap:6px 12px;font-size:0.88rem;margin-bottom:1.25rem;">
        ${renderMetaRows({
          Type: anime.type || '—', Episodes: totalEps || 'Unknown', Status: anime.status || '—',
          Aired: anime.aired?.string || '—', Duration: anime.duration || '—', Rating: anime.rating || '—',
          Studio: (anime.studios ?? []).map((s) => s.name).join(', ') || '—', Source: anime.source || '—',
        })}
      </div>

      ${anime.genres?.length ? `
      <div class="flex flex-wrap mb-2" style="gap:6px;">
        ${anime.genres.map((g) => `<a href="${siteUrl}/browse?genre=${g.mal_id}" class="genre-tag">${h(g.name)}</a>`).join('')}
      </div>` : ''}

      <div class="flex gap-1 flex-wrap" style="gap:8px;margin-top:1rem;">
        <button class="btn btn-primary" onclick='addToList(${id}, ${jTitle}, ${jImage}, ${totalEps})'>
          ${userEntry ? `✏️ Edit in List` : `+ Add to List`}
        </button>
        <button class="btn btn-ghost" id="fav-btn" style="${isFav ? 'color:var(--accent)' : ''}" onclick='toggleFavorite(this, ${id}, ${jTitle}, ${jImage})'>
          ${isFav ? '♥ Favorited' : '♡ Favorite'}
        </button>
      </div>

      <div id="anime-user-status" class="mt-2" data-total-eps="${totalEps}">
        ${userEntry ? `
        <div class="flex gap-1" style="gap:8px;align-items:center;">
          <span id="anime-status-badge">${statusBadge(userEntry.status)}</span>
          <span id="anime-score-badge" style="color:var(--gold);font-size:0.9rem;">${userEntry.score ? `⭐ ${userEntry.score}/10` : ''}</span>
          <span id="anime-eps-badge" class="text-muted" style="font-size:0.85rem;">${totalEps > 0 ? `${userEntry.episodes_watched}/${totalEps} eps` : ''}</span>
        </div>
        <div id="anime-progress-wrap" class="progress-bar mt-1" style="max-width:400px;${totalEps > 0 && userEntry.episodes_watched ? '' : 'display:none'}">
          <div id="anime-progress-fill" class="progress-fill" style="width:${totalEps > 0 ? Math.min(100, Math.round((userEntry.episodes_watched / totalEps) * 100)) : 0}%"></div>
        </div>` : `
        <div class="flex gap-1" style="gap:8px;align-items:center;">
          <span id="anime-status-badge"></span>
          <span id="anime-score-badge" style="color:var(--gold);font-size:0.9rem;"></span>
          <span id="anime-eps-badge" class="text-muted" style="font-size:0.85rem;"></span>
        </div>
        <div id="anime-progress-wrap" class="progress-bar mt-1" style="max-width:400px;display:none;"><div id="anime-progress-fill" class="progress-fill" style="width:0%"></div></div>`}
      </div>
    </div>
  </div>

  <div class="tabs-container">
    <div class="tabs">
      <button class="tab-btn active" data-tab="overview">Overview</button>
      <button class="tab-btn" data-tab="episodes" id="ep-tab-btn">Episodes</button>
      <button class="tab-btn" data-tab="characters">Characters</button>
      <button class="tab-btn" data-tab="related">Related</button>
    </div>

    <div id="tab-overview" class="tab-content active">
      ${anime.synopsis ? `<div class="card card-body mb-2"><h3 class="mb-1">Synopsis</h3><p style="color:var(--text-secondary);line-height:1.8;">${h(anime.synopsis).replace(/\n/g, '<br>')}</p></div>` : ''}
      ${anime.background ? `<div class="card card-body mb-2"><h3 class="mb-1">Background</h3><p style="color:var(--text-secondary);line-height:1.8;">${h(anime.background).replace(/\n/g, '<br>')}</p></div>` : ''}
      ${anime.themes?.length ? `<div class="mb-2"><div class="section-title">Themes</div><div class="flex flex-wrap" style="gap:6px;">${anime.themes.map((t: any) => `<span class="genre-tag">${h(t.name)}</span>`).join('')}</div></div>` : ''}
      ${streamLinks.length > 0 ? `<div class="stream-in-overview card card-body mb-2"><h3 class="mb-1">Watch On</h3>${streamWatchOn(streamLinks, id, siteUrl)}</div>` : ''}
    </div>

    <div id="tab-episodes" class="tab-content">
      <div id="ep-grid-loading" style="text-align:center;padding:2.5rem 0;color:var(--text-muted);">
        <div class="av-loader" style="margin:0 auto 1rem;transform:scale(.6);"></div>
        Loading episodes…
      </div>
      <div class="ep-grid" id="ep-grid-js" style="display:none;"></div>
    </div>

    <div class="modal-overlay" id="ep-modal">
      <div class="modal" style="max-width:620px;width:100%;">
        <div class="modal-header" style="padding:1rem 1.25rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;">
          <div style="flex:1;min-width:0;">
            <div id="ep-modal-title" style="font-size:1.1rem;font-weight:700;line-height:1.4;"></div>
            <div style="display:flex;align-items:center;gap:10px;margin-top:5px;flex-wrap:wrap;">
              <span id="ep-modal-meta" style="font-size:0.82rem;color:var(--text-muted);"></span>
              <span id="ep-modal-score" style="color:var(--gold);font-size:0.85rem;font-weight:600;"></span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            ${(layoutUser?.role === 'admin' || layoutUser?.role === 'owner') ? `<button id="ep-modal-edit-btn" class="btn btn-sm btn-secondary" style="font-size:0.78rem;padding:4px 10px;">✏️ Edit</button>` : ''}
            <button class="modal-close" onclick="closeModal('ep-modal')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.3rem;padding:0;line-height:1;">✕</button>
          </div>
        </div>
        <div id="ep-modal-thumb-wrap" style="display:none;width:100%;aspect-ratio:16/9;background:var(--bg-base);overflow:hidden;">
          <img id="ep-modal-thumb" src="" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">
        </div>
        <div class="modal-body">
          <p id="ep-modal-synopsis" style="color:var(--text-secondary);line-height:1.8;font-size:0.93rem;margin:0 0 1rem;"></p>
          <div id="ep-modal-watch"></div>
        </div>
      </div>
    </div>

    ${(layoutUser?.role === 'admin' || layoutUser?.role === 'owner') ? renderEpisodeEditorModal() : ''}

    <div id="tab-characters" class="tab-content">
      <div id="char-grid-loading" style="text-align:center;padding:2.5rem 0;color:var(--text-muted);">
        <div class="av-loader" style="margin:0 auto 1rem;transform:scale(.6);"></div>
        Loading characters…
      </div>
      <div class="anime-grid" id="char-grid-js" style="display:none;"></div>
    </div>

    <div id="tab-related" class="tab-content">
      <div id="related-grid-loading" style="text-align:center;padding:2.5rem 0;color:var(--text-muted);">
        <div class="av-loader" style="margin:0 auto 1rem;transform:scale(.6);"></div>
        Loading recommendations…
      </div>
      <div class="anime-grid" id="related-grid-js" style="display:none;"></div>
    </div>
  </div>
</div>

<script>window.__animeTitle = ${JSON.stringify(title)};</script>
<script>window.__animeId   = ${JSON.stringify(id)};</script>
<script>window.__siteUrl   = ${JSON.stringify(siteUrl)};</script>
<script>window.__totalEps  = ${JSON.stringify(totalEps)};</script>
<script>window.__animeCover = ${JSON.stringify(image)};</script>
<script>window.__tmdbKey    = ${JSON.stringify(c.env.TMDB_API_KEY ?? '')};</script>
<script>window.__videoEps  = ${JSON.stringify(videoEpSet)};</script>

${animeTailScript(animeDubConfirmed)}`;

  html += renderFooter({ siteUrl, currentUser: layoutUser });
  await session.save(c, lifetime);
  return c.html(html);
});

function renderMetaRows(meta: Record<string, string | number>): string {
  return Object.entries(meta)
    .map(([k, v]) => `<span style="color:var(--text-muted);font-weight:500;">${h(k)}</span><span>${h(String(v))}</span>`)
    .join('');
}

function renderEpisodeEditorModal(): string {
  return `
<div class="modal-overlay" id="ep-editor-modal">
  <div class="modal" style="max-width:580px;width:100%;">
    <div class="modal-header" style="padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center;">
      <h3 id="eped-heading" style="margin:0;font-size:1rem;">Edit Episode</h3>
      <button class="modal-close" onclick="closeModal('ep-editor-modal')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.3rem;padding:0;line-height:1;">✕</button>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:1rem;">
      <input type="hidden" id="eped-anime-id">
      <input type="hidden" id="eped-ep-num">
      <div>
        <label class="ep-editor-label">Thumbnail URL</label>
        <input type="url" id="eped-image" class="form-control" placeholder="https://... (paste any image URL)">
        <div id="eped-img-preview" style="display:none;margin-top:8px;"><img id="eped-img-tag" src="" style="width:100%;max-height:180px;object-fit:cover;border-radius:6px;"></div>
      </div>
      <div>
        <label class="ep-editor-label">Synopsis</label>
        <textarea id="eped-synopsis" class="form-control" rows="4" placeholder="Episode synopsis…" style="resize:vertical;"></textarea>
      </div>
      <div>
        <label class="ep-editor-label">Watch Links</label>
        <div id="eped-links-list"></div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap;">
          <select id="eped-new-service" class="form-control" style="flex:0 0 150px;">
            <option value="">— Service —</option>
            <option value="crunchyroll">Crunchyroll</option><option value="netflix">Netflix</option>
            <option value="hidive">HIDIVE</option><option value="funimation">Funimation</option>
            <option value="amazon">Prime Video</option><option value="hulu">Hulu</option>
            <option value="apple">Apple TV+</option><option value="disney">Disney+</option>
            <option value="youtube">YouTube</option><option value="bilibili">Bilibili</option>
          </select>
          <input type="url" id="eped-new-url" class="form-control" placeholder="https://..." style="flex:1;min-width:150px;">
          <button class="btn btn-secondary" onclick="epedAddLink()">+ Add</button>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:0.5rem;border-top:1px solid var(--border);">
        <button class="btn btn-secondary" onclick="closeModal('ep-editor-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="epedSave()">Save Changes</button>
      </div>
    </div>
  </div>
</div>`;
}
