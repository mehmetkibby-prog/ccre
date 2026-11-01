export function premiumDueQueries(now,flags){return function(){return [
    ['SELECT id FROM players WHERE pumpkin_enabled499=1 AND pumpkin_until499<=?',now],
    ['SELECT id FROM players WHERE ration_until>0 AND ration_until<=?',now],
    ['SELECT id FROM players WHERE has_wings=1 AND wings_expires_at_ms>0 AND wings_expires_at_ms<=?',now],
    ['SELECT id FROM players WHERE arena_wings_owned=1 AND arena_wings_expires_at_ms>0 AND arena_wings_expires_at_ms<=?',now],
    ...['weapon_skin','teleport_skin'].map(p=>[`SELECT id FROM players WHERE ${p}_owned=1 AND ${p}_expires_at_ms>0 AND ${p}_expires_at_ms<=?`,now]),
    ["SELECT player_id AS id FROM player_items WHERE kind='costume' AND expires_at_ms>0 AND expires_at_ms<=?",now],
    ["SELECT seller_id AS id FROM premium_listings WHERE product IN ('weapon_skin','teleport_skin') AND json_extract(payload,'$.expires_at_ms')<=?",now],
    ["SELECT seller_id AS id FROM premium_listings WHERE product='costume' AND json_extract(payload,'$.item.expires_at_ms')<=?",now],
    ...(this.hasStorage?[["SELECT player_id AS id FROM player_storage_items WHERE kind='costume' AND expires_at_ms>0 AND expires_at_ms<=?",now]]:[]),
    ...(this.hasPets?[["SELECT player_id AS id FROM player_pets WHERE kind='starter' AND equipped=1 AND acquired_at+259200<=?",Math.floor(now/1000)]]:[]),
   ];}.call(flags);}
const DAY_MS=86400000;
const OFFSET_MS=10800000;
const day477=now=>Math.floor((now+OFFSET_MS)/DAY_MS);
const STATE='daily_monster_reward_state477';
const RECEIPTS='daily_monster_rewards477';
export const nativeDailyDay=day477;export const nativeDailyNext=now=>(day477(now)+1)*DAY_MS-OFFSET_MS;
export const DAILY_STATE_SQL=`SELECT active_day,enabled FROM ${STATE} WHERE id=1`;
export const DAILY_PENDING_SQL=`SELECT day,player_id,amount FROM ${RECEIPTS} WHERE status='pending' ORDER BY day LIMIT 1`;
export const DAILY_PLAYER_SQL="SELECT id FROM players WHERE id=? AND loadlab_run_id=''";
export function createNativeDailyJobs(db,{now=Date.now,assertDurable}={}){if(typeof assertDurable!=="function"||assertDurable()!==true)throw Error("Daily reward requires a verified durable sole writer");
const state=db.prepare(`SELECT active_day,enabled FROM ${STATE} WHERE id=1`);
const advance=db.prepare(`UPDATE ${STATE} SET active_day=? WHERE id=1 AND enabled=1 AND active_day<?`);
const pending=db.prepare(`SELECT day,player_id,amount FROM ${RECEIPTS} WHERE status='pending' ORDER BY day LIMIT 1`);
const receipt=db.prepare(`SELECT player_id,amount,status FROM ${RECEIPTS} WHERE day=?`);
const player=db.prepare("SELECT id FROM players WHERE id=? AND loadlab_run_id=''");
const credit=db.prepare("UPDATE players SET core_coins=core_coins+? WHERE id=? AND loadlab_run_id='' RETURNING core_coins");
const paid=db.prepare(`UPDATE ${RECEIPTS} SET status='paid',paid_at_ms=?,balance_after=? WHERE day=? AND player_id=? AND status='pending'`);
const missing=db.prepare(`UPDATE ${RECEIPTS} SET status='missing' WHERE day=? AND status='pending' AND NOT EXISTS(SELECT 1 FROM players WHERE id=${RECEIPTS}.player_id AND loadlab_run_id='')`);
const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}};
const settleOne=entry=>transaction(()=>{
  const current=receipt.get(entry.day);
  if(current?.status!=='pending'||current.player_id!==entry.player_id)return;
  const balance=credit.get(current.amount,current.player_id);
  if(!balance){missing.run(entry.day);return;}
  // The credit and receipt consume commit together. A failure after commit or
  // lost permanent-resume acknowledgement cannot create a second +50 credit.
  if(paid.run(now(),balance.core_coins,entry.day,current.player_id).changes!==1)throw Error('Daily monster reward receipt changed');
 });
return {advanceDay:today=>transaction(()=>advance.run(today,today)),settleOne,markMissing:day=>transaction(()=>missing.run(day))};}
