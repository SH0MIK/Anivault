// Ports index.php. The debug var_dump(session_id(), $_SESSION) at the top of
// the original was leftover debug code (dumps session data to every page load
// in production) — dropped here rather than ported, since it's clearly not
// intentional and would leak session internals on your live homepage.
import { Hono } from 'hono';
import type { Env } from '../index';
import { Db } from '../lib/db';
import { Session } from '../lib/session';
import { Auth } from '../lib/auth';
import { MalAPI } from '../lib/mal-api';
import { AnimeTracker } from '../lib/tracker';
import { Notification } from '../lib/notification';
import { getUserAnimeStatuses } from '../lib/user-list';
import { icon } from '../lib/icons';
import { h } from '../lib/helpers';
import { renderAnimeCard } from '../lib/anime-card';
import { renderHeader, renderFooter } from '../render/layout';
import { CONTINUE_WATCHING_CSS } from '../render/home-css';
import { continueWatchingScript } from '../render/home-js';
import { getBannerData } from '../lib/settings';

export const homeRoutes = new Hono<{ Bindings: Env }>();

interface WatchHistoryRow {
  [key: string]: unknown;
  anime_id: number;
  anime_title: string | null;
  anime_image: string | null;
  episode_num: number;
  ep_title: string | null;
  ep_thumb: string | null;
  watched_at: string;
  watch_time: number;
  episode_duration: number;
}

homeRoutes.get('/', async (c) => {
  const db = new Db(c.env.DB);
  const lifetime = Number(c.env.SESSION_LIFETIME_SECONDS ?? 86400);
  const session = await Session.load(c, db, lifetime);
  const auth = new Auth(db, session, c.env as any, c.req.header('cf-connecting-ip') ?? 'unknown');
  const mal = new MalAPI(c.env, c.env.API_CACHE, db);
  const siteUrl = c.env.SITE_URL;

  const [seasonal, topAnime, upcoming] = await Promise.all([
    mal.getSeasonNow(1),
    mal.getTopAnime('bypopularity', 1),
    mal.getSeasonUpcoming(),
  ]);
  const seasonalList = (seasonal.data ?? []).slice(0, 12);
  const topList = (topAnime.data ?? []).slice(0, 12);
  const upcomingList = (upcoming.data ?? []).slice(0, 8);

  // Watch Now — anime that have episodes available in episode_videos
  let watchNowList: any[] = [];
  try {
    const rows = await db.fetchAll<{ anime_id: number }>(
      'SELECT DISTINCT anime_id FROM episode_videos WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 12'
    );
    const results = await Promise.all(rows.map((r) => mal.getAnime(r.anime_id)));
    watchNowList = results.map((r) => r.data).filter(Boolean);
  } catch {
    watchNowList = [];
  }

  // Watch history (logged-in users only) — the PHP version's CREATE TABLE /
  // ALTER TABLE self-healing runs on every home page load; that schema
  // migration dance isn't needed here since watch_history already exists
  // with the right shape from the D1 migration.
  let watchHistory: WatchHistoryRow[] = [];
  const currentUser = auth.check() ? await auth.getCurrentUser() : null;
  if (currentUser) {
    try {
      watchHistory = await db.fetchAll<WatchHistoryRow>(
        `SELECT anime_id, anime_title, anime_image, episode_num, ep_title, ep_thumb, watched_at, watch_time, episode_duration
         FROM watch_history WHERE user_id = ? ORDER BY watched_at DESC LIMIT 8`,
        [currentUser.id]
      );
    } catch {
      watchHistory = [];
    }
  }

  const unreadCount = currentUser ? await Notification.unreadCount(db, currentUser.id) : 0;
  const userStatuses = currentUser ? await getUserAnimeStatuses(db, currentUser.id) : {};

  const layoutUser = currentUser
    ? { id: currentUser.id, username: currentUser.username, avatar_url: currentUser.avatar_url, role: currentUser.role }
    : null;

  const __banner = await getBannerData(db);
  let html = renderHeader({
    ...__banner,    siteUrl,
    siteName: c.env.SITE_NAME,
    pageTitle: 'Home',
    pageDescription: 'Watch all anime subbed & dubbed Ad-free on Anivault!',
    currentPage: 'index',
    currentUser: layoutUser,
    unreadCount,
    requestUrl: c.req.url,
  });

  html += `
<div class="hero">
  ${icon('fire', 'hero-icon', '48px')}
  <h1 class="hero-title">Your Anime<br><span>Universe</span></h1>
  <p class="hero-sub">Track what you watch, discover what's trending, and never lose your place again.</p>
  <div class="flex flex-center gap-1 hero-actions">
    ${!currentUser ? `
    <a href="${siteUrl}/register" class="btn btn-primary btn-lg">${icon('plus', 'icon-small')} Get Started</a>
    <a href="${siteUrl}/browse" class="btn btn-ghost btn-lg">${icon('search', 'icon-small')} Browse</a>` : `
    <a href="${siteUrl}/mylist" class="btn btn-primary btn-lg">${icon('list', 'icon-small')} My List</a>
    <a href="${siteUrl}/browse" class="btn btn-ghost btn-lg">${icon('search', 'icon-small')} Discover More</a>`}
  </div>
</div>

<div class="container">`;

  if (currentUser) {
    const stats = await AnimeTracker.getStats(db, currentUser.id);
    html += `
  <div class="grid-4 mb-3">
    <div class="stat-card">${icon('list', 'stat-icon')}<div class="stat-value">${stats.total}</div><div class="stat-label">Total Tracked</div></div>
    <div class="stat-card">${icon('watching', 'stat-icon')}<div class="stat-value" style="color:var(--blue)">${stats.watching}</div><div class="stat-label">Watching</div></div>
    <div class="stat-card">${icon('completed', 'stat-icon')}<div class="stat-value" style="color:var(--teal)">${stats.completed}</div><div class="stat-label">Completed</div></div>
    <div class="stat-card">${icon('star', 'stat-icon')}<div class="stat-value" style="color:var(--gold)">${stats.avg_score || '—'}</div><div class="stat-label">Avg Score</div></div>
  </div>`;
  }

  // ── Continue Watching ──────────────────────────────────────────────────
  if (watchHistory.length > 0) {
    html += `
  <section class="section">
      <style>${CONTINUE_WATCHING_CSS}</style>
    <div class="cw-header">
      <div class="section-title" style="margin-bottom:0;flex:1;">${icon('watching', 'icon-small')} Continue Watching</div>
      <button onclick="clearWatchHistory(this)" class="cw-clear">Clear History</button>
    </div>
    <div class="cw-row" id="watch-history-grid">
      ${watchHistory.map((hRow) => renderContinueWatchingCard(hRow, siteUrl)).join('')}
    </div>
    <div class="cw-show-more-wrap">
      <div class="cw-show-more-line"></div>
      <a href="${siteUrl}/history" class="cw-show-more-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 16"/><polyline points="8 12 12 16 16 12"/></svg>
        View Full History
      </a>
      <div class="cw-show-more-line"></div>
    </div>
  </section>
  ${continueWatchingScript(siteUrl)}`;
  }

  // ── Watch Now ────────────────────────────────────────────────────────────
  if (watchNowList.length > 0) {
    html += `
  <section class="section">
    <div class="section-title">${icon('watching', 'icon-small')} Watch Now</div>
    <div class="anime-grid" id="watch-now-grid">
      ${watchNowList.map((a, i) => `<div class="watch-now-item" ${i >= 6 ? 'style="display:none;"' : ''}>${renderAnimeCard(a, siteUrl, userStatuses[a.mal_id] ?? null)}</div>`).join('')}
    </div>
    ${watchNowList.length > 6 ? `
    <style>
    .wn-more-wrap { display:flex; align-items:center; gap:1rem; margin-top:1.5rem; }
    .wn-line      { flex:1; height:1px; background:var(--border, rgba(255,255,255,.1)); }
    .wn-more-btn  { background:none; border:1px solid var(--border, rgba(255,255,255,.15)); color:var(--text-muted); font-size:.78rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:.45rem 1.4rem; border-radius:999px; white-space:nowrap; text-decoration:none; transition:color .15s, border-color .15s; }
    .wn-more-btn:hover { color:var(--text-primary); border-color:var(--accent, #e00); }
    </style>
    <div class="wn-more-wrap"><div class="wn-line"></div><a href="${siteUrl}/watch-now" class="wn-more-btn">Show More</a><div class="wn-line"></div></div>` : ''}
  </section>`;
  }

  // ── Airing This Season ─────────────────────────────────────────────────
  html += `
  <section class="section">
    <div class="section-title">${icon('fire', 'icon-small')} Airing This Season</div>
    ${seasonalList.length === 0
      ? `<p class="text-muted text-center">Could not load seasonal anime. API may be rate limited — try again shortly.</p>`
      : `<div class="anime-grid">${seasonalList.map((a) => renderAnimeCard(a, siteUrl, userStatuses[a.mal_id] ?? null)).join('')}</div>`}
    <div class="text-center mt-2"><a href="${siteUrl}/seasonal" class="btn btn-ghost">${icon('arrow-right', 'icon-small')} View All Seasonal →</a></div>
  </section>

  <section class="section">
    <div class="section-title">${icon('trophy', 'icon-small')} Top Anime</div>
    <div class="anime-grid">${topList.map((a) => renderAnimeCard(a, siteUrl, userStatuses[a.mal_id] ?? null)).join('')}</div>
    <div class="text-center mt-2"><a href="${siteUrl}/top" class="btn btn-ghost">${icon('arrow-right', 'icon-small')} View Full Rankings →</a></div>
  </section>`;

  if (upcomingList.length > 0) {
    html += `
  <section class="section">
    <div class="section-title">${icon('calendar', 'icon-small')} Coming Soon</div>
    <div class="anime-grid">${upcomingList.map((a) => renderAnimeCard(a, siteUrl, userStatuses[a.mal_id] ?? null)).join('')}</div>
  </section>`;
  }

  html += `</div>`;
  html += renderFooter({ siteUrl, currentUser: layoutUser });

  await session.save(c, lifetime);
  return c.html(html);
});

function renderContinueWatchingCard(hRow: WatchHistoryRow, siteUrl: string): string {
  const watchUrl = `${siteUrl}/watch?anime=${hRow.anime_id}&ep=${hRow.episode_num}`;
  const thumbSrc = hRow.ep_thumb || '';
  const epNum = hRow.episode_num;
  const animeTitle = h(hRow.anime_title || `Anime #${hRow.anime_id}`);
  const epTitle = hRow.ep_title ? h(hRow.ep_title) : `Episode ${epNum}`;
  const hasThumb = !!thumbSrc;

  const watchTime = hRow.watch_time ?? 0;
  const duration = hRow.episode_duration ?? 0;
  const progressPct = duration > 0 && watchTime > 0 ? Math.min(100, Math.round((watchTime / duration) * 100)) : 0;
  const secsLeft = duration > 0 && watchTime > 0 ? Math.max(0, duration - watchTime) : 0;
  const minsLeft = secsLeft > 60 ? Math.round(secsLeft / 60) : 0;
  const timeLeft = duration > 0 && minsLeft >= 60
    ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m left`
    : (duration > 0 && minsLeft > 0 ? `${minsLeft}m left` : '');
  const resumeUrl = watchTime >= 30 ? `${watchUrl}&t=${watchTime}` : watchUrl;
  const phId = `cwph-${hRow.anime_id}-${epNum}`;

  return `
<a class="cw-card" id="whcard-${hRow.anime_id}" href="${resumeUrl}">
  <div class="cw-thumb">
    ${!hasThumb ? `<div class="cw-placeholder" id="${phId}"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>` : ''}
    <img src="${h(thumbSrc)}" alt="${epTitle}" loading="lazy" data-anime-id="${hRow.anime_id}" data-ep="${epNum}" data-anime-title="${animeTitle}" data-ph-id="${phId}" class="wh-ep-thumb" style="${!hasThumb ? 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;' : ''}">
    <div class="cw-play"><div class="cw-play-circle"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>
    <div class="cw-ep-badge">Ep ${epNum}</div>
    ${timeLeft ? `<span class="cw-time-left">${h(timeLeft)}</span>` : ''}
    ${progressPct > 0 ? `<div class="cw-progress-bar"><div class="cw-progress-fill" style="--pct:${progressPct}%"></div></div>` : ''}
    <button class="cw-remove" onclick="event.preventDefault();event.stopPropagation();removeFromHistory(${hRow.anime_id},this)" title="Remove">✕</button>
  </div>
  <div class="cw-info">
    <div class="cw-anime-name">${animeTitle}</div>
    <div class="cw-ep-title">E${epNum} – ${epTitle}</div>
  </div>
</a>`;
}
