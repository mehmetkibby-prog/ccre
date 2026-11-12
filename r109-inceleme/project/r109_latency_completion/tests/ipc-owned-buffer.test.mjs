import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {once,EventEmitter} from 'node:events';
import {ProcessStream} from '../working/core511-source/scripts/core511/process-stream.mjs';
import {framed,receiveFrames} from '../working/core511-source/scripts/core511/reliable-stream.mjs';

const later=()=>new Promise(resolve=>setImmediate(resolve));
test('advanced process IPC owns a stable snapshot after every write callback, including queued writes',{timeout:15000},async t=>{
 const child=fork(new URL('./ipc-owned-buffer-child.mjs',import.meta.url),[],{serialization:'advanced',stdio:['ignore','ignore','pipe','ipc']});
 let stderr='';child.stderr.on('data',bytes=>stderr+=bytes);t.after(()=>{if(child.connected)child.disconnect();if(child.exitCode===null)child.kill();});
 const stream=new ProcessStream(child,{stream:'test'}),received=[],failures=[];stream.on('error',error=>failures.push(error.message));
 receiveFrames(stream,(frame)=>received.push(frame),error=>failures.push(error.message));
 const expected=Array.from({length:32},(_,id)=>({id,text:'Türkçe😀'+String(id).repeat(65536)}));
 let callbacks=0,wasBackpressured=false;const sent=[];
 for(const value of expected){
  // Distinct subranges exercise offsets and prevent pooled backing bytes being
  // mistaken for the frame. Writable owns each range until its callback.
  const raw=framed(value),storage=Buffer.alloc(raw.length+17,0xa5),chunk=storage.subarray(7,7+raw.length);raw.copy(chunk);
  sent.push(new Promise((resolve,reject)=>{if(!stream.write(chunk,error=>{callbacks++;chunk.fill(0);error?reject(error):resolve();}))wasBackpressured=true;}));
 }
 await Promise.all(sent);const deadline=Date.now()+8000;while(received.length<expected.length&&Date.now()<deadline)await later();
 assert.deepEqual(failures,[],stderr);assert.equal(callbacks,expected.length);assert(wasBackpressured);assert.deepEqual(received,expected,'callbacks permit caller reuse without mutating serialized frames');
 const done=once(child,'exit');stream.end();await done;assert.deepEqual(failures,[],stderr);
});
test('received typed-array subrange, stream demultiplexing and EOF retain exact bytes',async t=>{
 const peer=new EventEmitter();peer.connected=true;peer.send=()=>{};const stream=new ProcessStream(peer,{stream:'owned',connect:false});t.after(()=>stream.destroy());
 const chunks=[];stream.on('data',bytes=>chunks.push(bytes));const raw=new Uint8Array([99,1,2,3,98]);
 peer.emit('message',{type:'kernel511-bytes',stream:'foreign',bytes:new Uint8Array([77])});
 peer.emit('message',{type:'kernel511-bytes',stream:'owned',bytes:raw.subarray(1,4)});
 const ended=once(stream,'end');peer.emit('message',{type:'kernel511-bytes',stream:'owned',bytes:null});await ended;
 assert.deepEqual(Buffer.concat(chunks),Buffer.from([1,2,3]));
});
