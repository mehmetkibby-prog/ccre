-- Ön kayıt: oyun açılmadan açılan hesaplar ödül (Ön Kayıt Sandığı) alır.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS prereg BOOLEAN NOT NULL DEFAULT false;
-- Oyun henüz açılmadıysa bugüne kadar açılmış bütün hesaplar ön kayıtlıdır.
UPDATE accounts SET prereg = true
  WHERE COALESCE((SELECT value->>'mode' FROM server_state WHERE key = 'opening'), 'closed') <> 'open';
-- E-posta ile arama (tekillik kodda denetlenir: eski kayıtlarda aynı adres olabilir)
CREATE INDEX IF NOT EXISTS accounts_email_lower ON accounts (lower(email));

-- Forum: konu + iletiler (konunun ilk iletisi konuyu açan yazıdır)
CREATE TABLE IF NOT EXISTS forum_topics (
  id BIGSERIAL PRIMARY KEY,
  cat TEXT NOT NULL,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_post_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  replies INT NOT NULL DEFAULT 0,
  views INT NOT NULL DEFAULT 0,
  pinned BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  deleted BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS forum_topics_list ON forum_topics (cat, deleted, pinned DESC, last_post_at DESC);
CREATE TABLE IF NOT EXISTS forum_posts (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS forum_posts_topic ON forum_posts (topic_id, id);
CREATE INDEX IF NOT EXISTS forum_posts_account ON forum_posts (account_id, created_at DESC);
