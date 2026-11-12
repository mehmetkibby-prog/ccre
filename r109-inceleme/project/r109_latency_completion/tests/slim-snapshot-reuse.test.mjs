import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeSlimBundle,SlimBundleClient} from '../working/core511-source/scripts/core511/slim-reload.mjs';

const copy=value=>structuredClone(value);
function bundle(revision=1,actor='alpha'){
 return {actor,revision,owner:{channel:1,incarnation:'boot-a',epoch:3},player:{id:actor,area:'tower_1',arena_match_id:null},world:{cycle:7},
  settings:{rates:{xp:1}},profiles:[{id:'guard',skills:[1,2,3]}],
  dungeon:{settings:{rooms:5}},adventure:{towerInfo:{config:{floors:10,cost:100}}},
  projection:{data:{players:[{id:actor,name:'Test',equipment:[{kind:'weapon',power:10}]}],inventory:[{id:'item',amount:2}],quests:{complete:[]}},friends:[]}};
}
const full=b=>encodeSlimBundle(b,null);
const data=b=>{const {slim,...result}=b;return result;};

test('unchanged private sections are retained; only changed sections allocate new snapshots',t=>{
 const client=new SlimBundleClient(),first=full(bundle()),original=globalThis.structuredClone;
 let clones=0;t.mock.method(globalThis,'structuredClone',value=>{clones++;return original(value);});
 client.capture(first);assert.equal(clones,Object.keys(first.slim.revisions).length+1);
 const second=full(bundle(2));clones=0;client.capture(second);
 assert.equal(clones,1,'an unchanged refresh clones metadata, not every section again');
 const third=bundle(3);third.projection.data.inventory[0].amount=3;const encoded=full(third);
 clones=0;client.capture(encoded);assert.equal(clones,2,'one changed inventory section plus metadata');
});

test('inputs, returned metadata and expanded values cannot mutate the retained snapshot',()=>{
 const client=new SlimBundleClient(),source=full(bundle());client.capture(source);
 source.settings.rates.xp=999;source.profiles[0].skills.push(999);
 source.projection.data.inventory[0].amount=999;
 source.slim.revisions.settings='invalid';source.slim.scope='invalid';
 const hint=client.hint('alpha');hint.scope='another-owner';hint.revisions.settings='invalid';
 assert.notEqual(client.hint('alpha').scope,hint.scope);
 assert.notEqual(client.hint('alpha').revisions.settings,hint.revisions.settings);
 const expected=bundle(2),delta=encodeSlimBundle(expected,client.hint('alpha'));
 assert(delta.slim.omitted.includes('settings'));
 const expanded=client.expand(delta);assert.deepEqual(data(expanded),expected);
 expanded.settings.rates.xp=500;expanded.profiles[0].skills.push(500);
 expanded.projection.data.players[0].equipment[0].power=500;
 expanded.projection.data.inventory[0].amount=500;
 assert.deepEqual(data(client.expand(delta)),expected,'hydration mutations never reach cache');
 client.capture(full(bundle(3)));
 assert.deepEqual(data(client.expand(encodeSlimBundle(bundle(4),client.hint('alpha')))),bundle(4));
 assert.equal(Object.hasOwn(client,'rows'),false,'cached values are private to the class');
});

test('ownership, channel, area, cycle and older revision changes do not reuse snapshots',t=>{
 const original=globalThis.structuredClone;let clones=0;
 t.mock.method(globalThis,'structuredClone',value=>{clones++;return original(value);});
 for(const change of [b=>b.owner.channel=2,b=>b.owner.incarnation='boot-b',b=>b.owner.epoch++,b=>b.player.area='forest',b=>b.world.cycle++,b=>b.revision=0]){
  const client=new SlimBundleClient();client.capture(full(bundle()));
  const changed=bundle(2);change(changed);const encoded=full(changed);clones=0;client.capture(encoded);
  assert.equal(clones,Object.keys(encoded.slim.revisions).length+1,'all values copied after scope/revision change');
  const next=copy(changed);next.revision++;assert.deepEqual(data(client.expand(encodeSlimBundle(next,client.hint('alpha')))),next);
 }
});

test('actors remain isolated, removed sections are dropped and forget requires a full read',async()=>{
 const client=new SlimBundleClient({diagnose:()=>{}});client.capture(full(bundle()));client.capture(full(bundle(1,'beta')));
 const changed=bundle(2);delete changed.projection.data.inventory;client.capture(full(changed));
 const future=copy(changed);future.revision++;const delta=encodeSlimBundle(future,client.hint('alpha'));
 assert.deepEqual(data(client.expand(delta)),future);
 const forged=copy(delta);forged.slim.omitted.push('projection.data.inventory');forged.slim.revisions['projection.data.inventory']='missing';
 assert.equal(client.expand(forged),null,'removed cached section cannot be resurrected');
 assert.deepEqual(data(client.expand(encodeSlimBundle(bundle(2,'beta'),client.hint('beta')))),bundle(2,'beta'));
 client.forget('alpha');assert.equal(client.hint('alpha'),null);assert(client.hint('beta'));
 const calls=[];const actual=await client.load('alpha',async hint=>{calls.push(hint);return calls.length===1?delta:full(future);});
 assert.deepEqual(data(actual),future);assert.deepEqual(calls,[null,null]);assert.equal(client.metrics.fallbacks,1);
});

test('digest verification and full fallback still reject mismatched omitted values',async()=>{
 const notices=[],client=new SlimBundleClient({diagnose:detail=>notices.push(detail)});client.capture(full(bundle()));
 const next=bundle(2),bad=encodeSlimBundle(next,client.hint('alpha'));bad.slim.revisions.settings='wrong-digest';
 assert.equal(client.expand(bad),null);
 const hints=[];const result=await client.load('alpha',async hint=>{hints.push(hint);return hints.length===1?bad:full(next);});
 assert.deepEqual(data(result),next);assert.equal(hints.length,2);assert.equal(hints[1],null);
 assert.equal(notices[0].reason,'missing_revision_full_fallback');
});

test('repeated changed, unchanged, removed and reordered sections match full snapshots',async()=>{
 const client=new SlimBundleClient({diagnose:()=>{}});let previous=null;
 for(let revision=1;revision<=160;revision++){
  const expected=bundle(revision);expected.player.area=revision<80?'tower_1':'forest';
  expected.settings.rates.xp=Math.floor(revision/9)+1;
  expected.projection.data.inventory[0].amount=Math.floor(revision/3)+1;
  expected.projection.data.players.push({id:'other',name:'Other',equipment:[]});
  if(revision%4===0)expected.projection.data.players.reverse();
  if(revision%7===0)delete expected.projection.data.quests;
  if(revision%11===0)expected.adventure=null;
  const loaded=await client.load('alpha',async hint=>encodeSlimBundle(expected,hint));
  assert.deepEqual(data(loaded),expected);client.capture(loaded);
  // Consumer objects from both current and previous refreshes stay mutable.
  // They must remain independent of snapshots reused by the next refresh.
  loaded.settings.rates.xp=-revision;loaded.projection.data.inventory[0].amount=-revision;
  if(previous)previous.profiles[0].skills.push(-revision);
  previous=loaded;
 }
 assert.equal(client.metrics.fallbacks,0);
});
