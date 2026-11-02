import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAfkController,createAfkUI,afkClock} from '../working/core511-source/scripts/core511/afk-client.mjs';
import {patchAfkR77,unpatchAfkR77} from '/workspace/ccre/r77_verification_work/src/patch-afk-r77.mjs';
const nonce='a'.repeat(32),base={enabled:true,settingsRevision:1,revision:1,serverTime:100000,locked:false,blocked:true,blockedUntil:0};
const question={nonce,prompt:'İKSİRİ seç.',deadline:160000,images:[1,2,3,4].map(n=>`/afk/${nonce}/${n}`),attempt:1,maxAttempts:2};
test('question and penalty use monotonic countdown; only server release unlocks',async()=>{
 let time=0,calls=0;const c=createAfkController({now:()=>time,wallNow:()=>999999,post:async()=>{calls++;}});
 c.update({...base,challenge:question});assert.equal(c.state.blocked,true);assert.equal(c.state.seconds,60);
 time=10000;c.tick();assert.equal(c.state.seconds,50);
 c.update({...base,serverTime:999999,challenge:question});assert.equal(c.state.seconds,50);
 c.update({...base,revision:3,serverTime:110000,locked:true,blockedUntil:230000,challenge:null});assert.equal(c.state.seconds,120);
 assert.equal(afkClock(c.state.seconds),'2:00');time+=35000;c.tick();assert.equal(c.state.seconds,85);
 c.update(null);assert.equal(c.state.blocked,true);assert.equal(c.state.seconds,85);
 assert.equal(c.update({...base,revision:2,blocked:false,challenge:null}),false);
 await c.recover();assert.equal(calls,0);
 time+=85000;c.tick();assert.equal(c.state.seconds,0);assert.equal(c.state.blocked,true);
 await c.recover();assert.equal(calls,0);
 c.update({...base,revision:4,serverTime:230001,blocked:false,blockedUntil:0,locked:false,challenge:null});assert.equal(c.state.blocked,false);
 c.dispose();
});
test('reload keeps remaining server deadline and admin disable releases only the AFK flag',()=>{
 const c=createAfkController({now:()=>0,post:async()=>({})});
 c.update({...base,revision:8,serverTime:160000,locked:true,blockedUntil:230000,challenge:null});assert.equal(c.state.seconds,70);
 c.update({...base,settingsRevision:2,revision:9,enabled:false,locked:true,blocked:true,blockedUntil:230000,challenge:question});
 assert.equal(c.state.blocked,false);assert.equal(c.state.blockedUntil,0);assert.equal(c.state.challenge,null);assert.equal(c.state.seconds,0);
 assert.equal(c.update({...base,settingsRevision:1,revision:100,challenge:question}),false);
 c.dispose();
});
test('panel keeps four answer buttons usable and shows penalty timer without recovery bypass',()=>{
 const h=(type,props,...children)=>({type,props:props??{},children});const {Panel}=createAfkUI({createElement:h});
 const flatten=(n)=>n==null?[]:Array.isArray(n)?n.flatMap(flatten):typeof n==='object'?[n,...n.children.flatMap(flatten)]:[];
 const q=flatten(Panel({state:{...base,challenge:question,seconds:60,busy:false},onAnswer:()=>{}}));
 assert.equal(q.filter(x=>x.type==='button').length,4);assert(q.filter(x=>x.type==='button').every(x=>x.props.disabled===false));
 const locked=Panel({state:{...base,locked:true,blockedUntil:230000,challenge:null,seconds:120,busy:false}}),nodes=flatten(locked);
 assert.equal(nodes.filter(x=>x.type==='button').length,0);assert(nodes.some(x=>x.props.role==='timer'&&x.children.includes('2:00')));
 assert(JSON.stringify(locked).includes('Yanlış deneme sınırına ulaştın. Süre bitene kadar hareket ve saldırı kapalı.'));
 assert.equal(Panel({state:{enabled:true,locked:false,challenge:null,blocked:false}}),null);
});
test('compiled patch is exactly reversible and leaves separate native CAPTCHA callback untouched',()=>{
 const source=fs.readFileSync('/workspace/ccre/r76_admin_gameplay_work/working/core511-source/scripts/core511/generated/client/game-client-core511-r76-63da43f1e5d71be7.js','utf8');
 const result=patchAfkR77(source,'core511-afk-r77-0123456789abcdef.js');
 assert.equal(unpatchAfkR77(result.source,result.proof),source);assert.equal(result.proof.gateReads,15);
 const boundary=result.proof.boundary;assert.equal(result.source.slice(result.source.indexOf(boundary)),source.slice(source.indexOf(boundary)));
 assert(result.source.includes('colAfkInputR77.current=blocked===true'));
});
