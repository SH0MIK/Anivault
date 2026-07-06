// Full port of includes/tracker.php (AnimeTracker class).
import { Db } from './db';
import { Logger } from './logger';
import { MalAPI } from './mal-api';

export interface TrackerStats {
  watching: number;
  completed: number;
  plan_to_watch: number;
  dropped: number;
  on_hold: number;
  total_episodes: number;
  avg_score: number;
  total: number;
}

export interface AnimeListEntry {
  [key: string]: unknown;
  id: number;
  user_id: number;
  anime_id: number;
  anime_title?: string;
  anime_image?: string | null;
  anime_episodes?: number;
  status: string;
  episodes_watched: number;
  score: number | null;
  updated_at?: string;
}

export const ITEMS_PER_PAGE = 20;

async function getLocalAnimeImage(db: Db, animeId: number): Promise<string> {
  if (!animeId) return '';
  const row = await db.fetchOne<{ image_url: string }>('SELECT image_url FROM anime_images WHERE anime_id = ?', [animeId]);
  return row ? row.image_url : '';
}

export const AnimeTracker = {
  async getUserList(db: Db, userId: number, status: string, page: number): Promise<{ items: AnimeListEntry[]; total: number; pages: number }> {
    const offset = (page - 1) * ITEMS_PER_PAGE;
    let where = 'WHERE user_id = ?';
    const params: unknown[] = [userId];
    if (status) { where += ' AND status = ?'; params.push(status); }
    const items = await db.fetchAll<AnimeListEntry>(`SELECT * FROM anime_list ${where} ORDER BY updated_at DESC LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`, params);
    const total = await db.count(`SELECT COUNT(*) as cnt FROM anime_list ${where}`, params);
    return { items, total, pages: Math.ceil(total / ITEMS_PER_PAGE) };
  },

  async getUserEntry(db: Db, userId: number, animeId: number): Promise<AnimeListEntry | null> {
    return db.fetchOne<AnimeListEntry>('SELECT * FROM anime_list WHERE user_id=? AND anime_id=?', [userId, animeId]);
  },

  async getStats(db: Db, userId: number): Promise<TrackerStats> {
    const rows = await db.fetchAll<{ status: string; cnt: number; ep_sum: number; avg_score: number | null }>(
      'SELECT status, COUNT(*) as cnt, SUM(episodes_watched) as ep_sum, AVG(score) as avg_score FROM anime_list WHERE user_id=? GROUP BY status',
      [userId]
    );
    const stats: TrackerStats = {
      watching: 0, completed: 0, plan_to_watch: 0, dropped: 0, on_hold: 0,
      total_episodes: 0, avg_score: 0, total: 0,
    };
    let scoreTotal = 0;
    let scoreCount = 0;
    for (const r of rows) {
      (stats as any)[r.status] = r.cnt;
      stats.total_episodes += Number(r.ep_sum ?? 0);
      stats.total += r.cnt;
      if (r.avg_score) {
        scoreTotal += r.avg_score * r.cnt;
        scoreCount += r.cnt;
      }
    }
    stats.avg_score = scoreCount > 0 ? Math.round((scoreTotal / scoreCount) * 10) / 10 : 0;
    return stats;
  },

  /** Lightweight genre fetch stored alongside a list entry (fetchGenresJson). */
  async fetchGenresJson(mal: MalAPI, animeId: number): Promise<string | null> {
    try {
      const result = await mal.getAnime(animeId);
      const genres = result.data?.genres ?? [];
      if (genres.length === 0) return null;
      const names = genres.map((g) => g.name).filter(Boolean);
      return names.length ? JSON.stringify(names) : null;
    } catch {
      return null;
    }
  },

  async addOrUpdate(db: Db, mal: MalAPI, userId: number, data: Record<string, any>): Promise<{ success: boolean; message: string }> {
    const animeId = parseInt(data.anime_id ?? '0', 10) || 0;
    if (!animeId) return { success: false, message: 'Invalid anime ID.' };

    const status = data.status || 'plan_to_watch';
    const watched = parseInt(data.episodes_watched ?? '0', 10) || 0;
    const score = data.score ? parseInt(data.score, 10) : null;
    const review = data.review ?? null;
    const title = data.anime_title ?? '';
    const localImage = await getLocalAnimeImage(db, animeId);
    const image = localImage || data.anime_image || '';
    const episodes = parseInt(data.anime_episodes ?? '0', 10) || 0;

    const existing = await db.fetchOne<{ id: number; genres: string | null }>(
      'SELECT id, genres FROM anime_list WHERE user_id = ? AND anime_id = ?',
      [userId, animeId]
    );

    if (existing) {
      let genresUpdate = '';
      const extraParams: unknown[] = [];
      if (!existing.genres) {
        const genresJson = await this.fetchGenresJson(mal, animeId);
        if (genresJson) { genresUpdate = ', genres=?'; extraParams.push(genresJson); }
      }
      const completedAtExpr = status === 'completed' ? "date('now')" : 'completed_at';
      await db.query(
        `UPDATE anime_list SET status=?, episodes_watched=?, score=?, review=?,
         completed_at = ${completedAtExpr}${genresUpdate}, updated_at=datetime('now')
         WHERE user_id=? AND anime_id=?`,
        [status, watched, score, review, ...extraParams, userId, animeId]
      );
    } else {
      const genresJson = await this.fetchGenresJson(mal, animeId);
      const startedAt = ['watching', 'completed'].includes(status) ? new Date().toISOString().split('T')[0] : null;
      await db.insert(
        `INSERT INTO anime_list (user_id, anime_id, anime_title, anime_image, anime_episodes,
         status, episodes_watched, score, review, genres, started_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [userId, animeId, title, image, episodes, status, watched, score, review, genresJson, startedAt]
      );
    }
    await Logger.log(db, userId, 'anime_update', `Updated anime ${animeId} to status: ${status}`);
    return { success: true, message: 'Anime list updated!' };
  },

  async remove(db: Db, userId: number, animeId: number): Promise<{ success: boolean; message: string }> {
    await db.query('DELETE FROM anime_list WHERE user_id=? AND anime_id=?', [userId, animeId]);
    return { success: true, message: 'Removed from list.' };
  },

  async toggleFavorite(db: Db, userId: number, animeId: number, title: string, image: string): Promise<{ success: boolean; favorited: boolean }> {
    const exists = await db.fetchOne('SELECT id FROM favorites WHERE user_id=? AND anime_id=?', [userId, animeId]);
    if (exists) {
      await db.query('DELETE FROM favorites WHERE user_id=? AND anime_id=?', [userId, animeId]);
      return { success: true, favorited: false };
    }
    await db.insert('INSERT INTO favorites (user_id,anime_id,anime_title,anime_image) VALUES (?,?,?,?)', [userId, animeId, title, image]);
    return { success: true, favorited: true };
  },

  async isFavorite(db: Db, userId: number, animeId: number): Promise<boolean> {
    const row = await db.fetchOne('SELECT id FROM favorites WHERE user_id=? AND anime_id=?', [userId, animeId]);
    return !!row;
  },

  async getFavorites(db: Db, userId: number): Promise<any[]> {
    return db.fetchAll('SELECT * FROM favorites WHERE user_id=? ORDER BY created_at DESC', [userId]);
  },
};
