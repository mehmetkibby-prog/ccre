import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {BASE,SHA,hash,native} from './helpers.mjs';
import {createCpuProfiler507,createProfileCoordinator507,PROFILE507_MS,PROFILE507_TTL,PROFILE507_MAX,PROFILE507_CHUNK} from '../generated/profiler-rules.mjs';
import {KernelDiagnostics} from '../diagnostics.mjs';
import {StreamControl} from '../reliable-stream.mjs';

test('profiler retains exact pinned native capture and limits; only coordinator targets extend',async()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/profiler-proof.json',import.meta.url)));assert.equal(proof.baselineManifestSha256,SHA);
 for(const row of proof.sources)assert.equal(hash(fs.readFileSync(path.join(BASE,row.file))),row.sha256);
 assert.equal(hash(fs.readFileSync(new URL('../generated/profiler-rules.mjs',import.meta.url))),proof.generatedSha256);
 const original=await native('vds-server/src/cpu-profile507.mjs');assert.equal(createCpuProfiler507.toString(),original.createCpuProfiler507.toString());
 assert.deepEqual([PROFILE507_MS,PROFILE507_TTL,PROFILE507_MAX,PROFILE507_CHUNK],[60000,300000,16777216,65536]);
});

test('actual native inspector captures a bounded profile without a listening inspector port',{timeout:5000},async t=>{
 // Short duration is confined to this factory test. Every runtime uses the
 // original60-second defaults, asserted separately in the OS-process test.
 const profiler=createCpuProfiler507({duration:80,ttl:1000});t.after(()=>profiler.close());const id=randomUUID();
 assert.equal((await profiler.command({operation:'status'})).state,'idle');const before=Date.now(),started=await profiler.command({operation:'start',id}),after=Date.now();assert(started.startedAtMs>=before&&started.startedAtMs<=after);assert(started.endsAtMs>=started.startedAtMs+80&&started.endsAtMs<=after+80);
 let state;for(let n=0;n<100;n++){await pause(10);state=await profiler.command({operation:'status',id});if(state.state==='ready')break;}assert.equal(state.state,'ready');assert(state.bytes>0&&state.bytes<=PROFILE507_MAX);
 let body='',part;do{part=await profiler.command({operation:'chunk',id,offset:body.length});assert(part.chunk.length<=PROFILE507_CHUNK);body+=part.chunk;}while(body.length<part.length);
 const profile=JSON.parse(body);assert(profile.nodes.length>0);assert(Array.isArray(profile.samples));assert(profile.nodes.every(n=>!n.callFrame?.url?.includes(BASE)&&!/[?#]/.test(n.callFrame?.url??'')&&(n.callFrame?.functionName??'').length<=200));
 assert.equal((await profiler.command({operation:'status',id:randomUUID()})).state,'expired');await assert.rejects(profiler.command({operation:'chunk',id,offset:-1}),{code:'profile_invalid_offset'});
});

test('native profiler schedules exactly60s even when separate start/end clock reads straddle a millisecond',async()=>{
 const original=await native('vds-server/src/cpu-profile507.mjs'),results=[];
 for(const factory of [original.createCpuProfiler507,createCpuProfiler507]){
  let time=1000;const scheduled=[],calls=[],profiler=factory({now:()=>time++,sessionFactory:()=>({connect(){},disconnect(){},async post(method){calls.push(method);}}),schedule:(callback,delay)=>{scheduled.push(delay);return callback;},cancel:()=>{}});
  try{const state=await profiler.command({operation:'start',id:'12345678-1234-1234-1234-123456789abc'});assert.equal(state.state,'recording');assert.equal(state.endsAtMs-state.startedAtMs,60001);assert.deepEqual(scheduled,[60000]);results.push({state,calls,scheduled});}finally{profiler.close();}
 }
 assert.deepEqual(results[0],results[1]);
});

test('native coordinator routes all six owners, retains cooldown and rejects changed owners or malformed chunks',async()=>{
 for(const target of ['main','world','channel-1','channel-2','channel-3','channel-4']){
  let now=1000,state='recording',bad=false;const body='{"nodes":[],"samples":[]}',calls=[];
  const command=async request=>{calls.push(request);if(request.operation==='chunk')return {id:request.id,offset:bad?1:0,chunk:body,length:body.length};return {id:request.id,state,startedAtMs:now,endsAtMs:now+60000,bytes:Buffer.byteLength(body)};};
  const child={ready:true,rpc:{request:(method,request,options)=>{assert.equal(method,'cpuProfile507');assert.equal(options.timeoutMs,5000);return command(request);}}},children=new Map([[target==='world'?0:Number(target.slice(-1)),child]]),database={channelCompute:{children}},coordinate=createProfileCoordinator507({local:command,now:()=>now});
  const started=await coordinate(database,{operation:'start',target});assert.equal(started.target,target);assert.equal(started.nextStartAtMs,121000);await assert.rejects(coordinate(database,{operation:'start',target}),{code:'profile_busy'});
  state='ready';const response=await coordinate(database,{operation:'download',id:started.id});assert.equal(await response.text(),body);assert.match(response.headers.get('content-disposition'),new RegExp(target));
  bad=true;await assert.rejects(coordinate(database,{operation:'download',id:started.id}),{code:'profile_invalid_chunk'});
  if(target!=='main'){children.set(target==='world'?0:Number(target.slice(-1)),{...child});assert.equal((await coordinate(database,{operation:'status'})).state,'failed');}
  now=121001;bad=false;assert.equal((await coordinate(database,{operation:'start',target})).target,target);assert(calls.length>=5);
 }
 const coordinate=createProfileCoordinator507();await assert.rejects(coordinate({}, {operation:'start',target:'channel-5'}),{code:'profile_invalid_target'});await assert.rejects(coordinate({}, {operation:'start',target:'world'}),{code:'profile_process_unavailable'});
});

test('diagnostic samples share bounded requests and discard replies from a replaced process',async t=>{
 let clock=10000,calls=0,release;const pending=new Promise(resolve=>release=resolve),make=()=>({online:true,control:{request:async(method,_payload,options)=>{assert.equal(method,'metrics');assert.equal(options.timeoutMs,5000);calls++;return {players:1};}}});
 const old=make();old.control.request=async()=>{calls++;return pending;};const core={processes:new Map([[1,make()],[2,make()],[3,make()],[4,old]]),sharedWorld:{row:{...make(),state:'running',exited:false}}},diagnostics=new KernelDiagnostics(core,{clock:()=>clock});t.after(()=>diagnostics.close());
 const first=diagnostics.sample(),second=diagnostics.sample();core.processes.set(4,make());release({players:999});const [a,b]=await Promise.all([first,second]);assert.deepEqual(a,b);assert.equal(calls,5);assert.equal(a.targets.length,5);assert.deepEqual(a.targets.find(r=>r.target==='channel-4'),{target:'channel-4',available:false});assert.equal(a.scope,'server-processes-not-network-rtt');
 a.targets[0].available=false;const refreshed=await diagnostics.sample();assert.equal(refreshed.targets[0].available,true);assert.equal(refreshed.targets.find(r=>r.target==='channel-4').available,true);assert.equal(calls,10,'a changed owner invalidates even a subsecond cache');clock+=1001;assert.equal((await diagnostics.sample()).targets.find(r=>r.target==='channel-4').available,true);assert.equal(calls,15);
});

test('diagnostic timeout releases pending capacity and ignores late ACK without abandoning durable controls',async t=>{
 const control=new StreamControl();t.after(()=>control.close());const frames=[];control.attach(frame=>frames.push(frame));
 assert.throws(()=>control.request('freeze',{},{timeoutMs:15}),{code:'ipc_control_timeout_scope'});assert.equal(control.pending.size,0);
 const timed=control.request('profile',{operation:'status'},{id:'timed',timeoutMs:15});await Promise.all([assert.rejects(timed,{code:'ipc_control_timeout'}),pause(25)]);assert.equal(control.pending.size,0);
 control.receive({type:'control_result',id:'timed',ok:true,value:{state:'ready'}});const replay=[];control.attach(frame=>replay.push(frame));assert.equal(replay.length,0);
 const durable=control.request('freeze',{}, {id:'durable'});await pause(25);assert.equal(control.pending.size,1);control.receive({type:'control_result',id:'durable',ok:true,value:{frozen:true}});assert.deepEqual(await durable,{frozen:true});assert.equal(control.pending.size,0);
 const fast=control.request('metrics',{}, {id:'fast',timeoutMs:15});control.receive({type:'control_result',id:'fast',ok:true,value:{players:1}});assert.deepEqual(await fast,{players:1});await pause(25);assert.equal(control.pending.size,0);
});
