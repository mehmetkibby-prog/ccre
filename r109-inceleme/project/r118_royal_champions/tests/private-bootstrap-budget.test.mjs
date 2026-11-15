// Delayed initialization is simulated with Node's clock, not machine load.
// The real private ProcessStream and authenticated framing protocol are used.
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Duplex} from 'node:stream';
import {ProcessStream} from '../../r109_latency_completion/working/core511-source/scripts/core511/process-stream.mjs';
import {acceptStreamSocket,framed} from '../../r109_latency_completion/working/core511-source/scripts/core511/reliable-stream.mjs';
import {PROTOCOL} from '../../r109_latency_completion/working/core511-source/scripts/core511/contract.mjs';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const identity={realm:'fixture',channel:1,incarnation:'incarnation-1'};
const hello={type:'hello',protocol:PROTOCOL,...identity,proof:'private-proof'};
function fixture(t,{privatePipe=true,name='kernel511',pid=123}={}){
 t.mock.timers.enable({apis:['setTimeout']});
 const sent=[],peer=new EventEmitter();peer.pid=pid;peer.connected=true;
 peer.send=(message,callback)=>{sent.push(message.bytes);queueMicrotask(()=>callback?.());return true;};
 const socket=privatePipe?new ProcessStream(peer,{connect:false,stream:name}):new Duplex({read(){},write(bytes,encoding,callback){sent.push(Buffer.from(bytes));callback();}});
 t.after(()=>socket.destroy());let authenticated=0,dispatched=0,attached=0,closed=0;
 const options={authenticate:frame=>{authenticated++;return frame.realm===identity.realm&&frame.channel===1&&frame.incarnation===identity.incarnation&&frame.proof===hello.proof?identity:null;},dispatch:()=>{dispatched++;return {};},controlFor:()=>({attach(){attached++;},detach(){}}),onClose:()=>closed++};
 return {socket,options,send:frame=>privatePipe?peer.emit('message',{type:'kernel511-bytes',stream:name,bytes:framed(frame)}):socket.push(framed(frame)),counts:()=>({authenticated,dispatched,attached,closed}),frames:()=>sent.filter(Boolean).map(b=>JSON.parse(Buffer.from(b).toString('utf8',4)))};
}
test('private channel valid hello after6s succeeds within its existing20s bootstrap budget',async t=>{
 const f=fixture(t);acceptStreamSocket(f.socket,{...f.options,privateBootstrapMs:20000});
 await settle();t.mock.timers.tick(6000);
 assert.equal(f.socket.destroyed,false,'initialization must not be killed by the shorter general5s handshake timer');
 assert.deepEqual(f.counts(),{authenticated:0,dispatched:0,attached:0,closed:0});
 f.send(hello);await settle();assert.equal(f.socket.destroyed,false);assert.deepEqual(f.frames(),[{type:'ready',protocol:PROTOCOL}]);assert.equal(f.counts().attached,1);
 t.mock.timers.tick(30000);await settle();assert.equal(f.socket.destroyed,false,'successful authentication cancels the bootstrap timer');
});
test('private bootstrap still expires at20s and never authenticates a late hello',async t=>{
 const f=fixture(t);acceptStreamSocket(f.socket,{...f.options,privateBootstrapMs:20000});await settle();
 t.mock.timers.tick(19999);assert.equal(f.socket.destroyed,false);t.mock.timers.tick(1);assert.equal(f.socket.destroyed,true);await settle();
 f.send(hello);await settle();assert.deepEqual(f.counts(),{authenticated:0,dispatched:0,attached:0,closed:1});assert.deepEqual(f.frames(),[]);
});
for(const privatePipe of [false,true])test((privatePipe?'private default':'public default')+' handshake deadline remains5s',async t=>{
 const f=fixture(t,{privatePipe});acceptStreamSocket(f.socket,f.options);await settle();t.mock.timers.tick(4999);assert.equal(f.socket.destroyed,false);t.mock.timers.tick(1);assert.equal(f.socket.destroyed,true);await settle();assert.equal(f.counts().closed,1);
});
for(const config of [{privatePipe:false},{name:'kernel511-world'},{pid:null}])test('bootstrap override rejects an unqualified transport '+JSON.stringify(config),t=>{
 const f=fixture(t,config);assert.throws(()=>acceptStreamSocket(f.socket,{...f.options,privateBootstrapMs:20000}),{code:'ipc_private_bootstrap_scope'});
});
for(const ms of [0,-1,20001,Infinity,1.5,'20000'])test('bootstrap override rejects invalid or unbounded duration '+String(ms),t=>{
 const f=fixture(t);assert.throws(()=>acceptStreamSocket(f.socket,{...f.options,privateBootstrapMs:ms}),{code:'ipc_private_bootstrap_scope'});
});
for(const patch of [{proof:'forged'}, {incarnation:'old-incarnation'}, {realm:'wrong-realm'}])test('longer bootstrap does not accept forged or stale identity '+JSON.stringify(patch),async t=>{
 const f=fixture(t);acceptStreamSocket(f.socket,{...f.options,privateBootstrapMs:20000});await settle();t.mock.timers.tick(6000);f.send({...hello,...patch});await settle();assert.equal(f.socket.destroyed,true);assert.equal(f.counts().authenticated,1);assert.equal(f.counts().dispatched,0);assert.equal(f.counts().attached,0);assert.deepEqual(f.frames(),[]);
});
test('pre-auth requests stay forbidden and close cancels bootstrap cleanup',async t=>{
 const f=fixture(t);acceptStreamSocket(f.socket,{...f.options,privateBootstrapMs:20000});await settle();f.send({type:'request',id:'x',method:'command',payload:{}});await settle();assert.equal(f.socket.destroyed,true);assert.equal(f.counts().authenticated,0);assert.equal(f.counts().dispatched,0);assert.equal(f.counts().closed,1);t.mock.timers.tick(30000);await settle();assert.equal(f.counts().closed,1);
});
