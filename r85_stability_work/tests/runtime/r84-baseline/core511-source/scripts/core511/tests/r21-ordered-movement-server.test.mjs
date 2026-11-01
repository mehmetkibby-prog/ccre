import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {ChannelConnections} from '../channel-connections.mjs';
import {FixedLoop} from '../fixed-loop.mjs';
import {demand,PROTOCOL} from '../contract.mjs';

const capability='queued-movement-v1',ordered='ordered-movement-v2';
const defer=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const turn=()=>new Promise(r=>setImmediate(r));
class Socket extends EventEmitter {
 constructor(){super();this.sent=[];this.readyState=1;this.bufferedAmount=0;this.closed=null;}
 send(text){this.sent.push(JSON.parse(text));}
 input(sequence,payload,extra={}){this.emit('message',Buffer.from(JSON.stringify({type:'input',sequence,payload,...extra})),false);}
 close(code,reason){if(this.closed)return;this.closed={code,reason};this.readyState=3;this.emit('close');}
 ping(){}
 terminate(){this.close(1006,'terminated');}
}
function fixture(t){
 const identity={actor:'test-actor',account:'test-account',session:'test-session',epoch:1},owner={epoch:1,pending:0};
 const state={channel:1,owners:new Map([[identity.actor,owner]]),assertOwner(id,epoch){demand(id===identity.actor&&epoch===owner.epoch,'owner_epoch_fenced');return owner;},changes(){return {};}};
 const committed=defer();let commits=0,rateCalls=0,retryAfter=0,allowed=true,connections;
 const kernel=new FixedLoop({state,rules:{
  movement:()=>({type:'action',status:200,body:{moved:true}}),
  combat:({id,kernel})=>{commits++;kernel.durable(id,()=>committed.promise);return {type:'action',status:200,body:{rewardOnce:true}};},
  ai:()=>{},respawn:()=>{},project:({results,lastApplied})=>({type:'state',results,lastApplied})
 },send:(id,packet)=>{connections.actors.get(id)?.send(JSON.stringify(packet));}});
 kernel.admit(identity.actor,1);kernel.stopped=false;
 connections=new ChannelConnections({kernel,tickets:{consume:()=>({...identity})},budget:{activate:async()=>{},release:async()=>{}},admit:async()=>{},guard:()=>allowed,rate:()=>{rateCalls++;return retryAfter;},disconnected:async()=>{}});
 t.after(()=>{connections.close();kernel.stop();});
 async function connect({negotiated=true,immediate=true}={}){const socket=new Socket();connections.attach(socket,{lease:'lease',boot:'boot',origin:'https://fixture.invalid'});socket.emit('message',Buffer.from(JSON.stringify({type:'auth',ticket:'fixture',...(negotiated?{capabilities:[capability,...immediate?[ordered]:[]]}:{})})),false);await turn();return socket;}
 return {identity,owner,kernel,connections,connect,committed,commits:()=>commits,rateCalls:()=>rateCalls,setRate:n=>{retryAfter=n;},setAllowed:value=>{allowed=value;},actor:()=>kernel.players.get(identity.actor)};
}
const receipts=socket=>socket.sent.filter(p=>p.type==='queued');
const results=socket=>socket.sent.flatMap(p=>p.results??[]).filter(p=>p.type==='action');


test('ordered dependent movement skips enqueue roundtrip but still waits for durable command completion',async t=>{
 const f=fixture(t),socket=await f.connect();assert.deepEqual(socket.sent[0].capabilities,[capability,ordered]);
 socket.input(1,{action:'attack',ability:0});socket.input(2,{action:'move',x:1},{dependsOn:1});
 assert.equal(f.actor().lastAccepted,2);assert.equal(f.actor().lastApplied,0);assert.equal(f.rateCalls(),2);assert.equal(receipts(socket).length,2);
 f.kernel.tick();assert.equal(f.commits(),1);assert.deepEqual(results(socket),[]);assert.equal(f.actor().lastApplied,0);
 f.committed.resolve();await turn();f.kernel.tick();assert.equal(f.actor().lastApplied,2);assert.equal(results(socket).length,2);assert.equal(f.commits(),1);
});

test('rate rejected parent explicitly discards dependent movement without accepting a sequence or consuming its rate budget',async t=>{
 const f=fixture(t),socket=await f.connect();f.setRate(1);socket.input(1,{action:'attack'});socket.input(2,{action:'move'},{dependsOn:1});
 assert.equal(f.actor().lastAccepted,0);assert.equal(f.rateCalls(),1);assert.equal(socket.closed,null);assert.deepEqual(socket.sent.at(-1),{type:'not_queued',protocol:PROTOCOL,epoch:1,sequence:2,dependsOn:1,code:'dependency_not_queued',durable:false});
 f.setRate(0);socket.input(1,{action:'move'});assert.equal(f.actor().lastAccepted,1);assert.equal(f.rateCalls(),2);assert.equal(f.actor().queue.length,1);
});

test('draining parent discards dependent movement and exact primary sequence can resume only once',async t=>{
 const f=fixture(t),socket=await f.connect();f.actor().accepting=false;socket.input(1,{action:'claim_rewards'});socket.input(2,{action:'move'},{dependsOn:1});
 assert.equal(socket.sent.at(-1).type,'not_queued');assert.equal(f.actor().lastAccepted,0);assert.equal(f.commits(),0);
 f.actor().accepting=true;socket.input(1,{action:'claim_rewards'});socket.input(2,{action:'move'},{dependsOn:1});f.kernel.tick();f.committed.resolve();await turn();f.kernel.tick();
 assert.equal(f.actor().lastApplied,2);assert.equal(f.commits(),1);assert.equal(socket.closed,null);
});

test('accepted ordered movement retains exact movement rate and session guards',async t=>{
 const f=fixture(t),socket=await f.connect();socket.input(1,{action:'attack'});f.setRate(1);socket.input(2,{action:'move'},{dependsOn:1});
 assert.equal(socket.sent.at(-1).type,'rejected');assert.equal(f.actor().lastAccepted,1);assert.equal(f.rateCalls(),2);
 f.setRate(0);socket.input(2,{action:'move'});assert.equal(f.actor().lastAccepted,2);socket.input(3,{action:'move'});assert.equal(f.actor().lastAccepted,2);assert.equal(socket.sent.at(-1).type,'retry');
 const g=fixture(t),guarded=await g.connect();guarded.input(1,{action:'attack'});g.setAllowed(false);guarded.input(2,{action:'move'},{dependsOn:1});assert.equal(g.actor().lastAccepted,1);assert.equal(guarded.closed.code,1008);
});

for(const [name,parent,extra,immediate] of [
 ['no capability',{action:'attack'},{dependsOn:1},false],
 ['wrong predecessor',{action:'attack'},{dependsOn:0},true],
 ['skill',{action:'attack',ability:1},{dependsOn:1},true],
 ['teleport',{action:'teleport'},{dependsOn:1},true],
 ['potion',{action:'use_potion'},{dependsOn:1},true],
])test('dependency refuses '+name,async t=>{
 const f=fixture(t),socket=await f.connect({immediate});socket.input(1,parent);socket.input(2,{action:'move'},extra);assert.equal(f.actor().lastAccepted,1);assert.equal(socket.closed.code,1008);
});

test('dependency cannot cross socket replacement and cannot grant a third outstanding slot',async t=>{
 const f=fixture(t),socket=await f.connect();socket.input(1,{action:'collect'});const newer=await f.connect();newer.input(2,{action:'move'},{dependsOn:1});assert.equal(newer.closed.code,1008);assert.equal(f.actor().lastAccepted,1);
 const g=fixture(t),s=await g.connect();s.input(1,{action:'collect'});s.input(2,{action:'move'},{dependsOn:1});s.input(3,{action:'move'},{dependsOn:2});assert.equal(s.closed.code,1008);assert.equal(g.actor().lastAccepted,2);assert.equal(g.actor().queue.length,2);
});

for(const payload of [{action:'attack',ability:0},{action:'claim_rewards'},{action:'collect'}])test('movement then '+payload.action+' can alternate back to movement within two accepted slots',async t=>{
 const f=fixture(t),socket=await f.connect();socket.input(1,{action:'move'});socket.input(2,payload,{dependsOn:1});assert.equal(f.actor().lastAccepted,2);assert.equal(f.actor().lastApplied,0);socket.input(3,{action:'move'});assert.equal(f.actor().lastAccepted,2);assert.equal(socket.sent.at(-1).type,'retry');
 f.kernel.tick();assert.equal(f.actor().lastApplied,1);assert.equal(f.commits(),1);assert.equal(results(socket).filter(r=>r.body.rewardOnce).length,0);
 socket.input(3,{action:'move'});assert.equal(f.actor().lastAccepted,3);assert.equal(f.actor().lastAccepted-f.actor().lastApplied,2);assert.equal(f.owner.pending,1);
 f.committed.resolve();await turn();f.kernel.tick();assert.equal(f.actor().lastApplied,3);assert.equal(f.commits(),1);assert.equal(results(socket).filter(r=>r.body.rewardOnce).length,1);
});
for(const payload of [{action:'teleport'},{action:'attack',ability:1},{action:'use_potion'},{action:'select_channel'},{action:'dungeon'}])test('movement cannot grant unsafe dependent '+payload.action+' '+payload.ability,async t=>{
 const f=fixture(t),socket=await f.connect();socket.input(1,{action:'move'});socket.input(2,payload,{dependsOn:1});assert.equal(f.actor().lastAccepted,1);assert.equal(socket.closed.code,1008);
});
test('rate rejected movement cannot cause dependent reward to execute; retry has original sequence',async t=>{
 const f=fixture(t),socket=await f.connect();f.setRate(1);socket.input(1,{action:'move'});socket.input(2,{action:'claim_rewards'},{dependsOn:1});assert.equal(socket.sent.at(-1).type,'not_queued');assert.equal(f.commits(),0);assert.equal(f.actor().lastAccepted,0);
 f.setRate(0);socket.input(1,{action:'claim_rewards'});f.kernel.tick();f.committed.resolve();await turn();f.kernel.tick();assert.equal(f.actor().lastApplied,1);assert.equal(f.commits(),1);
});
