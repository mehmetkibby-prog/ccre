// VDS-only, additive and safe to run on every startup. Never touches frozen D1.
export function ensureGmVisibilitySchema(db) {
  const columns = new Set(db.prepare('PRAGMA table_info(players)').all().map(row => row.name));
  for (const name of ['gm_invisible', 'gm_visibility_revision']) {
    if (!columns.has(name)) db.exec(`ALTER TABLE players ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 0`);
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_players_gm_visibility ON players(channel,area) WHERE gm_visibility_revision > 0');
}
