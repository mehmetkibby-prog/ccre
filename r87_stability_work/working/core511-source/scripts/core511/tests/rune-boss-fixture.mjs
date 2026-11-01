import {setupPvp,put,update,json} from './pvp-fixture.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {createRuneBossHandler} from '../rune-boss-writer.mjs';
import {createRuneBossRules} from '../generated/rune-boss-rules.mjs';
import {nativeAtomicStatements} from '../retaliation-writer.mjs';
export async function setupRuneWriter(t){
 const f=await setupPvp(t),{sql,id}=f,channel=1,bossId='rune-v2-boss-c1-1',peer={realm:'rune-writer511',channel,incarnation:'rune-writer-session511'};
 f.reset({area:'rune_v2',actor:{x:2240,y:700,hp:1,max_hp:1000,gems:103},victim:{x:2600,y:680}});update(sql,'monsters',bossId,{hp:26000,max_hp:26000,spawn_round:17,x:2240,y:680,stun_until_ms:0,root_until_ms:0,control_x:0,control_y:0,is_boss:0,is_stone:0,summoned:0,loadlab_run_id:''});
 const authority=new ChannelOwnership(f.f.database,{realmId:peer.realm,now:()=>f.nowMs});await authority.initialize();await authority.registerProcess(channel,peer.incarnation);const actor=await authority.admit(id,peer,{sessionId:'rune-writer-auth',guard:()=>true}),writer=new SystemWriter(f.f.database,{realmId:peer.realm,authority,clock:()=>f.nowMs});await writer.initialize();await writer.register(peer);const services=new NativeGameServices(sql,{clock:()=>f.nowMs});writer.add('rune_boss_step',createRuneBossHandler({services,authority,clock:()=>f.nowMs}));
 const state={id:bossId,spawn_round:17,session:peer.incarnation,seq:7,next_basic_at_ms:f.nowMs-1,next_wave_at_ms:f.nowMs+100000,phase:'idle',cast_id:'',starts_at_ms:0,impact_at_ms:0,expires_at_ms:0,x:2240,y:680,wave_damage:0,channel};sql.prepare('DELETE FROM rune_v2_boss_state484 WHERE id=?').run(bossId);put(sql,'rune_v2_boss_state484',state);
 const payload={mode:'step',session:peer.incarnation,nowMs:f.nowMs,seed:'9'.repeat(64),cycle:sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle,monster:{...sql.prepare('SELECT * FROM monsters WHERE id=?').get(bossId)},settings:f.settings,actors:[{id,epoch:actor.epoch,sequence:actor.sequence}],frames:json(createRuneBossRules().readPlayers(nativeAtomicStatements(sql),[id],channel)),state:{base:{...state},current:{...state}},cache:[[bossId,{...state}]]};
 const owner=writer.owner('channel:1'),request={epoch:owner.epoch,sequence:owner.sequence+1,key:'rune-writer-death511',kind:'rune_boss_step',payload};return {...f,authority,writer,services,peer,request,state,bossId};
}
