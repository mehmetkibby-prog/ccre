// Additive setup runs once, before channel readers and the durable writer start.
export const PLAYER_COLUMNS456=Object.freeze({specialization:"TEXT NOT NULL DEFAULT ''",skill_four:'INTEGER NOT NULL DEFAULT 1',attack_four_at:'INTEGER NOT NULL DEFAULT 0',special_guard_until_ms:'INTEGER NOT NULL DEFAULT 0',jewelry_attack:'INTEGER NOT NULL DEFAULT 0',jewelry_defense:'INTEGER NOT NULL DEFAULT 0',jewelry_cast_speed:'INTEGER NOT NULL DEFAULT 0',jewelry_pvp:'INTEGER NOT NULL DEFAULT 0',jewelry_resist:'INTEGER NOT NULL DEFAULT 0',jewelry_earring_enchantments:"TEXT NOT NULL DEFAULT '[]'",jewelry_bracelet_enchantments:"TEXT NOT NULL DEFAULT '[]'",halloween_candy_until:'INTEGER NOT NULL DEFAULT 0'});
const recalculate=(id,condition='')=>`UPDATE players SET jewelry_attack=20*(SELECT COUNT(*) FROM player_items WHERE player_id=${id} AND equipped=1 AND kind IN ('earring','bracelet')),jewelry_defense=50*(SELECT COUNT(*) FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='bracelet'),jewelry_cast_speed=10*(SELECT COUNT(*) FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='earring'),jewelry_pvp=5*(SELECT COUNT(*) FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='earring'),jewelry_resist=5*(SELECT COUNT(*) FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='bracelet'),jewelry_earring_enchantments=COALESCE((SELECT enchantments FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='earring'),'[]'),jewelry_bracelet_enchantments=COALESCE((SELECT enchantments FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='bracelet'),'[]') WHERE id=${id} ${condition};`;
export function ensureExpansion456Schema(db){
 db.exec('SAVEPOINT expansion456_schema');
 try{
  const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
  for(const[name,type]of Object.entries(PLAYER_COLUMNS456))if(!columns.has(name))db.exec(`ALTER TABLE players ADD COLUMN ${name} ${type}`);
  db.exec(`CREATE TABLE IF NOT EXISTS expansion456_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,operation TEXT NOT NULL,result TEXT NOT NULL,created_at_ms INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
CREATE INDEX IF NOT EXISTS idx_expansion456_receipts_created ON expansion456_receipts(created_at_ms);
CREATE TRIGGER IF NOT EXISTS expansion456_jewelry_insert AFTER INSERT ON player_items WHEN NEW.equipped=1 AND NEW.kind IN ('earring','bracelet') BEGIN ${recalculate('NEW.player_id')} END;
CREATE TRIGGER IF NOT EXISTS expansion456_jewelry_delete AFTER DELETE ON player_items WHEN OLD.equipped=1 AND OLD.kind IN ('earring','bracelet') BEGIN ${recalculate('OLD.player_id')} END;
CREATE TRIGGER IF NOT EXISTS expansion456_jewelry_update AFTER UPDATE OF player_id,kind,equipped,enchantments ON player_items WHEN (OLD.equipped=1 AND OLD.kind IN ('earring','bracelet')) OR (NEW.equipped=1 AND NEW.kind IN ('earring','bracelet')) BEGIN ${recalculate('OLD.player_id')} ${recalculate('NEW.player_id','AND NEW.player_id!=OLD.player_id')} END;`);
  db.exec('RELEASE expansion456_schema');
 }catch(error){db.exec('ROLLBACK TO expansion456_schema; RELEASE expansion456_schema');throw error;}
}
