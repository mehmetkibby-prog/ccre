import {createHash} from 'node:crypto';
import {demand} from './contract.mjs';
import {DAILY_PENDING_SQL,nativeDailyDay} from './generated/player-job-rules.mjs';

// Keep the native +50 winner receipt intact. R76 adds +100 to that winner,
// +100 to second and +50 to third. Nothing rewrites previously captured days.
export const DAILY_PRIZES_R76=Object.freeze([150,100,50]);
export const DAILY_STATE_R76='kernel511_daily_monster_reward_state_r76';
export const DAILY_RECEIPTS_R76='kernel511_daily_monster_rewards_r76';
export const DAILY_TRIGGER_R76='daily_monster_capture_r76';
export const DAILY_SCHEMA_R76=Object.freeze({
 [DAILY_STATE_R76]:`CREATE TABLE ${DAILY_STATE_R76}(id INTEGER PRIMARY KEY CHECK(id=1),schema_version INTEGER NOT NULL CHECK(schema_version=1),enabled INTEGER NOT NULL CHECK(enabled IN(0,1)))`,
 [DAILY_RECEIPTS_R76]:`CREATE TABLE ${DAILY_RECEIPTS_R76}(day INTEGER NOT NULL,rank INTEGER NOT NULL CHECK(rank BETWEEN 1 AND 3),player_id TEXT NOT NULL,player_name TEXT NOT NULL,kills INTEGER NOT NULL CHECK(kills>0),amount INTEGER NOT NULL CHECK((rank IN(1,2) AND amount=100) OR (rank=3 AND amount=50)),captured_at_ms INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN('pending','paid','missing')),paid_at_ms INTEGER,balance_after INTEGER,PRIMARY KEY(day,rank),UNIQUE(day,player_id))`,
 idx_kernel511_daily_monster_pending_r76:`CREATE INDEX idx_kernel511_daily_monster_pending_r76 ON ${DAILY_RECEIPTS_R76}(day,rank) WHERE status='pending'`
});
// This executes *inside* the native capture INSERT, itself BEFORE the daily
// counter reset/ban/deletion. All ranks therefore share the identical cutoff.
// A mismatch or partial failure aborts the native capture and rollover too.
export const DAILY_CAPTURE_SQL_R76=`CREATE TRIGGER ${DAILY_TRIGGER_R76} AFTER INSERT ON daily_monster_rewards477
WHEN NEW.status='pending' AND (SELECT enabled FROM ${DAILY_STATE_R76} WHERE id=1 AND schema_version=1)=1
BEGIN
 INSERT INTO ${DAILY_RECEIPTS_R76}(day,rank,player_id,player_name,kills,amount,captured_at_ms,status)
 SELECT NEW.day,w.rank,w.id,w.name,w.daily_monster_kills,CASE WHEN w.rank=3 THEN 50 ELSE 100 END,NEW.captured_at_ms,'pending'
 FROM (SELECT p.id,p.name,p.daily_monster_kills,ROW_NUMBER() OVER(ORDER BY p.daily_monster_kills DESC,p.id) AS rank
  FROM players p JOIN accounts a ON a.id=p.account_id
  WHERE p.loadlab_run_id='' AND p.is_gm=0 AND p.daily_monster_kills>0 AND p.daily_monster_day=NEW.day AND a.permanently_banned=0
  ORDER BY p.daily_monster_kills DESC,p.id LIMIT 3) AS w;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ${DAILY_RECEIPTS_R76} WHERE day=NEW.day AND rank=1 AND player_id=NEW.player_id AND kills=NEW.kills) THEN RAISE(ABORT,'daily_r76_winner_mismatch') END;
END`;
export const dailyRewardTriggerHashesR76=Object.freeze({['main:'+DAILY_TRIGGER_R76]:createHash('sha256').update(DAILY_CAPTURE_SQL_R76).digest('hex')});
const schemaRow=(sql,name)=>sql.prepare('SELECT type,sql FROM main.sqlite_schema WHERE name=?').get(name);
export function validateDailyMonsterRewardsR76(sql,{allowAbsent=false}={}){
 const state=schemaRow(sql,DAILY_STATE_R76);
 if(!state&&allowAbsent){demand(!schemaRow(sql,DAILY_RECEIPTS_R76)&&!schemaRow(sql,DAILY_TRIGGER_R76),'daily_r76_partial_schema');return false;}
 for(const [name,expected]of Object.entries(DAILY_SCHEMA_R76))demand(schemaRow(sql,name)?.sql===expected,'daily_r76_unknown_schema');
 const row=sql.prepare(`SELECT * FROM ${DAILY_STATE_R76}`).all();
 demand(row.length===1&&row[0].id===1&&row[0].schema_version===1&&[0,1].includes(row[0].enabled),'daily_r76_unknown_state');
 const trigger=schemaRow(sql,DAILY_TRIGGER_R76);demand(!trigger||trigger.sql===DAILY_CAPTURE_SQL_R76,'daily_r76_unknown_trigger');
 return true;
}
export function installDailyMonsterRewardsR76(sql,{now=Date.now}={}){
 demand(sql.isTransaction,'daily_r76_cold_transaction_required');
 const present=validateDailyMonsterRewardsR76(sql,{allowAbsent:true}),active=present&&sql.prepare(`SELECT enabled FROM ${DAILY_STATE_R76} WHERE id=1`).get().enabled===1;
 // A cold R75→R76 switch can occur after midnight without an intervening R75
 // scheduler tick. Catch up its existing +50 rule while R76 capture is still
 // absent/disabled; never turn an offline rollback-era day into an addon day.
 // Already-enabled R76 restarts keep their pending earned day unchanged.
 if(!active){
  const at=now();demand(Number.isSafeInteger(at)&&at>0,'daily_r76_startup_clock');const today=nativeDailyDay(at);
  sql.prepare('UPDATE daily_monster_reward_state477 SET active_day=? WHERE id=1 AND enabled=1 AND active_day<?').run(today,today);
 }
 if(!present){
  for(const definition of Object.values(DAILY_SCHEMA_R76))sql.exec(definition);
  sql.exec(`INSERT INTO ${DAILY_STATE_R76}(id,schema_version,enabled) VALUES(1,1,1)`);
 }else sql.exec(`UPDATE ${DAILY_STATE_R76} SET enabled=1 WHERE id=1 AND schema_version=1`);
 if(!schemaRow(sql,DAILY_TRIGGER_R76))sql.exec(DAILY_CAPTURE_SQL_R76);
 // Existing legacy receipts are deliberately not backfilled. Reapply only
 // resumes amounts already earned under R76 and captures future rollovers.
}
export function disableDailyMonsterRewardsR76(sql){
 demand(sql.isTransaction,'daily_r76_cold_transaction_required');
 if(!validateDailyMonsterRewardsR76(sql,{allowAbsent:true}))return {present:false};
 sql.exec(`UPDATE ${DAILY_STATE_R76} SET enabled=0 WHERE id=1 AND schema_version=1;DROP TRIGGER IF EXISTS ${DAILY_TRIGGER_R76}`);
 // Do not restore databases or delete pending/paid receipts on code rollback.
 return {present:true,pending:sql.prepare(`SELECT COUNT(*) n FROM ${DAILY_RECEIPTS_R76} WHERE status='pending'`).get().n};
}
export function readDailyPendingR76(sql){
 const legacy=sql.prepare(DAILY_PENDING_SQL).get();
 if(legacy)return legacy;
 if(!schemaRow(sql,DAILY_STATE_R76))return null;
 return sql.prepare(`SELECT day,rank,player_id,amount,76 AS rewardVersion FROM ${DAILY_RECEIPTS_R76} WHERE status='pending' AND (SELECT enabled FROM ${DAILY_STATE_R76} WHERE id=1)=1 ORDER BY day,rank LIMIT 1`).get()??null;
}
export function dailyReceiptR76(sql,entry){
 if(entry.rewardVersion!==76)return sql.prepare('SELECT * FROM daily_monster_rewards477 WHERE day=?').get(entry.day)??null;
 demand(Number.isSafeInteger(entry.rank)&&entry.rank>=1&&entry.rank<=3,'daily_r76_entry');
 return sql.prepare(`SELECT * FROM ${DAILY_RECEIPTS_R76} WHERE day=? AND rank=?`).get(entry.day,entry.rank)??null;
}
export function settleDailyRewardR76(sql,entry,{nowMs,missing=false,assertDurable}){
 demand(sql.isTransaction&&assertDurable()===true,'daily_r76_durability_required');
 demand(entry.rewardVersion===76&&Number.isSafeInteger(entry.day)&&typeof entry.player_id==='string','daily_r76_entry');
 const row=dailyReceiptR76(sql,entry);
 if(row?.status!=='pending'||row.player_id!==entry.player_id)return;
 if(missing){
  sql.prepare(`UPDATE ${DAILY_RECEIPTS_R76} SET status='missing' WHERE day=? AND rank=? AND status='pending' AND NOT EXISTS(SELECT 1 FROM players WHERE id=? AND loadlab_run_id='')`).run(row.day,row.rank,row.player_id);return;
 }
 const balance=sql.prepare("UPDATE players SET core_coins=core_coins+? WHERE id=? AND loadlab_run_id='' RETURNING core_coins").get(row.amount,row.player_id);
 if(!balance){settleDailyRewardR76(sql,entry,{nowMs,missing:true,assertDurable});return;}
 demand(sql.prepare(`UPDATE ${DAILY_RECEIPTS_R76} SET status='paid',paid_at_ms=?,balance_after=? WHERE day=? AND rank=? AND player_id=? AND status='pending'`).run(nowMs,balance.core_coins,row.day,row.rank,row.player_id).changes===1,'daily_r76_receipt_changed');
}

// The first place's native50 and addon100 share one actor fence and one outer
// writer COMMIT. This avoids a second pause or an intermediate +50 wallet frame.
export function settleDailyWinnerTopupR76(sql,entry,options){
 if(!schemaRow(sql,DAILY_STATE_R76))return;
 const legacy=dailyReceiptR76(sql,entry);
 if(!legacy||legacy.player_id!==entry.player_id||!['paid','missing'].includes(legacy.status))return;
 const addon={day:entry.day,rank:1,player_id:entry.player_id,rewardVersion:76};
 settleDailyRewardR76(sql,addon,options);
}
