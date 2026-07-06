// Ports api/thumb_search.php. curl -> fetch, file-cache -> KV.
import { Hono } from 'hono';
import type { Env } from '../index';
import { Db } from '../lib/db';
import { Session } from '../lib/session';
import { Auth } from '../lib/auth';

export const thumbSearchRoutes = new Hono<{ Bindings: Env }>();

async function httpGetText(url: string, headers: Record<string, string> = {}, timeoutMs = 10000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { 'Accept-Encoding': 'gzip, deflate', Accept: '*/*', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36', ...headers },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function httpPostText(url: string, payload: string, headers: Record<string, string> = {}, timeoutMs = 10000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'POST', body: payload,
      headers: { 'Accept-Encoding': 'gzip, deflate', 'User-Agent': 'Mozilla/5.0 (compatible; AnimeVaultBot/1.0)', ...headers },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

thumbSearchRoutes.get('/api/thumb_search.php', async (c) => {
  const db = new Db(c.env.DB);
  const lifetime = Number(c.env.SESSION_LIFETIME_SECONDS ?? 86400);
  const session = await Session.load(c, db, lifetime);
  const auth = new Auth(db, session, c.env as any, c.req.header('cf-connecting-ip') ?? 'unknown');

  if (!auth.isAdmin()) {
    await session.save(c, lifetime);
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  const animeTitle = (c.req.query('anime') ?? '').trim();
  const epNum = parseInt(c.req.query('ep') ?? '0', 10) || 0;
  const malId = parseInt(c.req.query('mal_id') ?? '0', 10) || 0;
  let mode = c.req.query('mode') ?? 'auto';
  const debug = mode === 'debug';
  if (debug) mode = 'list';
  const isList = mode === 'list';

  if (!animeTitle || !epNum) {
    await session.save(c, lifetime);
    return c.json({ success: false, error: 'Missing anime or ep' });
  }

  const cacheKey = `epthumb_${malId}_${epNum}`;
  if (!debug) {
    const cached = await c.env.API_CACHE.get(cacheKey, 'json');
    if (cached) { await session.save(c, lifetime); return c.json(cached); }
  }

  const thumbs: string[] = [];
  const log: string[] = [];

  // ── Source 1: Kitsu ──────────────────────────────────────────────────
  let kitsuAnimeId: number | null = null;
  if (malId) {
    const mapBody = await httpGetText(
      `https://kitsu.app/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`,
      { Accept: 'application/vnd.api+json' }
    );
    if (mapBody) {
      try {
        const mapJ = JSON.parse(mapBody);
        for (const item of mapJ.included ?? []) {
          if (item.type === 'anime') { kitsuAnimeId = parseInt(item.id, 10); break; }
        }
      } catch { /* ignore parse errors */ }
      log.push(`Kitsu mapping: ${kitsuAnimeId ? `found ID ${kitsuAnimeId}` : 'not found'}`);
    } else {
      log.push('Kitsu mapping: HTTP failed');
    }

    if (!kitsuAnimeId) {
      const srch = await httpGetText(`https://kitsu.app/api/edge/anime?filter[text]=${encodeURIComponent(animeTitle)}&page[limit]=3`, { Accept: 'application/vnd.api+json' });
      if (srch) {
        try {
          const srchJ = JSON.parse(srch);
          kitsuAnimeId = srchJ.data?.[0]?.id ? parseInt(srchJ.data[0].id, 10) : null;
        } catch { /* ignore */ }
        log.push(`Kitsu title search: ${kitsuAnimeId ? `found ID ${kitsuAnimeId}` : 'not found'}`);
      } else {
        log.push('Kitsu title search: HTTP failed');
      }
    }
  }

  if (kitsuAnimeId) {
    const epBody = await httpGetText(`https://kitsu.app/api/edge/anime/${kitsuAnimeId}/episodes?filter[number]=${epNum}&page[limit]=1`, { Accept: 'application/vnd.api+json' });
    if (epBody) {
      try {
        const epJ = JSON.parse(epBody);
        const epData = epJ.data?.[0] ?? null;
        if (epData) {
          const imgs = epData.attributes?.thumbnail ?? {};
          log.push(`Kitsu ep ${epNum} thumbnail: ${Object.keys(imgs).length === 0 ? 'empty (no image on Kitsu)' : JSON.stringify(imgs)}`);
          for (const sz of ['original', 'large', 'medium', 'small', 'tiny']) {
            if (imgs[sz]) { thumbs.push(imgs[sz]); break; }
          }
        } else {
          log.push(`Kitsu ep ${epNum}: episode record not found`);
        }
      } catch { log.push('Kitsu ep: parse failed'); }
    } else {
      log.push('Kitsu ep: HTTP failed');
    }
  }

  // ── Source 2: TMDB ───────────────────────────────────────────────────
  const tmdbKey = c.env.TMDB_API_KEY ?? '';
  if (tmdbKey && (thumbs.length === 0 || isList)) {
    const srchB = await httpGetText(`https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(animeTitle)}&language=en-US`);
    if (srchB) {
      try {
        const srchJ = JSON.parse(srchB);
        const results = srchJ.results ?? [];
        if (results.length === 0) {
          log.push(`TMDB: no show found for '${animeTitle}'`);
        } else {
          outer: for (const show of results.slice(0, 2)) {
            const showId = show.id;
            log.push(`TMDB: trying '${show.name}' (ID ${showId})`);
            for (const season of [1, 2]) {
              const epB = await httpGetText(`https://api.themoviedb.org/3/tv/${showId}/season/${season}/episode/${epNum}?api_key=${tmdbKey}`);
              if (!epB) { log.push(`TMDB s${season}e${epNum}: HTTP failed`); continue; }
              try {
                const epJ = JSON.parse(epB);
                const still = epJ.still_path ?? null;
                log.push(`TMDB ${show.name} s${season}e${epNum}: ${still ? `found ${still}` : 'no still'}`);
                if (still) {
                  thumbs.push(`https://image.tmdb.org/t/p/w780${still}`);
                  if (isList) thumbs.push(`https://image.tmdb.org/t/p/original${still}`);
                  break outer;
                }
              } catch { /* ignore parse error, continue */ }
            }
          }
        }
      } catch { log.push('TMDB: parse failed'); }
    } else {
      log.push('TMDB: HTTP failed — the host may block api.themoviedb.org.');
    }
  } else if (!tmdbKey) {
    log.push('TMDB: skipped (no TMDB_API_KEY secret set)');
  }

  // ── Source 3: AniList streamingEpisodes ──────────────────────────────
  if (thumbs.length === 0 || isList) {
    const query = 'query($malId:Int){Media(idMal:$malId,type:ANIME){streamingEpisodes{title thumbnail}}}';
    const alBody = await httpPostText('https://graphql.anilist.co', JSON.stringify({ query, variables: { malId } }), { 'Content-Type': 'application/json', Accept: 'application/json' });
    if (alBody) {
      try {
        const alJ = JSON.parse(alBody);
        const eps: any[] = alJ.data?.Media?.streamingEpisodes ?? [];
        log.push(`AniList: ${eps.length} streaming episodes`);
        let found = false;
        for (const ep of eps) {
          const m = (ep.title ?? '').match(/(?:episode|ep\.?)\s*(\d+)/i);
          if (!m) continue;
          if (parseInt(m[1], 10) !== epNum || !ep.thumbnail) continue;
          if (!ep.thumbnail.includes('/thumbnail/') && !ep.thumbnail.includes('/still/')) {
            log.push(`AniList ep ${epNum}: skipped generic-looking URL: ${ep.thumbnail}`);
            continue;
          }
          thumbs.push(ep.thumbnail);
          log.push(`AniList ep ${epNum}: found ${ep.thumbnail}`);
          found = true;
          break;
        }
        if (!found) log.push(`AniList ep ${epNum}: no matching thumbnail`);
      } catch { log.push('AniList: parse failed'); }
    } else {
      log.push('AniList: HTTP POST failed');
    }
  }

  // ── Source 4: Jikan episode image ────────────────────────────────────
  if (malId && (thumbs.length === 0 || isList)) {
    const jBody = await httpGetText(`https://api.jikan.moe/v4/anime/${malId}/episodes/${epNum}`);
    if (jBody) {
      try {
        const jJ = JSON.parse(jBody);
        const img = jJ.data?.images?.jpg?.image_url ?? null;
        log.push(`Jikan ep: ${img ? img : "no image (MAL doesn't store episode screenshots)"}`);
        if (img && !thumbs.includes(img)) thumbs.push(img);
      } catch { log.push('Jikan ep: parse failed'); }
    } else {
      log.push('Jikan ep: HTTP failed');
    }
  }

  // ── Source 5: AniSearch scrape ────────────────────────────────────────
  if (thumbs.length === 0 || isList) {
    const body = await httpGetText(`https://www.anisearch.com/anime/index/?q=${encodeURIComponent(animeTitle)}&mode=2&per=1`);
    const idMatch = body ? body.match(/\/anime\/(\d+)[,/]/) : null;
    if (idMatch) {
      const asId = idMatch[1];
      log.push(`AniSearch: found anime ID ${asId}`);
      const epBody = await httpGetText(`https://www.anisearch.com/anime/${asId}/episodes/${epNum}`);
      const ogMatch = epBody ? epBody.match(/<meta property="og:image" content="([^"]+)"/) : null;
      if (ogMatch) {
        const u = ogMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
        if (!thumbs.includes(u)) thumbs.push(u);
        log.push(`AniSearch ep ${epNum}: found ${u}`);
      } else {
        log.push(`AniSearch ep ${epNum}: no image found`);
      }
    } else {
      log.push(`AniSearch: ${body ? 'anime not found' : 'HTTP failed'}`);
    }
  }

  if (debug) {
    await session.save(c, lifetime);
    return c.json({
      success: true, thumbs: [...new Set(thumbs)], debug_log: log,
      inputs: { animeTitle, epNum, malId }, kitsuId: kitsuAnimeId, tmdb_key_set: !!tmdbKey,
    });
  }

  const result = isList ? { success: true, thumbs: [...new Set(thumbs)] } : { success: true, thumb: thumbs[0] ?? null };
  await c.env.API_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 3600 });
  await session.save(c, lifetime);
  return c.json(result);
});
