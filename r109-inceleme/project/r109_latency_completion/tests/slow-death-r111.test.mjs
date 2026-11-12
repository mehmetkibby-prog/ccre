import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const tree=process.env.STUTTER_TREE||path.resolve('working');
const {createSlowDeathReporterR111}=await import(pathToFileURL(path.join(tree,'core511-source/scripts/core511/slow-death-r111.mjs')));
const {createDeathLatencyR82,publicDeathLatencyR82}=await import(pathToFileURL(path.join(tree,'core511-source/scripts/core511/death-latency-r82.mjs')));

test('slow-death journal has a strict rate and fixed public fields',()=>{
 let now=100;const rows=[],report=createSlowDeathReporterR111({now:()=>now,write:line=>rows.push(JSON.parse(line))});
 const base={atMs:10000,channel:2,outcome:'completed',totalMs:470,checkpointMs:100,writerMs:300,refreshMs:70,inputWaitMs:29,actor:'secret',email:'secret'};
 report(base);assert.equal(rows.length,0);
 for(let i=0;i<20;i++)report({...base,inputWaitMs:30});
 assert.equal(rows.length,8);assert.equal(rows[0].serverWaitMs,500);assert.equal(rows[0].channel,2);
 assert.equal(rows[0].actor,undefined);assert.equal(rows[0].email,undefined);
 now+=60000;report({...base,inputWaitMs:30});assert.equal(rows.length,9);assert.equal(rows[8].suppressed,12);
 report({...base,inputWaitMs:NaN});report({...base,writerMs:-1});assert.equal(rows.length,9);
 assert.doesNotThrow(()=>createSlowDeathReporterR111({write:()=>{throw Error('sink failed');}})({...base,inputWaitMs:40}));
});

test('queue, checkpoint, writer and refresh waits are measured without changing the admin schema',()=>{
 let now=0;const rows=[],d=createDeathLatencyR82({now:()=>now,wall:()=>2000,report:r=>rows.push(r)});
 const token=d.begin({inputWaitMs:600,channel:3});now=20;d.phase(token,'writer');now=100;d.phase(token,'refresh');now=120;d.finish(token,'completed');
 assert.equal(rows.length,1);assert.deepEqual(rows[0],{atMs:2000,outcome:'completed',totalMs:120,checkpointMs:20,writerMs:80,refreshMs:20,inputWaitMs:600,channel:3});
 const snapshot=publicDeathLatencyR82(d.snapshot());assert.equal(snapshot.completed,1);assert.equal(snapshot.active,0);
 assert.equal(snapshot.last.inputWaitMs,undefined);assert.equal(snapshot.last.totalMs,120);
 d.finish(token,'completed');assert.equal(rows.length,1);
});

test('report failure and backwards clocks cannot alter a kill observation or leave a token active',()=>{
 let now=0;const d=createDeathLatencyR82({now:()=>now,wall:()=>2000,report:()=>{throw Error('sink');}});
 const token=d.begin();now=600;assert.doesNotThrow(()=>d.finish(token,'completed'));assert.equal(d.snapshot().completed,1);assert.equal(d.snapshot().active,0);
 const bad=d.begin();now=0;d.finish(bad,'failed');assert.equal(d.snapshot().dropped,1);assert.equal(d.snapshot().active,0);
});
