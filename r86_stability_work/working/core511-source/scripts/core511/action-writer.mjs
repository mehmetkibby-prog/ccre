import {castleEnabled,CASTLE_AREA} from './castle-model-r59.mjs';
import {rewardSliceR56} from './r56-options.mjs';
import {completedClaimTargetsR56} from './completed-claims-r56.mjs';
import {prepareRewardCodeR54} from './reward-code-r54.mjs';
import {claimOutputDatabaseR53,boundedClaimResultR53} from './claim-output-r53.mjs';
import {nativeRewardWorksetR52} from './r52-options.mjs';
import {rewardWorksetDatabaseR52} from './reward-workset-r52.mjs';
import {mountRewardResult} from './mounts-rewards.mjs';
import {actorFrameConflict} from './actor-frame-rejection.mjs';
import {r37Options} from './r37-options.mjs';
import {normalizeClaimTargets,runClaimChunks} from './claim-chunks.mjs';
import {BELT_ACTIONS_R31} from './belt-model.mjs';
import {exchangeEssence} from './essence-exchange.mjs';
import {ADVENTURE_ACTIONS,isAdventureArea} from './adventure-maps.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {createAttackWriterRules} from './generated/attack-writer-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {readAttackFrame,sameAttackFrame,attackRandom} from './attack-writer.mjs';
import {OperationRandom} from './operation-random.mjs';
import {demand} from './contract.mjs';
import {stablePresenceFrame} from './presence.mjs';
import {gameplayRateResponse} from './gameplay-rate.mjs';
import {logActionConflictR65} from './action-conflict-log-r65.mjs';
import {respawnActorNotificationR85} from './respawn-notification-r85.mjs';

import {NATIVE_ACTIONS} from './generated/action-names.mjs';
export {NATIVE_ACTIONS};
// The crypto proof stream is separate from loot/damage and UUID draws. Only a
// trusted server-generated seed is accepted by the owned writer interface.
export function actionRandom(seed){const rng=attackRandom(seed),proof=new OperationRandom(seed);return {...rng,getRandomValues:array=>{demand(array instanceof Uint32Array&&array.length===1,'action_proof_array');array[0]=proof.integer(2**32);return array;}};}
export function createActionWriterHandler({settingsFor,globalsFor,assertOwnership,assertResources,affectedActors,settleRetaliation,enforceRateLimit,joinClaimActorsR56,randomFor=p=>actionRandom(p.seed),clock=Date.now}){
 for(const fn of [settingsFor,globalsFor,assertOwnership,assertResources,affectedActors,settleRetaliation,enforceRateLimit])demand(typeof fn==='function','action_writer_dependencies');
 return (sql,payload,context)=>{
  // Ownership/write lanes are checked first. For a joined potion the exact
  // journal CAS must precede settlement validation: SQL may still contain an
  // old due hit already settled in memory. The strict join helper validates
  // the new encounter before it returns; rejection never runs native potion.
  const joinedPotion=Boolean(payload.claimActorsR56&&payload.input?.action==='use_potion');
  demand(sql.isTransaction,'action_requires_atomic');demand(assertOwnership(sql,context.peer,context.actor,context.epoch)===true,'action_owner_fenced');demand(assertResources(sql,payload,context,{settlement:!joinedPotion})===true,'action_resources_fenced');
  const joinedR56=payload.claimActorsR56?joinClaimActorsR56?.(sql,payload,context):null;
  demand(!payload.claimActorsR56||joinedR56,'claim_join_unbound');
  if(joinedR56?.rejected){const r=joinedR56.rejected;return {result:{status:409,body:{code:r.code,not_executed:true,error:'Oyuncu durumu yenilendi. İşlem uygulanmadı; tekrar deneyebilirsin.'}},r56ClaimRejected:r.actor,players:[r.player],encounters:[[r.actor,r.engagement]],events:[]};}
  const {input,nowMs,receivedAtMs,seed,expected}=payload;demand(NATIVE_ACTIONS.includes(input?.action),'action_kind');demand(Number.isSafeInteger(nowMs)&&nowMs>=0&&nowMs<=clock()+5000&&Number.isSafeInteger(receivedAtMs)&&receivedAtMs>=0&&receivedAtMs<=nowMs,'action_invalid_time');
  const globals=globalsFor(sql,context.actor),settings=settingsFor(sql,context.actor),player=readAttackFrame(sql,context.actor,'',globals).player;
  if(!(player&&sameAttackFrame(stablePresenceFrame(player),stablePresenceFrame(expected?.player))&&sameAttackFrame(settings,expected?.settings))){logActionConflictR65(sql,context,input,player,settings,expected);throw actorFrameConflict('action_frame_conflict',context,sql);}
  const events=[],record=(...args)=>{events.push(args);},sync=value=>{demand(!value?.then,'async_action_writer');return value;},rng=randomFor(payload);
  // Ownership independently validated this native prefix against the original
  // input. Keep that input intact for its receipt digest; only the executed
  // native action and affected-actor reads use the validated ten targets.
  const nativeLimit=payload.localScope?.kind==='claim'&&payload.localScope.nativeLimit===true,effectiveInput=nativeLimit?{...input,rewardTargets:payload.localScope.targets}:input;
  const chunked=r37Options.claimChunks&&payload.localScope?.kind==='claim'&&!nativeLimit&&input.action==='claim_rewards',targets=chunked?normalizeClaimTargets(input.rewardTargets):null;let claimRate=false;
  const rules=createAttackWriterRules({...rng,globals,now:()=>nowMs,fourChannels:true,response:{json:(body,{status=200}={})=>({body,status})},ports:{
   ...(rewardSliceR56?{prepareMonsterXpR54:args=>prepareRewardCodeR54(sql,args)}:{}),
   publishRealtimeRoomEvent:record,publishRealtimeRoomEventToChannels:record,publishRealtimePlayerEvent:record,publishRealtimeWorldEvent:record,deliverRealtime:sync,
   settlePveEngagement:(_,id,s,time)=>sync(settleRetaliation(sql,id,s,time,{...context,globals,random:rng.random,publish:record})),
   enforceRateLimit:(...args)=>{if(chunked&&args[0]==='claim-rewards'&&claimRate)return;const value=sync(enforceRateLimit(sql,...args));if(chunked&&args[0]==='claim-rewards')claimRate=true;return value;},
   runRewardDelivery:(_,key,fn)=>{demand(sql.isTransaction,'action_reward_lane');return mountRewardResult(globals,key,sync(fn()));}
  }});
  const lootRun=input.action.startsWith('adventure_loot_')?globals.__colAdventure.current(context.actor):null;
  let result;try{if(castleEnabled()&&['castle_enter_r59','castle_leave_r59'].includes(input.action)){try{result={body:globals.__colCastle.command(context.actor,input),status:200};}catch(e){if(!e.gameCode?.startsWith('castle_'))throw e;result={body:{error:e.message,code:e.gameCode},status:e.status??409};}}else if(BELT_ACTIONS_R31.includes(input.action)){try{result={body:globals.__colBelt.command(context.actor,input),status:200};}catch(e){if(!e.beltRule)throw e;result={body:{error:e.message,code:e.gameCode},status:e.status??409};}}else if(input.action==='bulk_exchange_essence'){result=exchangeEssence(sql,context.actor,input,settings,nowMs,(...args)=>sync(enforceRateLimit(sql,...args)));}else if(isAdventureArea(player.area)&&!(castleEnabled()&&player.area===CASTLE_AREA&&input.action==='respawn')&&(input.action.startsWith('travel_')||['select_channel','arena_join_queue','respawn'].includes(input.action))){result={body:{error:"Seferden çıkış düğmesini kullan."},status:409};}else if(ADVENTURE_ACTIONS.includes(input.action)){sql.exec('SAVEPOINT adventure_command');try{result={body:globals.__colAdventure.command(context.actor,input,{epoch:context.epoch,connectionId:payload.lootConnection,publish:record}),status:200};sql.exec('RELEASE adventure_command');}catch(e){sql.exec('ROLLBACK TO adventure_command;RELEASE adventure_command');if(!e.adventureRule)throw e;result={body:{error:e.message},status:409};}}else {const run=payload=>sync(rules.nativeAction(input.action==='claim_rewards'?claimOutputDatabaseR53(nativeRewardWorksetR52?rewardWorksetDatabaseR52(nativeAtomicStatements(sql)):nativeAtomicStatements(sql)):(nativeRewardWorksetR52?rewardWorksetDatabaseR52(nativeAtomicStatements(sql)):nativeAtomicStatements(sql)),{player,playerId:context.actor,payload,settings,requestReceivedAtMs:receivedAtMs,now:Math.floor(nowMs/1000),auth:{account:{id:prepareCached477(sql,'SELECT account_id FROM players WHERE id=?').get(context.actor).account_id}}}));result=chunked?runClaimChunks(targets,rewardTargets=>run({...input,rewardTargets})):run(effectiveInput);}}
  catch(error){result=gameplayRateResponse(error);if(!result)throw error;}
  if(input.action==='claim_rewards')result=boundedClaimResultR53(result);
  globals.__colAdventure?.loot?.refundPlayer(context.actor);
  const ids=[...new Set([context.actor,...affectedActors(sql,effectiveInput,context.actor)])].sort();
  const completedClaimsR56=input.action==='claim_rewards'?completedClaimTargetsR56(sql,payload.localScope?.targets??[]):[];
  const players=ids.map(id=>prepareCached477(sql,'SELECT * FROM players WHERE id=?').get(id)).filter(Boolean);
  const deliveryEvents=input.action==='respawn'?respawnActorNotificationR85(events,{actor:context.actor,before:player,after:players.find(row=>row.id===context.actor),result}):events;
  return {result,events:deliveryEvents,...(completedClaimsR56.length?{completedClaimsR56}:{}),...(joinedR56?{claimActorsR56:joinedR56.saved}:{}),...(lootRun?{mistLoot:globals.__colAdventure.loot.snapshot(lootRun.id)}:{}),players,encounters:ids.map(id=>[id,prepareCached477(sql,'SELECT * FROM pve_engagements WHERE player_id=?').get(id)??null]),fishing:prepareCached477(sql,'SELECT * FROM fishing_sessions WHERE player_id=?').get(context.actor)??null,drop:input.action==='collect'?prepareCached477(sql,'SELECT * FROM world_drops WHERE id=? AND owner_id=?').get(input.targetId,context.actor)??null:undefined};
 };
}
