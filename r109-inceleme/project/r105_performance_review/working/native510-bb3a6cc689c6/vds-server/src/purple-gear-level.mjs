export function ensurePurpleGearLevel(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`CREATE TRIGGER IF NOT EXISTS purple_gear_level_insert
      BEFORE INSERT ON player_items
      WHEN NEW.equipped=1 AND NEW.rarity='purple' AND NEW.kind IN ('weapon','armor','helmet','shoes','necklace')
        AND EXISTS(SELECT 1 FROM players WHERE id=NEW.player_id AND level<60)
      BEGIN SELECT RAISE(ABORT,'gear_level_required'); END;
    CREATE TRIGGER IF NOT EXISTS purple_gear_level_update
      BEFORE UPDATE OF equipped,rarity,player_id ON player_items
      WHEN NEW.equipped=1 AND NEW.rarity='purple' AND NEW.kind IN ('weapon','armor','helmet','shoes','necklace')
        AND EXISTS(SELECT 1 FROM players WHERE id=NEW.player_id AND level<60)
      BEGIN SELECT RAISE(ABORT,'gear_level_required'); END;
    CREATE TRIGGER IF NOT EXISTS purple_gear_level_player
      AFTER UPDATE OF level,last_seen ON players
      WHEN NEW.level<60
      BEGIN UPDATE player_items SET equipped=0 WHERE player_id=NEW.id AND equipped=1
        AND rarity='purple' AND kind IN ('weapon','armor','helmet','shoes','necklace'); END;`);
    // Existing equipment stays owned by the player and returns to the bag.
    db.exec(`UPDATE player_items SET equipped=0 WHERE equipped=1 AND rarity='purple'
      AND kind IN ('weapon','armor','helmet','shoes','necklace')
      AND EXISTS(SELECT 1 FROM players WHERE id=player_items.player_id AND level<60)`);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
