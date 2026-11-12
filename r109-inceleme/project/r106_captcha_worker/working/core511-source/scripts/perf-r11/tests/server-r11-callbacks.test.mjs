import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID,randomBytes} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parse} from './parser.mjs';

const root=process.env.COL_NATIVE_TEST_ROOT;
const digest=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=await readFile(join(root,'realm-package-manifest.json'));
assert.equal(digest(manifestBytes),process.env.COL_NATIVE_TEST_MANIFEST_SHA256);
const manifest=new Map(JSON.parse(manifestBytes).files.map(r=>[r.path,r]));
async function source(name){
 const path='vds-server/src/'+name,bytes=await readFile(join(root,path)),pin=manifest.get(path);
 assert.ok(pin,'source must be in the candidate manifest');assert.equal(bytes.length,pin.bytes);assert.equal(digest(bytes),pin.sha256);return bytes.toString();
}
function find(node,predicate,out=[]){
 if(!node||typeof node!=='object')return out;if(predicate(node))out.push(node);
 for(const value of Object.values(node)){
  if(Array.isArray(value)){for(const child of value)find(child,predicate,out);}
  else if(value&&typeof value==='object')find(value,predicate,out);
 }
 return out;
}
async function callback(name,bindings){
 const text=await source(name),ast=parse(text,{ecmaVersion:'latest',sourceType:'module'});
 const nodes=find(ast,n=>n.type==='AssignmentExpression'&&n.left?.object?.name==='database'&&n.left?.property?.name==='onCommitted');
 assert.equal(nodes.length,1);const arrow=nodes[0].right;assert.equal(arrow.type,'ArrowFunctionExpression');
 // The whole exact shipped callback is executed. Only its surrounding service
 // objects are controlled boundaries; the callback body is not rewritten.
 return new Function(...Object.keys(bindings),'return ('+text.slice(arrow.start,arrow.end)+');')(...Object.values(bindings));
}

test('exact shared callback forwards the same per-ACK Map synchronously and retains shared invalidation',async()=>{
 const events=[],rows=new Map([['players\u001ereal-1',{hp:99}]]),changes=[{table:'players',keys:['real-1']}];
 const cb=await callback('channel-shared-runtime.mjs',{prior:(c,r)=>events.push(['prior',c,r]),state:{changed:c=>events.push(['shared',c])}});
 assert.equal(cb(changes,rows),undefined);assert.deepEqual(events.map(e=>e[0]),['prior','shared']);assert.equal(events[0][1],changes);assert.equal(events[0][2],rows);assert.equal(events[1][1],changes);
 cb(changes);assert.equal(events[2][2],undefined,'direct notifications retain the absence of an ACK cache');
});

test('exact dungeon callback forwards the same per-ACK Map and retains pending-run invalidation',async()=>{
 const events=[],pendingRunIds=new Set(),rows=new Map(),changes=[{table:'dungeon_runs',keys:['run-a']}];
 const cb=await callback('channel-dungeon-runtime.mjs',{prior:(c,r)=>events.push([c,r]),snapshot:{tables:['dungeon_runs'],ignoresChange:()=>false,loadedRunIds:new Set(['run-a'])},pendingRunIds,engine:{runs:new Map()},invalid:false});
 assert.equal(cb(changes,rows),undefined);assert.equal(events[0][0],changes);assert.equal(events[0][1],rows);assert.deepEqual([...pendingRunIds],['run-a']);
 cb(changes);assert.equal(events[1][1],undefined);
});

test('exact supervisor preserves actual ready and later child health snapshots without substituting parent values',{timeout:5000},async()=>{
 const text=await source('channel-supervisor.mjs'),ast=parse(text,{ecmaVersion:'latest',sourceType:'module'});
 const nodes=find(ast,n=>n.type==='ClassDeclaration'&&n.id?.name==='ChannelSupervisor');assert.equal(nodes.length,1);
 const {perfR11Features}=await import(pathToFileURL(join(root,'vds-server/src/perf-r11-features.mjs')));
 const protocol=await import(pathToFileURL(join(root,'vds-server/src/channel-protocol.mjs')));
 const child=new EventEmitter();Object.assign(child,{pid:101,exitCode:null,signalCode:null,kill(){throw Error('unexpected kill');}});
 let spawnOptions;const fork=(_entry,_args,options)=>{spawnOptions=options;return child;};
 class ChannelRpc{constructor(){this.health={};}async request(method){assert.equal(method,'health');return this.health;}close(){}}
 const bindings={fork,randomUUID,randomBytes,ChannelRpc,channelNumber:protocol.channelNumber,channelError:protocol.channelError,ensureChannelDungeonIndexes:()=>{},lifecycle477:()=>{},perfR11Features};
 const Supervisor=new Function(...Object.keys(bindings),'return ('+text.slice(nodes[0].start,nodes[0].end)+');')(...Object.values(bindings));
 const supervisor=new Supervisor({database:{},authority:{registerProcess:async()=>{}},writer:{reserveEvents:async()=>({})},entry:'/not-executed.mjs',startupMs:3000});
 const pending=supervisor.startChannel(1);await new Promise(r=>setImmediate(r));const state=supervisor.children.get(1);
 const ready={source:'child-ready',appliedSha256:'a'.repeat(64),values:{ackRowReuse:true}};
 child.emit('message',{type:'resident-channel-ready',channel:1,incarnation:state.incarnation,port:3101,perfR11Features:ready});await pending;
 assert.equal(supervisor.snapshot().channels[0].perfR11Features,ready,'the child ready payload is preserved by identity');
 assert.equal(spawnOptions.serialization,perfR11Features.enabled('channelAdvancedIpc')?'advanced':'json');
 const health={source:'child-health',appliedSha256:'b'.repeat(64),values:{ackRowReuse:false}};state.rpc.health={perfR11Features:health};
 const sampled=await supervisor.sample();assert.equal(sampled.channels[0].perfR11Features,health,'a mismatched child setting remains visible for the installer to reject');assert.notEqual(health,perfR11Features.snapshot);
 state.perfR11Features=null;state.rpc.health={};assert.equal((await supervisor.sample()).channels[0].perfR11Features,null,'neither actual child source means null, never a parent substitute');
});
