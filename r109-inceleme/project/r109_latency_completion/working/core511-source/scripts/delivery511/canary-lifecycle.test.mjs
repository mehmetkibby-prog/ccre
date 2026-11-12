import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {requestChild,stopChild} from './canary-lifecycle.mjs';

function child(send) {
 const c=new EventEmitter();Object.assign(c,{connected:true,exitCode:null,signalCode:null});
 c.send=(m,cb)=>{cb?.(null);send(c,m);};
 c.kill=signal=>{c.signalCode=signal;c.connected=false;c.emit('exit',null,signal);};return c;
}
test('RPC settles promptly when the generator exits during initialization',async()=>{
 const c=child(c=>queueMicrotask(()=>{c.exitCode=2;c.emit('exit',2,null);}));
 await assert.rejects(requestChild(c,'init',null,1000),/canary_child_exited:init/);
 for(const name of ['message','exit','error','disconnect'])assert.equal(c.listenerCount(name),0);
});
test('stop observes an exit occurring in the same turn as the acknowledgment',async()=>{
 const c=child((c,m)=>queueMicrotask(()=>{c.emit('message',{id:m.id,value:{stopped:true}});c.exitCode=0;c.connected=false;c.emit('exit',0,null);}));
 await stopChild(c,30);assert.equal(c.exitCode,0);assert.equal(c.listenerCount('exit'),0);
});
test('an unresponsive generator is terminated and cleanup remains a failure',async()=>{
 const c=child(()=>{});await assert.rejects(stopChild(c,20),/canary_child_timeout:stop/);
 assert.equal(c.signalCode,'SIGTERM');
});
test('a disconnected generator cannot leave a pending RPC behind',async()=>{
 const c=child(()=>{});c.connected=false;await assert.rejects(requestChild(c,'run'),/canary_child_unavailable/);
 assert.equal(c.listenerCount('message'),0);
});
