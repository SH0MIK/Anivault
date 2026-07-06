// Ports includes/discord_notifier.php. Still relays through your existing
// Railway -> Vercel -> Discord chain, so no changes needed on that side.
import { Db } from './db';

export interface DiscordEnv {
  DISCORD_RELAY_URL?: string;
  BOT_SECRET?: string;
}

interface NotifyUser {
  id: number;
  username: string;
  email?: string | null;
  uid?: string | null;
  avatar_url?: string | null;
}

async function send(env: DiscordEnv, db: Db, type: 'register' | 'login', user: NotifyUser, method: string): Promise<void> {
  if (!env.DISCORD_RELAY_URL || !env.BOT_SECRET) return;

  let displayId: number | null = null;
  if (user.id) {
    const row = await db.fetchOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users WHERE id <= ?', [user.id]);
    displayId = row?.cnt ?? null;
  }

  const payload = JSON.stringify({
    type,
    method,
    user: {
      id: user.id ?? null,
      display_id: displayId,
      username: user.username ?? 'Unknown',
      email: user.email ?? null,
      uid: user.uid ?? null,
      avatar_url: user.avatar_url ?? null,
    },
  });

  try {
    // Fire-and-forget-ish; we don't await failures blocking login, but Workers
    // needs the promise settled before the response finishes, so we still await
    // with a short timeout via AbortController instead of curl's CURLOPT_TIMEOUT.
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    await fetch(env.DISCORD_RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-secret': env.BOT_SECRET },
      body: payload,
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    // Silently ignore, same as the PHP version — a failed relay must never break login.
  }
}

export const DiscordNotifier = {
  newUser: (env: DiscordEnv, db: Db, user: NotifyUser, method = 'email') => send(env, db, 'register', user, method),
  userLogin: (env: DiscordEnv, db: Db, user: NotifyUser, method = 'email') => send(env, db, 'login', user, method),
};
