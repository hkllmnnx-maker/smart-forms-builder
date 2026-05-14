-- Smart Forms Builder - Initial schema
-- Users come from Google OAuth; we store minimal profile + encrypted refresh tokens.

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,                -- Google sub (unique stable id)
  email           TEXT NOT NULL,
  name            TEXT,
  picture         TEXT,
  refresh_token   TEXT,                            -- AES-GCM encrypted (base64)
  scopes          TEXT,                            -- space-separated scopes granted
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- A session record (server-side) tied to a signed cookie sid.
CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,                -- random session id
  user_id         TEXT NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at      DATETIME NOT NULL,
  user_agent      TEXT,
  ip_hash         TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exp  ON sessions(expires_at);

-- OAuth state values (anti-CSRF). Short lived.
CREATE TABLE IF NOT EXISTS oauth_states (
  state           TEXT PRIMARY KEY,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at      DATETIME NOT NULL,
  redirect_to     TEXT
);

-- Forms successfully (or attempted) created on behalf of users.
CREATE TABLE IF NOT EXISTS generated_forms (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         TEXT NOT NULL,
  google_form_id  TEXT,
  title           TEXT,
  description     TEXT,
  responder_url   TEXT,
  edit_url        TEXT,
  question_count  INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'pending',         -- pending | success | failed
  error_message   TEXT,
  source_kind     TEXT,                           -- text | docx
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_forms_user ON generated_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_forms_created ON generated_forms(created_at DESC);

-- Rate limit buckets (lightweight).
CREATE TABLE IF NOT EXISTS rate_limits (
  key             TEXT PRIMARY KEY,
  count           INTEGER NOT NULL DEFAULT 0,
  window_started  DATETIME NOT NULL
);
