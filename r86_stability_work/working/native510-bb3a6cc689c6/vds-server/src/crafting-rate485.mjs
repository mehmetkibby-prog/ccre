/** One persistent per-account gate shared by the five crafting actions.
 * Uses existing auth-rate storage in seconds, with fractional precision. No sleep,
 * queue or timer; durable economy transactions and action receipts stay separate. */
export const CRAFT_INTERVAL485=250;
export const CRAFT_ACTIONS485=Object.freeze(['upgrade_unique','evolve_weapon','reroll','enchant_add','enchant_fifth']);
export const CRAFT_RATE_SQL485=`INSERT INTO auth_rate_limits(key,attempts,window_started_at,blocked_until)
 VALUES(?,1,?,?) ON CONFLICT(key) DO UPDATE SET
 attempts=CASE WHEN auth_rate_limits.blocked_until<=? THEN 1 ELSE 2 END,
 window_started_at=CASE WHEN auth_rate_limits.blocked_until<=? THEN excluded.window_started_at ELSE auth_rate_limits.window_started_at END,
 blocked_until=CASE WHEN auth_rate_limits.blocked_until<=? THEN excluded.blocked_until ELSE auth_rate_limits.blocked_until END
 RETURNING attempts,blocked_until`;
export async function enforceCraftRate485(database,key,nowMs=Date.now()){
 const now=nowMs/1000,until=(nowMs+CRAFT_INTERVAL485)/1000;
 const result=await database.prepare(CRAFT_RATE_SQL485).bind(key,now,until,now,now,now).first();
 return result?.attempts===1?{allowed:true,retryAfterMs:0}:{allowed:false,retryAfterMs:Math.max(1,Math.ceil(((result?.blocked_until??until)-now)*1000))};
}
