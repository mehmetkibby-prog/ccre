// Add acknowledgement metadata to the existing database only. No table copy,
// import, delete or player-row rewrite is needed, and repeat starts are safe.
export function ensureMovementColumns(database) {
  database.exec("BEGIN IMMEDIATE");
  try {
    const columns = new Set(database.prepare("PRAGMA table_info(players)").all().map(row => row.name));
    if (!columns.size) throw new Error("Existing player database is required");
    if (!columns.has("motion_stream_id")) database.exec("ALTER TABLE players ADD COLUMN motion_stream_id text DEFAULT '' NOT NULL");
    if (!columns.has("motion_sequence")) database.exec("ALTER TABLE players ADD COLUMN motion_sequence integer DEFAULT 0 NOT NULL");
    for (const table of ["players", "monsters"]) {
      const existing = new Set(database.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name));
      if (!existing.size) continue;
      for (const column of ["root_until_ms", "stun_until_ms", ...(table === "monsters" ? ["control_x", "control_y"] : [])]) {
        if (!existing.has(column)) database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${column.startsWith("control_") ? "real" : "integer"} DEFAULT 0 NOT NULL`);
      }
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
