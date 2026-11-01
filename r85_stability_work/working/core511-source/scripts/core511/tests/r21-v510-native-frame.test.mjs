import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import {OwnPrediction} from '../movement-prediction.mjs';
import {parse} from '../../../../deps/build/node_modules/acorn/dist/acorn.mjs';

const root=path.resolve(import.meta.dirname,'../../../..');
const proof=JSON.parse(fs.readFileSync(path.join(root,'core511-source/scripts/core511/generated/native-client-proof.json')));
const original=fs.readFileSync(path.join(root,'native510-bb3a6cc689c6',proof.file),'utf8');
const ast=parse(original,{ecmaVersion:'latest',sourceType:'module'});
const native=['tu','au','Ev'].map(name=>{const n=ast.body.find(n=>n.id?.name===name);assert.ok(n);return original.slice(n.start,n.end);}).join('\n');
const movement=proof.edits.find(e=>e.replacement.includes('const keys511=')).replacement;
const run=new vm.Script(native+'\n'+movement+'\n({x:b.current.x,y:b.current.y,walking:be})');

function frame({keys=[],stick={x:0,y:0},role='muhafiz',x=1000,enabled=true}={}){
 const own={id:'fixture',x,y:1000,area:'event',position_revision:1};
 const prediction=new OwnPrediction();prediction.bind(own,'fixture',0);
 let called=0;
 const core={world:{players:[own]},position:()=>prediction.position(16.667),predictFrame:({seconds},integrate)=>{called++;return prediction.advance(seconds,integrate,16.667);},suspendPrediction:()=>prediction.clear()};
 const ref=current=>({current});
 const c=vm.createContext({Set,Math,performance:{now:()=>16.667},kernel511:()=>core,Kt:()=>({}),le:{run:null},v:ref(enabled),w:ref(2000),xe:false,ki:ref(false),xp:()=>16.667,bt:ref({root:0}),g:ref(own.id),Yo:ref(false),fe:ref(new Set(keys)),Si:ref(stick),G:role,pe:ref(null),yr:ref(null),wu:()=>null,F:ref(core.world),_r:ref(null),Hc:ref(null),ve:()=>({width:3600,height:2200}),de:{x,y:1000},b:ref({x,y:1000}),a:16.667,s:1/60,be:false,y:false,ri:ref(0),eu:[0],ai:ref(0),oi:ref(null),C:ref(0),_:78,fi:ref([]),Y:()=>{}});
 const result=run.runInContext(c);return{result,called,speed:(role==='avci'?250:225)*1.03*1.07};
}
for(const role of ['muhafiz','avci']){
 test(role+' keyboard simulated native frame uses exact pinned V510 speed',()=>{
  const {result,speed,called}=frame({keys:['d'],role});assert.equal(called,1);assert.equal(result.walking,true);assert.ok(Math.abs(result.x-1000-speed/60)<1e-9);
 });
 test(role+' joystick simulated native frame retains diagonal V510 speed',()=>{
  const {result,speed}=frame({stick:{x:1,y:1},role});assert.equal(result.walking,true);assert.ok(Math.abs(Math.hypot(result.x-1000,result.y-1000)-speed/60)<1e-9);
 });
}
test('native event wall prevents prediction crossing collision boundary',()=>{const {result}=frame({keys:['d'],x:2950});assert.equal(result.x,2950);assert.equal(result.walking,false);});
test('released input does not continue moving',()=>{const {result}=frame();assert.equal(result.x,1000);assert.equal(result.y,1000);assert.equal(result.walking,false);});
test('original disabled/dead/rooted control gate still suspends prediction',()=>{const {result,called}=frame({keys:['d'],enabled:false});assert.equal(called,0);assert.equal(result.x,1000);});
