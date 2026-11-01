import {gameplayR60} from './r60-options.mjs';
import {prepareCached477} from './writer-statements.mjs';

export const MOUNT_PRIVATE_TABLES_R60=Object.freeze(['mount_inventory_r49','mount_reward_claims_r49']);
const tables=new Set([...MOUNT_PRIVATE_TABLES_R60,'dungeon_materials']);
export const rewardSectionTableR60=name=>gameplayR60.rewardSections&&tables.has(name);
export const needsMaterialSectionsR60=result=>gameplayR60.rewardSections&&result.sharedRefresh?.tables?.includes('dungeon_materials');
const validRows=rows=>Array.isArray(rows)&&rows.length<=128&&new Set(rows.map(r=>r?.kind)).size===rows.length&&rows.every(r=>r&&Object.keys(r).length===2&&typeof r.kind==='string'&&r.kind.length>0&&r.kind.length<=128&&Number.isSafeInteger(r.amount)&&r.amount>=0);

// Only these inventory amounts and their deduplication journal may change.
// Neither is a resident combat input: ResidentMounts.hydrate reads ONLY owned
// unlocks + selected profile, whose tables remain disallowed. The Seyis panel
// reads current quest amounts through its existing authoritative status call.
// Material rows ARE world projection inputs and must be replaced in full.
export function captureMaterialSectionsR60(sql,snapshot,result){
 if(snapshot?.complete!==true||!needsMaterialSectionsR60(result))return snapshot;
 if(result.actorSectionsR52?.readMaterialsR60!==true)return null;
 const actors=[];
 for(const entry of snapshot.actors){
  const rows=prepareCached477(sql,'SELECT kind,amount FROM dungeon_materials WHERE player_id=? LIMIT 129').all(entry.id);
  if(!validRows(rows))return null;
  actors.push({...entry,dungeonMaterialsR60:rows});
 }
 return {...snapshot,actors};
}
export function validMaterialSectionR60(result,fresh){
 return !needsMaterialSectionsR60(result)||result.actorSectionsR52?.readMaterialsR60===true&&validRows(fresh?.dungeonMaterialsR60);
}
export function materialPartR60(result,fresh){
 return needsMaterialSectionsR60(result)?{dungeonMaterialsR60:fresh.dungeonMaterialsR60}:{};
}
