import test from 'node:test';
import assert from 'node:assert/strict';
const {SharedCombatBridge}=await import(process.env.STUTTER_TREE+'/core511-source/scripts/core511/shared-combat-bridge.mjs');
const turn=()=>new Promise(r=>setImmediate(r));
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {resolve,promise};};
async function until(fn){const end=Date.now()+2000;while(!fn()){assert(Date.now()<end);await turn();}}
function fixture(t){
 const peers=[1,2,3,4].map(channel=>({channel,incarnation:'boot-'+channel})),source={...peers[0],actor:'source',epoch:1};
 const reload=gate(),hydrate=gate(),events=[],core={writer:{owners:new Map([['source',{...source,state:'active'}]])},reader:{query:async()=>({rows:{}})},process:peer=>assert(peers.includes(peer))};
 const world={core,global:{recover:()=>events.push('recover')},row:{owner:{epoch:1},peer:{incarnation:'world'},control:{request:async method=>{events.push(method);if(method==='shared_reload')await reload.promise;return {};}}}};
 const bridge=new SharedCombatBridge(world),row={id:'operation',source,world:world.row,proof:'proof',phase:'leased',commandAck:{result:{sharedRefresh:{version:1,all:false,actors:['changed']}}}};
 const h={row,token:'hold',phase:'frozen',channels:peers.map(peer=>({channel:{peer,control:{request:async(method,p)=>{
  assert.equal(method,'shared_release');if(p.releaseUnchangedOnly){events.push('early:'+peer.channel);return {token:p.token,channel:peer.channel,incarnation:peer.incarnation,unchangedReleased:[{id:'free-'+peer.channel,epoch:1}]};}
  events.push('hydrate:'+peer.channel);await hydrate.promise;return {token:p.token,released:true};
 }}},answer:{actors:[{id:'free-'+peer.channel,epoch:1},...(peer.channel===2?[{id:'changed',epoch:1}]:[])]}}))};
 row.terminal=h;bridge.terminal=h;bridge.requests.set(row.id,row);t.after(()=>{reload.resolve();hydrate.resolve();bridge.abort(Error('fixture done'));});
 return {bridge,peers,row,h,reload,hydrate,events,finish:()=>bridge.finish(peers[0],{id:row.id,actor:source.actor,epoch:1,proof:row.proof})};
}
const request=(id,resources=[])=>({playerId:id,epoch:1,operation:'attack',payload:{resources}});
test('only audited unchanged actors wake; cross-player writes and ownership wait for remaining refresh',async t=>{
 const s=fixture(t),{bridge,peers}=s;let free=false,cross=false,ownership=false;
 const ready=bridge.writable(peers[1],request('free-2')).then(()=>free=true);
 const blocked=bridge.writable(peers[1],request('free-2',['player:changed'])).then(()=>cross=true);
 const global=bridge.terminalIdle().then(()=>ownership=true),finishing=s.finish();await until(()=>s.events.includes('shared_reload'));await turn();assert(!free&&!cross&&!ownership);assert(!s.events.some(x=>x.startsWith('early')));
 s.reload.resolve();await until(()=>s.events.includes('hydrate:2'));await turn();assert(free);assert(!cross&&!ownership);assert.equal(bridge.terminal,s.h);
 assert.throws(()=>bridge.guard(peers[1],request('free-2',['player:changed'])),/shared_terminal_actor_fenced/);
 assert.throws(()=>bridge.guard({...peers[1],incarnation:'retired'},request('free-2')),/shared_terminal_actor_fenced/);
 s.hydrate.resolve();await Promise.all([ready,blocked,global,finishing]);assert(cross&&ownership);
});
test('unproven early-release epochs never authorize a write',async t=>{
 const s=fixture(t),c=s.h.channels[1].channel,original=c.control.request;c.control.request=async(method,p)=>p.releaseUnchangedOnly?{token:p.token,channel:2,incarnation:c.peer.incarnation,unchangedReleased:[{id:'free-2',epoch:99}]}:original(method,p);
 const waiting=assert.rejects(s.bridge.writable(s.peers[1],request('free-2')),/shared_unchanged_release_ack/);s.reload.resolve();
 await assert.rejects(s.finish(),/shared_unchanged_release_ack/);await waiting;assert.equal(s.h.channels[1].unchangedReleasedR112,undefined);assert(s.events.includes('recover'));
});
