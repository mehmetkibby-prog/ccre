import test from 'node:test';
import assert from 'node:assert/strict';
const before=await import('/workspace/ccre/r85_stability_work/working/core511-source/scripts/core511/generated/attack-writer-rules.mjs?event-inspect-r86');
const after=await import('../working/core511-source/scripts/core511/generated/attack-writer-rules.mjs?event-inspect-r86');
const create=(module,extra={})=>module.createAttackWriterRules({globals:{},...extra});
const original=create(before),current=create(after);
const allFrozen=x=>!x||typeof x!=='object'||Object.isFrozen(x)&&Object.values(x).every(allFrozen);
test('native output equivalence for valid, changed, malformed and nonstring settings',()=>{
 const defaults=original.readEventsConfig('{}'),valid=JSON.parse(JSON.stringify(defaults));
 valid.events.exp={...valid.events.exp,enabled:true,start:100,end:200,percent:45};
 const values=['{}','bad-json','null','[]',JSON.stringify(valid),JSON.stringify({...valid,halloweenWandChance:0}),JSON.stringify({...valid,fishingRedPearlChance460:101}),null,{},valid];
 for(const raw of values){
  const expected=original.readEventsConfig(raw),actual=current.readEventsConfig(raw);
  assert.deepEqual(actual,expected);
  if(typeof raw==='string')assert(allFrozen(actual));
 }
});
test('cross-factory reuse preserves event clock and ignores unrelated RNG/ports',()=>{
 const config=JSON.parse(JSON.stringify(original.readEventsConfig('{}')));
 const key=Object.keys(config.events)[0];config.events[key]={enabled:true,start:100,end:200,percent:35,runId:'r86'};
 const raw=JSON.stringify(config),a=create(after,{now:()=>1,random:()=>0}),b=create(after,{now:()=>9000,random:()=>.99});
 const x=a.readEventsConfig(raw),y=b.readEventsConfig(raw);
 assert.equal(x,y);assert.deepEqual(x,create(before).readEventsConfig(raw));
 for(const now of [99,100,150,199,200,300])assert.deepEqual(a.eventOccurrence499(x.events[key],now),original.eventOccurrence499(x.events[key],now));
 assert.throws(()=>{x.events[key].percent=999;},TypeError);
});
test('nonstring input stays fresh and unfrozen; large strings preserve native output',()=>{
 const value=JSON.parse(JSON.stringify(original.readEventsConfig('{}')));
 const a=current.readEventsConfig(value),b=current.readEventsConfig(value);
 assert.notEqual(a,b);assert.equal(Object.isFrozen(a),false);
 const raw=JSON.stringify({...value,ignored:'x'.repeat(270000)});
 assert.deepEqual(current.readEventsConfig(raw),original.readEventsConfig(raw));
 assert(allFrozen(current.readEventsConfig(raw)));
});
test('shared pool bounds entries and bytes and does not retain failed parses',async()=>{
 const {readEventConfigR86:read}=await import('../working/core511-source/scripts/core511/event-config-cache-r86.mjs?isolated-pool-test');
 let builds=0;const build=()=>Object.freeze({value:++builds});
 const first=read('first',build);assert.equal(read('first',build),first);
 for(let i=0;i<8;i++)read('key-'+i,build);
 assert.notEqual(read('first',build),first);
 const big='b'.repeat(270000);assert.notEqual(read(big,build),read(big,build));
 assert.throws(()=>read('failure',()=>{throw Error('native failure');}));
 assert.equal(read('failure',()=>Object.freeze({ok:true})).ok,true);
});
