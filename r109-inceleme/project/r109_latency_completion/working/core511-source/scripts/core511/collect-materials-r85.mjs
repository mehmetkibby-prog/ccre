import {prepareCached477} from './writer-statements.mjs';

// This is a complete post-write image, never a guessed increment. Bound the
// payload and fall back to the ordinary actor read for unfamiliar inventories.
export function validCollectMaterialsR85(rows){
 if(!Array.isArray(rows)||rows.length>128)return false;
 const kinds=new Set();
 return rows.every(row=>row&&Object.keys(row).length===2&&Object.hasOwn(row,'kind')&&Object.hasOwn(row,'amount')&&typeof row.kind==='string'&&row.kind.length>0&&row.kind.length<=128&&!kinds.has(row.kind)&&kinds.add(row.kind)&&Number.isSafeInteger(row.amount)&&row.amount>=0);
}
export function captureCollectMaterialsR85(sql,actor){
 const rows=prepareCached477(sql,'SELECT kind,amount FROM dungeon_materials WHERE player_id=? LIMIT 129').all(actor);
 return validCollectMaterialsR85(rows)?rows:null;
}
export function prepareCollectMaterialsR85(runtime,actor,rows){
 if(!validCollectMaterialsR85(rows))return null;
 const sub=runtime.world.subscribers.get(actor),adventure=runtime.adventure,bundle=adventure?.bundles?.get(actor);
 if(!sub||!Array.isArray(sub.data?.dungeonMaterials)||!sub.data.adventure511?.towerInfo?.inventory||!bundle?.towerInfo?.inventory||typeof adventure.sent?.delete!=='function'||typeof runtime.dungeon.refreshActor!=='function')return null;
 return {rows,inventory:Object.fromEntries(rows.map(row=>[row.kind,row.amount]))};
}
export function applyCollectMaterialsR85(runtime,actor,plan){
 const sub=runtime.world.subscribers.get(actor),adventure=runtime.adventure,{rows,inventory}=plan;
 sub.data={...sub.data,dungeonMaterials:rows,adventure511:{...sub.data.adventure511,towerInfo:{...sub.data.adventure511.towerInfo,inventory}}};
 // A validated portal plan may have updated this bundle in the same commit.
 // Replace only inventory on its current image, retaining those new portals.
 const bundle=adventure.bundles.get(actor);
 adventure.bundles.set(actor,{...bundle,towerInfo:{...bundle.towerInfo,inventory}});
 adventure.projectionCache=null;adventure.sent.delete(actor);
 runtime.dungeon.refreshActor({player:runtime.channel.view.player(actor),dungeon:{memberships:[],materials:[[actor,inventory]]}});
}
