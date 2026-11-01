import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {ChannelConnections} from '../channel-connections.mjs';
import {FixedLoop} from '../fixed-loop.mjs';
import {demand,PROTOCOL} from '../contract.mjs';

const capability='queued-movement-v1';
const defer=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const turn=()=>new Promise(r=>setImmediate(r));
class Socket extends EventEmitter {
 constructor(){super();this.sent=[];this.readyState=1;this.bufferedAmount=0;this.closed=null;}
 send(text){this.sent.push(JSON.parse(text));}
 input(sequence,payload){this.emit('message',Buffer.from(JSON.stringify({type:'input',sequence,payload})),false);}
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
 async function connect({negotiated=true}={}){const socket=new Socket();connections.attach(socket,{lease:'lease',boot:'boot',origin:'https://fixture.invalid'});socket.emit('message',Buffer.from(JSON.stringify({type:'auth',ticket:'fixture',...(negotiated?{capabilities:[capability]}:{})})),false);await turn();return socket;}
 return {identity,owner,kernel,connections,connect,committed,commits:()=>commits,rateCalls:()=>rateCalls,setRate:n=>{retryAfter=n;},setAllowed:value=>{allowed=value;},actor:()=>kernel.players.get(identity.actor)};
}
const receipts=socket=>socket.sent.filter(p=>p.type==='queued');
const results=socket=>socket.sent.flatMap(p=>p.results??[]).filter(p=>p.type==='action');

test('feature is opt-in and ordinary legacy transport gets no queued receipts',async t=>{
 const f=fixture(t),socket=await f.connect({negotiated:false});
 assert.equal(socket.sent[0].capabilities,undefined);
 socket.input(1,{action:'attack'});assert.equal(f.actor().lastAccepted,1);assert.deepEqual(receipts(socket),[]);
 const upgraded=await f.connect();assert.deepEqual(upgraded.sent[0].capabilities,[capability]);
 upgraded.input(2,{action:'move'});
 assert.deepEqual(upgraded.sent.at(-1),{type:'retry',sequence:2,code:'input_backpressure'});
 assert.equal(f.actor().lastAccepted,1);assert.equal(upgraded.closed,null);
});

test('queued is non-durable admission only; durable combat and following movement settle once in original sequence',async t=>{
 const f=fixture(t),socket=await f.connect();
 socket.input(1,{action:'attack',ability:0});
 assert.deepEqual(receipts(socket),[{type:'queued',protocol:PROTOCOL,epoch:1,sequence:1,kind:'combat',accepted:true,durable:false}]);
 assert.equal(f.commits(),0);assert.equal(f.actor().lastApplied,0);assert.deepEqual(f.kernel.replayResults(f.identity.actor),[]);
 socket.input(2,{action:'move',dx:1,dy:0,duration:200});f.kernel.tick();
 assert.equal(f.commits(),1);assert.equal(f.actor().lastApplied,0);assert.equal(f.actor().queue.length,1);assert.equal(f.owner.pending,1);
 assert.deepEqual(results(socket),[]);assert.deepEqual(f.kernel.replayResults(f.identity.actor),[]);
 // The unchanged durable boundary releases the primary before the queued
 // movement executes. Its final ACK is never the earlier queued receipt.
 f.committed.resolve({diskCommitted:true});await turn();assert.equal(f.actor().lastApplied,1);f.kernel.tick();
 assert.equal(f.actor().lastApplied,2);assert.equal(f.owner.pending,0);assert.equal(f.commits(),1);
 // A scheduled frame can flush the combat ACK before the next test tick.
 // Delivery order may differ; exactly one result per sequence and durable
 // replay order below are the contract.
 assert.deepEqual(results(socket).map(r=>r.sequence).sort((a,b)=>a-b),[1,2]);
 assert.deepEqual(f.kernel.replayResults(f.identity.actor).map(r=>r.sequence),[1,2]);
 assert.equal(results(socket).filter(r=>r.body.rewardOnce).length,1);
});

test('two-flight budget rejects second combat and third input without accepting or consuming sequence',async t=>{
 const f=fixture(t),socket=await f.connect();socket.input(1,{action:'attack'});
 socket.input(2,{action:'collect'});assert.equal(f.actor().lastAccepted,1);assert.equal(socket.sent.at(-1).code,'input_backpressure');
 socket.input(2,{action:'move'});assert.equal(f.actor().lastAccepted,2);
 socket.input(3,{action:'move'});assert.equal(f.actor().lastAccepted,2);assert.equal(socket.sent.at(-1).code,'input_backpressure');
 socket.input(3,{action:'attack'});assert.equal(f.actor().lastAccepted,2);assert.equal(socket.sent.at(-1).type,'retry');
 assert.equal(socket.closed,null);assert.equal(f.rateCalls(),2);assert.equal(receipts(socket).length,2);
 f.kernel.tick();f.committed.resolve();await turn();
 // The primary is settled but its following movement is still pending: no
 // third command can start behind that movement.
 socket.input(3,{action:'attack'});assert.equal(f.actor().lastAccepted,2);assert.equal(socket.sent.at(-1).type,'retry');
 f.kernel.tick();socket.input(3,{action:'attack'});assert.equal(f.actor().lastAccepted,3);assert.equal(socket.sent.at(-1).type,'queued');
});

test('same-epoch reconnect inherits accepted slots and replay metadata',async t=>{
 const f=fixture(t),original=await f.connect();original.input(1,{action:'collect'});f.kernel.tick();
 const reconnect=await f.connect();assert.equal(original.closed.code,4009);
 assert.equal(reconnect.sent[0].lastAccepted,1);assert.equal(reconnect.sent[0].lastApplied,0);assert.deepEqual(reconnect.sent[0].results,[]);
 reconnect.input(2,{action:'attack'});assert.equal(f.actor().lastAccepted,1);
 reconnect.input(2,{action:'move'});assert.equal(f.actor().lastAccepted,2);
 const again=await f.connect();assert.equal(again.sent[0].lastAccepted,2);again.input(3,{action:'move'});
 assert.deepEqual(again.sent.at(-1),{type:'retry',sequence:3,code:'input_backpressure'});assert.equal(f.actor().queue.length,1);
 f.committed.resolve();await turn();f.kernel.tick();
 const settled=await f.connect();assert.equal(settled.sent[0].lastAccepted,2);assert.equal(settled.sent[0].lastApplied,2);assert.deepEqual(settled.sent[0].results.filter(r=>r.type==='action').map(r=>r.sequence),[1,2]);
});

test('only basic attack, claim_rewards and collect grant the following movement slot',async t=>{
 for(const payload of [{action:'attack'},{action:'attack',ability:0},{action:'claim_rewards'},{action:'collect'}])await t.test(JSON.stringify(payload),async t=>{
  const f=fixture(t),socket=await f.connect();socket.input(1,payload);socket.input(2,{action:'move'});assert.equal(f.actor().lastAccepted,2);assert.equal(receipts(socket).length,2);
 });
 for(const payload of [{action:'attack',ability:1},{action:'attack',ability:2},{action:'teleport'},{action:'dungeon_enter'},{action:'channel_transfer'},{action:'move'}])await t.test(JSON.stringify(payload),async t=>{
  const f=fixture(t),socket=await f.connect();socket.input(1,payload);socket.input(2,{action:'move'});assert.equal(f.actor().lastAccepted,1);assert.equal(socket.sent.at(-1).code,'input_backpressure');assert.equal(receipts(socket).length,1);
 });
});

test('secondary movement keeps rate and gameplay guards, with no receipt on rejection',async t=>{
 const f=fixture(t),socket=await f.connect();socket.input(1,{action:'attack'});f.setRate(200);socket.input(2,{action:'move'});
 assert.deepEqual(socket.sent.at(-1),{type:'rejected',sequence:2,code:'rate_limited',retryAfter:200});assert.equal(f.actor().lastAccepted,1);assert.equal(receipts(socket).length,1);assert.equal(f.rateCalls(),2);
 f.setRate(0);socket.input(2,{action:'move'});assert.equal(f.actor().lastAccepted,2);assert.equal(f.rateCalls(),3);
 const f2=fixture(t),guarded=await f2.connect();guarded.input(1,{action:'attack'});f2.setAllowed(false);guarded.input(2,{action:'move'});assert.equal(f2.actor().lastAccepted,1);assert.equal(guarded.closed.code,1008);assert.equal(receipts(guarded).length,1);
});

test('quiescing rejects before enqueue and allows exact sequence retry after resume',async t=>{
 const f=fixture(t),socket=await f.connect();socket.input(1,{action:'attack'});f.actor().accepting=false;socket.input(2,{action:'move'});
 assert.deepEqual(socket.sent.at(-1),{type:'retry',sequence:2,code:'actor_draining'});assert.equal(f.actor().lastAccepted,1);assert.equal(receipts(socket).length,1);
 assert.equal(f.connections.inputPipelines.get(f.identity.actor).inputs.has(2),false);
 f.actor().accepting=true;socket.input(2,{action:'move'});assert.equal(f.actor().lastAccepted,2);assert.equal(receipts(socket).length,2);
});

test('sequence and owner epoch fencing remain enforced and stale pipeline ownership is pruned',async t=>{
 const f=fixture(t),socket=await f.connect();socket.input(1,{action:'attack'});socket.input(3,{action:'move'});assert.equal(socket.closed.code,1008);assert.equal(f.actor().lastAccepted,1);assert.equal(receipts(socket).length,1);
 const f2=fixture(t),socket2=await f2.connect();socket2.input(1,{action:'attack'});f2.actor().epoch=2;f2.owner.epoch=2;socket2.input(2,{action:'move'});assert.equal(socket2.closed.code,1008);assert.equal(f2.actor().lastAccepted,1);assert.equal(receipts(socket2).length,1);
 f2.connections.heartbeat();assert.equal(f2.connections.inputPipelines.size,0);
});
