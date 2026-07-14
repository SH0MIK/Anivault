// Ports api/thumb_search.php. curl -> fetch, file-cache -> KV.
// The actual multi-source lookup now lives in ../lib/episode-thumb.ts, shared
// with the watch page's og:image generation (see routes/watch.ts).
import { Hono } from 'hono';
import type { Env } from '../index';
import { Db } from '../lib/db';
import { Session } from '../lib/session';
import { Auth } from '../lib/auth';
import { findEpisodeThumbnails, episodeThumbCacheKey } from '../lib/episode-thumb';

export const thumbSearchRoutes = new Hono<{ Bindings: Env }>();

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

  const cacheKey = episodeThumbCacheKey(malId, epNum);
  if (!debug) {
    const cached = await c.env.API_CACHE.get(cacheKey, 'json');
    if (cached) { await session.save(c, lifetime); return c.json(cached); }
  }

  const { thumbs, log, kitsuAnimeId, tmdbKeySet } = await findEpisodeThumbnails(c.env, animeTitle, epNum, malId, isList);

  if (debug) {
    await session.save(c, lifetime);
    return c.json({
      success: true, thumbs, debug_log: log,
      inputs: { animeTitle, epNum, malId }, kitsuId: kitsuAnimeId, tmdb_key_set: tmdbKeySet,
    });
  }

  const result = isList ? { success: true, thumbs } : { success: true, thumb: thumbs[0] ?? null };
  await c.env.API_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 3600 });
  await session.save(c, lifetime);
  return c.json(result);
});
