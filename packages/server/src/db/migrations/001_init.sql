-- Core of Life — temel şema
CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  username_norm TEXT NOT NULL UNIQUE,
  email TEXT,
  pass_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','moderator','gm','admin','owner')),
  early_access BOOLEAN NOT NULL DEFAULT false,
  starter_eligible BOOLEAN NOT NULL DEFAULT true,
  banned_until TIMESTAMPTZ,
  ban_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS characters (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id),
  name TEXT NOT NULL,
  name_norm TEXT NOT NULL UNIQUE,
  cls TEXT NOT NULL CHECK (cls IN ('guardian','hunter','arcanist')),
  level INT NOT NULL DEFAULT 1,
  xp BIGINT NOT NULL DEFAULT 0,
  hp INT NOT NULL DEFAULT 0,
  map TEXT NOT NULL DEFAULT 'bazaar',
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  gems BIGINT NOT NULL DEFAULT 0 CHECK (gems >= 0),
  essence BIGINT NOT NULL DEFAULT 0 CHECK (essence >= 0),
  cp BIGINT NOT NULL DEFAULT 0 CHECK (cp >= 0),
  arena_coin BIGINT NOT NULL DEFAULT 0 CHECK (arena_coin >= 0),
  stat_str INT NOT NULL DEFAULT 0, stat_res INT NOT NULL DEFAULT 0, stat_vit INT NOT NULL DEFAULT 0,
  skill_levels INT[] NOT NULL DEFAULT '{1,1,1,1}',
  spec TEXT,
  kills BIGINT NOT NULL DEFAULT 0,
  misc JSONB NOT NULL DEFAULT '{}'::jsonb,
  save_version BIGINT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS characters_account ON characters(account_id);
CREATE INDEX IF NOT EXISTS characters_level ON characters(level DESC, xp DESC);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY,
  char_id BIGINT REFERENCES characters(id),
  tpl TEXT NOT NULL,
  rarity TEXT NOT NULL,
  plus INT NOT NULL DEFAULT 0,
  location TEXT NOT NULL CHECK (location IN ('bag','equip','storage','listing','pending','escrow')),
  slot TEXT,
  locked BOOLEAN NOT NULL DEFAULT false,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS items_char ON items(char_id, location);

CREATE TABLE IF NOT EXISTS materials (
  char_id BIGINT NOT NULL REFERENCES characters(id),
  key TEXT NOT NULL,
  qty BIGINT NOT NULL CHECK (qty >= 0),
  PRIMARY KEY (char_id, key)
);

-- Para hareket defteri: idem_key benzersizliği "bir kez etki" kanıtıdır.
CREATE TABLE IF NOT EXISTS ledger (
  id BIGSERIAL PRIMARY KEY,
  char_id BIGINT NOT NULL REFERENCES characters(id),
  currency TEXT NOT NULL,
  delta BIGINT NOT NULL,
  reason TEXT NOT NULL,
  ref TEXT,
  idem_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_char ON ledger(char_id, created_at DESC);

-- Tek seferlik haklar (başlangıç sandığı, görev ödülü, günlük ödül...).
CREATE TABLE IF NOT EXISTS receipts (
  key TEXT PRIMARY KEY,
  account_id BIGINT,
  char_id BIGINT,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS server_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  revision BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by BIGINT
);

CREATE TABLE IF NOT EXISTS config_revisions (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  revision BIGINT NOT NULL,
  value JSONB NOT NULL,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, revision)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_account BIGINT,
  action TEXT NOT NULL,
  target TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());
