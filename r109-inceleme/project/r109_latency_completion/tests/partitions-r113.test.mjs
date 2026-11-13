import test from 'node:test';
import assert from 'node:assert/strict';
import {PartitionGateR113} from '../working/core511-source/scripts/core511/partition-gate-r113.mjs';
import {SharedWorldRuntime} from '../working/core511-source/scripts/core511/shared-world.mjs';
const turn=()=>new Promise(r=>setImmediate(r)),empty=()=>({monsters:[],participants:[],bossParticipants:[],combatEvents:[]});
const peer=n=>({channel:n,incarnation:'channel-'+n,actor:'player-'+n,epoch:1});
function fixture(t){
 const m={channel:0,spawn_round:1,is_boss:0,is_stone:0,max_hp:100,hp:100,last_damaged_at_ms:0,last_regen_at_ms:100000,root_until_ms:0,stun_until_ms:0,control_x:null,control_y:null,wave_stage:0};
 const monsters=[{...m,id:'a',area:'forest'},{...m,id:'b',area:'black'}],writes=[],faults=[];
 const r=new SharedWorldRuntime({peer:{realm:'r113',channel:0,role:'world',incarnation:'world'},initial:{system:{incarnation:'world',epoch:1,sequence:0,online:1},world:{cycle:1},settings:{},monsters,engagements:[],config:{}},clock:()=>100000,request:async(method,p)=>{if(method==='world_projection')return {version:p.version};writes.push(p);return {key:p.key,sequence:p.sequence,result:{saved:p.payload}};},onFatal:e=>faults.push(e)});
 t.after(()=>{r.stop();r.sharedCombat.close();});return {r,monsters,writes,faults};
}
test('independent keys pass a blocked peer but never starve a queued global transition',async()=>{
 const g=new PartitionGateR113({capacity:4}),a=await g.acquire(['a']);let second=false,global=false,last=false;
 const p=g.acquire(['a']).then(t=>(second=true,t)),b=await g.acquire(['b']);assert.equal(second,false);
 const all=g.acquire([],{global:true}).then(t=>(global=true,t)),c=g.acquire(['c']).then(t=>(last=true,t));await turn();assert.equal(global,false);assert.equal(last,false);
 g.release(a);const a2=await p;g.release(b);assert.equal(global,false);g.release(a2);const barrier=await all;assert.equal(last,false);g.release(barrier);g.release(await c);assert.equal(g.active.size,0);
});
test('two maps hold independent signed leases while same-map and global requests wait',async t=>{
 const {r,writes}=fixture(t),a=await r.sharedCombat.acquire(peer(1),'a-first','forest'),b=await r.sharedCombat.acquire(peer(2),'b-first','black');
 assert.deepEqual(a.snapshot.monsters.map(m=>m.id),['a']);assert.deepEqual(b.snapshot.monsters.map(m=>m.id),['b']);
 let next=false,global=false;const pending=r.sharedCombat.acquire(peer(3),'a-second','forest').then(v=>(next=true,v));
 const all=r.sharedCombat.acquire(peer(4),'global').then(v=>(global=true,v));await turn();assert.equal(next,false);assert.equal(global,false);
 await r.sharedCombat.finish(peer(1),{proof:a.proof,changes:{...empty(),monsters:[{...a.snapshot.monsters[0],hp:73}]}});
 const resumed=await pending;assert.equal(resumed.snapshot.monsters[0].hp,73);assert.equal(r.view.monster('b').hp,100);assert.equal(writes.length,0,'nonterminal attacks still have no per-hit SQL');
 await r.sharedCombat.finish(peer(3),{proof:resumed.proof,changes:empty()});assert.equal(global,false);
 await r.sharedCombat.finish(peer(2),{proof:b.proof,changes:empty()});const whole=await all;assert.equal(whole.snapshot.monsters.length,2);await r.sharedCombat.finish(peer(4),{proof:whole.proof,changes:empty()});await r.sharedCombat.idle();
});
test('committed reload of one map preserves another map’s unflushed HP and contribution',async t=>{
 const {r,monsters}=fixture(t),a=await r.sharedCombat.acquire(peer(1),'a','forest'),b=await r.sharedCombat.acquire(peer(2),'b','black');
 const bp={monster_id:'b',spawn_round:1,player_id:'player-2',created_at:100,stone_damage476:4,stone_first_hit_at_ms476:100000};
 await r.sharedCombat.finish(peer(2),{proof:b.proof,changes:{...empty(),monsters:[{...monsters[1],hp:60}],participants:[bp]}});
 await r.sharedCombat.checkpoint(peer(1),{proof:a.proof});
 await r.sharedCombat.reload(peer(1),{proof:a.proof,snapshot:{world:{cycle:1},monsters:[{...monsters[0],hp:0},monsters[1]],participants:[],bossParticipants:[]}});
 assert.equal(r.view.monster('b').hp,60);assert.equal(r.journal.snapshot().monsters.find(x=>x.current.id==='b').current.hp,60);assert.deepEqual(r.journal.snapshot().participants[0].current,bp);
 await r.sharedCombat.finish(peer(1),{proof:a.proof,changes:empty()});
});
test('a map lease cannot publish another map or release an unknown durable outcome',async t=>{
 const {r,monsters,faults}=fixture(t),a=await r.sharedCombat.acquire(peer(1),'a','forest');
 await assert.rejects(r.sharedCombat.finish(peer(1),{proof:a.proof,changes:{...empty(),monsters:[{...monsters[1],hp:30}]}}),/shared_proposal_monster/);
 assert.equal(r.view.monster('b').hp,100);assert(r.sharedCombat.busy);assert(r.lanes.busy(['monster:a']));assert.equal(faults.length,1);
});
