import {setupPvp,put,update} from './pvp-fixture.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {createWorldUpkeepHandler,createWorldTransitionHandler} from '../world-jobs.mjs';
import {createRespawnRules} from '../generated/respawn-rules.mjs';
import {DurableWorldState} from '../world-state.mjs';
export const isolatedFrozen=(sql,payload)=>payload.fence==='isolated-no-channels'&&sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_processes WHERE online=1').get().n===0;
export function bindJobs(writer,services,clock){writer.add('world_upkeep',createWorldUpkeepHandler({services,clock}));writer.add('world_transition',createWorldTransitionHandler({services,clock,assertFrozen:isolatedFrozen}));}
export async function setupWorldJobs(t){
 const f=await setupPvp(t),authority=new ChannelOwnership(f.f.database,{realmId:'world-jobs'});await authority.initialize();const writer=new SystemWriter(f.f.database,{realmId:'world-jobs',authority}),services=new NativeGameServices(f.sql,{clock:()=>f.nowMs}),peer={realm:'world-jobs',channel:0,role:'world',incarnation:'world-jobs-boot'};await writer.initialize();await writer.register(peer);bindJobs(writer,services,()=>f.nowMs);
 await new DurableWorldState(f.f.database).initialize();f.sql.exec('UPDATE players SET last_seen=1,movement_checked_at_ms=1,last_monster_hit_at=0;');
 const settings={...createRespawnRules({globals:services.globals}).defaults,...f.sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...f.sql.prepare('SELECT * FROM economy_settings WHERE id=1').get(),...f.sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()};return {...f,authority,writer,services,peer,settings};
}
export function prepareJob(f,mode){
 const now=Math.floor(f.nowMs/1000);f.sql.prepare('UPDATE world_state SET health=50,updated_at=?,cycle=9,reset_at=?,guardian_reward_at=? WHERE id=1').run(now-10,mode==='reset'?now-1:0,now-1);
 f.sql.prepare('UPDATE players SET contribution=0').run();update(f.sql,'players',f.id,{level:60,contribution:500,gems:900,essence:800,potions:40,wheel_paid_gems:100,wheel_paid_essence:200,wheel_paid_potions:10});
 if(mode==='reset'){put(f.sql,'player_items',{id:'paid-reset511',player_id:f.id,kind:'weapon',item_name:'Paid preservation fixture',rarity:'red',power:30,role:'avci',equipped:1,created_at:1,premium_origin:1});put(f.sql,'player_items',{id:'earned-reset511',player_id:f.id,kind:'weapon',item_name:'Earned fixture',rarity:'white',power:3,role:'avci',equipped:0,created_at:1,premium_origin:0});}
}
export function jobCommand(f,mode){const owner=f.writer.owner('world');return {epoch:owner.epoch,sequence:owner.sequence+1,key:'world-job-'+mode+'-'+(owner.sequence+1),kind:mode==='upkeep'?'world_upkeep':'world_transition',payload:{mode,cycle:f.sql.prepare('SELECT cycle FROM world_state').get().cycle,nowMs:f.nowMs,seed:'a'.repeat(64),fence:'isolated-no-channels'}};}
