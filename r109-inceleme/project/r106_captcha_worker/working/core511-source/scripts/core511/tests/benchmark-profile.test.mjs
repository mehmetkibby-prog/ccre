import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {TickTrace,measuredSend} from '../benchmark/tick-trace.mjs';
import {ProfileCapture} from '../benchmark/profile-capture.mjs';
import {summarizeProfile} from '../benchmark/analyze-profile.mjs';
import {nonDecreasingRuns} from '../benchmark/campaign-policy.mjs';
import {ChannelConnections} from '../channel-connections.mjs';
const burn=ms=>{const end=performance.now()+ms;while(performance.now()<end){};};
test('new stop counter resets at19; any criterion-count/input/channel improvement resets stagnation',()=>{
 const r=(pause=200,input=300,p95=26)=>({status:'measured',sourceUnchanged:true,channels:[1,2,3,4].map(channel=>({channel,maxPauseMs:pause,tickP95Ms:p95,tickP99Ms:40})),measurement:{eventLoops:[{target:'channel-3',maxPauseMs:pause}]},inputResponses:{p99Ms:90,maxMs:input},writer:{elu:.3},resources:{maxRssBytes:1e9},performanceAcceptance:{passed:false,failures:['channel_targets','input_response_targets','runtime_pause:channel-3']}});
 const h=Array.from({length:18},()=>r());assert.equal(nonDecreasingRuns(h),0);
 h.push(r(),r(),r());assert.equal(nonDecreasingRuns(h),3);
 h.push(r(200,299));assert.equal(nonDecreasingRuns(h),0);
 h.push(r(199,300));assert.equal(nonDecreasingRuns(h),0);
 h.push(r(200,300,24));assert.equal(nonDecreasingRuns(h),0);
 h.push(r(200,300,24));assert.equal(nonDecreasingRuns(h),1);
 h.push({status:'failed',measurementStarted:false});assert.equal(nonDecreasingRuns(h),1);
 h.push({status:'failed',measurementStarted:true});assert.equal(nonDecreasingRuns(h),2);
});
test('tick function nesting, GC overlap, top10 and startup split retain wall time',()=>{
 const t=new TickTrace();try{t.begin('test',performance.now());for(let i=0;i<12;i++)t.tick(()=>t.phase('combat',()=>t.call('parent',()=>{burn(.2);t.call('child',()=>burn(.3));})));
 const slow=t.active.slowest[0];t.gc.push({startedAtMs:slow.startedAtMs,endedAtMs:slow.endedAtMs,ms:slow.ms,kind:1});const r=t.end();assert.equal(r.ticks,12);assert.equal(r.slowest.length,10);assert.equal(r.segments.startup.ticks,12);assert.equal(r.segments.normal.ticks,0);for(const row of r.slowest){assert.equal(row.work.parent.count,1);assert.equal(row.work.child.count,1);assert(row.work.parent.totalMs>=row.work.child.totalMs);assert(Math.abs(row.work.parent.selfMs+row.work.child.totalMs-row.work.parent.totalMs)<.0001);}assert(Math.abs(r.slowest[0].gcOverlapMs-slow.ms)<.001); // Epoch double precision, not a timing-gate allowance.
 }finally{t.close();}
});
test('instrumented send keeps native guard, bytes, return value and thrown serialization behavior',()=>{
 for(const state of ['missing','closed','slow','ok','circular']){const outcomes=[];for(const measured of [false,true]){const sent=[],closed=[],socket={readyState:state==='closed'?3:1,bufferedAmount:state==='slow'?1048577:0,send:value=>sent.push(value),close:(...args)=>closed.push(args)},c={encode:JSON.stringify,write:(socket,text,{perform=()=>socket.send(text)}={})=>{perform();return true;},actors:new Map(state==='missing'?[]:[['a',socket]])},trace={call:(_k,fn)=>fn()},packet={value:1};if(state==='circular')packet.self=packet;let value,error;try{value=measured?measuredSend(trace,c,'a',packet):ChannelConnections.prototype.send.call(c,'a',packet);}catch(e){error=e.name;}outcomes.push({sent,closed,value,error});}assert.deepEqual(outcomes[0],outcomes[1]);}
});
test('real inspector profile clock brackets align and samples cover the measured interval',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'core511-profile-'));try{const p=new ProfileCapture();await p.start();burn(35);const meta=await p.stop(path.join(dir,'sample.cpuprofile'));assert(meta.clockAligned,JSON.stringify(meta));assert(meta.samples>0);const profile=JSON.parse(fs.readFileSync(meta.file)),r=summarizeProfile(profile,meta,[{startedAtMs:meta.profileStartedAtMs,endedAtMs:meta.profileEndedAtMs}])[0];assert(r.sampledWallMs>20);assert(r.self.some(x=>x.functionName.startsWith('burn @')));assert.equal(meta.bytes,fs.statSync(meta.file).size);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('sample interval clipping is exact and failed clock calibration refuses attribution',()=>{
 const p={startTime:0,nodes:[{id:1,callFrame:{functionName:'f',url:'x',lineNumber:0}}],samples:[1,1],timeDeltas:[1000,2000]},meta={clockAligned:true,epochOffsetMs:100};const r=summarizeProfile(p,meta,[{startedAtMs:100.5,endedAtMs:102}])[0];assert.equal(r.sampledWallMs,1.5);assert.equal(r.self[0].sampledMs,1.5);assert.throws(()=>summarizeProfile(p,{...meta,clockAligned:false},[]));
});
