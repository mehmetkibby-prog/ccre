import {SELECTED_CHARACTER_SQL_R101} from './characters-r101.mjs';
import {createHash,randomBytes} from 'node:crypto';
import {colLabHttpAuth} from '../../../native510-bb3a6cc689c6/vds-server/src/loadlab/http-auth.mjs';
import {createEntryRules,createEntryWriterRules} from './generated/entry-rules.mjs';
import {createTransferRules} from './generated/transfer-rules.mjs';
import {createStarterReward} from '../../../native510-bb3a6cc689c6/vds-server/src/starter-reward.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {writerSettlement} from './combat-settlement.mjs';
import {demand,validChannel} from './contract.mjs';
import {deliverPendingBag} from './bag-pending.mjs';

const response={json:(body,{status=200,headers}={})=>({body,status,headers})};
export const nativeTokenHash=token=>createHash('sha256').update(token).digest('base64url');

// The actual original auth code remains asynchronous and uses the original
// session, account, Origin, CSRF, instance, realm, bot and lab-proof predicates.
export function createNativeEntryAuth({database,globals,clock=Date.now,presence=null}){
 const environment={DB:database,CORE_RUNTIME:'vds',CORE_SHA256:nativeTokenHash};
 const rules=createEntryRules({environment,globals,clock});
 return {rules,async session(request,{csrf=true,tokenHash=null}={}){
  let session=tokenHash?await rules.getGameSessionByHash(tokenHash,request,true):await rules.getGameSession(request);
  if(session&&presence)session=presence.augment(session);
  session=await rules.validateGameSession(request,session);if(csrf)await rules.assertCsrf(request,session);return session;
 },rate:(request,session)=>rules.enforceRateLimit('realtime-ticket',session.account.id,{limit:30,windowSeconds:60,blockSeconds:60},colLabHttpAuth.rateLimitContext(request,session)),error:rules.authErrorResponse};
}

// Admission, native join effects and starter ledger share a single outer
// LocalDatabase.atomic COMMIT/fsync. The callback never changes ownership itself.
export class EntryWriter {
 constructor({database,services,clock=Date.now}){demand(database&&services,'entry_writer_dependencies');Object.assign(this,{database,services,clock});this.starter=createStarterReward(database.sqlite,{now:clock,initialize:false});}
 assertSession(sql,session,{creating=false}={}){
  const row=sql.prepare(`SELECT s.account_id,s.expires_at,s.security_version,a.security_version AS current_version,a.permanently_banned,a.suspended_until_ms,p.id AS player_id FROM auth_sessions s JOIN accounts a ON a.id=s.account_id LEFT JOIN players p ON p.account_id=a.id${this.database.core101Characters?SELECTED_CHARACTER_SQL_R101:""} WHERE s.token_hash=?`).get(session.tokenHash);
  demand(row&&row.account_id===session.account.id&&(creating?!row.player_id&&!session.player:row.player_id===session.player?.id)&&row.expires_at>Math.floor(this.clock()/1000)&&row.security_version===session.securityVersion&&row.current_version===session.securityVersion,'entry_session_changed');
  demand(!row.permanently_banned&&row.suspended_until_ms<=this.clock(),'entry_account_blocked');return row;
 }
 create(sql,{session,channel,payload,nowMs=this.clock(),seed=randomBytes(32).toString('hex')}){
  demand(sql.isTransaction&&!session.player&&validChannel(channel),'creation_atomic_scope');this.assertSession(sql,session,{creating:true});
  return this.services.run({nowMs,seed},()=>{
   const database={...nativeAtomicStatements(sql)},rules=createEntryWriterRules({environment:{DB:database,CORE_RUNTIME:'vds'},globals:this.services.globals,clock:()=>nowMs,uuid:()=>this.services.active.uuid(),response});
   const result=rules.createCharacter({auth:session,database,now:Math.floor(nowMs/1000),requestReceivedAtMs:nowMs,joinSettings:rules.getGameSettings(),payload,requestedChannel:channel});
   demand(!result?.then&&Number.isInteger(result.status),'creation_native_result');if(result.status!==200)return {accepted:false,result};
   const player=sql.prepare('SELECT id,name,role,area,level FROM players WHERE account_id=?').get(session.account.id);demand(player?.id===result.body.playerId,'creation_native_identity');
   return {accepted:true,result,session:{...session,player:{id:player.id,name:player.name,role:player.role},playerAccess:{area:player.area,level:player.level}},starterReward:this.starter.grant(session.account.id,player.id)};
  });
 }
 prepare(sql,{session,channel,nowMs=this.clock(),seed=randomBytes(32).toString('hex')}){
  demand(sql.isTransaction&&session.player?.id&&validChannel(channel),'entry_atomic_scope');this.assertSession(sql,session);
  return this.services.run({nowMs,seed},()=>{
   const globals=this.services.globals,db={...nativeAtomicStatements(sql)},events=[],publish=(...args)=>events.push(args),rng=this.services.active;
   const rules=createEntryWriterRules({environment:{DB:db,CORE_RUNTIME:'vds',CORE_SHA256:nativeTokenHash},globals,clock:()=>nowMs,uuid:()=>rng.uuid(),response,ports:{
    // Selection is made by the authoritative four-channel admission map.
    selectEntry504:({requestedChannel})=>requestedChannel,
    settlePveEngagement:(_,id,settings,time)=>writerSettlement(sql,id,settings,time,{globals,random:()=>rng.random(),publish})
   }});
   const id=session.player.id;
   // Native entry-only exception is derived from durable ownership and
   // authenticated last_seen, never a caller's join/initial flag. The 40s
   // reconnect grace prevents reload/claim from escaping a live battle.
   const prior=sql.prepare('SELECT channel,last_seen,combat_lock_until_ms FROM players WHERE id=?').get(id),lastSeen=prior?.last_seen;
   const unowned=!sql.prepare('SELECT 1 FROM kernel511_admissions WHERE player_id=?').get(id)&&!sql.prepare('SELECT 1 FROM kernel511_simulations WHERE player_id=?').get(id);
   if(unowned)globals.__colAdventure?.settleAdmission(id);
   // A disconnected adventure member still belongs to its original run and
   // channel. Reentry must not move only the player while the run/monsters
   // remain on the old channel. Expired/dead/reset runs were settled above.
   const adventure=globals.__colAdventure?.current(id);
   if(adventure?.status==='active'&&adventure.channel!==channel)return {accepted:false,result:{status:409,body:{code:'entry_adventure_channel_locked',currentChannel:adventure.channel,channel,error:`Seferin Kanal ${adventure.channel} üzerinde sürüyor. O kanalı seçip seferden ayrıldıktan sonra kanal değiştirebilirsin.`}},events};
   const initialEntry=unowned&&Number.isSafeInteger(lastSeen)&&lastSeen*1000<=nowMs-40000;
   if(session.playerAccess?.area==='rune_v2')rules.colRepairRuneV2Access(db,id);
   if(session.playerAccess?.area==='rune')rules.colRepairRuneAccess(db,id);
   if(session.playerAccess?.area==='ancient')rules.repairAncientAccess(db,id);
   const result=rules.joinExisting({auth:session,database:db,now:Math.floor(nowMs/1000),requestReceivedAtMs:nowMs,joinSettings:rules.getGameSettings(),labAccount504:false,automatic504:false,initialEntry,payload:{action:'join'},requestedChannel:channel});
   demand(!result?.then&&Number.isInteger(result?.status),'entry_native_result');
   if(result.status!==200){
    if(unowned&&!initialEntry&&prior.channel!==channel&&prior.combat_lock_until_ms>nowMs&&result.status===409&&result.body?.error==='Savaş sürerken kanal değiştiremezsin.')result.body={...result.body,code:'entry_reconnect_combat',currentChannel:prior.channel,error:`Önceki bağlantının savaş koruması sürüyor. Kanal ${prior.channel} ile yeniden gir veya korumanın bitmesini bekle.`};
    return {accepted:false,result,events};
   }
   deliverPendingBag(sql,id);
   return {accepted:true,result,events,starterReward:this.starter.grant(session.account.id,id)};
  });
 }
 transferPreflight(sql,{session,channel,nowMs=this.clock(),seed=randomBytes(32).toString('hex')}){
  demand(sql.isTransaction&&validChannel(channel),'transfer_preflight_atomic');this.assertSession(sql,session);
  return this.services.run({nowMs,seed},()=>{
   const globals=this.services.globals,rng=this.services.active,events=[],publish=(...args)=>events.push(args);
   // A private facade prevents transferPlayer from leaking into later joins.
   const database={...nativeAtomicStatements(sql),transferPlayer:()=>({channel})};
   const entry=createEntryWriterRules({environment:{DB:database,CORE_RUNTIME:'vds'},globals,clock:()=>nowMs,response});
   const settings=entry.getGameSettings(),read=()=>sql.prepare('SELECT p.*,COALESCE(w.cycle,1) AS world_cycle,COALESCE(w.reset_at,0) AS reset_at FROM players p LEFT JOIN world_state w ON w.id=1 WHERE p.id=?').get(session.player.id);
   const rules=createTransferRules({globals,response});
   const result=rules.selectChannelSync({database,player:read(),playerId:session.player.id,settings,payload:{action:'select_channel',channel},now:Math.floor(nowMs/1000),requestReceivedAtMs:nowMs,settlePveEngagement:(_,id,s,time)=>writerSettlement(sql,id,s,time,{globals,random:()=>rng.random(),publish})});
   demand(!result?.then&&Number.isInteger(result?.status),'transfer_native_result');
   // R22: native settles pending monster hits AFTER reading the player, so a
   // hit landing in that settlement can renew the combat lock unseen. The
   // writer guard would then reject the handoff as a fatal state change (world
   // recovery). Re-check the settled row and answer with the native refusal.
   const settled=read();
   if(result.status===200&&settled.channel!==channel&&(settled.combat_lock_until_ms>nowMs||settled.hp<=0))return {accepted:false,result:response.json({error:settled.hp<=0?'Karakterin yeniden doğmayı bekliyor.':'Savaş sürerken kanal değiştiremezsin.'},{status:409}),events,player:settled,settings,now:Math.floor(nowMs/1000),requestReceivedAtMs:nowMs,targetChannel:channel};
   return {accepted:result.status===200,result,events,player:settled,settings,now:Math.floor(nowMs/1000),requestReceivedAtMs:nowMs,targetChannel:channel};
  });
 }
}
