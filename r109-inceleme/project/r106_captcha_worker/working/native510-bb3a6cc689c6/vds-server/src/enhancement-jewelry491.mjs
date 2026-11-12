// Native additive upgrade. Called after ensureExpansion456Schema and the
// item_enhancements491 schema exist, before the durable writer/readers start.
// Original trigger names are retained intentionally: a code rollback must not
// discard defense already earned on an upgraded piece of jewelry.
// The canonical stored prefix and power are written together by the durable
// enhancement command, after validating its sidecar. Read that stored prefix
// here: existing dungeon/dragon private workspaces intentionally omit the
// global item sidecar, but copy these inventory triggers and exact item rows.
const bonus491=name=>`CASE substr(${name},1,3) WHEN '+1 ' THEN 2 WHEN '+2 ' THEN 6 WHEN '+3 ' THEN 11 WHEN '+4 ' THEN 18 WHEN '+5 ' THEN 28 ELSE 0 END`;
const jewelryBonus491=id=>`COALESCE((SELECT SUM(${bonus491('i.item_name')}) FROM player_items i WHERE i.player_id=${id} AND i.equipped=1 AND i.kind IN ('earring','bracelet')),0)`;
const recalculate491=(id,condition='')=>`UPDATE players SET jewelry_attack=20*(SELECT COUNT(*) FROM player_items WHERE player_id=${id} AND equipped=1 AND kind IN ('earring','bracelet')),jewelry_defense=50*(SELECT COUNT(*) FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='bracelet')+${jewelryBonus491(id)},jewelry_cast_speed=10*(SELECT COUNT(*) FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='earring'),jewelry_pvp=5*(SELECT COUNT(*) FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='earring'),jewelry_resist=5*(SELECT COUNT(*) FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='bracelet'),jewelry_earring_enchantments=COALESCE((SELECT enchantments FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='earring'),'[]'),jewelry_bracelet_enchantments=COALESCE((SELECT enchantments FROM player_items WHERE player_id=${id} AND equipped=1 AND kind='bracelet'),'[]') WHERE id=${id} ${condition};`;
export function ensureEnhancementJewelry491(db){
 db.exec('SAVEPOINT enhancement_jewelry491');
 try{
  db.exec(`DROP TRIGGER IF EXISTS expansion456_jewelry_insert;
DROP TRIGGER IF EXISTS expansion456_jewelry_delete;
DROP TRIGGER IF EXISTS expansion456_jewelry_update;
DROP TRIGGER IF EXISTS enhancement491_preserve_canonical_name;
CREATE TRIGGER enhancement491_preserve_canonical_name BEFORE UPDATE OF item_name ON player_items
WHEN OLD.kind IN ('weapon','armor','helmet','shoes','necklace','earring','bracelet')
 AND substr(OLD.item_name,1,3) IN ('+0 ','+1 ','+2 ','+3 ','+4 ','+5 ')
 AND substr(NEW.item_name,1,3) NOT IN ('+0 ','+1 ','+2 ','+3 ','+4 ','+5 ')
BEGIN SELECT RAISE(ABORT,'Artı basılmış eşyanın dönüşümü için güncel oyun sürümünü kullan.'); END;
CREATE TRIGGER expansion456_jewelry_insert AFTER INSERT ON player_items WHEN NEW.equipped=1 AND NEW.kind IN ('earring','bracelet') BEGIN ${recalculate491('NEW.player_id')} END;
CREATE TRIGGER expansion456_jewelry_delete AFTER DELETE ON player_items WHEN OLD.equipped=1 AND OLD.kind IN ('earring','bracelet') BEGIN ${recalculate491('OLD.player_id')} END;
CREATE TRIGGER expansion456_jewelry_update AFTER UPDATE OF player_id,kind,equipped,enchantments,power,item_name ON player_items WHEN (OLD.equipped=1 AND OLD.kind IN ('earring','bracelet')) OR (NEW.equipped=1 AND NEW.kind IN ('earring','bracelet')) BEGIN ${recalculate491('OLD.player_id')} ${recalculate491('NEW.player_id','AND NEW.player_id!=OLD.player_id')} END;`);
  // Only startup repair of the tiny currently-equipped jewelry set; no timer
  // and no additional combat query. Includes +0, preserving original values.
  for(const row of db.prepare("SELECT DISTINCT player_id FROM player_items WHERE equipped=1 AND kind IN ('earring','bracelet')").all())db.prepare(recalculate491('@enhancementPlayer491')).run({enhancementPlayer491:row.player_id});
  db.exec('RELEASE enhancement_jewelry491');
 }catch(error){db.exec('ROLLBACK TO enhancement_jewelry491; RELEASE enhancement_jewelry491');throw error;}
}
