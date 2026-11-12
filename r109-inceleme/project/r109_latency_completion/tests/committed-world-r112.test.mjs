import test from 'node:test';
import assert from 'node:assert/strict';
const {SharedWorldRuntime}=await import(process.env.STUTTER_TREE+'/core511-source/scripts/core511/shared-world.mjs');
const empty=()=>({monsters:[],participants:[],bossParticipants:[],combatEvents:[]});
function fixture(t){
 const frames=[],faults=[],monster={id:'shared',channel:0,area:'sanctum',hp:100,max_hp:100,spawn_round:7,is_boss:1};
 const r=new SharedWorldRuntime({peer:{realm:'r112',channel:0,role:'world',incarnation:'world'},initial:{system:{incarnation:'world',epoch:1,sequence:0,online:1},world:{cycle:1},settings:{},monsters:[monster],engagements:[],config:{}},clock:()=>100000,request:async(method,p)=>{assert.equal(method,'world_projection');frames.push(p);return {version:p.version};},onFatal:e=>faults.push(e)});
 t.after(()=>{r.stop();r.sharedCombat.close();});return {r,monster,frames,faults};
}
test('a committed shared death reaches replicas before cold hydration without granting the next borrower',async t=>{
 const {r,monster,frames}=fixture(t),peer={channel:1,incarnation:'channel-1',actor:'a',epoch:1};
 const first=await r.sharedCombat.acquire(peer,'death');let granted=false;
 const next=r.sharedCombat.acquire({...peer,channel:2,actor:'b',incarnation:'channel-2'},'next').then(x=>{granted=true;return x;});
 await r.sharedCombat.checkpoint(peer,{proof:first.proof});
 await r.sharedCombat.reload(peer,{proof:first.proof,snapshot:{world:{cycle:1},monsters:[{...monster,hp:0}],participants:[],bossParticipants:[]}});
 assert.equal(frames.at(-1).monsters[0].hp,0);assert.equal(frames.at(-1).full,true);assert.equal(granted,false);assert(r.lanes.busy(['monster:shared']));assert(r.sharedCombat.busy);
 const published=frames.length;await r.sharedCombat.finish(peer,{proof:first.proof,changes:empty()});const second=await next;assert.equal(second.snapshot.monsters[0].hp,0);assert.equal(frames.length,published);
 await r.sharedCombat.finish({...peer,channel:2,actor:'b',incarnation:'channel-2'},{proof:second.proof,changes:empty()});
});
test('stale leases and wrong world cycles cannot publish a committed projection',async t=>{
 const {r,monster,frames}=fixture(t),peer={channel:1,incarnation:'channel-1',actor:'a',epoch:1},grant=await r.sharedCombat.acquire(peer,'death'),before=frames.length;
 await assert.rejects(r.sharedCombat.reload({...peer,epoch:2},{proof:grant.proof,snapshot:{world:{cycle:1},monsters:[{...monster,hp:0}]}}));
 await assert.rejects(r.sharedCombat.reload(peer,{proof:grant.proof,snapshot:{world:{cycle:2},monsters:[{...monster,hp:0}]}}));assert.equal(frames.length,before);assert.equal(r.view.monster('shared').hp,100);
 await r.sharedCombat.finish(peer,{proof:grant.proof,changes:empty()});
});
