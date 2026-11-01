import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../working/core511-source/scripts/core511/',import.meta.url);
test('all native attack respawn paths retain configured Rune zero/positive values and existing generic fallbacks',()=>{
 const settings={boss_respawn_seconds:600,sinsi_stone_respawn_seconds:80,ancient_monster_respawn_seconds:40,forest_monster_respawn_seconds:30,frozen_monster_respawn_seconds:50,black_monster_respawn_seconds:60,afk_island_respawn_seconds:70};
 const source=fs.readFileSync(new URL('generated/attack-rules.mjs',root),'utf8');
 const expressions=[...source.matchAll(/const respawn = ([^\n]+);/g)].filter(m=>m[1].includes('respawnSeconds'));
 assert.equal(expressions.length,6);
 for(const [,expression] of expressions){
  const calculate=new Function('target','globalThis','settings',"const now=1000,isAdventureArea=a=>a.startsWith('adventure:'),dragonService=()=>null,isBlackStoneBoss476=()=>false,isFrozenBossId=()=>false,isFrozenWaterId=()=>false,colLabNormalRespawnSecondsR10=(t,n)=>n;return "+expression+';');
  for(const area of ['rune_v2','rune'])for(const seconds of [0,30,600])assert.equal(calculate({area},{__colRuneV2:{monster:()=>({respawnSeconds:seconds})},__colRunes:{monster:()=>({respawnSeconds:seconds})}},settings),1000+seconds);
  for(const globals of [{},{__colRuneV2:{monster:()=>null},__colRunes:{monster:()=>null}}]){
   assert.equal(calculate({area:'rune_v2'},globals,settings),1018);
   assert.equal(calculate({area:'rune_v2',summoned:1},globals,settings),1002);
   assert.equal(calculate({area:'rune_v2',is_boss:1},globals,settings),1600);
  }
  for(const [area,seconds] of [['forest',30],['frozen',50],['ancient',40],['black',60],['afk',70]])assert.equal(calculate({area},{},settings),1000+seconds);
  assert.equal(calculate({area:'event'},{},settings),0);assert.equal(calculate({area:'adventure:1'},{},settings),0);
 }
});
