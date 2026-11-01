import {MOUNT_QUEST,MOUNT_RECIPE,mountEnabled,mountItem} from './mounts-model.mjs';
import {mountDropConfigR55,awardMountMaterialsR55} from './mount-drops-r55.mjs';
// Called only after the native claim-gated award succeeds, inside its existing
// sole-writer transaction. No timer, global hold, scan of players, or new RNG.
export function recordMountReward(service,key,outcome){
 if(!mountEnabled()||!service?.enabled||!outcome?.awarded||typeof outcome.claimToken!=='string')return outcome;
 service.requireTransaction();const q=text=>service.statement(text),sql=service.sql,time=service.now();
 const config=mountDropConfigR55(sql)?.config,custom=config?.materials.some(x=>x.mode==='chance');
 let rows,kind,area='',dropArea='',dropType='';
 if(key.startsWith('normal:')&&typeof outcome.monsterId==='string'&&Number.isSafeInteger(outcome.spawnRound)){
  const monster=q('SELECT m.id,m.area,m.is_boss,m.is_stone,m.summoned,m.loadlab_run_id,d.defeated_at FROM normal_defeats d JOIN monsters m ON m.id=d.monster_id WHERE d.monster_id=? AND d.spawn_round=?').get(outcome.monsterId,outcome.spawnRound);
  if(!monster||monster.loadlab_run_id||monster.summoned)return outcome;
  dropArea=monster.area;dropType=monster.is_boss?'boss':monster.is_stone?'stone':'normal';
  kind=monster.id==='frozen-boss-1'?'boss_frozen':monster.id==='ancient-boss-1'?'boss_ancient':null;
  if(!kind){const hunt=MOUNT_QUEST.hunts.find(h=>h.area===monster.area);if(hunt&&!monster.is_boss&&!monster.is_stone){kind=hunt.kind;area=hunt.area;}else if(!custom)return outcome;}
  rows=q(`SELECT claim.player_id,p.cycle FROM normal_reward_claims claim
   JOIN mount_profiles_r49 p ON p.player_id=claim.player_id AND p.active=1 AND p.crafted=0
   JOIN players actor ON actor.id=claim.player_id AND actor.loadlab_run_id=''
   WHERE claim.monster_id=? AND claim.spawn_round=? AND claim.claim_token=? AND p.started_at_ms/1000<=?`).all(outcome.monsterId,outcome.spawnRound,outcome.claimToken,monster.defeated_at);
 }else if(key.startsWith('boss:')&&Number.isSafeInteger(outcome.bossRound)){
  kind='boss_world';dropArea='sanctum';dropType='boss';rows=q(`SELECT claim.player_id,p.cycle FROM boss_reward_claims claim
   JOIN boss_defeats d ON d.boss_round=claim.boss_round
   JOIN mount_profiles_r49 p ON p.player_id=claim.player_id AND p.active=1 AND p.crafted=0
   JOIN players actor ON actor.id=claim.player_id AND actor.loadlab_run_id=''
   WHERE claim.boss_round=? AND claim.claim_token=? AND p.started_at_ms/1000<=d.defeated_at`).all(outcome.bossRound,outcome.claimToken);
 }else return outcome;
 for(const row of rows){
  if(custom){
   if(service.amount(row.player_id,'mount_saddle')>0)continue;
   const before=kind?service.amount(row.player_id,kind):0,limit=area?50:1;
   const canDrop=config.materials.some(entry=>service.amount(row.player_id,entry.kind)<mountItem(entry.kind).cap&&(entry.mode==='chance'?entry.sources.some(s=>s.area===dropArea&&s.monsters===dropType&&s.chance>0):!!area&&before<50));
   if((!kind||before>=limit)&&!canDrop)continue;
   const inserted=q('INSERT OR IGNORE INTO mount_reward_claims_r49(player_id,cycle,reward_key,created_at_ms) VALUES(?,?,?,?)').run(row.player_id,row.cycle,key,time).changes;if(!inserted)continue;
   const after=kind&&before<limit?service.add(row.player_id,kind,1):before;
   awardMountMaterialsR55(service,row.player_id,{area:dropArea,type:dropType,huntBefore:before,huntCount:after,config});continue;
  }
  const before=service.amount(row.player_id,kind),limit=area?50:1;if(before>=limit||service.amount(row.player_id,'mount_saddle')>0)continue;
  const inserted=q('INSERT OR IGNORE INTO mount_reward_claims_r49(player_id,cycle,reward_key,created_at_ms) VALUES(?,?,?,?)').run(row.player_id,row.cycle,key,time).changes;
  if(!inserted)continue;
  const after=service.add(row.player_id,kind,1);
  if(area==='forest'&&after<=30)service.add(row.player_id,'saddle_leather',1);
  if(area==='frozen'&&after%5===0)service.add(row.player_id,'saddle_buckle',1);
  if(area==='black'&&after%10===0)service.add(row.player_id,'saddle_rein',1);
 }
 return outcome;
}
export function mountRewardResult(globals,key,outcome){return recordMountReward(globals?.__colMounts,key,outcome);}
