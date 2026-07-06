// Ports includes/settings.php. The file-based API cache (CACHE_DIR glob of
// mal_*.json / jikan_*.json) doesn't exist on Workers -- that's replaced by
// Workers KV in mal-api.ts, so the cache-file-management methods
// (getApiCacheFiles/clearApiCacheFiles/getCacheStats) move there instead.
import { Db } from './db';

export interface BannerData {
  bannerEnabled: boolean;
  bannerMessage: string;
  bannerType: 'info' | 'success' | 'warning' | 'error';
}

/** Fetches the sitewide banner settings configured via admin/banner.php,
 * for use in every public-facing renderHeader() call. */
export async function getBannerData(db: Db): Promise<BannerData> {
  const settings = new Settings(db);
  const enabled = (await settings.get('banner_enabled', '0')) === '1';
  const message = (await settings.get('banner_message', '')) ?? '';
  const rawType = (await settings.get('banner_type', 'info')) ?? 'info';
  const type = (['info', 'success', 'warning', 'error'].includes(rawType) ? rawType : 'info') as BannerData['bannerType'];
  return { bannerEnabled: enabled && !!message, bannerMessage: message, bannerType: type };
}

export class Settings {
  private cache: Map<string, string> = new Map();
  private loaded = false;

  constructor(private db: Db) {}

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const rows = await this.db.fetchAll<{ key: string; value: string }>('SELECT `key`, `value` FROM settings');
      for (const row of rows) this.cache.set(row.key, row.value);
    } catch {
      // table may not exist yet
    }
    this.loaded = true;
  }

  async get(key: string, defaultValue: string | null = null): Promise<string | null> {
    await this.load();
    return this.cache.has(key) ? this.cache.get(key)! : defaultValue;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.query(
      "INSERT INTO settings (`key`, `value`) VALUES (?,?) ON CONFLICT(`key`) DO UPDATE SET `value`=excluded.value",
      [key, value]
    );
    this.cache.set(key, value);
  }

  async isApiCacheEnabled(apiCacheEnabledFlag: boolean): Promise<boolean> {
    await this.load();
    return apiCacheEnabledFlag && (await this.get('api_cache_disabled', '1')) !== '1';
  }
}
