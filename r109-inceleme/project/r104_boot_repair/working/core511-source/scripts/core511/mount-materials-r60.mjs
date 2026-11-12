import {gameplayR60} from './r60-options.mjs';
import {MOUNT_MIGRATION_SCOPE_R60,MOUNT_RESERVE_SCOPE_R60,readMountReserveR60} from './mount-material-reserve-r60.mjs';
export const MOUNT_MATERIALS_R60=Object.freeze({saddle_leather:'Sağlam Deri',saddle_buckle:'Eyer Tokası',saddle_rein:'Dizgin Parçası'});
export const mountMaterialR60=kind=>gameplayR60.mountMaterials&&Object.hasOwn(MOUNT_MATERIALS_R60,kind);
export const MOUNT_MATERIAL_CAP_R60=1000000000;
export const mountInventoryTableR60=kind=>mountMaterialR60(kind)?'dungeon_materials':'mount_inventory_r49';
// Bootstrap only, before admitting players. Move, never copy, the old quest
// balance into the same table used by native market escrow and settlement.
export function migrateMountMaterialsR60(sql){
 if(!gameplayR60.mountMaterials)return;
 sql.exec('SAVEPOINT mount_materials_r60');
 try{
  for(const kind of Object.keys(MOUNT_MATERIALS_R60)){
   sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) SELECT player_id,kind,amount FROM mount_inventory_r49 WHERE kind=? AND amount>0 ON CONFLICT(player_id,kind) DO UPDATE SET amount=dungeon_materials.amount+excluded.amount').run(kind);
   sql.prepare('DELETE FROM mount_inventory_r49 WHERE kind=?').run(kind);
  }
  const credit=sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=dungeon_materials.amount+excluded.amount');
  for(const row of readMountReserveR60(sql))for(const [kind,amount]of Object.entries(row.balances))if(amount)credit.run(row.playerId,kind,amount);
  sql.prepare('DELETE FROM mount_receipts_r49 WHERE scope=?').run(MOUNT_RESERVE_SCOPE_R60);
  sql.prepare("INSERT OR IGNORE INTO mount_receipts_r49(scope,request_id,operation,result,created_at_ms) VALUES(?,'v1','bootstrap','{}',?)").run(MOUNT_MIGRATION_SCOPE_R60,Date.now());
  sql.exec('RELEASE mount_materials_r60');
 }catch(error){sql.exec('ROLLBACK TO mount_materials_r60;RELEASE mount_materials_r60');throw error;}
}
