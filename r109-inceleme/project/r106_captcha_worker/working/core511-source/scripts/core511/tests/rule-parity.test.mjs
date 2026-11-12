import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {BASE,SHA,seeded} from './helpers.mjs';
import {createRules} from '../generated/rules.mjs';
process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {nativeFixture507}=await import('../../entry507/native-fixture.mjs');
const plain=value=>JSON.parse(JSON.stringify(value));
test('selected formulas: unchanged V510 damage, equipment, XP and seeded loot agree with the extracted module',async t=>{
 const fixture=await nativeFixture507();t.after(()=>fixture.close());const {ctx,settings}=fixture;
 const instant=1000000;ctx.__now511=()=>instant;vm.runInContext('Date.now=__now511',ctx);
 const equipment=[{id:'weapon',kind:'weapon',item_name:'Başlangıç Kılıcı',rarity:'white',power:25,role:'muhafiz',equipped:1,enchantments:'[]'},{id:'armor',kind:'armor',item_name:'Başlangıç Zırhı',rarity:'blue',power:40,role:'muhafiz',equipped:1,enchantments:'[]'}];
 for(let seed=1;seed<=100;seed++){
  const random=seeded(seed),rules=createRules({random,now:()=>instant,globals:ctx});ctx.__random511=seeded(seed);vm.runInContext('Math.random=__random511',ctx);
  for(const role of ['muhafiz','avci','arkanist']){
   const args=[role,equipment.map(item=>({...item,role})),settings,false,false];
   assert.deepEqual(plain(rules.calculateEquipmentStats(...args)),plain(ctx.calculateEquipmentStats(...args)));
   const player={role,area:'forest',hp:1000,specialization:'',attack_block:seed%16,level:20};
   const monster={id:'golge-normal-c1-1',variant:'normal',area:'forest',is_boss:0,is_stone:0,max_hp:1000,hp:1000};
   assert.deepEqual(plain(rules.pveDamage(monster,seed*5,player,settings)),plain(ctx.pveDamage(monster,seed*5,player,settings)));
   assert.equal(rules.monsterXpReward(monster,settings),ctx.monsterXpReward(monster,settings));
   assert.equal(rules.lifeStealAmount(seed*13,seed%25),ctx.lifeStealAmount(seed*13,seed%25));
  }
  for(const key of ['boss.world','boss.frozen_throne','boss.black_stone','sinsi.stone']){
   const profile=rules.buildDefaultLootProfile(key,settings),old=ctx.buildDefaultLootProfile(key,settings);assert.deepEqual(plain(profile),plain(old));
   const options={hasDropCharm:seed%2===0,eventPercent:seed%5*50,itemMultiplier:1,levelBalanceMultiplier487:1};
   assert.deepEqual(plain(rules.rollLootProfile(profile,options)),plain(ctx.rollLootProfile(old,options)));
  }
 }
});
