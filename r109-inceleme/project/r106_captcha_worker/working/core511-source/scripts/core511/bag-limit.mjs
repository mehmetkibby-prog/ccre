import {r40Options,BAG_EQUIPMENT_LIMIT} from './r40-options.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {installBagPending,installPendingReset} from './bag-pending.mjs';

// Exactly the existing Çanta equipment category. Costumes, runes, coupons,
// materials and equipped items live in other categories and do not count.
export const BAG_EQUIPMENT_KINDS=Object.freeze(['weapon','armor','helmet','shoes','necklace','earring','bracelet','belt']);
export const BAG_FULL_MESSAGE='Çantan dolu (35/35). Yeni eşya almak için önce eşya sat veya depoya kaldır.';
const kinds=BAG_EQUIPMENT_KINDS.map(kind=>"'"+kind+"'").join(','),predicate=`equipped=0 AND kind IN (${kinds})`;
const installed=new WeakSet();
export const bagFullBody=()=>({ok:false,code:'bag_full',error:BAG_FULL_MESSAGE,limit:BAG_EQUIPMENT_LIMIT,retryable:false});
export function isBagFull(error){return r40Options.bagLimit&&error?.code==='ERR_SQLITE_ERROR'&&error.errcode===1811&&error.message===BAG_FULL_MESSAGE;}
export function bagHasSpace(sql,actor,amount=1){
 if(!r40Options.bagLimit)return true;
 if(!Number.isSafeInteger(amount)||amount<1||amount>BAG_EQUIPMENT_LIMIT)return false;
 // A partial covering index bounds even a legacy bag with thousands of rows.
 return !prepareServerStatement(sql,`SELECT 1 FROM player_items INDEXED BY kernel511_bag_equipment_owner WHERE player_id=? AND ${predicate} LIMIT 1 OFFSET ?`).get(actor,BAG_EQUIPMENT_LIMIT-amount);
}
export function installBagLimit(sql){
 if(!r40Options.bagLimit){installPendingReset(sql);return;}if(installed.has(sql))return;
 sql.exec(`CREATE INDEX IF NOT EXISTS kernel511_bag_equipment_owner ON player_items(player_id) WHERE ${predicate}`);
 const full=`EXISTS(SELECT 1 FROM player_items INDEXED BY kernel511_bag_equipment_owner WHERE player_id=NEW.player_id AND ${predicate} LIMIT 1 OFFSET ${BAG_EQUIPMENT_LIMIT-1})`;
 const incoming=`NEW.equipped=0 AND NEW.kind IN (${kinds})`;
 installBagPending(sql,{predicate,full});
 // TEMP guards disappear on an R39 restart. Existing items are never edited.
 // Equipment swaps and mandatory level/reset unequips are not acquisitions;
 // explicit player unequips are checked at their command boundary instead.
 sql.exec(`CREATE TEMP TRIGGER kernel511_bag_insert BEFORE INSERT ON main.player_items WHEN ${incoming} AND NEW.player_id IS NOT (SELECT defer_actor FROM kernel511_bag_context) AND ${full} BEGIN SELECT RAISE(ABORT,'${BAG_FULL_MESSAGE}');END;
 CREATE TEMP TRIGGER kernel511_bag_transfer BEFORE UPDATE OF player_id,kind ON main.player_items WHEN ${incoming} AND (NEW.player_id!=OLD.player_id OR OLD.kind NOT IN (${kinds})) AND NOT EXISTS(SELECT 1 FROM kernel511_bag_trade_transfers WHERE item_id=OLD.id AND source=OLD.player_id AND target=NEW.player_id) AND ${full} BEGIN SELECT RAISE(ABORT,'${BAG_FULL_MESSAGE}');END;`);
 installed.add(sql);
}
// Native HTTP routes catch their own SQL errors and retain only error.message.
// Normalize this one exact domain rejection after their transaction rollback.
export async function normalizeBagResponse(response){
 if(!r40Options.bagLimit||!(response instanceof Response)||response.status!==409)return response;
 let body;try{body=await response.clone().json();}catch{return response;}
 if(body?.error!==BAG_FULL_MESSAGE||body.code==='bag_full')return response;
 const headers=new Headers(response.headers);headers.delete('content-length');
 return Response.json({...body,...bagFullBody()},{status:409,headers});
}
export function bagUnequipBlocked(sql,actor,input){
 if(!r40Options.bagLimit)return false;
 let row;
 if(input.action==='unequip'||input.action==='unequip_belt_r31')row=prepareServerStatement(sql,`SELECT 1 FROM player_items WHERE id=? AND player_id=? AND equipped=1 AND kind IN (${kinds})`).get(String(input.itemId??''),actor);
 else if(input.action==='equip_rod')row=prepareServerStatement(sql,"SELECT 1 FROM player_items WHERE player_id=? AND kind='weapon' AND equipped=1 AND EXISTS(SELECT 1 FROM players WHERE id=? AND has_rod=1) LIMIT 1").get(actor,actor);
 return Boolean(row)&&!bagHasSpace(sql,actor);
}
