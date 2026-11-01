import test from 'node:test';
import assert from 'node:assert/strict';
import {SharedFrameEncoder} from '../shared-frame-encoder.mjs';
test('same-view serialization is byte-identical while owner fields and results remain private',()=>{
 const e=new SharedFrameEncoder(),common={players:[{id:'a',hp:1},{id:'b',hp:2}],monsters:[{id:'m',hp:5,targetIds:['a']}],combatEvents:[{id:1,text:'quote" newline\n Türkçe 😀'}]},delta={entities:{players:{upsert:[{id:'a',hp:3}],remove:[]},monsters:{upsert:[{id:'m',hp:4}],remove:[]}}};e.begin({});e.prepare(common,delta);
 for(const id of ['a','b'])for(const type of ['world_snapshot','world_delta']){
  const world=type==='world_snapshot'?{type,data:{...common,players:common.players.map(row=>row.id===id?{...row,privateOwner:id,quest:10}:row),inventory:[{id:'private-'+id}],empty:undefined}}:{type,entities:{...delta.entities,players:{upsert:[...delta.entities.players.upsert.filter(row=>row.id!==id),{id,privateOwner:id,quest:11}],remove:[]}},fields:{privateField:id}};
  const packet={type:'frame',world,results:[{sequence:1,body:{owner:id}}],lastApplied:1};assert.equal(e.encode(packet),JSON.stringify(packet));const text=e.encode(packet);assert(!text.includes('"privateOwner":"'+(id==='a'?'b':'a')+'"'));
 }assert(e.metrics.reused>0);assert(e.cache.size>0);
});
test('tick boundary invalidates cached text; omitted/null/array values and fallback packets match native JSON',()=>{
 const e=new SharedFrameEncoder(),row={id:'a',hp:1},common={players:[row],monsters:[],combatEvents:[]};e.begin({});e.prepare(common);const p={type:'frame',world:{type:'world_snapshot',data:{...common,values:[null,undefined,NaN,-0,'x\u2028y'],unset:undefined}},results:[]};assert.equal(e.encode(p),JSON.stringify(p));row.hp=2;e.begin({});assert.equal(e.cache.size,0);assert.equal(e.encode(p),JSON.stringify(p));
 for(const p of [null,{type:'event',payload:{text:'x'}},{type:'frame',world:{type:'world_reset',seq:1}},{type:'frame',results:[1]}])assert.equal(e.encode(p),JSON.stringify(p));
});
test('native JSON parity, nested encoding, exceptions and owner isolation after serialization revert',()=>{
 const e=new SharedFrameEncoder();
 for(let i=0;i<1600;i++){
  const key='key-"\\\n'+i,value=i%3?'Türkçe 😀\u0000\ud800 '+i:'x'.repeat(3000);
  const p={type:'frame',world:{type:'world_delta',entities:{},fields:{[key]:value,number:i%5?i/7:-0,invalid:Infinity,absent:undefined,flag:i%2===0}},results:[{body:{owner:i}}]};
  assert.equal(e.encode(p),JSON.stringify(p));
 }
 const nested={type:'frame',world:{type:'world_delta',fields:{text:'nested'}}};
 const p={type:'frame',world:{type:'world_delta',get fields(){return {nested:e.encode(nested),owner:'only-me'};}}};assert.equal(e.encode(p),JSON.stringify(p));
 const bad={type:'frame',world:{type:'world_delta',get fields(){throw Error('getter-failed');}}};assert.throws(()=>e.encode(bad),/getter-failed/);assert.throws(()=>e.encode({type:'frame',world:{type:'world_delta',field:1n}}),TypeError);assert.equal(e.encode(p),JSON.stringify(p));
 for(const n of [Number.MIN_VALUE,Number.MAX_VALUE,-0,NaN,Infinity,-Infinity,1e-7,1e21,9007199254740991])assert.equal(e.value(n),JSON.stringify(n));
});
