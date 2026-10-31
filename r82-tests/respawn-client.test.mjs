// Exact old/new shipped bundle effects with controlled React lifecycle/clock.
// One timeout test additionally runs the shipped Q/browserRequest functions
// against the actual unmodified Core511Transport command queue.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {buildRespawnClientR82,oldHash,oldName} from './respawn-client-build.mjs';
import {harness,shippedEffect} from '../r82-investigation/client/respawn-effect-repro.mjs';
import {Core511Transport} from '../r82-work/core511-source/scripts/core511/generated/client/core511-transport-r79-715e78ecd9021ea8.js';

const proof=buildRespawnClientR82();
const directory=new URL('../r82-work/core511-source/scripts/core511/generated/client/',import.meta.url);
const before=fs.readFileSync(new URL(oldName,directory),'utf8');
const after=fs.readFileSync(new URL(proof.newName,directory),'utf8');
const start=after.indexOf('  (0, R.useEffect)(() => {\n    if (!Ea2 || !Db || wb > 0)');
const end=after.indexOf('\n  let Ub =',start);
const effect=after.slice(start,end);
const alive=(revision=11,area='forest')=>({ok:true,hp:100,maxHp:100,hpRevision:revision,area,x:10,y:20});
const setup=options=>harness({effect,...options});
const setWorld=(h,patch,playerPatch={})=>{
 const previous=h.sandbox.F2.current;
 h.sandbox.F2.current={...previous,...patch,players:previous.players.map(p=>p.id===h.sandbox.g2.current?{...p,...playerPatch}:p)};
};

test('only one effect changed; exact inverse restores immutable R79 bytes',()=>{
 assert.equal(createHash('sha256').update(before).digest('hex'),oldHash);
 assert.equal(after.slice(0,start)+shippedEffect+after.slice(end),before);
 assert.equal(createHash('sha256').update(after).digest('hex'),proof.newSha256);
 assert(proof.exactInverse&&proof.oldBundleUnchanged);
});

for(const scope of ['channel','cycle'])test('old '+scope+' scope race sticks; new effect ignores old response and schedules current death',async()=>{
 const old=harness();old.render();await old.advance(2680);
 setWorld(old,scope==='channel'?{channel:2}:{world:{cycle:2}});old.render();
 old.http[0].resolve(alive());await old.flush();await old.advance(60000);
 assert.equal(old.requests(),1);assert.equal(old.sandbox.Ho2,0);assert.equal(old.sandbox.le2.current,true);assert.equal(old.jobs.size,0);old.cleanup();
 const h=setup();h.render();await h.advance(2680);
 setWorld(h,scope==='channel'?{channel:2}:{world:{cycle:2}});h.render();
 const currentToken=h.sandbox.le2.current;assert.equal(typeof currentToken,'object');
 h.http[0].resolve(alive());await h.flush();
 assert.equal(h.sandbox.Ho2,0,'old response cannot revive a different scope');
 assert.equal(h.sandbox.le2.current,currentToken,'old finally cannot release new effect ownership');
 await h.advance(120);assert.equal(h.requests(),2);
 h.http[1].resolve(alive());await h.flush();
 assert.equal(h.sandbox.Ho2,100);assert.equal(h.sandbox.le2.current,false);h.cleanup();
});

test('stale success retains revision guard, refreshes and retries the same dead lifecycle',async()=>{
 const old=harness({response:()=>alive(9)});old.render();await old.advance(10000);
 assert.equal(old.requests(),1);assert.equal(old.refreshes(),0);assert.equal(old.sandbox.Ho2,0);old.cleanup();
 const h=setup({response:n=>alive(n===1?9:11)});h.render();await h.advance(2680);
 assert.equal(h.sandbox.Ho2,0);assert.equal(h.refreshes(),1);assert.equal(h.requests(),1);
 await h.advance(899);assert.equal(h.requests(),1);await h.advance(1);
 assert.equal(h.requests(),2);assert.equal(h.sandbox.Ho2,100);assert.equal(h.jobs.size,0);h.cleanup();
});

test('normal and native cross-area respawn apply only supplied authoritative HP and coordinates',async()=>{
 for(const area of ['forest','bazaar','sanctum','rune_v2','kadim_0123456789abcdef0123456789abcdef_01']){
  const h=setup({response:()=>({...alive(11,area),hp:73,maxHp:137,x:77,y:88})});h.render();await h.advance(2680);
  assert.equal(h.sandbox.Ho2,73);assert.equal(h.sandbox.F2.current.area,area);
  assert.equal(h.sandbox.F2.current.players[0].max_hp,137);assert.equal(h.sandbox.b2.current.x,77);assert.equal(h.sandbox.b2.current.y,88);
  assert.equal(h.refreshes(),1);assert.equal(h.jobs.size,0);assert.equal(h.sandbox.le2.current,false);h.cleanup();
 }
});

test('same channel/cycle rebind uses existing transport epoch; no epoch is invented in the response',async()=>{
 const h=setup();h.render();await h.advance(2680);h.sandbox.core.epoch=2;h.render();
 const token=h.sandbox.le2.current;h.http[0].resolve(alive());await h.flush();
 assert.equal(h.sandbox.Ho2,0);assert.equal(h.sandbox.le2.current,token);
 await h.advance(120);h.http[1].resolve(alive());await h.flush();
 assert.equal(h.sandbox.Ho2,100);h.cleanup();
});

test('replacement transport with identical epoch and scope still retires the old effect',async()=>{
 const h=setup();h.render();await h.advance(2680);
 h.sandbox.core={...h.sandbox.core,queue:[]};h.render();const token=h.sandbox.le2.current;
 h.http[0].resolve(alive());await h.flush();assert.equal(h.sandbox.Ho2,0);assert.equal(h.sandbox.le2.current,token);
 await h.advance(120);h.http[1].resolve(alive());await h.flush();assert.equal(h.sandbox.Ho2,100);h.cleanup();
});

test('new game instance and different player identity discard stale responses',async()=>{
 for(const change of ['instance','player']){
  const h=setup();h.render();await h.advance(2680);
  if(change==='instance')h.sandbox.Kt=()=> 'new-instance';
  else{h.sandbox.g2.current='p2';h.sandbox.core.playerId='p2';setWorld(h,{},{});h.sandbox.F2.current.players[0].id='p2';}
  h.render();const token=h.sandbox.le2.current;
  h.http[0].resolve(alive());await h.flush();assert.equal(h.sandbox.Ho2,0);assert.equal(h.sandbox.le2.current,token,change);
  await h.advance(120);h.http[1].resolve(alive());await h.flush();assert.equal(h.sandbox.Ho2,100);h.cleanup();
 }
});

test('a temporary transport/UI owner mismatch starts no request and resumes when the actual owner matches',async()=>{
 const h=setup();h.sandbox.core.playerId='other';h.render();await h.advance(10000);
 assert.equal(h.requests(),0);assert.equal(h.jobs.size,0);assert.equal(h.sandbox.le2.current,false);
 h.sandbox.core.playerId='p';h.render();await h.advance(120);assert.equal(h.requests(),1);
 h.http[0].resolve(alive());await h.flush();assert.equal(h.sandbox.Ho2,100);assert.equal(h.jobs.size,0);h.cleanup();
});

test('a transport owner change during a request cannot apply the old response, even before React renders',async()=>{
 const h=setup();h.render();await h.advance(2680);h.sandbox.core.playerId='other';
 h.http[0].resolve(alive());await h.flush();await h.advance(10000);
 assert.equal(h.sandbox.Ho2,0);assert.equal(h.sandbox.D2.current,10);assert.equal(h.requests(),1);
 assert.equal(h.sandbox.le2.current,false);assert.equal(h.jobs.size,0);assert.equal(h.refreshes(),1);
 h.render();h.sandbox.core.playerId='p';h.render();await h.advance(120);assert.equal(h.requests(),2);
 h.http[1].resolve(alive());await h.flush();assert.equal(h.sandbox.Ho2,100);h.cleanup();
});

test('actual transport admission publishes a render after installing owner identity and epoch',async()=>{
 const h=setup();let socket;
 class Socket{
  constructor(){socket=this;this.readyState=1;this.bufferedAmount=0;this.listeners=new Map();}
  addEventListener(kind,fn){this.listeners.set(kind,fn);}
  send(){} close(){}
 }
 const core=new Core511Transport({now:()=>h.now(),fetch:()=>{throw Error('unexpected fetch');},WebSocket:Socket,origin:'https://fixture.invalid',headers:()=>({})});
 h.sandbox.core=core;
 const off=core.subscribe(kind=>{if(kind==='status'||kind==='world')h.render();});
 assert.equal(core.playerId,undefined);assert.equal(h.jobs.size,0);assert.equal(h.requests(),0);
 const opening=core.open({url:'/game/channel/1',channel:1,epoch:7,playerId:'p',ticket:'fixture'});
 assert.equal(core.playerId,'p','ticket owner is installed before ready');assert.equal(h.jobs.size,0);
 socket.listeners.get('message')({data:JSON.stringify({type:'ready',protocol:'coreoflife-kernel-v1',channel:1,epoch:7,lastAccepted:0,lastApplied:0})});
 await opening;assert.equal(core.epoch,7);assert.equal(h.nextAt()-h.now(),2680);
 await h.advance(2680);assert.equal(h.requests(),1);h.http[0].resolve(alive());await h.flush();
 assert.equal(h.sandbox.Ho2,100);assert.equal(h.jobs.size,0);off();h.cleanup();core.dispose();
});

test('a second death before an old success cannot resurrect the newer life',async()=>{
 const h=setup();h.render();await h.advance(2680);
 setWorld(h,{}, {hp:0,hp_revision:12,respawn_at_ms:1006000});h.sandbox.D2.current=12;h.sandbox.w2.current=0;h.render();
 const token=h.sandbox.le2.current;
 h.http[0].resolve(alive(11));await h.flush();assert.equal(h.sandbox.Ho2,0);assert.equal(h.sandbox.D2.current,12);assert.equal(h.sandbox.le2.current,token);
 await h.advance(3400);assert.equal(h.requests(),2);h.http[1].resolve(alive(13));await h.flush();
 assert.equal(h.sandbox.Ho2,100);assert.equal(h.sandbox.D2.current,13);h.cleanup();
});

test('death revision dependency restarts even when timer and HP remain identical',async()=>{
 const h=setup();h.render();await h.advance(2680);
 setWorld(h,{}, {hp_revision:12});h.sandbox.D2.current=12;h.render();
 h.http[0].resolve(alive(11));await h.flush();await h.advance(120);assert.equal(h.requests(),2);
 h.http[1].resolve(alive(13));await h.flush();assert.equal(h.sandbox.D2.current,13);h.cleanup();
});

test('healthy authority arriving before the request result cancels obsolete work',async()=>{
 const h=setup();h.render();await h.advance(2680);
 setWorld(h,{}, {hp:77,hp_revision:11,respawn_at_ms:0});
 h.sandbox.D2.current=11;h.sandbox.w2.current=77;h.sandbox.Ho2=77;h.render();
 h.http[0].resolve(alive(12));await h.flush();await h.advance(10000);
 assert.equal(h.sandbox.Ho2,77);assert.equal(h.sandbox.D2.current,11);assert.equal(h.requests(),1);assert.equal(h.jobs.size,0);h.cleanup();
});

test('newer live HP revision held outside the older world image also blocks retries',async()=>{
 const h=setup();h.render();await h.advance(2680);
 h.sandbox.D2.current=11;h.sandbox.w2.current=77;h.sandbox.Ho2=77;
 h.http[0].resolve(alive());await h.flush();await h.advance(10000);
 assert.equal(h.requests(),1);assert.equal(h.sandbox.Ho2,77);assert.equal(h.jobs.size,0);h.cleanup();
});

test('cleanup cancels the timer; late rejected old request cannot clear a newer token',async()=>{
 const idle=setup();idle.render();idle.cleanup();await idle.advance(10000);assert.equal(idle.requests(),0);assert.equal(idle.jobs.size,0);
 const h=setup();h.render();await h.advance(2680);
 h.sandbox.J=async()=>{};h.render();const token=h.sandbox.le2.current;
 h.http[0].reject(Object.assign(Error('old arena response'),{payload:{code:'arena_waiting_for_round498'}}));
 await h.flush();assert.equal(h.sandbox.le2.current,token);assert.equal(h.sandbox.Ho2,0);
 await h.advance(120);assert.equal(h.requests(),2);h.http[1].resolve(alive());await h.flush();assert.equal(h.sandbox.Ho2,100);h.cleanup();
});

test('active team arena waits, including authoritative arena-wait response',async()=>{
 for(const mode of ['2v2','3v3','5v5']){
  const h=setup();setWorld(h,{area:'arena',arenaMatch:{id:'arena-id',mode}},{area:'arena'});h.render();await h.advance(20000);
  assert.equal(h.requests(),0);assert.equal(h.jobs.size,0);assert.equal(h.sandbox.Ho2,0);h.cleanup();
 }
 const h=setup({response:()=>{throw Object.assign(Error('wait'),{payload:{code:'arena_waiting_for_round498'}});}});
 h.render();await h.advance(20000);assert.equal(h.requests(),1);assert.equal(h.refreshes(),1);assert.equal(h.jobs.size,0);assert.equal(h.sandbox.le2.current,false);h.cleanup();
});

test('malformed 200 replies never manufacture HP or a health revision',async()=>{
 const cases=[{},null,{ok:true},{...alive(),hp:0},{...alive(),hp:NaN},{...alive(),hp:Infinity},
  {...alive(),hp:101},{...alive(),hp:'100'},{...alive(),maxHp:null},{...alive(),hpRevision:10},
  {...alive(),hpRevision:11.5},{...alive(),hpRevision:'11'},{...alive(),x:undefined},{...alive(),y:NaN},{...alive(),area:''}];
 for(const reply of cases){
  const h=setup({response:()=>reply});h.render();await h.advance(2680);
  assert.equal(h.sandbox.Ho2,0,JSON.stringify(reply));assert.equal(h.sandbox.D2.current,10);
  assert.equal(h.refreshes(),1);assert.equal(h.nextAt(),h.now()+900);h.cleanup();
 }
});

test('ordinary errors retry once after refresh; refresh rejection cannot strand the attempt',async()=>{
 const h=setup({response:n=>{if(n===1)throw Error('temporary');return alive();}});
 let refreshes=0;h.sandbox.J=async()=>{refreshes++;throw Error('temporary refresh');};
 h.render();await h.advance(2680);assert.equal(h.requests(),1);assert.equal(refreshes,1);assert.equal(h.sandbox.Ho2,0);
 await h.advance(900);assert.equal(h.requests(),2);assert.equal(h.sandbox.Ho2,100);assert.equal(h.jobs.size,0);h.cleanup();
});

test('hanging refresh is bounded, shared within the effect and cancelled safely',async()=>{
 const h=setup({response:()=>({})});let refreshes=0,finish;
 h.sandbox.J=()=>{refreshes++;return new Promise(resolve=>{finish=resolve;});};h.render();await h.advance(2680);
 assert.equal(refreshes,1);assert.equal(h.requests(),1);await h.advance(3499);assert.equal(h.requests(),1);
 await h.advance(901);assert.equal(h.requests(),2);assert.equal(refreshes,1,'same outstanding snapshot request reused');
 h.cleanup();finish();await h.flush();await h.advance(30000);assert.equal(h.requests(),2);assert.equal(h.jobs.size,0);assert.equal(h.sandbox.le2.current,false);
});

test('successful refresh confirming life ends retries even when request reply was skipped',async()=>{
 const h=setup({response:()=>alive(9)});
 h.sandbox.J=async()=>{setWorld(h,{}, {hp:69,hp_revision:11,respawn_at_ms:0});h.sandbox.D2.current=11;h.sandbox.w2.current=69;h.sandbox.Ho2=69;};
 h.render();await h.advance(20000);assert.equal(h.requests(),1);assert.equal(h.sandbox.Ho2,69);assert.equal(h.jobs.size,0);h.cleanup();
});

test('actual shipped Q timeout leaves one accepted transport respawn and the new effect does not duplicate it',async()=>{
 const h=setup(),wire=[];
 const core=new Core511Transport({now:()=>h.now(),fetch:()=>{throw Error('unexpected HTTP fallback');},WebSocket:class {},origin:'https://fixture.invalid',headers:()=>({})});
 Object.assign(core,{ready:true,epoch:1,playerId:'p',world:h.sandbox.F2.current});
 core.ws={readyState:1,bufferedAmount:0,send:raw=>wire.push(JSON.parse(raw)),close:()=>{}};
 h.sandbox.core=core;
 const transport=fs.readFileSync(new URL('core511-transport-r79-715e78ecd9021ea8.js',directory),'utf8');
 const browserStart=transport.indexOf('function browserRequest('),browserEnd=transport.indexOf('\nif (typeof window',browserStart);
 const qStart=before.indexOf('var Q_ = class extends Error'),qEnd=before.indexOf('\nfunction ev(',qStart);
 assert(browserStart>=0&&browserEnd>browserStart&&qStart>=0&&qEnd>qStart);
 Object.assign(h.sandbox,{Headers,Request,AbortController,DOMException,document:{cookie:''},k_:8000,
  fetch:()=>{throw Error('unexpected native fetch');},browserCore:()=>core,publishAzrailResultR68:()=>{},
  Z_:null});
 vm.runInContext(transport.slice(browserStart,browserEnd)+'\n'+before.slice(qStart,qEnd),h.sandbox);
 h.sandbox.Z_=h.sandbox.browserRequest;
 h.render();await h.advance(2680);assert.equal(wire.length,1);assert.equal(core.active.payload.action,'respawn');
 await h.advance(30000);assert.equal(wire.length,1,'HTTP observer timeout must not enqueue another accepted respawn');
 assert.equal(core.queue.length,0);assert.equal(core.active.payload.action,'respawn');assert.equal(h.sandbox.Ho2,0);
 core.result({type:'action',sequence:1,status:200,body:alive()});await h.flush();
 setWorld(h,{}, {hp:100,hp_revision:11,respawn_at_ms:0});h.sandbox.D2.current=11;h.sandbox.w2.current=100;h.sandbox.Ho2=100;h.render();
 await h.advance(10000);assert.equal(wire.length,1);assert.equal(core.active,null);assert.equal(h.jobs.size,0);
 h.cleanup();core.dispose();
});

test('fresh page state accepts the native death-revision-plus-one response in both clients',async()=>{
 for(const selected of [shippedEffect,effect]){
  const h=harness({effect:selected,response:()=>alive()});h.sandbox.oe2.current=-1;
  // Initial snapshot has installed dead revision10 after mount D=0/oe=-1.
  h.render();await h.advance(2680);assert.equal(h.sandbox.D2.current,11);assert.equal(h.sandbox.Ho2,100);h.cleanup();
 }
});

test('zero death deadline plus native409 is retried but never fabricated into a resurrection',async()=>{
 for(const selected of [shippedEffect,effect]){
  const h=harness({effect:selected,response:()=>{throw Object.assign(Error('not ready'),{status:409});}});
  setWorld(h,{}, {respawn_at_ms:0});h.render();await h.advance(5380);
  assert.equal(h.requests(),4);assert.equal(h.sandbox.Ho2,0);assert.equal(h.sandbox.D2.current,10);h.cleanup();
 }
});

test('future authoritative deadline remains enforced with a normal clock',async()=>{
 for(const selected of [shippedEffect,effect]){
  const future=harness({effect:selected,response:()=>alive()});setWorld(future,{}, {respawn_at_ms:1300000});future.render();
  await future.advance(300000);assert.equal(future.requests(),0);await future.advance(80);assert.equal(future.requests(),1);future.cleanup();
 }
});

test('actual existing xp2 server clock fixes both -120s and +120s device skew and keeps the normal delay',async()=>{
 const clockStart=before.indexOf('xp2 = (0, R.useCallback)(() => {\n    let e4 = $t2.current;');
 const clockEnd=before.indexOf('}, []), Sp2 =',clockStart);
 assert(clockStart>=0&&clockEnd>clockStart,'exact shipped xp2 clock callback');
 for(const offset of [-120000,0,120000]){
  const old=harness({response:()=>alive(),clockOffset:offset});old.render();
  assert.equal(old.nextAt()-old.now(),offset===-120000?122680:offset===120000?120:2680);old.cleanup();
  const h=setup({response:()=>alive(),clockOffset:offset});
  h.sandbox.$t2={current:{observedAt:h.now(),serverTimeMs:1000000}};
  vm.runInContext(before.slice(clockStart,clockEnd)+'}, []);',h.sandbox);
  h.render();assert.equal(h.nextAt()-h.now(),2680,offset+'ms device skew');
  await h.advance(2679);assert.equal(h.requests(),0);await h.advance(1);assert.equal(h.requests(),1);assert.equal(h.sandbox.Ho2,100);h.cleanup();
 }
});

test('one server-clock read preserves the zero-deadline fallback and past-deadline minimum',async()=>{
 for(const [deadline,delay] of [[0,2680],[999999,120]]){
  const h=setup({response:()=>alive()});let clockReads=0;
  h.sandbox.xp2=()=>{clockReads++;return 1000000;};setWorld(h,{}, {respawn_at_ms:deadline});h.render();
  assert.equal(clockReads,1);assert.equal(h.nextAt()-h.now(),delay);await h.advance(delay);assert.equal(h.requests(),1);assert.equal(h.sandbox.Ho2,100);h.cleanup();
 }
});
