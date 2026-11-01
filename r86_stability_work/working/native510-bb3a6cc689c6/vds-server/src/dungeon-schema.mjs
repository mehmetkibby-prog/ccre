import {ensureGroupLimit494} from '../../lib/group-dungeon-limit494.mjs';
// Additive VDS-only upgrade. Never creates or replaces the game database.
export const DUNGEON_DEFAULTS = Object.freeze({
    enabled: 1, minimum_level: 50, ready_seconds: 60, duration_seconds: 1800,
    enemy_hp: 18000, boss_hp: 240000, enemy_damage: 32, boss_damage: 100,
    crystal_hp: 12000, wing_chance: 12, wing_min: 1, wing_max: 2,
    infinite_chance: 4, infinite_min: 1, infinite_max: 1,
    pet_chance: 6, pet_min: 1, pet_max: 1, red_chance: 18, helmet_chance: 5,
    wing_bonus_chance:10, infinite_bonus_chance:10, pet_bonus_chance:10,
    wing_cost: 30, infinite_cost: 50, infinite_gems: 10000, infinite_pearls: 50,
    pet_cost: 50, pet_gems: 2000, winner_gems: 30, winner_red_chance: 100, infinite_power_percent: 30, infinite_weapon_power: 230,
});
export function ensureDungeonSchema(db) {
    db.exec('BEGIN IMMEDIATE');
    try {
        db.exec(`CREATE TABLE IF NOT EXISTS dungeon_settings(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS dungeon_runs(id TEXT PRIMARY KEY,party_id TEXT NOT NULL,leader_id TEXT NOT NULL,status TEXT NOT NULL,state TEXT NOT NULL,updated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS dungeon_members(player_id TEXT PRIMARY KEY,run_id TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS dungeon_members_run ON dungeon_members(run_id);
 CREATE INDEX IF NOT EXISTS dungeon_runs_status ON dungeon_runs(status,updated_at);
 CREATE TABLE IF NOT EXISTS dungeon_materials(player_id TEXT NOT NULL,kind TEXT NOT NULL,amount INTEGER NOT NULL DEFAULT 0 CHECK(amount>=0),PRIMARY KEY(player_id,kind));
 CREATE TABLE IF NOT EXISTS dungeon_rewards(run_id TEXT NOT NULL,player_id TEXT NOT NULL,rewards TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(run_id,player_id));
 CREATE TABLE IF NOT EXISTS dungeon_crafts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(player_id,request_id));
 CREATE TABLE IF NOT EXISTS dungeon_wings(player_id TEXT PRIMARY KEY,equipped INTEGER NOT NULL DEFAULT 0);`);
        // Repair old dual equips once; ownership stays intact. Triggers also cover
        // purchases, admin grants and payment fulfillment in the same transaction.
        db.exec(`UPDATE players SET wings_equipped=0 WHERE wings_equipped=1 AND EXISTS(SELECT 1 FROM dungeon_wings WHERE player_id=players.id AND equipped=1);
 CREATE TRIGGER IF NOT EXISTS equip_market_wings_exclusive AFTER UPDATE OF wings_equipped ON players WHEN NEW.wings_equipped=1 BEGIN
 UPDATE dungeon_wings SET equipped=0 WHERE player_id=NEW.id AND equipped=1; END;
 CREATE TRIGGER IF NOT EXISTS equip_core_wings_exclusive AFTER UPDATE OF equipped ON dungeon_wings WHEN NEW.equipped=1 BEGIN
 UPDATE players SET wings_equipped=0 WHERE id=NEW.player_id AND wings_equipped=1; END;
 CREATE TRIGGER IF NOT EXISTS create_core_wings_exclusive AFTER INSERT ON dungeon_wings WHEN NEW.equipped=1 BEGIN
 UPDATE players SET wings_equipped=0 WHERE id=NEW.player_id AND wings_equipped=1; END;`);
        db.prepare('INSERT OR IGNORE INTO dungeon_settings(id,value) VALUES(1,?)').run(JSON.stringify(DUNGEON_DEFAULTS));
        ensureGroupLimit494(db);
        db.exec('COMMIT');
    }
    catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }
}
