-- Sessions table: replaces PHP's server-side $_SESSION.
-- The Worker sets an httpOnly cookie holding `id`, and looks up/writes this row per request.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,               -- random session token (goes in the cookie)
  user_id INTEGER,                   -- NULL until logged in
  data TEXT NOT NULL DEFAULT '{}',   -- JSON blob for oauth_state, flash messages, oauth_redirect, etc.
  expires_at INTEGER NOT NULL,       -- unix timestamp
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
