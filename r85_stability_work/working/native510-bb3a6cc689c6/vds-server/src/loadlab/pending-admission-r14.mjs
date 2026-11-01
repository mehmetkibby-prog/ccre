import {validId} from './protocol.mjs';

const fail=(code,status=409)=>Object.assign(Error(code),{code,status});
const raw=db=>db.sqlite.positionRawPrepare??db.sqlite.prepare.bind(db.sqlite);
const moves=d=>d.admissionR14??{revision:0,visitedChannels:[d.channel]};
const stateFields=['id','channel','area','x','y','hp'];
function argsValid(a,now){
 if(!a||!validId(a.runId)||!validId(a.playerId)||!validId(a.accountId)||typeof a.requestId!=='string'||!/^[A-Za-z0-9:_-]{1,96}$/.test(a.requestId)||![1,2,3].includes(a.expectedChannel)||![1,2,3].includes(a.targetChannel)||a.expectedChannel===a.targetChannel||!Number.isSafeInteger(a.assignmentRevision)||a.assignmentRevision<0||a.assignmentRevision>1||!Number.isSafeInteger(a.deadlineAtMs)||a.deadlineAtMs<=now()||a.deadlineAtMs>now()+7000)throw fail('admission_invalid_request');
}
function owned(db,registry,a,now,{allowReceipt=false}={}){
 if(!registry.active(a.runId)||registry.playerRun(a.playerId)!==a.runId||registry.accountRun(a.accountId)!==a.runId)throw fail('admission_inactive_owned_bot',403);
 const read=raw(db),p=read('SELECT * FROM main.players WHERE id=?').get(a.playerId),m=read("SELECT * FROM main.loadlab_entities_v1 WHERE id=? AND run_id=? AND kind='player'").get(a.playerId,a.runId);
 if(!p||!m||p.loadlab_run_id!==a.runId||p.account_id!==a.accountId||m.account_id!==a.accountId)throw fail('admission_ownership_mismatch',403);
 let d;try{d=JSON.parse(m.descriptor_json);}catch{throw fail('admission_descriptor_invalid');}
 if(d.id!==p.id||d.accountId!==p.account_id||d.channel!==p.channel||d.area!==p.area||d.admissionScenarioR14!=='distributed-pve'||d.kind!=='pve'||d.team!==0||p.loadlab_team!==0||p.area!=='forest'||p.last_seen!==0||p.hp<=0||p.arena_match_id||p.movement_checked_at_ms!==0||p.combat_lock_until_ms!==0||['attack_one_at','attack_two_at','attack_three_at','attack_four_at'].some(k=>p[k]!==0))throw fail('admission_not_pending_pve');
 if(read('SELECT 1 FROM main.pve_engagements WHERE player_id=?').get(p.id)||read('SELECT 1 FROM main.arena_queue WHERE player_id=?').get(p.id))throw fail('admission_player_busy');
 const session=read(`SELECT s.token_hash FROM main.loadlab_sessions_v1 s JOIN main.auth_sessions a ON a.token_hash=s.token_hash AND a.account_id=s.account_id JOIN main.accounts ac ON ac.id=a.account_id JOIN main.game_presence gp ON gp.account_id=s.account_id AND gp.token_hash=s.token_hash
 WHERE s.run_id=? AND s.player_id=? AND s.account_id=? AND s.expires_ms>? AND a.expires_at>? AND a.security_version=ac.security_version AND ac.permanently_banned=0 AND ac.suspended_until_ms<=? AND gp.instance_id=? AND gp.expires_at_ms>?`).get(a.runId,p.id,a.accountId,now(),Math.floor(now()/1000),now(),d.instance,now());
 if(!session)throw fail('admission_session_expired',403);
 const h=moves(d);
 if(!Number.isSafeInteger(h.revision)||h.revision<0||h.revision>2||!Array.isArray(h.visitedChannels)||h.visitedChannels.length!==h.revision+1||new Set(h.visitedChannels).size!==h.visitedChannels.length||h.visitedChannels.some(n=>![1,2,3].includes(n))||h.visitedChannels.at(-1)!==p.channel)throw fail('admission_history_invalid');
 if(allowReceipt&&h.requestId===a.requestId){
  if(h.result?.fromChannel!==a.expectedChannel||h.result?.channel!==a.targetChannel||h.revision!==a.assignmentRevision+1)throw fail('admission_request_reused');
  if(stateFields.some(k=>h.result[k]!==p[k])||h.result.hpRevision!==p.hp_revision||h.result.positionRevision!==p.position_revision||h.result.realtimeScopeVersion!==p.realtime_scope_version)throw fail('admission_receipt_state_changed');
  return {p,d,m,h,receipt:h.result};
 }
 if(h.requestId===a.requestId||h.revision!==a.assignmentRevision||p.channel!==a.expectedChannel||h.revision>=2||h.visitedChannels.includes(a.targetChannel))throw fail('admission_assignment_conflict');
 return {p,d,m,h};
}
function capacity(db,channel,now){
 const read=raw(db);
 if(read('SELECT channel_capacity FROM main.game_settings WHERE id=1').get()?.channel_capacity!==25)throw fail('admission_capacity_policy_changed');
 if(read('SELECT COUNT(*) AS n FROM main.players WHERE channel=? AND last_seen>=?').get(channel,Math.floor(now()/1000)-30).n>=25)throw fail('admission_target_full');
}
function targets(db,registry,a){
 const read=raw(db),all=read(`SELECT m.*,e.descriptor_json FROM main.monsters m JOIN main.loadlab_entities_v1 e ON e.id=m.id AND e.kind='monster' AND e.run_id=m.loadlab_run_id WHERE m.loadlab_run_id=? AND m.channel=? AND m.area='forest' AND m.is_boss=0 AND m.is_stone=0 ORDER BY m.id`).all(a.runId,a.targetChannel);
 const valid=all.filter(m=>{try{const d=JSON.parse(m.descriptor_json);return d.id===m.id&&d.channel===m.channel&&d.area==='forest'&&!d.boss&&registry.monsterRun(m.id)===a.runId&&registry.monsterSource(m.id)===d.sourceId;}catch{return false;}});
 // Reuse a destination bot's authorized three targets and its valid provisioned
 // spawn point. No monster, lease, participation, reward or dirty overlay moves.
 for(const row of read("SELECT descriptor_json FROM main.loadlab_entities_v1 WHERE run_id=? AND kind='player' ORDER BY id").all(a.runId)){
  const d=JSON.parse(row.descriptor_json);
  if(d.id!==a.playerId&&d.channel===a.targetChannel&&d.area==='forest'&&d.kind==='pve'&&d.admissionScenarioR14==='distributed-pve'&&Array.isArray(d.targetIds)&&d.targetIds.length===3&&new Set(d.targetIds).size===3&&d.targetIds.every(id=>valid.some(m=>m.id===id))&&Number.isFinite(d.x)&&Number.isFinite(d.y)&&d.x>=0&&d.y>=0&&d.x<=6000&&d.y<=6000)return {x:d.x,y:d.y,targetIds:[...d.targetIds],targetDescriptors:d.targetIds.map(id=>valid.find(m=>m.id===id).descriptor_json),targetSharing:{enabled:true,uniqueDestinationTargets:valid.length,sharedWithExistingBots:true}};
 }
 throw fail('admission_target_supply_unavailable');
}
function singleFlight(map,a,task){
 const signature=JSON.stringify(a),old=map.get(a.playerId);
 if(old){if(old.signature!==signature)throw fail('admission_player_busy');return old.work;}
 const work=Promise.resolve().then(task).finally(()=>map.delete(a.playerId));map.set(a.playerId,{signature,work});return work;
}
export function createPendingAdmissionR14({database,supervisor,registry,now=Date.now}){
 const running=new Map();
 // Evaluated inside the existing synchronous acceptTransfer transaction, after
 // all awaited drain work; revocation/deadline cannot race this final guard.
 database.sqlite.function('col_loadlab_reassign_active_r14',(runId,deadline)=>Number(registry.active(runId)&&now()<deadline));
 database.sqlite.function('col_loadlab_reassign_now_r14',()=>now());
 return a=>{
  argsValid(a,now);
  return singleFlight(running,a,async()=>{
   const {p,receipt}=owned(database,registry,a,now,{allowReceipt:true});
   if(receipt)return database.atomic(()=>{
    if(now()>=a.deadlineAtMs)throw fail('admission_deadline_expired');
    const current=owned(database,registry,a,now,{allowReceipt:true});
    if(!current.receipt)throw fail('admission_outcome_unverified',503);
    return structuredClone(current.receipt);
   });
   capacity(database,a.targetChannel,now);
   const source=supervisor.children.get(p.channel),destination=supervisor.children.get(a.targetChannel);
   if(!source?.ready||!destination?.ready)throw fail('admission_channel_unavailable',503);
   const selection=targets(database,registry,a);
   const result=await source.rpc.request('loadlabPendingAdmissionR14',{...a,selection},{timeoutMs:8000});
   const after=owned(database,registry,a,now,{allowReceipt:true});
   if(!after.receipt||JSON.stringify(result)!==JSON.stringify(after.receipt))throw fail('admission_outcome_unverified',503);
   return result;
  });
 };
}
export function installPendingAdmissionChildR14({rpc,db,registry,now=Date.now}){
 const running=new Map();
 rpc.handlers.loadlabPendingAdmissionR14=a=>{
  argsValid(a,now);
  return singleFlight(running,a,async()=>{
   owned(db,registry,a,now);
   if(db.channel!==a.expectedChannel)throw fail('admission_source_channel_mismatch');
   capacity(db,a.targetChannel,now);
   const selected=targets(db,registry,a);
   if(JSON.stringify(selected)!==JSON.stringify(a.selection))throw fail('admission_target_selection_changed');
   return db.runPlayer(a.playerId,async()=>{
    const {p,d,m,h}=owned(db,registry,a,now);
    const revision=h.revision+1,visitedChannels=[...h.visitedChannels,a.targetChannel];
    const result={ok:true,requestId:a.requestId,assignmentRevision:revision,fromChannel:p.channel,channel:a.targetChannel,area:p.area,id:p.id,x:selected.x,y:selected.y,hp:p.hp,hpRevision:p.hp_revision,positionRevision:p.position_revision+1,realtimeScopeVersion:p.realtime_scope_version+1,targetIds:selected.targetIds,targetSharing:selected.targetSharing,visitedChannels};
    const updated=JSON.stringify({...d,channel:a.targetChannel,x:selected.x,y:selected.y,targetIds:selected.targetIds,admissionR14:{revision,requestId:a.requestId,visitedChannels,result}});
    const guard=db.prepare(`UPDATE players SET channel=?,x=?,y=?,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0,movement_debt_ms=0
 WHERE id=? AND account_id=? AND loadlab_run_id=? AND channel=? AND area='forest' AND loadlab_team=0 AND last_seen=0 AND hp=? AND hp>0 AND hp_revision=? AND position_revision=? AND realtime_scope_version=? AND movement_checked_at_ms=0 AND combat_lock_until_ms=0 AND arena_match_id='' AND attack_one_at=0 AND attack_two_at=0 AND attack_three_at=0 AND attack_four_at=0
 AND NOT EXISTS(SELECT 1 FROM pve_engagements WHERE player_id=players.id) AND NOT EXISTS(SELECT 1 FROM arena_queue WHERE player_id=players.id)
 AND EXISTS(SELECT 1 FROM loadlab_entities_v1 e WHERE e.kind='player' AND e.id=players.id AND e.run_id=? AND e.account_id=? AND e.descriptor_json=?)
 AND EXISTS(SELECT 1 FROM loadlab_sessions_v1 s JOIN auth_sessions a ON a.token_hash=s.token_hash AND a.account_id=s.account_id JOIN accounts ac ON ac.id=a.account_id JOIN game_presence gp ON gp.account_id=s.account_id AND gp.token_hash=s.token_hash WHERE s.player_id=players.id AND s.run_id=? AND s.account_id=players.account_id AND s.expires_ms>col_loadlab_reassign_now_r14() AND a.expires_at>CAST(col_loadlab_reassign_now_r14()/1000 AS INTEGER) AND a.security_version=ac.security_version AND ac.permanently_banned=0 AND ac.suspended_until_ms<=col_loadlab_reassign_now_r14() AND gp.instance_id=? AND gp.expires_at_ms>col_loadlab_reassign_now_r14())
 AND col_loadlab_reassign_active_r14(?,?)=1 AND (SELECT channel_capacity FROM game_settings WHERE id=1)=25
 AND (SELECT COUNT(*) FROM players other WHERE other.channel=? AND other.last_seen>=CAST(col_loadlab_reassign_now_r14()/1000 AS INTEGER)-30)<25
 AND (SELECT COUNT(*) FROM monsters t JOIN loadlab_entities_v1 e ON e.id=t.id AND e.kind='monster' AND e.run_id=t.loadlab_run_id WHERE ((t.id=? AND e.descriptor_json=?) OR (t.id=? AND e.descriptor_json=?) OR (t.id=? AND e.descriptor_json=?)) AND t.loadlab_run_id=? AND t.channel=? AND t.area='forest' AND t.is_boss=0 AND t.is_stone=0)=3
 RETURNING id,channel,area,x,y,hp,hp_revision,position_revision,realtime_scope_version`).bind(a.targetChannel,selected.x,selected.y,p.id,a.accountId,a.runId,p.channel,p.hp,p.hp_revision,p.position_revision,p.realtime_scope_version,a.runId,a.accountId,m.descriptor_json,a.runId,d.instance,a.runId,a.deadlineAtMs,a.targetChannel,...selected.targetIds.flatMap((id,i)=>[id,selected.targetDescriptors[i]]),a.runId,a.targetChannel);
    const update=db.prepare("UPDATE loadlab_entities_v1 SET descriptor_json=? WHERE kind='player' AND id=? AND run_id=? AND account_id=? AND descriptor_json=?").bind(updated,p.id,a.runId,a.accountId,m.descriptor_json);
    const committed=await db.transferPlayer(p.id,a.targetChannel,guard,[update]);
    // Normal transfer cancels only a proven transition rejection. Unknown IPC
    // outcomes keep its native fence and must stop; never replay from here.
    if(!committed)throw fail('admission_transition_rejected');
    if(stateFields.some(k=>committed[k]!==result[k])||committed.hp_revision!==result.hpRevision||committed.position_revision!==result.positionRevision||committed.realtime_scope_version!==result.realtimeScopeVersion)throw fail('admission_outcome_unverified',503);
    return result;
   });
  });
 };
}
