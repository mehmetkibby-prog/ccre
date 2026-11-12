import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {TicketConsumer,issueTicket} from '../ticket.mjs';
import {ConnectionBudget,connectionLimits} from '../connection-budget.mjs';
import {ChannelConnections} from '../channel-connections.mjs';
import {createRules} from '../generated/rules.mjs';
import {until} from './helpers.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const origin='https://game.invalid',base={realm:'test',channel:4,boot:'boot-1',actor:'p',account:'a',session:'s',epoch:3,securityVersion:7,origin};
test('P256 one-time ticket binds origin, channel, incarnation, session and current owner',()=>{
 let now=10000,valid=true;const consumer=new TicketConsumer({publicKey,...base,origins:new Set([origin]),now:()=>now,assertOwner:c=>valid&&c.epoch===3&&c.securityVersion===7});
 const token=issueTicket(privateKey,base,{now});assert.equal(consumer.consume(token,origin).actor,'p');assert.throws(()=>consumer.consume(token,origin),/already_used/);
 for(const change of [{channel:1},{boot:'boot-2'},{realm:'production'},{origin:'https://evil.invalid'},{epoch:4}])assert.throws(()=>consumer.consume(issueTicket(privateKey,{...base,...change},{now}),origin));
 assert.throws(()=>consumer.consume(issueTicket(privateKey,base,{now}),''),/origin_rejected/);
 const fresh=issueTicket(privateKey,base,{now});valid=false;assert.throws(()=>consumer.consume(fresh,origin),/owner_revoked/);valid=true;now+=4000;assert.throws(()=>consumer.consume(fresh,origin),/expired/);
});
test('a ticket tamper fails signature validation and does not use the nonce',()=>{
 const consumer=new TicketConsumer({publicKey,...base,origins:new Set([origin]),assertOwner:()=>true});const token=issueTicket(privateKey,base),[body,sig]=token.split('.');
 const claims=JSON.parse(Buffer.from(body,'base64url'));claims.actor='other';const forged=Buffer.from(JSON.stringify(claims)).toString('base64url')+'.'+sig;
 assert.throws(()=>consumer.consume(forged,origin),/signature/);assert.equal(consumer.consume(token,origin).actor,'p');
});
test('IP quotas are shared across channels; process exit and pending timeout release them',()=>{
 let now=0;const budget=new ConnectionBudget({limits:connectionLimits({}),now:()=>now});const leases=[];
 for(let i=0;i<8;i++)leases.push(budget.reserve('127.0.0.1','ch'+(i%4)));
 assert.throws(()=>budget.reserve('127.0.0.1','ch4'),/budget_exceeded/);
 leases.forEach((id,i)=>budget.activate(id,'ch'+(i%4)));
 for(let i=8;i<32;i++){const id=budget.reserve('127.0.0.1','ch'+(i%4));budget.activate(id,'ch'+(i%4));}
 assert.throws(()=>budget.reserve('127.0.0.1','ch4'),/budget_exceeded/);budget.releaseProcess('ch0');assert.equal(budget.leases.size,24);
 for(let i=0;i<8;i++)budget.reserve('127.0.0.1','ch0');now=4000;budget.expirePending();assert.equal(budget.leases.size,24);assert.equal(budget.pending,0);
 assert.deepEqual(connectionLimits({MAX_CONNECTIONS_PER_IP:'100'}),{total:1000,pending:128,perIp:100,pendingPerIp:8});
});
test('V510 action-rate thresholds remain exact and reset only at the original window boundary',()=>{
 let now=10000;const rules=createRules({now:()=>now});for(let i=0;i<360;i++)assert.equal(rules.enforceLocalActionRate('move-account','move'),0);assert.equal(rules.enforceLocalActionRate('move-account','move'),60);
 for(let i=0;i<240;i++)assert.equal(rules.enforceLocalActionRate('combat-account','attack'),0);assert.equal(rules.enforceLocalActionRate('combat-account','pvp_attack'),60);
 now+=60000;assert.equal(rules.enforceLocalActionRate('move-account','move'),0);
});
class FakeSocket extends EventEmitter{constructor(){super();this.readyState=1;this.bufferedAmount=0;this.sent=[];this.pings=0;}send(text){this.sent.push(JSON.parse(text));}close(code){this.code=code;this.readyState=3;this.emit('close');}terminate(){this.close(1006);}ping(){this.pings++;}message(value){this.emit('message',Buffer.from(JSON.stringify(value)),false);}}
test('component: authentication runs once, heartbeat writes nothing, ban closes immediately',async()=>{
 const budget=new ConnectionBudget(),lease=budget.reserve('127.0.0.1',base.boot),socket=new FakeSocket();let verified=0,guards=0,inputs=0,disconnections=0;
 const actual=new TicketConsumer({publicKey,...base,origins:new Set([origin]),assertOwner:()=>{verified++;return true;}});
 const manager=new ChannelConnections({tickets:actual,budget,kernel:{state:{channel:4},players:new Map([['p',{epoch:3,lastAccepted:0,lastApplied:0}]]),enqueue(){inputs++;}},admit:()=>{},guard:()=>{guards++;return true;},rate:()=>0,disconnected:()=>disconnections++});
 manager.attach(socket,{lease,boot:base.boot,origin});socket.message({type:'auth',ticket:issueTicket(privateKey,base)});await until(()=>socket.sent.length);
 socket.message({type:'input',sequence:1,payload:{action:'move',x:1,y:1}});socket.message({type:'input',sequence:2,payload:{action:'attack'}});
 manager.heartbeat();socket.emit('pong');manager.heartbeat();assert.equal(socket.pings,2);assert.equal(verified,1);assert.equal(inputs,2);assert.equal(guards,4); // Pong checks the current in-memory revocation gate too.
 manager.revoke({account:'a'});assert.equal(socket.readyState,3);await until(()=>disconnections===1&&budget.leases.size===0);
});
test('auth completion after socket close or ban releases the admitted actor exactly once',async()=>{
 for(const reason of ['closed','banned']){
  let complete,disconnections=0;
  const pending=new Promise(r=>complete=r),budget=new ConnectionBudget(),socket=new FakeSocket(),lease=budget.reserve('127.0.0.1',base.boot);
  const manager=new ChannelConnections({tickets:new TicketConsumer({publicKey,...base,origins:new Set([origin]),assertOwner:()=>true}),budget,kernel:{state:{channel:4},players:new Map([['p',{epoch:3}]])},admit:()=>pending,guard:()=>true,rate:()=>0,disconnected:()=>disconnections++});
  manager.attach(socket,{lease,boot:base.boot,origin});socket.message({type:'auth',ticket:issueTicket(privateKey,base)});
  if(reason==='closed')socket.close(1000);else manager.revoke({account:'a'});
  assert.equal(socket.readyState,3);complete();await until(()=>disconnections===1&&budget.leases.size===0);
  assert.equal(socket.sent.length,0);assert.equal(manager.actors.size,0);
 }
});
test('other 256-bit curves cannot replace the pinned P256 ticket key',()=>{
 const other=generateKeyPairSync('ec',{namedCurve:'secp256k1'});
 assert.throws(()=>issueTicket(other.privateKey,base),/key_must_be_p256/);
 assert.throws(()=>new TicketConsumer({publicKey:other.publicKey,...base,origins:new Set([origin]),assertOwner:()=>true}),/key_must_be_p256/);
});
