import {setupPvp,update,json,response} from './pvp-fixture.mjs';
import {seedGuildWar,captureGuildDatabase} from './guild-war-fixture.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {captureReturnOwners,reconcileReturnOwners,finalizeReturnSequence,ensureGuildWarReturns} from '../guild-war.mjs';
import {createPvpWriterHandler,readPvpFrame} from '../pvp-writer.mjs';
import {createAttackRules} from '../generated/attack-rules.mjs';
import {attackRandom} from '../attack-writer.mjs';
export {captureGuildDatabase,json};
export function bindGuildCombat(authority,{settings,globals={},clock}){
 const handler=createPvpWriterHandler({settingsFor:()=>settings,globalsFor:()=>globals,assertOwnership:(sql,peer,id,epoch)=>Boolean(authority.assertAdmitted(sql,peer,id,epoch)),assertResources:(_sql,p)=>p.fence==='isolated-guild-combat',clock,returns:{capture:sql=>captureReturnOwners(sql),reconcile:(sql,before,now)=>reconcileReturnOwners(sql,before,now,{authority})}});
 registerOwnedRule(authority,'pvp_attack',handler);return (peer,request,after=()=>{})=>authority.command(peer,request,{after:(sql,result)=>{finalizeReturnSequence(sql,result.result.moves,request,peer);after(sql,result);}});
}
export async function setupGuildCombat(t,{home=4,role='avci'}={}){
 const f=await setupPvp(t);f.reset({area:'war',role});const authority=new ChannelOwnership(f.f.database,{realmId:'guild-combat-test'});await authority.initialize();const peers=[1,2,3,4].map(channel=>({channel,incarnation:'guild-combat-'+channel}));for(const peer of peers)await authority.registerProcess(peer.channel,peer.incarnation);
 ensureGuildWarReturns(f.sql);f.sql.function('unixepoch',{varargs:true},()=>Math.floor(f.nowMs/1000));f.sql.function('strftime',{varargs:true},format=>{if(format!=='%s')throw Error('unexpected clock format');return String(Math.floor(f.nowMs/1000));});
 const match=seedGuildWar(f,{a:0,b:0,home,delta:599000});update(f.sql,'arena_matches',match,{kill_target:1});
 for(const id of [f.id,f.targetId]){update(f.sql,'players',id,{hp:id===f.id?4321:1,respawn_at_ms:0,stun_until_ms:0,root_until_ms:0});await authority.admit(id,peers[0],{sessionId:'guild-combat-'+id,guard:()=>true});}
 f.sql.prepare('UPDATE kernel511_channel_owners SET sequence=7 WHERE player_id=?').run(f.id);
 const frame={...readPvpFrame(f.sql,f.id,f.targetId,f.globals,f.nowMs),settings:f.settings},input={action:'pvp_attack',targetPlayerId:f.targetId,ability:0,intentId:'guild-final-hit'},request={playerId:f.id,epoch:1,sequence:8,operationId:'guild-final-once',operation:'pvp_attack',payload:{nowMs:f.nowMs,receivedAtMs:f.nowMs,seed:f.seed,input,expected:frame,fence:'isolated-guild-combat'}};
 const events=[];let original;original=createAttackRules({globals:f.globals,...attackRandom(f.seed),now:()=>f.nowMs,response,ports:{releasePvpCommit:()=>{},pvpContinuity:c=>original.nativeContinuity(f.db,frame,c),readActionSnapshot:(_db,p,actor)=>({...readPvpFrame(f.sql,actor,p.targetPlayerId,f.globals,f.nowMs),settings:f.settings}),publishRealtimeRoomEvent:(...a)=>events.push(a),publishRealtimePlayerEvent:(...a)=>events.push(a),deliverRealtime:value=>value,selectMixedMonsters473:()=>[]}});
 const command=bindGuildCombat(authority,{settings:f.settings,globals:f.globals,clock:()=>f.nowMs});return {...f,authority,peers,request,command,events,oracle:()=>original.nativePvp(f.db,{actionSnapshot:frame,playerId:f.id,payload:input,requestReceivedAtMs:f.nowMs})};
}
