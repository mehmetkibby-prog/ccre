-- Loncalar: ad (büyük/küçük harf duyarsız tekil), simge, öz vergisi, hazine, duyuru, savaş sonuçları
CREATE TABLE IF NOT EXISTS guilds (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  emblem SMALLINT NOT NULL DEFAULT 0,
  tax SMALLINT NOT NULL DEFAULT 0,
  bank BIGINT NOT NULL DEFAULT 0,
  notice TEXT NOT NULL DEFAULT '',
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS guilds_name_lower ON guilds (lower(name));
-- Üyelik: bir karakter en çok bir loncada; rütbe 0 üye, 1 subay, 2 lider
CREATE TABLE IF NOT EXISTS guild_members (
  char_id BIGINT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  guild_id INT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  rank SMALLINT NOT NULL DEFAULT 0,
  contributed BIGINT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guild_members_guild ON guild_members(guild_id);
