// Legacy storage is retained; the banner product and customization are retired.
export function ensureGuildBannerSchema(db){db.exec(`CREATE TABLE IF NOT EXISTS guild_banners(
 guild_id TEXT PRIMARY KEY REFERENCES guilds(id),
 color TEXT NOT NULL DEFAULT 'emerald' CHECK(color IN ('emerald','ruby','sapphire','amber','violet','silver')),
 emblem TEXT NOT NULL DEFAULT 'shield' CHECK(emblem IN ('shield','crown','swords','flame','moon','gem')),
 pattern TEXT NOT NULL DEFAULT 'plain' CHECK(pattern IN ('plain','stripe','split')),
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1)),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),purchased_by TEXT NOT NULL,purchased_at_ms INTEGER NOT NULL
);`);}
