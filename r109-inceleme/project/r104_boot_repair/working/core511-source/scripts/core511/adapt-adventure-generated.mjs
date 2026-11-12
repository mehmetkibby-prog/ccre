// Explicit, count-checked R18/R19 integration hooks. The extractors still
// validate every V510 source byte before these narrowly scoped adaptations.
// Keeping these here prevents a future regeneration silently removing tower
// inventory support, ordinary-map adventure aggro, or dead-monster retirement.
function replace(source,from,to,count=1){
 if(source.split(from).length-1!==count)throw Error('Adventure extraction anchor drift: '+from);
 return source.split(from).join(to);
}
export function adaptDungeonTower(source){
 source=replace(source,'import {assertGroupLimit494,consumeGroupLimit494} from "../../../../native510-bb3a6cc689c6/lib/group-dungeon-limit494.mjs";',"import {assertGroupLimit494,consumeGroupLimit494} from '../group-dungeon-limit-r31.mjs';");
 source=replace(source,"import {createSoloRules} from './solo-rules.mjs';","import {createSoloRules} from './solo-rules.mjs';\nimport {createTowerRules} from '../tower-rules.mjs';");
 source=replace(source,'const {craftSoloKey,createSolo,soloInfo,soloStage,soloTick,rewardSolo}=createSoloRules({randomUUID,randomInt,globals,progressionSettings});','const {craftSoloKey,createSolo,soloInfo,soloStage,soloTick,rewardSolo}=createSoloRules({randomUUID,randomInt,globals,progressionSettings});\nconst {towerInfo,createTower,towerOpenChest,towerRefine,towerStage,towerTick,towerKills,towerSummary}=createTowerRules({randomUUID,globals});');
 source=replace(source,"if(r.mode!=='solo'){","if(r.mode!=='solo'&&r.mode!=='tower'){",2);
 source=replace(source,'    stage(r) {','    stage(r) {\n        if(r.mode===\'tower\')return towerStage.call(this,r);');
 source=replace(source,'notice:this.notices.get(id)?.message','towerInfo:towerInfo.call(this,id), notice:this.notices.get(id)?.message');
 source=replace(source,"mode:r.mode??'group', status:","mode:r.mode??'group', ...(r.mode==='tower'?{tower:towerSummary(r)}:{}), status:",2);
 source=replace(source,"        if(input.action==='create_solo')", "        if(input.action==='create_tower')return createTower.call(this,id,input);\n        if(input.action==='tower_open_chest')return towerOpenChest.call(this,id,input);\n        if(input.action==='tower_refine')return towerRefine.call(this,id,input);\n        if(input.action==='create_solo')");
 source=replace(source,"if(r.mode==='solo'){this.finish(r,r.status==='complete'?'complete':'abandoned','Solo zindandan ayrıldın. Pazar Köyü’ne döndün.');return {ok:true};}","if(r.mode==='solo'||r.mode==='tower'){this.finish(r,r.status==='complete'?'complete':'abandoned',r.mode==='tower'?'Kadim Kulesi’nden ayrıldın. Pazar Köyü’ne döndün.':'Solo zindandan ayrıldın. Pazar Köyü’ne döndün.');return {ok:true};}");
 source=replace(source,"const floor=r.mode!=='solo'&&enemy.kind", "const floor=r.mode!=='solo'&&r.mode!=='tower'&&enemy.kind");
 source=replace(source,"if(r.mode!=='solo')for(const hit of kills)","if(r.mode!=='solo'&&r.mode!=='tower')for(const hit of kills)");
 source=replace(source,'if(bossKilled)this.reward(r);else if(kills.length)this.save(r);',"if(r.mode==='tower'&&durable)towerKills.call(this,r,plans.filter(hit=>!hit.enemy.shield&&hit.enemy.hp<=0).map(hit=>hit.enemy),p.id);else if(bossKilled)this.reward(r);else if(kills.length)this.save(r);");
 source=replace(source,"if(r.mode==='solo')return;","if(r.mode==='solo'||r.mode==='tower')return;");
 source=replace(source,'        for (const r of runs) {',"        for (const r of runs) {\n            if(r.mode==='tower'){towerTick.call(this,r,now,dt);continue;}");
 source=replace(source,"this.db.prepare('DELETE FROM dungeon_members WHERE run_id=?').run(r.id);", "this.db.prepare('DELETE FROM dungeon_members WHERE run_id=?').run(r.id);\n            if(r.mode==='tower')this.db.prepare('DELETE FROM kadim_tower_kills WHERE run_id=?').run(r.id);");
 return source;
}
export function adaptAdventureAggro(source){
 source="import {isAdventureArea} from '../adventure-maps.mjs';\n"+source;
 source=replace(source,'!EVENT_NEARBY_AREAS444.has(p.area)', '(!EVENT_NEARBY_AREAS444.has(p.area)&&!isAdventureArea(p.area))');
 source=replace(source,'    if(optimizeR18&&multiple489', '    if(isAdventureArea(base.area)&&this.adventureProfile?.(base)?.stationary)continue;\n    if(optimizeR18&&multiple489');
 return replace(source,'const range=eventArea444?', 'const range=isAdventureArea(base.area)?(this.adventureProfile?.(base)?.range??320):eventArea444?');
}
export function adaptAdventureClock(source){
 source="import {isAdventureArea} from '../adventure-maps.mjs';\n"+source;
 return replace(source,"if(!colLabMonsterActive(m)||id==='dragon-world-1'", "if(isAdventureArea(m.area)||!colLabMonsterActive(m)||id==='dragon-world-1'",2);
}
