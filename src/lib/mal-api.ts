// Full port of includes/api.php's MalAPI class (aliased as JikanAPI in the old
// codebase). Talks to the official MyAnimeList v2 API for most endpoints and
// falls back to the public Jikan API for characters/episodes/streaming, which
// MAL v2 doesn't expose -- exactly like the PHP version. File-based caching
// (CACHE_DIR/mal_*.json) is replaced with Workers KV.
import { Db } from './db';

const MAL_API_BASE = 'https://api.myanimelist.net/v2';
const LIST_FIELDS = 'id,title,alternative_titles,main_picture,synopsis,mean,rank,popularity,num_episodes,status,genres,start_date,rating,media_type,nsfw,num_list_users,broadcast,average_episode_duration';
const DETAIL_FIELDS = 'id,title,alternative_titles,main_picture,synopsis,mean,rank,popularity,num_episodes,status,genres,start_date,end_date,rating,media_type,nsfw,background,studios,related_anime,recommendations,statistics,source,average_episode_duration,broadcast';

export interface MalEnv {
  MAL_CLIENT_ID?: string;
  API_CACHE_ENABLED?: string; // "1" / "0" via wrangler.toml var
  API_CACHE_TIME?: string; // seconds
}

export interface NormalisedAnime {
  mal_id: number;
  title: string;
  title_english: string;
  title_japanese: string;
  images: { jpg: { image_url: string; large_image_url: string } };
  synopsis: string;
  background: string;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  episodes: number;
  status: string;
  type: string;
  rating: string;
  source: string;
  duration: string | null;
  aired: { string: string | null };
  start_date: string | null;
  genres: { mal_id: number; name: string }[];
  studios: { mal_id: number; name: string }[];
  related_anime: any[];
  recommendations: any[];
  trailer: any[];
  themes: any[];
  members: number;
  broadcast: { day: string | null; time: string | null };
  duration_mins: number | null;
}

export class MalAPI {
  constructor(private env: MalEnv, private kv: KVNamespace | undefined, private db: Db) {}

  private cacheEnabled(): boolean {
    return (this.env.API_CACHE_ENABLED ?? '1') === '1';
  }
  private cacheTtl(): number {
    return Number(this.env.API_CACHE_TIME ?? 3600);
  }

  private async get(endpoint: string, params: Record<string, string | number> = {}): Promise<any> {
    const url = MAL_API_BASE + endpoint + (Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '');

    if (this.kv && this.cacheEnabled()) {
      const cacheKey = 'mal_' + (await sha1(url));
      const cached = await this.kv.get(cacheKey, 'json');
      if (cached) return cached;

      const res = await fetch(url, { headers: { 'X-MAL-CLIENT-ID': this.env.MAL_CLIENT_ID ?? '', Accept: 'application/json' } });
      if (!res.ok) return { error: 'API request failed' };
      const json = await res.json();
      await this.kv.put(cacheKey, JSON.stringify(json), { expirationTtl: this.cacheTtl() });
      return json;
    }

    const res = await fetch(url, { headers: { 'X-MAL-CLIENT-ID': this.env.MAL_CLIENT_ID ?? '', Accept: 'application/json' } });
    if (!res.ok) return { error: 'API request failed' };
    return res.json();
  }

  async jikanGet(url: string): Promise<any> {
    if (this.kv && this.cacheEnabled()) {
      const cacheKey = 'jikan_' + (await sha1(url));
      const cached = await this.kv.get(cacheKey, 'json') as any;
      if (cached && cached.data !== undefined) return cached;
    }

    // Jikan rate-limit: 3 req/sec. Retry with backoff on 429 (and on 5xx,
    // which Jikan also throws under load) before giving up.
    let lastStatus: number | null = null;
    let lastBody: string | null = null;
    let lastFetchError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'AnimeApp/1.0' } });
        lastStatus = res.status;
        if (res.status === 429 || res.status >= 500) {
          lastBody = await res.text().catch(() => null);
          console.error(`jikanGet retry: ${url} -> ${res.status} attempt ${attempt}`, lastBody?.slice(0, 300));
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        if (!res.ok) {
          lastBody = await res.text().catch(() => null);
          console.error(`jikanGet failed: ${url} -> ${res.status}`, lastBody?.slice(0, 300));
          return { data: [], _debug: { status: res.status, body: lastBody?.slice(0, 500) ?? null } };
        }
        const decoded: any = await res.json().catch(() => null);
        if (!decoded || decoded.data === undefined) {
          console.error(`jikanGet bad json: ${url} -> status ${res.status}`);
          return { data: [], _debug: { status: res.status, body: 'non-JSON or missing data field' } };
        }

        if (this.kv && this.cacheEnabled()) {
          const cacheKey = 'jikan_' + (await sha1(url));
          await this.kv.put(cacheKey, JSON.stringify(decoded), { expirationTtl: this.cacheTtl() });
        }
        return decoded;
      } catch (err: any) {
        lastFetchError = String(err?.message ?? err);
        console.error(`jikanGet threw: ${url}`, lastFetchError);
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    return { data: [], _debug: { status: lastStatus, body: lastBody?.slice(0, 500) ?? null, fetchError: lastFetchError } };
  }

  private async getLocalAnimeImage(animeId: number): Promise<string> {
    if (!animeId) return '';
    const row = await this.db.fetchOne<{ image_url: string }>('SELECT image_url FROM anime_images WHERE anime_id = ?', [animeId]);
    return row ? row.image_url : '';
  }

  private async normalise(node: any): Promise<NormalisedAnime> {
    const animeId = Number(node.id ?? 0);
    const localImage = animeId ? await this.getLocalAnimeImage(animeId) : '';
    const mediumImage = localImage || node.main_picture?.medium || '';
    const largeImage = localImage || node.main_picture?.large || node.main_picture?.medium || '';

    const genres = (node.genres ?? []).map((g: any) => ({ mal_id: g.id, name: g.name }));
    const studios = (node.studios ?? []).map((s: any) => ({ mal_id: s.id, name: s.name }));

    const related = await Promise.all((node.related_anime ?? []).map(async (r: any) => {
      const entry = r.node ?? {};
      const entryId = Number(entry.id ?? 0);
      const entryLocalImage = entryId ? await this.getLocalAnimeImage(entryId) : '';
      return {
        entry: {
          mal_id: entryId,
          title: entry.title ?? '',
          images: { jpg: { image_url: entryLocalImage || entry.main_picture?.medium || '' } },
        },
        relation_type_formatted: r.relation_type_formatted ?? '',
      };
    }));

    const recommendations = await Promise.all((node.recommendations ?? []).map(async (r: any) => {
      const entry = r.node ?? {};
      const entryId = Number(entry.id ?? 0);
      const entryLocalImage = entryId ? await this.getLocalAnimeImage(entryId) : '';
      return {
        entry: {
          mal_id: entryId,
          title: entry.title ?? '',
          images: { jpg: { image_url: entryLocalImage || entry.main_picture?.medium || '' } },
        },
      };
    }));

    const altTitles = node.alternative_titles ?? {};
    const duration = node.average_episode_duration !== undefined
      ? `${Math.round(node.average_episode_duration / 60)} min per ep`
      : null;
    let aired: string | null = null;
    if (node.start_date) {
      aired = node.start_date + (node.end_date ? ' to ' + node.end_date : '');
    }

    return {
      mal_id: animeId,
      title: node.title ?? '',
      title_english: altTitles.en ?? '',
      title_japanese: altTitles.ja ?? '',
      images: { jpg: { image_url: mediumImage, large_image_url: largeImage } },
      synopsis: node.synopsis ?? '',
      background: node.background ?? '',
      score: node.mean ?? null,
      scored_by: node._scored_by ?? node.statistics?.scoring?.count ?? node.num_list_users ?? null,
      rank: node.rank ?? null,
      popularity: node.popularity ?? null,
      episodes: node.num_episodes ?? 0,
      status: mapStatus(node.status ?? ''),
      type: (node.media_type ?? '').toUpperCase(),
      rating: node.rating ?? '',
      source: node.source ?? '',
      duration,
      aired: { string: aired },
      start_date: node.start_date ?? null,
      genres,
      studios,
      related_anime: related,
      recommendations,
      trailer: [],
      themes: [],
      members: node.num_list_users ?? node.statistics?.num_list_users ?? 0,
      broadcast: { day: node.broadcast?.day_of_the_week ?? null, time: node.broadcast?.start_time ?? null },
      duration_mins: node.average_episode_duration !== undefined ? Math.round(node.average_episode_duration / 60) : null,
    };
  }

  currentSeasonPublic(): string {
    return this.currentSeason();
  }

  private currentSeason(): string {
    const m = new Date().getUTCMonth() + 1;
    if (m <= 3) return 'winter';
    if (m <= 6) return 'spring';
    if (m <= 9) return 'summer';
    return 'fall';
  }

  private nextSeason(): [number, string] {
    const seasons = ['winter', 'spring', 'summer', 'fall'];
    const idx = seasons.indexOf(this.currentSeason());
    const next = (idx + 1) % 4;
    const year = next === 0 ? new Date().getUTCFullYear() + 1 : new Date().getUTCFullYear();
    return [year, seasons[next]];
  }

  // ── Public API (same shapes as the old Jikan-backed version) ─────────────

  async searchAnime(query: string, page = 1, type = '', status = ''): Promise<{ data: NormalisedAnime[]; pagination: any }> {
    const offset = (page - 1) * 20;
    const params: Record<string, string | number> = { q: query, limit: 20, offset, fields: LIST_FIELDS, nsfw: 'false' };
    if (type) params.media_type = type.toLowerCase();
    if (status) params.status = status;
    const raw = await this.get('/anime', params);
    const data = await Promise.all((raw.data ?? []).map((n: any) => this.normalise(n.node)));
    return { data, pagination: { last_visible_page: Math.max(1, raw.paging?.next ? page + 5 : page), items: { total: data.length } } };
  }

  async getAnime(id: number): Promise<{ data: NormalisedAnime | null }> {
    const raw = await this.get(`/anime/${id}`, { fields: DETAIL_FIELDS });
    if (raw.error) return { data: null };
    return { data: await this.normalise(raw) };
  }

  async getCharacter(id: number): Promise<any> {
    return this.jikanGet(`https://api.jikan.moe/v4/characters/${id}`);
  }

  async getCharacterAnime(id: number): Promise<any> {
    return this.jikanGet(`https://api.jikan.moe/v4/characters/${id}/anime`);
  }

  async getCharacterVoices(id: number): Promise<any> {
    return this.jikanGet(`https://api.jikan.moe/v4/characters/${id}/voices`);
  }

  async getAnimeCharacters(id: number): Promise<any> {
    return this.jikanGet(`https://api.jikan.moe/v4/anime/${id}/characters`);
  }

  async getAnimeEpisodes(id: number, page = 1): Promise<any> {
    return this.jikanGet(`https://api.jikan.moe/v4/anime/${id}/episodes?page=${page}`);
  }

  async getAnimeStreaming(id: number): Promise<any> {
    return this.jikanGet(`https://api.jikan.moe/v4/anime/${id}/streaming`);
  }

  async getRecommendations(animeId: number): Promise<{ data: any[] }> {
    const result = await this.getAnime(animeId);
    return { data: result.data?.recommendations ?? [] };
  }

  async getSeasonNow(page = 1): Promise<{ data: NormalisedAnime[]; pagination: any }> {
    const year = new Date().getUTCFullYear();
    const season = this.currentSeason();
    const offset = (page - 1) * 20;
    const raw = await this.get(`/anime/season/${year}/${season}`, { limit: 20, offset, fields: LIST_FIELDS, sort: 'anime_score', nsfw: 'false' });
    const data = await Promise.all((raw.data ?? []).map((n: any) => this.normalise(n.node)));
    return { data, pagination: { last_visible_page: raw.paging?.next ? page + 1 : page } };
  }

  async getSeasonUpcoming(): Promise<{ data: NormalisedAnime[] }> {
    const [year, season] = this.nextSeason();
    const raw = await this.get(`/anime/season/${year}/${season}`, { limit: 20, fields: LIST_FIELDS, nsfw: 'false' });
    const data = await Promise.all((raw.data ?? []).map((n: any) => this.normalise(n.node)));
    return { data };
  }

  async getTopAnime(filter = 'bypopularity', page = 1): Promise<{ data: NormalisedAnime[]; pagination: any }> {
    const rankingMap: Record<string, string> = { bypopularity: 'bypopularity', favorite: 'favorite', airing: 'airing', upcoming: 'upcoming', byrank: 'all' };
    const rankingType = rankingMap[filter] ?? 'bypopularity';
    const offset = (page - 1) * 25;
    const raw = await this.get('/anime/ranking', { ranking_type: rankingType, limit: 25, offset, fields: LIST_FIELDS, nsfw: 'false' });
    const data = await Promise.all((raw.data ?? []).map((n: any) => this.normalise(n.node)));
    return { data, pagination: { last_visible_page: raw.paging?.next ? page + 5 : page } };
  }

  getAnimeGenres(): { data: { mal_id: number; name: string }[] } {
    return {
      data: [
        { mal_id: 1, name: 'Action' }, { mal_id: 2, name: 'Adventure' }, { mal_id: 4, name: 'Comedy' },
        { mal_id: 8, name: 'Drama' }, { mal_id: 10, name: 'Fantasy' }, { mal_id: 14, name: 'Horror' },
        { mal_id: 7, name: 'Mystery' }, { mal_id: 22, name: 'Romance' }, { mal_id: 24, name: 'Sci-Fi' },
        { mal_id: 36, name: 'Slice of Life' }, { mal_id: 30, name: 'Sports' }, { mal_id: 37, name: 'Supernatural' },
        { mal_id: 41, name: 'Thriller' }, { mal_id: 62, name: 'Isekai' }, { mal_id: 63, name: 'Magical Girl' },
        { mal_id: 17, name: 'Mecha' }, { mal_id: 18, name: 'Music' }, { mal_id: 38, name: 'Military' },
        { mal_id: 23, name: 'School' }, { mal_id: 29, name: 'Space' },
      ],
    };
  }

  async getAnimeByGenres(genreIds: number[], page = 1): Promise<{ data: NormalisedAnime[]; pagination: any }> {
    const perPage = 20;
    const collected: NormalisedAnime[] = [];
    let apiPage = 1;
    let hasMore = true;
    const skip = (page - 1) * perPage;
    let skipped = 0;

    while (collected.length < perPage && hasMore && apiPage <= 20) {
      const offset = (apiPage - 1) * 100;
      const raw = await this.get('/anime/ranking', { ranking_type: 'bypopularity', limit: 100, offset, fields: LIST_FIELDS, nsfw: 'false' });
      hasMore = !!raw.paging?.next;
      apiPage++;

      for (const n of raw.data ?? []) {
        const anime = await this.normalise(n.node);
        const animeGenreIds = anime.genres.map((g) => g.mal_id);
        if (genreIds.some((g) => !animeGenreIds.includes(g))) continue;
        if (skipped < skip) { skipped++; continue; }
        collected.push(anime);
        if (collected.length >= perPage) break;
      }
    }
    return { data: collected, pagination: { last_visible_page: collected.length === perPage ? page + 1 : page } };
  }

  async getAnimeByGenre(genreId: number, page = 1) {
    return this.getAnimeByGenres([genreId], page);
  }

  async getSchedule(day = ''): Promise<{ data: NormalisedAnime[] }> {
    const year = new Date().getUTCFullYear();
    const season = this.currentSeason();
    let all: NormalisedAnime[] = [];
    for (let page = 1; page <= 3; page++) {
      const offset = (page - 1) * 50;
      const raw = await this.get(`/anime/season/${year}/${season}`, { limit: 50, offset, fields: LIST_FIELDS, sort: 'anime_score', nsfw: 'false' });
      const batch = await Promise.all((raw.data ?? []).map((n: any) => this.normalise(n.node)));
      all = all.concat(batch);
      if (!raw.paging?.next) break;
    }
    if (day !== '') {
      all = all.filter((a) => (a.broadcast.day ?? '').toLowerCase() === day.toLowerCase());
    }
    all.sort((a, b) => (a.broadcast.time ?? '99:99').localeCompare(b.broadcast.time ?? '99:99'));
    return { data: all };
  }
}

function mapStatus(s: string): string {
  switch (s) {
    case 'currently_airing': return 'Currently Airing';
    case 'finished_airing': return 'Finished Airing';
    case 'not_yet_aired': return 'Not yet aired';
    default: return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

async function sha1(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
