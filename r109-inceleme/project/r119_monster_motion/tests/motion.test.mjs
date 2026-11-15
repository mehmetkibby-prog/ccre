import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {createChampionsViewR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/champions-client-r118.mjs';
const root=path.resolve(import.meta.dirname,'..'),core=path.resolve(root,'../r109_latency_completion/working/core511-source/scripts/core511');
const proof=JSON.parse(fs.readFileSync(core+'/generated/native-client-proof.json'));
const source=fs.readFileSync(core+'/generated/client/'+proof.name,'utf8');
const old=execFileSync('python3',['-c','import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);sys.stdout.buffer.write(z.read("payload/core511-source/scripts/core511/generated/client/game-client-core511-r118-a4d21f5a07c2cb04.js"))',root+'/../r118_royal_champions/artifacts/R118_ROYAL_61ba37784ffb.zip'],{maxBuffer:16*1024*1024}).toString();
const names=['Zy','Ud','mv','gv','zy','colSelectionRing487'];
function renderer(text){
 const functions=parse(text,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration'&&names.includes(n.id.name)).map(n=>text.slice(n.start,n.end));
 assert.equal(functions.length,names.length);
 const scope={Bv:()=>false,Fd:(ctx,...args)=>ctx.fillText(...args)};vm.createContext(scope);vm.runInContext(functions.join('\n'),scope);return scope;
}
const before=renderer(old),after=renderer(source);
function ctx(){const calls=[];return new Proxy({calls},{set(t,k,v){calls.push(['set',k,v]);t[k]=v;return true;},get(t,k){return k in t?t[k]:(...args)=>calls.push([k,...args]);}});}
const atlas={complete:true,naturalWidth:1280,naturalHeight:1536};
const monster=(id='golge-1')=>({id,area:'forest',x:200,y:300,name:'Gölge Kurdu',hp:80,max_hp:100,is_boss:0,variant:'normal'});
test('forest renderer remains operation-identical for existing species, variants, qualities and phases',()=>{
 let cases=0;
 for(const id of ['golge-1','curuk-1','ruh-1'])for(const variant of ['normal','agresif','katil'])for(const quality of [0,1,2])for(const selected of [false,true])for(const moving of [false,true])for(const attack of [0,.05,.2,.4,.6,.8,.999])for(const x of [-1,-.03,0,1]){
  const m={...monster(id),variant},args=[null,m,selected,1.4,attack,{x,y:.4},false,moving,1937,71,quality,undefined,undefined,undefined,undefined,atlas],a=ctx(),b=ctx();
  before.Zy(a,...args);after.Zy(b,...args);assert.deepEqual(b.calls,a.calls);cases++;
 }
 assert.equal(cases,3024);
});
test('shared atlas selector holds idle, advances each 19 units, clamps attack and preserves direction dead zone',()=>{
 for(const attack of [0,.001,.19,.2,.5,.99,1])for(const moving of [false,true])for(const travel of [0,14,18.9,19,38,94.9,95])for(const direction of [-1,-.08,-.01,0,1]){
  const c=ctx();after.Ud(c,atlas,0,6,50,60,216,travel,moving,attack,direction,false,()=>false);
  const draw=c.calls.find(r=>r[0]==='drawImage'),frame=attack>0?Math.min(4,Math.floor(attack*5)):moving?Math.floor(travel/19)%5:0;
  assert.equal(draw[2],frame*256);assert.equal(draw[3],attack>0?256:0);
  assert.equal(c.calls.some(r=>r[0]==='scale'&&r[1]===-1),direction<-.08);
 }
});
test('all four champion species use the same forest renderer with cached sheets and preserve gameplay objects',()=>{
 const saved=globalThis.Image;let created=0;
 globalThis.Image=class{constructor(){created++;this.complete=true;this.naturalWidth=1280;this.naturalHeight=512;}set src(value){this.url=value;}};
 try{
  const kinds=['ivory_guard','golden_lion','crescent_hunter','royal_colossus'],assets={monsters:Object.fromEntries(kinds.map(k=>[k,k+'.webp']))},calls=[];
  const view=createChampionsViewR118(assets,(...args)=>{calls.push(args);after.Zy(...args);});
  for(const kind of kinds)for(const moving of [false,true])for(const attack of [0,.1,.3,.6,.9]){
   const m=Object.freeze({...monster('champions-'+kind.replaceAll('_','-')+'-c1-01'),area:'champions',name:kind}),c=ctx();
   assert.equal(view.drawEnemy(c,m,true,1100,moving,attack,40,{x:-.01,y:1},3,0),true);
   const args=calls.at(-1);assert.equal(args[2],m);assert.equal(args[4],3);assert.equal(args[11],0);
   const draw=c.calls.find(v=>v[0]==='drawImage');assert(draw);assert.equal(draw[1].url,kind+'.webp');
   assert.equal(draw[2],(attack>0?Math.min(4,Math.floor(attack*5)):moving?2:0)*256);
   assert.equal(draw[3],attack>0?256:0);assert.equal(c.calls.filter(v=>v[0]==='drawImage').length,1);
   assert(c.calls.some(v=>v[0]==='fillText'&&v[1]===kind));
  }
  assert.equal(created,4);assert.equal(view.drawEnemy(ctx(),monster(),false,0,false,0,0,{x:1,y:0}),false);
 }finally{globalThis.Image=saved;}
});
