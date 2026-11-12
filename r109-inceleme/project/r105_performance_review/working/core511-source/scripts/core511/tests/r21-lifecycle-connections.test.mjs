import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {ChannelConnections} from '../channel-connections.mjs';
const turn=()=>new Promise(r=>setImmediate(r));
const defer=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
class Socket extends EventEmitter {
 constructor(){super();this.sent=[];this.readyState=1;this.bufferedAmount=0;}
 send(bytes){this.sent.push(JSON.parse(bytes));}
 close(){if(this.readyState===3)return;this.readyState=3;this.emit('close');}
 ping(){}
 terminate(){this.close();}
 auth(){this.emit('message',Buffer.from(JSON.stringify({type:'auth',ticket:'fixture-only'})),false);}
}
function fixture(t){
 const identity={actor:'fixture-actor',account:'fixture-account',session:'fixture-session',epoch:1},events=[];let activation=null;
 const kernel={state:{channel:1},players:new Map([[identity.actor,{epoch:1,lastAccepted:0,lastApplied:0}]]),replayResults:()=>[]};
 const connections=new ChannelConnections({kernel,tickets:{consume:()=>({...identity})},budget:{activate:()=>activation?.promise,release:()=>{}},admit:()=>{},guard:()=>true,rate:()=>0,presence:()=>events.push('seen'),ready:()=>events.push('ready'),disconnected:()=>events.push('disconnected')});
 t.after(()=>connections.close());
 function attach(){const socket=new Socket();connections.attach(socket,{lease:'lease',boot:'boot',origin:'https://fixture.invalid'});socket.auth();return socket;}
 return {connections,events,identity,attach,holdActivation(){return activation=defer();}};
}
test('replacement socket remains the live owner when old socket closes after new activation is resolved',async t=>{
 const f=fixture(t),old=f.attach();await turn();assert.deepEqual(f.events,['seen','ready']);
 const gate=f.holdActivation(),next=f.attach();await turn();assert.equal(f.connections.identity(f.identity.actor)?.actor,f.identity.actor);
 gate.resolve();old.close();await turn();
 assert.equal(f.connections.actors.get(f.identity.actor),next);
 assert.deepEqual(f.events,['seen','ready','seen','ready']);
 next.close();await turn();assert.deepEqual(f.events,['seen','ready','seen','ready','disconnected']);
});
test('closing an old socket after a completed replacement does not disconnect new presence',async t=>{
 const f=fixture(t),old=f.attach();await turn();const next=f.attach();await turn();old.close();await turn();
 assert.equal(f.connections.actors.get(f.identity.actor),next);assert.deepEqual(f.events,['seen','ready','seen','ready']);
 next.close();await turn();assert.equal(f.events.filter(e=>e==='disconnected').length,1);
});
