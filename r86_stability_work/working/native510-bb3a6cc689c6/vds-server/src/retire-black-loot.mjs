// Return the still-unclaimed contents of legacy PvP death chests before
// disabling the collection endpoint. Claims made before this release stay put.
const resources = ['essence', 'potions', 'fish_sokan', 'fish_levrek', 'fish_zargana', 'pearls', 'stone_dust'];

export function retireBlackLoot(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const chests = db.prepare(`SELECT c.* FROM black_loot_chests c
      JOIN players p ON p.id = c.victim_id`).all();
    const restoreItems = db.prepare("UPDATE player_items SET player_id = ? WHERE player_id = ?");
    const restoreResources = db.prepare(`UPDATE players SET
      ${resources.map(name => `${name} = ${name} + ?`).join(', ')},
      has_rod = MAX(has_rod, ?), has_wings = MAX(has_wings, ?)
      WHERE id = ?`);
    const deleteAttempts = db.prepare('DELETE FROM black_loot_attempts WHERE chest_id = ?');
    const deleteChest = db.prepare('DELETE FROM black_loot_chests WHERE id = ?');
    for (const chest of chests) {
      restoreItems.run(chest.victim_id, `chest:${chest.id}`);
      restoreResources.run(...resources.map(name => chest[name]), chest.has_rod, chest.has_wings, chest.victim_id);
      deleteAttempts.run(chest.id);
      deleteChest.run(chest.id);
    }
    db.exec('COMMIT');
    if (chests.length) console.info(`Returned remaining contents of ${chests.length} Black Zone death chests.`);
    return chests.length;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
