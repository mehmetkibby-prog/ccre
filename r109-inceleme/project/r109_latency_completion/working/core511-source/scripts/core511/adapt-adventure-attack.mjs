// Reviewed R19 adventure/R20 stationary extensions to the mechanically extracted V510 attack rules.
// Ordinary-map predicates, cooldowns, RNG formulas, reward claim guards and rates remain native.
const common=[
 [
  "function areaWorld(area) {",
  "function areaWorld(area) {if(isAdventureArea(area))return adventureBounds(area);",
  1
 ],
 [
  "function isAreaWalkablePosition(area, x, y) {",
  "function isAreaWalkablePosition(area, x, y) {if(isAdventureArea(area))return adventureWalkable(area,x,y);",
  1
 ],
 [
  "function isAreaWalkableSegment(area, fromX, fromY, toX, toY) {",
  "function isAreaWalkableSegment(area, fromX, fromY, toX, toY) {if(isAdventureArea(area))return adventureSegment(area,fromX,fromY,toX,toY);",
  1
 ],
 [
  "function monsterXpReward(target, settings) {",
  "function monsterXpReward(target, settings) {if(isAdventureArea(target.area))return globalThis.__colAdventure?.profile(target)?.xp??0;",
  1
 ],
 [
  "function normalEssenceRoll(target) {",
  "function normalEssenceRoll(target) {if(isAdventureArea(target.area))return {min:0,span:0};",
  1
 ],
 [
  "function pveAttackCadenceMs(monster) {",
  "function pveAttackCadenceMs(monster) {if(isAdventureArea(monster.area))return globalThis.__colAdventure?.profile(monster)?.cadence??2200;",
  1
 ],
 [
  "function defaultLootSnapshot(target, settings) {",
  "function defaultLootSnapshot(target, settings) {if(isAdventureArea(target.area)){const p=globalThis.__colAdventure?.profile(target);if(!p)throw Error('adventure_loot_profile_missing');return {lootSourceKey:'adventure.catalog',lootProfileRevision:1,lootProfileJson:JSON.stringify(p)};}",
  1
 ],
 [
  "function preparePveEngagement(database, player, monster, nowMs) {",
  "function preparePveEngagement(database, player, monster, nowMs) {if(isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary)return [];",
  1
 ],
 [
  "function armPveEngagement(database, player, monster, nowMs) {",
  "function armPveEngagement(database, player, monster, nowMs) {if(isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary)return;",
  1
 ],
 [
  "if (monster.is_stone || isFrozenWaterId(monster.id))",
  "if (monster.is_stone || isFrozenWaterId(monster.id) || isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary)",
  1
 ],
 [
  "if (player.area !== \"event\" &&",
  "if (!isAdventureArea(player.area) && player.area !== \"event\" &&",
  3
 ],
 [
  "if (player.area !== \"war\" && player.area !== \"black\"",
  "if (!isMistArea(player.area) && player.area !== \"war\" && player.area !== \"black\"",
  2
 ],
 [
  "if(player.area==='black'||player.area==='rune_v2'){",
  "if(isMistArea(player.area)||player.area==='black'||player.area==='rune_v2'){",
  2
 ],
 [
  "if((player.area==='black'||player.area==='rune_v2')",
  "if((isMistArea(player.area)||player.area==='black'||player.area==='rune_v2')",
  3
 ],
 [
  "if(!['black','rune_v2'].includes(player.area)||",
  "if((!isMistArea(player.area)&&!['black','rune_v2'].includes(player.area))||",
  2
 ],
 [
  "(player.area === \"black\" || player.area === \"rune_v2\") && killed",
  "(isMistArea(player.area) || player.area === \"black\" || player.area === \"rune_v2\") && killed",
  2
 ],
 [
  "!areas.includes(player.area)",
  "(!isAdventureArea(player.area)&&!areas.includes(player.area))",
  2
 ],
 [
  "![\"forest\",\"frozen\",\"sanctum\",\"dragon\",\"sinsi\",\"black\",\"war\",\"arena\",\"ancient\",\"afk\",\"event\",\"rune\",\"rune_v2\"].includes(player.area)",
  "(!isAdventureArea(player.area)&&![\"forest\",\"frozen\",\"sanctum\",\"dragon\",\"sinsi\",\"black\",\"war\",\"arena\",\"ancient\",\"afk\",\"event\",\"rune\",\"rune_v2\"].includes(player.area))",
  2
 ],
 [
  "const respawn = target.area==='event'",
  "const respawn = isAdventureArea(target.area)?0:target.area==='event'",
  4
 ],
 [
  "const respawn = target.area === 'event'",
  "const respawn = isAdventureArea(target.area)?0:target.area === 'event'",
  2
 ]
];
const writerOnly=[
 [
  "database=colLabRewardDatabase(database,pending);",
  "database=colLabRewardDatabase(database,pending);\n        if(pending.loot_source_key==='adventure.catalog'){database.batch(prepareMonsterXp(database,settings,now,pending.monster_id,pending.spawn_round,pending.xp_reward,null,false,pending));return globalThis.__colAdventure.award(pending);}",
  1
 ],
 [
  "function prepareMonsterXp(database, settings, now, monsterId, spawnRound, reward, lethalDamage, includeBefore = false, questMonster438 = null) {",
  "function prepareMonsterXp(database, settings, now, monsterId, spawnRound, reward, lethalDamage, includeBefore = false, questMonster438 = null) {\n const adventureXp511=adventureMonsterId(monsterId);",
  1
 ],
 [
  "WHERE source.hp>0 AND",
  "WHERE ${adventureXp511?0:1}=1 AND source.hp>0 AND",
  1
 ],
 [
  "const historical = `AND NOT EXISTS",
  "const historical = `${adventureXp511?\"AND p.hp>0 AND EXISTS(SELECT 1 FROM adventure_members a JOIN adventure_runs r ON r.id=a.run_id JOIN adventure_monsters am ON am.run_id=r.id WHERE a.player_id=p.id AND a.departed=0 AND am.id=mp.monster_id AND p.area=am.area AND p.channel=r.channel)\":\"\"} AND NOT EXISTS",
  1
 ]
];
export function adaptAdventureAttack(source,{writer=false}={}){
 let text=source;
 for(const [before,after,count] of [...common,...(writer?writerOnly:[])]){
  if(text.split(before).length-1!==count)throw Error('adventure_attack_source_changed:'+before.slice(0,90));
  text=text.replaceAll(before,after);
 }
 return "import {isAdventureArea,isMistArea,adventureBounds,adventureWalkable,adventureSegment,adventureMonsterId} from '../adventure-maps.mjs';\n"+text;
}
