import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {parse} from 'acorn';
import * as native from '../../r109_latency_completion/working/native510-bb3a6cc689c6/lib/runes.mjs';
import * as realtime from '../../r109_latency_completion/working/native510-bb3a6cc689c6/realtime-server/src/rune-map.mjs';
import {acceptMotion} from '../../r109_latency_completion/working/native510-bb3a6cc689c6/realtime-server/src/motion.mjs';
import {acceptMountMotion} from '../../r109_latency_completion/working/core511-source/scripts/core511/mount-motion.mjs';
import {createRules} from '../../r109_latency_completion/working/core511-source/scripts/core511/generated/rules.mjs';

const core=path.resolve(import.meta.dirname,'../../r109_latency_completion/working/core511-source/scripts/core511');
const proof=JSON.parse(fs.readFileSync(path.join(core,'generated/native-client-proof.json')));
function clientModel(file){
 const text=fs.readFileSync(path.join(core,'generated/client',file),'utf8');
 const ast=parse(text,{ecmaVersion:'latest',sourceType:'module'});
 const node=ast.body.flatMap(x=>x.declarations??[]).find(x=>x.id?.name==='colRuneModel');
 assert(node);return vm.runInNewContext(text.slice(node.init.start,node.init.end));
}
const client=clientModel(proof.name),old=clientModel(proof.r114Rune.sourceGame);
const generatedText=fs.readFileSync(path.join(core,'generated/reward-services.mjs'),'utf8');
const factory=parse(generatedText,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.id?.name==='runeLibraryModule');
const generated=vm.runInNewContext('const ambient=globalThis;('+generatedText.slice(factory.start,factory.end)+')({globals:{},now:Date.now,fourChannels:true})');
const implementations=[native,realtime,client,generated];

test('old interior walls and coastline reproduce the reported blockage; new paths open',()=>{
 for(const p of [[1900,1050],[2800,1600],[500,500],[4100,2600]]){
   assert.equal(old.runeWalkable(...p),false);
   for(const impl of implementations)assert.equal(impl.runeWalkable(...p,16),true);
 }
 for(const segment of [[1500,1000,2400,1000],[2500,1600,3200,1600],[300,300,4000,2600]]){
   assert.equal(old.runeWalkableSegment(...segment),false);
   for(const impl of implementations)assert.equal(impl.runeWalkableSegment(...segment,16),true);
 }
});
test('native, realtime, committed reward and actual browser module agree across the map',()=>{
 for(let x=60;x<4270;x+=137)for(let y=85;y<2820;y+=131){
   for(const impl of implementations){assert.equal(impl.runeWalkable(x,y,16),true);assert.equal(impl.runeWalkableSegment(2121,2579,x,y,16),true);}
 }
});
test('map bounds, invalid coordinates and clearance still reject illegal movement',()=>{
 for(const impl of implementations){
   for(const p of [[-1,100],[100,-1],[4321,100],[100,2881],[NaN,100],[100,Infinity]])assert.equal(impl.runeWalkable(...p),false);
   assert.equal(impl.runeWalkable(5,100,16),false);
   assert.equal(impl.runeWalkableSegment(100,100,4321,100),false);
 }
});
function actor(area){return{playerId:'r114-player',connectionId:'r114-stream',area,x:1800,y:1050,hp:100,role:'avci',hpRevision:1,cycle:1,channel:1};}
function payload(overrides={}){return{streamId:'r114-stream',sequence:1,x:1900,y:1050,hpRevision:1,...overrides};}
for(const area of ['rune','rune_v2']){
 test(area+': walking and mounted motion cross old wall; anti-teleport/session/HP checks stay enforced',()=>{
   const walk=(area,x,y)=>native.runeWalkable(x,y);
   assert(acceptMotion(actor(area),payload(),1000,walk));
   assert(acceptMountMotion(actor(area),payload(),1000,walk,1.25));
   assert.equal(acceptMotion(actor(area),payload({x:3500}),1000,walk),null);
   assert.equal(acceptMotion(actor(area),payload({streamId:'other'}),1000,walk),null);
   assert.equal(acceptMotion({...actor(area),hp:0},payload(),1000,walk),null);
 });
}
test('level/rank gates and spawn configuration are unchanged',()=>{
 assert.equal(native.runeEligible({level:64,rank_tier:1}),false);
 assert.equal(native.runeEligible({level:65,rank_tier:0}),false);
 assert.equal(native.runeEligible({level:65,rank_tier:1}),true);
 for(const spawn of native.RUNE_SPAWNS)assert(native.runeWalkable(spawn.x,spawn.y,16));
 assert.equal(native.RUNE_SPAWNS.length,20);
});
test('authoritative channel checkpoint rules accept both rune coast paths and reject map exits',()=>{
 const rules=createRules({fourChannels:true});
 for(const area of ['rune','rune_v2']){
   assert.equal(rules.isAreaWalkableSegment(area,1500,1000,2400,1000),true);
   assert.equal(rules.isAreaWalkableSegment(area,300,300,4000,2600),true);
   assert.equal(rules.isAreaWalkableSegment(area,100,100,9000,100),false);
 }
});
