// Controlled ports around real R82 state, actor/combat journals, target leases,
// joined-death code and actor barriers. No unavailable module is replaced.
import assert from 'node:assert/strict';
import {CombatCheckpoints} from '../r82-work/core511-source/scripts/core511/combat-checkpoint.mjs';
import {ActorCheckpoints,CHECKPOINT_FIELDS} from '../r82-work/core511-source/scripts/core511/actor-checkpoint.mjs';
import {ResidentState} from '../r82-work/core511-source/scripts/core511/resident-state.mjs';
import {ResourceLanes} from '../r82-work/core511-source/scripts/core511/resource-lanes.mjs';
import {FixedLoop} from '../r82-work/core511-source/scripts/core511/fixed-loop.mjs';
import {joinedDeathR53} from '../r82-work/core511-source/scripts/core511/attack-commit-r53.mjs';
import {unpackCheckpointR54} from '../r82-work/core511-source/scripts/core511/checkpoint-wire-r54.mjs';

export {CombatCheckpoints,unpackCheckpointR54};
export const turn=()=>new Promise(resolve=>setImmediate(resolve));
export function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});promise.catch(()=>{});return {promise,resolve,reject};}
export async function until(fn){const end=performance.now()+3000;while(!fn()){if(performance.now()>=end)assert.fail('controlled fixture did not reach expected state');await turn();}}
export const monster=(id,hp=100)=>({id,area:'forest',channel:1,spawn_round:1,is_boss:0,is_stone:0,max_hp:100,hp,last_damaged_at_ms:0,last_regen_at_ms:0,root_until_ms:0,stun_until_ms:0,control_x:0,control_y:0,wave_stage:0});
export const participant=(id,player='actor-1')=>({monster_id:id,spawn_round:1,player_id:player,created_at:1,stone_damage476:0,stone_first_hit_at_ms476:0});
export const combatEvent=(id,at=1)=>({player_id:'actor-1',target_id:id,role:'arkanist',ability:0,created_at:at});
export const ack=event=>({key:event.key,result:{saved:event.payload}});
export function gatedJournal({Journal=CombatCheckpoints,ids=['dying','other'],onFatal=()=>{}}={}){
 const commands=[],gate=deferred(),journal=new Journal({submit:async e=>{commands.push(e);await gate.promise;return ack(e);},onFatal});
 journal.hydrate('monsters',ids.map(id=>monster(id)));
 return {journal,commands,gate,dirty:(id,hp=80)=>journal.changed({monsters:[monster(id,hp)]})};
}
export function joinedFixture({Journal=CombatCheckpoints,actors=['actor-1'],targets=['dying'],checkpointSubmit=null,deathSubmit=null,onJournalFatal=null}={}){
 const state=new ResidentState(1),fatals=[],journalFatals=[],writes=[],actorWrites=[],committed=[],published=[],memoryCommits=[];
 const noop=()=>null;
 const kernel=new FixedLoop({state,rules:{movement:noop,combat:noop,ai:noop,respawn:noop,project:noop},send:noop,onFatal:e=>fatals.push(e)});
 for(const id of actors){
  const row={id,account_id:'account-'+id,area:'forest',channel:1,arena_match_id:'',realtime_scope_version:1,max_hp:100,...Object.fromEntries(CHECKPOINT_FIELDS.map(k=>[k,0])),motion_stream_id:'',hp:100,hp_revision:1,position_revision:1,movement_checked_at_ms:1000,cycle:1,instanceId:'',last_seen:1};
  state.put('players',row);state.claim(id,1);kernel.admit(id,1);
 }
 const checkpoints=new ActorCheckpoints({state,submit:async e=>{actorWrites.push(e);if(checkpointSubmit)return checkpointSubmit(e);return {key:e.key,result:{saved:e.payload.current}};},onFatal:e=>kernel.fail(e)});
 for(const id of actors)checkpoints.hydrate(state.read('players',id));
 const journal=new Journal({submit:async e=>{throw Error('fixture checkpoint port not configured: '+e.key);},onFatal:e=>{journalFatals.push(e);kernel.fail(e);onJournalFatal?.(e);}});
 journal.hydrate('monsters',[...new Set([...targets,'other'])].map(id=>monster(id)));
 const lanes=new ResourceLanes(),lease=lanes.acquire([...actors.map(id=>'player:'+id),...targets.map(id=>'monster:'+id)],'joined-fixture');
 const resultFor=command=>{
  const capture=unpackCheckpointR54(command.payload.checkpointR53);
  return {key:command.key,result:{players:actors.map(id=>state.read('players',id)),monsters:targets.map(id=>monster(id,0)),participants:[],bossParticipants:[],events:[[1,1,'forest',{type:'death',targets}]],checkpointR53:capture?.actors.map(t=>({id:t.actor,saved:t.payload.current}))??[],result:{status:200,body:{ok:true}}}};
 };
 const loop={checkpoints,combatCheckpoints:journal,lanes,
  frameFor:id=>({player:state.read('players',id),preloadedAttackMonster:monster(targets[0]),settings:{}}),
  submit:async command=>{writes.push(command);return deathSubmit?deathSubmit(command,resultFor):resultFor(command);},
  memory:{committed:value=>memoryCommits.push(value),view:{setMonster:noop,engagements:new Map()}},
  committed:async value=>{committed.push(value);for(const p of value.players)state.put('players',p);},publish:(...event)=>published.push(event)};
 const start=()=>{
  const preview=joinedDeathR53(loop,{id:actors[0],input:{targetId:targets[0],spawnRound:1},now:1000,receivedAtMs:1000,kernel,local:{targets:targets.map(id=>({id}))},ids:actors,lease,seed:1,key:'death-fixture'});
  const barrier=kernel.players.get(actors[0]).barrier;
  assert(barrier instanceof Promise);barrier.catch(()=>{});
  return {preview,barrier};
 };
 return {state,kernel,checkpoints,journal,lanes,lease,loop,start,resultFor,writes,actorWrites,fatals,journalFatals,committed,published,memoryCommits};
}
export function assertReleased(f){
 for(const [id,p]of f.kernel.players){assert.equal(p.barrier,null,id);assert.equal(f.state.owners.get(id).pending,0,id);}
 assert.equal(f.lease.state,'released');assert.equal(f.journal.reservedR53.size,0);assert.equal(f.kernel.failure,null);
}
export function assertFenced(f){
 assert(f.kernel.failure);assert.equal(f.lease.state,'unknown');assert(f.lanes.busy(f.lease.keys));assert(f.journal.reservedR53.size>0);
 for(const p of f.kernel.players.values())assert(p.barrier);
 assert.equal(f.published.length,0);assert.equal(f.memoryCommits.length,0);
}
