import {castleEnabled,CASTLE_AREA} from './castle-model-r59.mjs';
import {mountRewardResult} from './mounts-rewards.mjs';
import {actorFrameConflict} from './actor-frame-rejection.mjs';
import {isMistArea} from './adventure-maps.mjs';
import {createAttackWriterRules} from './generated/attack-writer-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {attackRandom,canonicalAttack,assertMixedResources} from './attack-writer.mjs';
import {writerSettlement} from './combat-settlement.mjs';
import {demand} from './contract.mjs';
import {stablePresenceFrame} from './presence.mjs';
const stable=frame=>frame&&({...frame,player:stablePresenceFrame(frame.player),preloadedPvpTarget:stablePresenceFrame(frame.preloadedPvpTarget)});

const frames=new WeakMap();
export function readPvpFrame(sqlite,actor,target,globals,nowMs){
 let rules=frames.get(globals);if(!rules){rules=createAttackWriterRules({globals});frames.set(globals,rules);}
 const frame=rules.hydratePvp(nativeAtomicStatements(sqlite),actor,target,Math.floor(nowMs/1000));
 if(frame.player)frame.player.pet_kind=sqlite.prepare("SELECT kind FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped=1 LIMIT 1").get(actor)?.kind??null;
 return frame;
}

// The complete original PvP branch, including UNIQUE death/reward claims,
// reciprocal-kill cooldown and arena round/final settlement triggers, executes
// synchronously in the same sole-writer transaction as its ordered receipt.
export function createPvpWriterHandler({settingsFor,globalsFor,assertOwnership,assertResources,mixedPorts,joinCastleR59=null,returns=null,randomFor=p=>attackRandom(p.seed),clock=Date.now}){
 for(const fn of [settingsFor,globalsFor,assertOwnership,assertResources])demand(typeof fn==='function','pvp_writer_dependencies');
 return (sqlite,payload,context)=>{
  demand(sqlite.isTransaction,'pvp_requires_atomic');demand(assertOwnership(sqlite,context.peer,context.actor,context.epoch)===true,'pvp_owner_fenced');demand(assertResources(sqlite,payload,context)===true,'pvp_resources_fenced');
  const {nowMs,receivedAtMs,input,seed,expected}=payload;
  demand(Number.isSafeInteger(nowMs)&&nowMs>=0&&nowMs<=clock()+5000&&Number.isSafeInteger(receivedAtMs)&&receivedAtMs>=0&&receivedAtMs<=nowMs,'pvp_invalid_time');
  demand(input?.action==='pvp_attack'&&typeof input.targetPlayerId==='string','pvp_invalid_action');
  const joined=joinCastleR59?.(sqlite,payload,context);demand(!payload.castleActorsR59||joined,'castle_join_unbound');
  if(joined?.rejected){const r=joined.rejected;return {result:{status:409,body:{code:r.code,not_executed:true,error:'Hedef durumu yenilendi. Saldırıyı yeniden deneyebilirsin.'}},castleRejectedR59:r.actor,players:[r.player],encounters:[[r.actor,r.engagement]],events:[],monsters:[],participants:[],bossParticipants:[]};}
  const globals=globalsFor(sqlite,context.actor),settings=settingsFor(sqlite,context.actor),fresh={...readPvpFrame(sqlite,context.actor,input.targetPlayerId,globals,nowMs),settings};
  if(!(canonicalAttack(stable(fresh))===canonicalAttack(stable(expected))))throw actorFrameConflict('pvp_frame_conflict',context,sqlite);
  const returning=fresh.player?.arena_match_id?returns?.capture(sqlite,payload,context,fresh):null;
  const db=nativeAtomicStatements(sqlite),events=[],record=(...args)=>{events.push(args);},sync=v=>{demand(!v?.then,'async_pvp_writer');return v;};
  const affected=new Set([context.actor,input.targetPlayerId,...(joined?payload.castleActorsR59.map(a=>a.actor):[])]);
  // A final arena score can reset/reward the whole match, not only the victim.
  if(fresh.player?.arena_match_id)for(const row of sqlite.prepare('SELECT player_id FROM arena_match_players WHERE match_id=?').all(fresh.player.arena_match_id))affected.add(row.player_id);
  const castleTargets=castleEnabled()&&fresh.player?.area===CASTLE_AREA?new Set(payload.resources):null;
  if(castleTargets)demand(castleTargets.size<=30&&castleTargets.has('player:'+context.actor)&&castleTargets.has('player:'+input.targetPlayerId),'castle_pvp_resource_scope');
  const rng=randomFor(payload);let rules;rules=createAttackWriterRules({...rng,globals,now:()=>nowMs,fourChannels:true,response:{json:(body,{status=200,headers}={})=>({body,status,headers,json:()=>body})},ports:{
   castlePvpTargetR59:id=>castleTargets?.has('player:'+id)===true,
   beforeMixed:c=>assertMixedResources(payload,c),settlePveEngagement:(_,id,s,time)=>writerSettlement(sqlite,id,s,time,{...context,globals,random:rng.random,publish:record}),
   publishRealtimeRoomEventToChannels:record,publishRealtimeWorldEvent:record,startBackgroundTask:fn=>sync(fn()),scheduleRequestTask:()=>false,runRewardDelivery:(_,key,fn)=>mountRewardResult(globals,key,sync(fn())),publishCommunityProgress:()=>{},
   ...mixedPorts?.(sqlite,context),publishRealtimeRoomEvent:record,publishRealtimeRoomEventToChannels:record,publishRealtimePlayerEvent:record,deliverRealtime:sync,
   releasePvpCommit:()=>{},pvpContinuity:c=>rules.nativeContinuity(db,payload.originalSnapshot??fresh,c),readActionSnapshot:(_,p,id)=>({...readPvpFrame(sqlite,id,p.targetPlayerId,globals,nowMs),settings})
  }});
  if(isMistArea(fresh.player?.area))globals.__colAdventure.loot.cancel(context.actor);
  const mistSnapshot=isMistArea(fresh.player?.area)?globals.__colAdventure.loot.capture(context.actor):null;
  const result=sync(rules.nativePvp(db,{actionSnapshot:fresh,playerId:context.actor,payload:input,requestReceivedAtMs:receivedAtMs}));
  if(mistSnapshot)globals.__colAdventure.loot.settleDeaths(mistSnapshot,result.body,events);
  delete result.json;
  const moves=returning?returns.reconcile(sqlite,returning,nowMs):[];
  for(const hit of result.body.hits??[])affected.add(hit.targetId);
  for(const row of result.body.progression??[])affected.add(row.id);
  const monsters=(result.body.monsterHits??[]).map(hit=>sqlite.prepare('SELECT * FROM monsters WHERE id=?').get(hit.id));
  const players=[...affected].sort().map(id=>sqlite.prepare('SELECT * FROM players WHERE id=?').get(id)).filter(Boolean);
  return {result,events,...(joined?{castleActorsR59:joined.saved}:{}),...(mistSnapshot?{mistLoot:globals.__colAdventure.loot.snapshot(mistSnapshot.run.id)}:{}),players,monsters,...(returns?{moves}:{}),participants:monsters.flatMap(m=>sqlite.prepare('SELECT monster_id,spawn_round,player_id,created_at,stone_damage476,stone_first_hit_at_ms476 FROM monster_participants WHERE monster_id=? AND spawn_round=?').all(m.id,m.spawn_round)),bossParticipants:monsters.filter(m=>m.is_boss).flatMap(m=>sqlite.prepare('SELECT boss_round,player_id,hit_count,total_damage,created_at FROM boss_participants WHERE boss_round=?').all(m.spawn_round)),encounters:players.map(p=>[p.id,sqlite.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(p.id)??null]),arena:fresh.player?.arena_match_id?sqlite.prepare('SELECT * FROM arena_matches WHERE id=?').get(fresh.player.arena_match_id)??null:null,arenaPlayers:fresh.player?.arena_match_id?sqlite.prepare('SELECT * FROM arena_match_players WHERE match_id=?').all(fresh.player.arena_match_id):[],claims:fresh.player?.arena_match_id?sqlite.prepare('SELECT victim_id,victim_hp_revision FROM arena_kill_claims WHERE match_id=?').all(fresh.player.arena_match_id):[]};
 };
}
