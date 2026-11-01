import test from 'node:test';
import assert from 'node:assert/strict';
import {createLootProfileCacheR61 as candidate} from '../../candidates/loot-pure-r85/loot-profile-cache-r61.mjs';
import {createLootProfileCacheR61 as baseline} from '../../candidates/loot-pure-r85/base-loot-profile-cache-r61.mjs';
const settings=()=>Object.freeze({loot_rate:3,events_json:'{}'});
const defeat=(json='{}',revision=1)=>({loot_source_key:'forest.shadow.normal',loot_profile_revision:revision,loot_profile_json:json});
const profile=()=>({version:1,key:'forest.shadow.normal',label:'Native source label',groups:[{id:'gear',label:'Gear',rolls:1,charmMultiplierBps:10000,gearChanceModel:'direct',outcomes:[{id:'white',item:{type:'gear',kind:'weapon',rarity:'white',family:'generic'},baseChancePpm:1000,minAmount:1,maxAmount:1,charmWeight:1}]}]});
const call=(factory,config,row,derive)=>factory({enabled:true})(row,'forest.shadow.normal',config,derive);
test('cross-factory reuse copies a private template while same-factory mutations retain original behavior',()=>{
 const config=settings(),row=defeat();let calls=0;const derive=()=>{calls++;return profile();},first=candidate({enabled:true}),a=first(row,'forest.shadow.normal',config,derive);
 a.groups[0].outcomes[0].item.kind='changed';a.groups.push({future:true});
 assert.equal(first(row,'forest.shadow.normal',config,derive),a);assert.equal(calls,1);
 const b=call(candidate,config,row,derive);assert.deepEqual(b,profile());assert.notEqual(a,b);assert.equal(calls,1);assert(!Object.isFrozen(b));assert(!Object.isFrozen(b.groups[0]));b.groups[0].outcomes[0].minAmount=99;
 assert.deepEqual(call(candidate,config,row,derive),profile());assert.equal(calls,1);
 const original=baseline({enabled:true}),x=original(row,'forest.shadow.normal',config,profile);x.groups[0].label='changed';assert.equal(original(row,'forest.shadow.normal',config,profile),x);
});
test('settings identity and each snapshot byte/revision/fallback change derive independently',()=>{
 const config=settings(),row=defeat();let count=0;const derive=()=>{count++;return profile();};call(candidate,config,row,derive);call(candidate,config,row,derive);assert.equal(count,1);
 call(candidate,settings(),row,derive);call(candidate,config,defeat('{"changed":1}'),derive);call(candidate,config,defeat('{}',2),derive);candidate({enabled:true})(row,'forest.other.normal',config,derive);assert.equal(count,5);
 const local=candidate({enabled:true});local(row,'forest.shadow.normal',config,derive);local(row,'forest.shadow.normal',Object.freeze({loot_rate:9}),derive);assert.equal(count,6);assert.deepEqual(local(row,'forest.shadow.normal',config,derive),profile());assert.equal(count,6);
});
test('mutable/hostile settings and defeat descriptors retain native fallback without evaluating getters',()=>{
 let count=0,gets=0;const derive=()=>{count++;return profile();},row=defeat(),mutable={rate:1};
 call(candidate,mutable,row,derive);call(candidate,mutable,row,derive);assert.equal(count,2);
 const hostile=Object.freeze(Object.defineProperty({},'rate',{get(){gets++;throw Error('getter');},enumerable:true}));call(candidate,hostile,row,derive);call(candidate,hostile,row,derive);assert.equal(count,4);assert.equal(gets,0);
 const bad={...row};Object.defineProperty(bad,'loot_profile_json',{get(){gets++;throw Error('getter');}});call(candidate,settings(),bad,derive);assert.equal(count,5);assert.equal(gets,0);
 const symbol=Symbol('future'),nested={rate:1},symbols=Object.freeze({[symbol]:nested});call(candidate,symbols,row,derive);nested.rate=2;call(candidate,symbols,row,derive);assert.equal(count,7);
});
test('unknown output fields, accessors, symbols and nested shapes are never reused across factories',()=>{
 for(const change of [p=>p.future=1,p=>p.groups[0].future=1,p=>p.groups[0].outcomes[0].item.future=1,p=>p.groups[Symbol('future')]=1,p=>Object.defineProperty(p.groups,'future',{value:1}),p=>Object.setPrototypeOf(p.groups,Object.create(Array.prototype)),p=>Object.defineProperty(p.groups,'length',{writable:false}),p=>Object.defineProperty(p.groups,'0',{writable:false}),p=>Object.defineProperty(p.groups[0],'future',{value:1}),p=>Object.defineProperty(p.groups[0],'label',{get(){return 'accessor';},enumerable:true,configurable:true}),p=>p.groups[0].outcomes[0].item.kind={future:true},p=>Object.preventExtensions(p),p=>Object.preventExtensions(p.groups),p=>Object.preventExtensions(p.groups[0]),p=>Object.preventExtensions(p.groups[0].outcomes[0].item)]){
  const config=settings(),row=defeat();let count=0;const derive=()=>{count++;const p=profile();change(p);return p;};call(candidate,config,row,derive);call(candidate,config,row,derive);assert.equal(count,2);
 }
});
test('rune, disabled and oversized snapshots keep existing fallback and shared cache bounds evict',()=>{
 assert.equal(candidate({enabled:false}),null);const config=settings();let count=0;const derive=()=>{count++;return profile();};for(let i=0;i<2;i++)candidate({enabled:true})(defeat(),'rune.tide',config,derive);assert.equal(count,2);
 call(candidate,config,defeat('x'.repeat(32769)),derive);call(candidate,config,defeat('x'.repeat(32769)),derive);assert.equal(count,4);
 for(let i=0;i<33;i++)call(candidate,config,defeat(String(i)),derive);assert.equal(count,37);call(candidate,config,defeat('0'),derive);assert.equal(count,38);
 const first=settings();call(candidate,first,defeat(),derive);for(let i=0;i<8;i++)call(candidate,settings(),defeat(),derive);const prior=count;call(candidate,first,defeat(),derive);assert.equal(count,prior+1);
});
test('shared object aliases retain original derive graph rather than flatten through a template',()=>{
 const config=settings(),row=defeat();let count=0;const derive=()=>{count++;const p=profile();p.groups[0].outcomes.push({...p.groups[0].outcomes[0],id:'alias'});return p;};
 const a=call(candidate,config,row,derive),b=call(candidate,config,row,derive);assert.equal(count,2);assert.equal(a.groups[0].outcomes[0].item,a.groups[0].outcomes[1].item);assert.equal(b.groups[0].outcomes[0].item,b.groups[0].outcomes[1].item);
});
