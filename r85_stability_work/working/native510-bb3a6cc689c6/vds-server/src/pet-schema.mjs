// Additive upgrade only; preserves all existing pet ownership and equipment.
export function ensurePetNameColumn(database) {
  const columns = new Set(database.prepare("PRAGMA table_info(player_pets)").all().map(row => row.name));
  if (!columns.has("name")) database.exec("ALTER TABLE player_pets ADD COLUMN name text DEFAULT '' NOT NULL");
}
