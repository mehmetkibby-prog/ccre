import {castleEnabled,CASTLE_CHANNEL,CASTLE_CAPACITY} from './castle-model-r59.mjs';
import {createTransferRules} from './generated/transfer-rules.mjs';
import {demand,validChannel,CAPACITY} from './contract.mjs';

// Only builds statements from pinned native code. No SQL or statement list is
// accepted from a browser/channel frame. This runs inside acceptOwnedTransfer's
// transaction AFTER the old channel's final ordered checkpoint was released.
const native=createTransferRules(),castleNative=createTransferRules({capacity:channel=>CAPACITY===10?10:castleEnabled()&&channel===CASTLE_CHANNEL?CASTLE_CAPACITY:CAPACITY});
const scopeFields=['id','account_id','channel','area','world_cycle','hp','hp_revision','position_revision','arena_match_id','combat_lock_until_ms'];
function statements(sqlite){return {prepare(sql){return {bind(...params){return {sql,params,first:()=>sqlite.prepare(sql).get(...params)??null};}};}};}
export function nativeTransferWriterGuard({player,targetChannel,now,requestReceivedAtMs,settings},{castleR59=false}={}){
 demand(player&&validChannel(targetChannel)&&player.channel!==targetChannel,'invalid_transfer_scope');
 demand(Number.isSafeInteger(now)&&Number.isSafeInteger(requestReceivedAtMs),'invalid_transfer_time');
 const snapshot=Object.freeze({...player}),config=Object.freeze({...settings});
 return (sqlite,owner)=>{
  demand(sqlite.isTransaction,'transfer_requires_atomic');
  const current=sqlite.prepare('SELECT p.*,COALESCE(w.cycle,1) AS world_cycle FROM players p LEFT JOIN world_state w ON w.id=1 WHERE p.id=?').get(snapshot.id);
  demand(owner.player_id===snapshot.id&&owner.channel===snapshot.channel&&scopeFields.every(field=>Object.is(current?.[field],snapshot[field])),'transfer_snapshot_conflict');
  // Additional fences close changes between native preflight and writer ACK.
  // They cannot substitute for selectChannel's original eligibility/retaliation
  // preflight, which the channel router must run before requesting the handoff.
  demand(current.hp>0&&!current.arena_match_id&&current.area!=='arena'&&current.combat_lock_until_ms<=requestReceivedAtMs,'transfer_game_state_changed');
  demand(!sqlite.prepare('SELECT 1 FROM dungeon_members WHERE player_id=?').get(snapshot.id),'dungeon_transfer_locked');
  if(castleR59)demand(castleEnabled()&&targetChannel===CASTLE_CHANNEL&&(process.env.CORE511_R61_CASTLE_TRAVEL==='1'||current.area==='bazaar')&&sqlite.prepare('SELECT 1 FROM guild_members WHERE player_id=?').get(snapshot.id),'castle_transfer_access');
  if(castleR59)sqlite.prepare('INSERT INTO castle_entries_r59 VALUES(?,?,?) ON CONFLICT(player_id) DO UPDATE SET return_channel=excluded.return_channel,entered_at_ms=excluded.entered_at_ms').run(snapshot.id,current.channel,requestReceivedAtMs);
  const plan=(castleR59?castleNative:native).writerPlan({database:statements(sqlite),playerId:snapshot.id,targetChannel,now,requestReceivedAtMs,settings:config});
  const switched=sqlite.prepare(plan.switchStatement.sql).get(...plan.switchStatement.params);
  if(!switched||switched.channel!==targetChannel)return false;
  for(const statement of plan.cleanupStatements)sqlite.prepare(statement.sql).run(...statement.params);
  return true;
 };
}
