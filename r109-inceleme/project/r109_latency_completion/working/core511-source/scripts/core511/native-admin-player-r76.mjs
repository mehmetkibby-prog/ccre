import {demand} from './contract.mjs';

// Only existing player-targeted administrative mutations enter this gate.
// World/settings controls and services with their own actor gates are excluded.
export const ADMIN_PLAYER_ACTIONS_R76=Object.freeze(['champion_grant_r102','grant_rank','grant_core_coins','grant_starter_chest','grant_gems','grant_stone_books','set_weapon_evolution_points','grant_evolution_scrolls','grant_item','update_player']);
export function runNativeAdminPlayerR76(bound,input,{adminId,reauthorize}={},operation){
 const c=bound.assertBound();
 demand(input&&ADMIN_PLAYER_ACTIONS_R76.includes(input.action)&&typeof adminId==='string'&&adminId&&typeof reauthorize==='function'&&typeof operation==='function','native_admin_player_scope');
 return c.serial(async()=>{
  bound.assertBound();demand(await reauthorize()===adminId,'native_admin_identity_changed');
  const sql=c.database.sqlite;
  // Resolve exactly the native target, inside the coordinator queue. Never
  // trust client-provided channel, owner, account, epoch or a second actor.
  let rows=[];
  if(input.action==='grant_core_coins'){
   const name=typeof input.playerName==='string'?input.playerName.trim():'';
   if(name&&name.length<=32&&!/[\r\n\t]/.test(name))rows=sql.prepare('SELECT id FROM players WHERE name=? COLLATE NOCASE LIMIT 2').all(name);
  }else if(typeof input.playerId==='string'&&/^[a-zA-Z0-9-]{8,64}$/.test(input.playerId))rows=sql.prepare('SELECT id FROM players WHERE id=?').all(input.playerId);
  // Keep native validation/errors for invalid or nonexistent targets. Such
  // requests cannot write a player and must not freeze an arbitrary actor.
  if(rows.length!==1)return operation();
  const actor=rows[0].id;demand(!c.transitions.has(actor),'native_admin_player_transition');
  let value,rejected=null;
  await c.permanent.durablePlayers([actor],async()=>{
   try{value=await operation();}catch(error){rejected=error;}
   demand(!sql.isTransaction,'native_admin_player_transaction_open');return null;
  });
  // Even a native rule rejection may follow a committed change. Refresh the
  // current database image before releasing, then retain the original error.
  if(rejected)throw rejected;return value;
 });
}
