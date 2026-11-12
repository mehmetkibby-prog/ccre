import test from 'node:test';
import assert from 'node:assert/strict';
const {SharedCombatBridge}=await import(process.env.STUTTER_TREE+'/core511-source/scripts/core511/shared-combat-bridge.mjs');
const turn=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function until(test){const end=Date.now()+2000;while(!test()){assert(Date.now()<end,'control request did not arrive');await turn();}}
function fixture(t,{enabled=true}={}){
 const previous=process.env.CORE511_R111_CHANNEL_RELEASE;
 process.env.CORE511_R111_CHANNEL_RELEASE=enabled?'1':'0';
 const peers=[1,2,3,4].map(channel=>({channel,incarnation:'boot-'+channel,realm:'test'}));
 const source={...peers[0],actor:'source',epoch:1},events=[],gates=peers.map(()=>deferred());
 const core={writer:{owners:new Map([['source',{...source,state:'active'}]])},reader:{query:async()=>({rows:{}})},process:peer=>{assert(peers.includes(peer),'channel_process_fenced');return peer;}};
 const world={core,global:{recover:()=>events.push('recover')},row:{exited:false,owner:{epoch:1},peer:{incarnation:'world'},control:{request:async method=>{events.push(method);return {finished:true};}}}};
 const bridge=new SharedCombatBridge(world);bridge.unchangedReleaseR112=false; // Exercise the original whole-channel protocol separately.
 if(previous===undefined)delete process.env.CORE511_R111_CHANNEL_RELEASE;else process.env.CORE511_R111_CHANNEL_RELEASE=previous;
 const row={id:'terminal-operation',source,world:world.row,proof:'private-proof',phase:'leased',commandAck:{result:{sharedRefresh:{version:1,all:false,actors:['actor-2']}}}};
 const held={row,token:'hold',phase:'frozen',channels:peers.map((peer,i)=>({channel:{peer,control:{request:async(method,payload)=>{assert.equal(method,'shared_release');assert.equal(payload.token,'hold');events.push('release:'+peer.channel);return gates[i].promise;}}},answer:{actors:[{id:'actor-'+peer.channel,epoch:1,sequence:0}]}}))};
 row.terminal=held;bridge.terminal=held;bridge.requests.set(row.id,row);
 const request=i=>({playerId:'actor-'+i,epoch:1,sequence:1,operationId:'hit-'+i,operation:'attack',payload:{input:{action:'attack',targetId:'normal-monster'}}});
 const open=(i,ack={token:'hold',released:true})=>gates[i-1].resolve(ack);
 const finish=()=>bridge.finish(peers[0],{id:row.id,actor:'source',epoch:1,proof:row.proof});
 t.after(async()=>{for(let i=1;i<=4;i++)open(i);await turn();bridge.abort(Error('fixture closed'));});
 return {peers,core,world,bridge,row,held,events,request,open,finish};
}

test('a committed, fully refreshed channel resumes normal attacks while a different channel is still refreshing',{timeout:5000},async t=>{
 const s=fixture(t),{bridge,peers,request,held}=s;let written=0,other=0,globalIdle=false;
 const local=bridge.writable(peers[3],request(4)).then(()=>{bridge.guard(peers[3],request(4));written++;});
 const remote=bridge.writable(peers[1],request(2)).then(()=>{bridge.guard(peers[1],request(2));other++;});
 const ownership=bridge.terminalIdle().then(()=>globalIdle=true);
 const finish=s.finish();await until(()=>s.events.filter(e=>e.startsWith('release:')).length===4);
 assert.equal(written,0);s.open(4);await turn();
 assert.equal(written,1,'a fully released channel must not wait for another channel');
 assert.equal(other,0);assert.equal(globalIdle,false);assert.equal(bridge.terminal,held);
 assert.throws(()=>bridge.guard(peers[1],request(2)),/shared_terminal_actor_fenced/);
 assert.throws(()=>bridge.reserveOwnership(),/shared_ownership_busy/);
 for(let i=1;i<=3;i++)s.open(i);await Promise.all([finish,local,remote,ownership]);
 assert.equal(other,1);assert(globalIdle);assert.equal(bridge.waiters.size,0);
});

test('no channel is released before durable command ACK and world reload',{timeout:5000},async t=>{
 const s=fixture(t),reload=deferred();let completed=false;
 s.world.row.control.request=async method=>{s.events.push(method);if(method==='shared_reload')await reload.promise;return {};};
 const pending=s.bridge.writable(s.peers[3],s.request(4)).then(()=>completed=true);
 const finish=s.finish();await until(()=>s.events.includes('shared_reload'));s.open(4);await turn();
 assert.equal(completed,false);assert.equal(s.held.phase,'frozen');assert(!s.events.includes('release:4'));
 reload.resolve();await until(()=>s.events.includes('release:4'));await turn();assert(completed);
 for(let i=1;i<=3;i++)s.open(i);await Promise.all([pending,finish]);
 const missing=fixture(t);delete missing.row.commandAck;await assert.rejects(missing.finish(),/shared_terminal_commit_missing/);
 assert(!missing.events.some(e=>e.startsWith('release:')));assert(missing.core.recoveringWorld);
});

test('invalid release ACK never wakes its actor; recovery rejects command and ownership waiters',{timeout:5000},async t=>{
 const s=fixture(t);const command=assert.rejects(s.bridge.writable(s.peers[3],s.request(4)),/shared_release_ack/);
 const ownership=assert.rejects(s.bridge.terminalIdle(),/shared_release_ack/);
 const finish=assert.rejects(s.finish(),/shared_release_ack/);
 await until(()=>s.events.includes('release:4'));s.open(4,{token:'wrong',released:true});
 await Promise.all([finish,command,ownership]);assert.equal(s.bridge.waiters.size,0);assert(s.core.recoveringWorld);
 assert.equal(s.held.channels[3].releasedR111,undefined);
});

test('a stale channel incarnation cannot use a valid release to cross the writer fence',{timeout:5000},async t=>{
 const s=fixture(t);s.core.process=()=>{throw Error('channel_process_fenced');};
 const pending=assert.rejects(s.bridge.writable(s.peers[3],s.request(4)),/channel_process_fenced/);
 const finish=s.finish();await until(()=>s.events.includes('release:4'));s.open(4);await pending;
 assert.throws(()=>s.bridge.guard({...s.peers[3],incarnation:'retired'},s.request(4)),/shared_terminal_actor_fenced/);
 for(let i=1;i<=3;i++)s.open(i);await finish;
});

test('the fallback preserves the full terminal barrier even after one release ACK',{timeout:5000},async t=>{
 const s=fixture(t,{enabled:false});let writes=0;
 const pending=s.bridge.writable(s.peers[3],s.request(4)).then(()=>writes++),finish=s.finish();
 await until(()=>s.events.includes('release:4'));s.open(4);await turn();assert.equal(writes,0);
 assert.throws(()=>s.bridge.guard(s.peers[3],s.request(4)),/shared_terminal_actor_fenced/);
 for(let i=1;i<=3;i++)s.open(i);await Promise.all([pending,finish]);assert.equal(writes,1);
});

test('shared return and ownership moves keep every channel fenced for the existing rehome protocol',{timeout:5000},async t=>{
 const s=fixture(t);s.row.commandAck.result.moves=[{id:'different-actor',target:{channel:2,incarnation:'boot-2',epoch:2}}];
 const answer=await s.finish();assert.deepEqual(answer,{returning:true,token:'hold'});
 assert.equal(s.row.phase,'returning');assert.equal(s.bridge.terminal,s.held);
 assert(!s.events.some(e=>e.startsWith('release:')));
 for(let i=1;i<=4;i++)assert.throws(()=>s.bridge.guard(s.peers[i-1],s.request(i)),/shared_terminal_actor_fenced/);
});
