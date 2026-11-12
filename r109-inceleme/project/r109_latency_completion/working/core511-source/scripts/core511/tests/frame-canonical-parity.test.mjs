import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalAttack,sameAttackFrame} from '../attack-writer.mjs';
const prior=value=>JSON.stringify(value&&typeof value==='object'?(Array.isArray(value)?value.map(v=>JSON.parse(prior(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(prior(value[k]))]))):value??null);
test('frame canonical form preserves previous bytes and rejection, including omitted, sparse and numeric fields',()=>{
 let state=51;const rnd=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/2**32),atoms=[null,undefined,Infinity,-Infinity,NaN,-0,0,1,'',true,false,'a"\n'];
 const draw=depth=>depth>2||rnd()<.6?atoms[Math.floor(rnd()*atoms.length)]:rnd()<.5?Array.from({length:4},()=>draw(depth+1)):Object.fromEntries(['z','10','2','__proto__','a'].map(k=>[k,draw(depth+1)]));
 const cases=[...atoms,new Array(4),{z:[undefined,,2],2:'b',10:'a'},new Date(),{x:Symbol('bad')},{x:()=>1},Symbol('top'),1n,...Array.from({length:1000},()=>draw(0))];
 const outcome=fn=>{try{return {value:fn()};}catch(e){return {error:e.name};}};
 for(const value of cases)assert.deepEqual(outcome(()=>canonicalAttack(value)),outcome(()=>prior(value)));
});

test('flat comparison matches canonical equality and rejects unexpected or changed frame fields',()=>{
 const frames=[{},null,undefined,{x:null},{x:undefined},{x:NaN},{x:Infinity},{x:-0},{x:0},{x:false},{x:'0'},{x:1},{x:1,y:2},{y:2,x:1},{x:[1,null]},{x:{a:1,b:2}}];
 for(const a of frames)for(const b of frames)assert.equal(sameAttackFrame(a,b),prior(a)===prior(b));
 const base={hp:100,epoch:2,gems:5};for(const key of Object.keys(base))assert.equal(sameAttackFrame(base,{...base,[key]:base[key]+1}),false);assert.equal(sameAttackFrame(base,{...base,extra:null}),false);
});
