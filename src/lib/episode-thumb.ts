// Shared episode-thumbnail lookup used by both api/thumb_search.php (admin
// tool) and the watch page's og:image generation. Previously watch.ts had
// its own much weaker version of this (AniList streamingEpisodes only, with
// a fragile regex and no fallback sources), which is why link-preview embeds
// showed the anime cover instead of an episode thumbnail far more often than
// the Continue Watching section did (that one uses this same multi-source
// chain, just run client-side in home-js.ts). This module is the single
// source of truth now -- same sources, same order, same matching rules,
// usable from anywhere with just an Env.

export async function httpGetText(url: string, headers: Record<string, string> = {}, timeoutMs = 10000): Promise<string | null> {
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

export async function httpPostText(url: string, payload: string, headers: Record<string, string> = {}, timeoutMs = 10000): Promise<string | null> {
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

/** KV cache key shared between the admin thumb-search tool and the watch
 * page's og:image lookup, so a hit found by either one benefits the other. */
export function episodeThumbCacheKey(malId: number, epNum: number): string {
  return `epthumb_${malId}_${epNum}`;
}

export interface EpisodeThumbEnv {
  TMDB_API_KEY?: string;
}

export interface EpisodeThumbResult {
  thumbs: string[];
  log: string[];
  kitsuAnimeId: number | null;
  tmdbKeySet: boolean;
}

/**
 * Looks up an episode-specific thumbnail across multiple sources, in order:
 * Kitsu -> TMDB -> AniList streamingEpisodes -> Jikan -> AniSearch scrape.
 *
 * @param isList When false (the common case -- og:image, Continue Watching),
 *   stops as soon as a source returns a usable thumbnail. When true (the
 *   admin debug/list tool), keeps querying every source so all candidates
 *   can be shown side by side.
 */
export async function findEpisodeThumbnails(
  env: EpisodeThumbEnv,
  animeTitle: string,
  epNum: number,
  malId: number,
  isList = false
): Promise<EpisodeThumbResult> {
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

  if (kitsuAnimeId && (thumbs.length === 0 || isList)) {
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
  const tmdbKey = env.TMDB_API_KEY ?? '';
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

  return { thumbs: [...new Set(thumbs)], log, kitsuAnimeId, tmdbKeySet: !!tmdbKey };
}
