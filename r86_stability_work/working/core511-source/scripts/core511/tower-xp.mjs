import {defaultTowerXp,readTowerConfig} from './tower-config.mjs';
import {adventureArea} from './adventure-maps.mjs';

// R18–R30 omitted the XP property from tower config/validation and therefore
// wrote xp:0 into every profile. Upgrade only that unmistakable old format;
// an administrator's new explicit zero remains a valid deliberate setting.
// Runs retain their own frozen configuration, including during this upgrade.
export function migrateTowerXp(sql){
 const runs=sql.prepare("SELECT id,config FROM adventure_runs WHERE kind='tower' AND status='active'").all();
 let profiles=0,pending=0;
 const hasDefeats=!!sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='normal_defeats'").get();
 for(const row of runs){
  const previous=JSON.parse(row.config),config=readTowerConfig(previous);
  const legacy=previous.floors.some(f=>f.spawns.some(s=>!Object.hasOwn(s,'xp')));
  if(legacy)sql.prepare('UPDATE adventure_runs SET config=?,revision=revision+1 WHERE id=?').run(JSON.stringify(config),row.id);
  for(const monster of sql.prepare('SELECT id,area,profile FROM adventure_monsters WHERE run_id=?').all(row.id)){
   const p=JSON.parse(monster.profile);if(p.xpRevision===31||!legacy)continue;
   const floor=adventureArea(monster.area)?.floor??1,spec=config.floors[floor-1]?.spawns.find(s=>s.kind===p.kind);
   p.xp=spec?.xp??defaultTowerXp(p.kind,floor);p.xpRevision=31;
   sql.prepare('UPDATE adventure_monsters SET profile=? WHERE id=?').run(JSON.stringify(p),monster.id);profiles++;
   // Only undelivered rewards can be upgraded. The existing native XP claim
   // ledger still decides whether this monster round can credit a player.
   if(hasDefeats)pending+=sql.prepare('UPDATE normal_defeats SET xp_reward=? WHERE monster_id=? AND xp_reward=0 AND rewards_completed_at=0').run(p.xp,monster.id).changes;
  }
 }
 return {profiles,pending};
}
