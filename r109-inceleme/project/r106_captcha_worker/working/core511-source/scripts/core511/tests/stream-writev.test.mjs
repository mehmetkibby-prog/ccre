import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter,once} from 'node:events';
import {MessageChannel} from 'node:worker_threads';
import {ProcessStream} from '../process-stream.mjs';
import {MessagePortStream} from '../message-port-stream.mjs';
test('corked IPC bytes retain order and stream identity; all callbacks await the actual send callback',async t=>{
 const peer=new EventEmitter(),sent=[],callbacks=[],acks=[];peer.connected=true;peer.send=(message,callback)=>{sent.push(message);callbacks.push(callback);};const stream=new ProcessStream(peer,{stream:'owned',connect:false});t.after(()=>stream.destroy());
 stream.cork();for(const [i,chunk]of [Buffer.from([0,1,2]),Buffer.from('gövde😀'),Buffer.from([255,0])].entries())stream.write(chunk,()=>acks.push(i));stream.uncork();
 assert.equal(sent.length,1);assert.equal(sent[0].stream,'owned');assert.deepEqual(sent[0].bytes,Buffer.concat([Buffer.from([0,1,2]),Buffer.from('gövde😀'),Buffer.from([255,0])]));assert.deepEqual(acks,[]);callbacks[0]();await new Promise(r=>setImmediate(r));assert.deepEqual(acks,[0,1,2]);
 const received=[];stream.on('data',bytes=>received.push(bytes));peer.emit('message',{type:'kernel511-bytes',stream:'foreign',bytes:Buffer.from('wrong')});peer.emit('message',{type:'kernel511-bytes',stream:'owned',bytes:sent[0].bytes});await new Promise(r=>setImmediate(r));assert.deepEqual(received,[sent[0].bytes]);
});
test('corked MessagePort writes use one cloned message with unchanged bytes and EOF',async t=>{
 const {port1,port2}=new MessageChannel(),stream=new MessagePortStream(port1);t.after(()=>{stream.destroy();port2.close();});const messages=[];port2.on('message',x=>messages.push(x));
 stream.cork();stream.write(Buffer.from('header'));stream.write(Buffer.from('body'));stream.uncork();await once(port2,'message');assert.equal(messages.length,1);assert.equal(Buffer.from(messages[0]).toString(),'headerbody');stream.end();await once(port2,'message');assert.equal(messages[1],null);
});
test('disconnected batched IPC fails every write and sends no bytes',async t=>{
 const peer=new EventEmitter();peer.connected=false;peer.send=()=>assert.fail('disconnected send');const stream=new ProcessStream(peer,{connect:false});t.after(()=>stream.destroy());stream.on('error',()=>{});const closed=new Promise(resolve=>stream.once('close',resolve)),errors=[];stream.cork();stream.write('a',e=>errors.push(e));stream.write('b',e=>errors.push(e));stream.uncork();await closed;assert.equal(errors.length,2);assert(errors.every(e=>e.message==='process_ipc_disconnected'));
});
