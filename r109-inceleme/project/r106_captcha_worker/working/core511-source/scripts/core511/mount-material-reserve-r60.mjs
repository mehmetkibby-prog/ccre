// Existing durable mount-receipt storage; reserved scopes cannot be selected
// by a player's request. No new table/trigger can disable the combat fast path
// either on R60 or after a downgrade to immutable R59.
export const MOUNT_MIGRATION_SCOPE_R60='system:r60-material-migration';
export const MOUNT_RESERVE_SCOPE_R60='system:r60-material-reserve';
export const MOUNT_LEGACY_CAPS_R60=Object.freeze({saddle_leather:30,saddle_buckle:8,saddle_rein:5});
export function readMountReserveR60(sql){
 return sql.prepare('SELECT request_id,result FROM mount_receipts_r49 WHERE scope=?').all(MOUNT_RESERVE_SCOPE_R60).map(row=>{
  const data=JSON.parse(row.result);
  if(data?.version!==1||data.playerId!==row.request_id||!data.balances||typeof data.balances!=='object'||Array.isArray(data.balances))throw Error('r60_invalid_material_reserve');
  for(const [kind,amount]of Object.entries(data.balances))if(!Object.hasOwn(MOUNT_LEGACY_CAPS_R60,kind)||!Number.isSafeInteger(amount)||amount<0)throw Error('r60_invalid_material_reserve');
  return data;
 });
}
