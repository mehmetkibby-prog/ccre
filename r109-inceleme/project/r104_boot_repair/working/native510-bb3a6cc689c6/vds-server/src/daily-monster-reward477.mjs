import {scopeLoadLabDailyRewardTriggers} from './loadlab-writer.mjs';
import {deferDatabaseBackgroundTask} from './database.mjs';

// The existing daily ranking is realm-wide, including all channels. Its day
// begins at 00:00 UTC+3, independent of the host's configured timezone.
export const DAILY_MONSTER_WINNER_COINS477=50;
const DAY_MS=86400000,OFFSET_MS=10800000;
const DAY_SQL='CAST((unixepoch()+10800)/86400 AS INTEGER)';
const STAMP_SQL='CAST(unixepoch() * 1000 AS INTEGER)';
const day477=now=>Math.floor((now+OFFSET_MS)/DAY_MS);
const STATE='daily_monster_reward_state477',RECEIPTS='daily_monster_rewards477';
export const DAILY_MONSTER_WRITER_TRIGGERS477=Object.freeze(['daily_monster_capture477','daily_monster_rollover477','daily_monster_delete477','daily_monster_ban477','daily_monster_account_delete477']);

export function assertDailyMonsterRewardRollbackReady477(db){
 const tables=new Set(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name IN (?,?)").all(STATE,RECEIPTS).map(row=>row.name));
 const expectedTriggers=DAILY_MONSTER_WRITER_TRIGGERS477;
 const triggers=db.prepare("SELECT name FROM sqlite_schema WHERE type='trigger' AND name IN (?,?,?,?,?)").all(...expectedTriggers);
 if(!tables.size&&!triggers.length)return {present:false};
 if(tables.size!==2)throw Error('Incomplete daily monster reward schema');
 for(const [table,expected] of [
  [STATE,[['id','INTEGER',0,1],['active_day','INTEGER',1,0],['enabled','INTEGER',1,0]]],
  [RECEIPTS,[['day','INTEGER',0,1],['player_id','TEXT',0,0],['player_name','TEXT',1,0],['kills','INTEGER',1,0],['amount','INTEGER',1,0],['captured_at_ms','INTEGER',1,0],['status','TEXT',1,0],['paid_at_ms','INTEGER',0,0],['balance_after','INTEGER',0,0]]],
 ]){
  const actual=db.prepare(`PRAGMA table_info(${table})`).all();
  if(actual.length!==expected.length||actual.some((row,i)=>row.name!==expected[i][0]||row.type.toUpperCase()!==expected[i][1]||row.notnull!==expected[i][2]||row.pk!==expected[i][3]))throw Error('Unsupported daily monster reward schema');
 }
 const rows=db.prepare(`SELECT id,active_day,enabled FROM ${STATE}`).all();
 if(rows.length!==1||rows[0].id!==1||!Number.isSafeInteger(rows[0].active_day)||rows[0].active_day<0||![0,1].includes(rows[0].enabled))throw Error('Invalid daily monster reward state');
 if(triggers.length!==expectedTriggers.length&&(rows[0].enabled!==0||triggers.length!==0))throw Error('Incomplete daily monster reward triggers');
 return {present:true};
}

// One state row and at most one durable receipt per completed active day. No
// history of individual kills or player/day score copies is introduced.
export function ensureDailyMonsterReward477(db,{now=Date.now}={}){
 db.exec('SAVEPOINT daily_monster_schema477');
 try{
  db.exec(`CREATE TABLE IF NOT EXISTS ${STATE}(
   id INTEGER PRIMARY KEY CHECK(id=1),active_day INTEGER NOT NULL,
   enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1)));
   CREATE TABLE IF NOT EXISTS ${RECEIPTS}(
    day INTEGER PRIMARY KEY,player_id TEXT,player_name TEXT NOT NULL DEFAULT '',
    kills INTEGER NOT NULL CHECK(kills>=0),amount INTEGER NOT NULL CHECK(amount=50),
    captured_at_ms INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN('pending','paid','empty','missing')),
    paid_at_ms INTEGER,balance_after INTEGER);
   CREATE INDEX IF NOT EXISTS idx_daily_monster_pending477 ON ${RECEIPTS}(day) WHERE status='pending';
   CREATE TRIGGER IF NOT EXISTS daily_monster_capture477 BEFORE UPDATE OF active_day ON ${STATE}
   WHEN OLD.enabled=1 AND NEW.enabled=1 AND NEW.active_day>OLD.active_day
   BEGIN
    INSERT INTO ${RECEIPTS}(day,player_id,player_name,kills,amount,captured_at_ms,status)
     SELECT OLD.active_day,p.id,p.name,p.daily_monster_kills,50,${STAMP_SQL},'pending'
     FROM players p JOIN accounts a ON a.id=p.account_id
     WHERE p.is_gm=0 AND p.daily_monster_kills>0 AND p.daily_monster_day=OLD.active_day AND a.permanently_banned=0
     ORDER BY p.daily_monster_kills DESC,p.id LIMIT 1 ON CONFLICT(day) DO NOTHING;
    INSERT INTO ${RECEIPTS}(day,player_id,player_name,kills,amount,captured_at_ms,status)
     VALUES(OLD.active_day,NULL,'',0,50,${STAMP_SQL},'empty') ON CONFLICT(day) DO NOTHING;
   END;`);
  const advance=`UPDATE ${STATE} SET active_day=${DAY_SQL} WHERE id=1 AND enabled=1 AND active_day<${DAY_SQL};`;
  const due=`${DAY_SQL}>(SELECT active_day FROM ${STATE} WHERE id=1 AND enabled=1)`;
  // BEFORE the first next-day count can replace yesterday's count, freeze the
  // winner in a receipt. These triggers NEVER mutate another player's wallet;
  // foreign-player economic writes must remain in the permanent owner lane.
  db.exec(`CREATE TRIGGER IF NOT EXISTS daily_monster_rollover477 BEFORE UPDATE OF daily_monster_day,daily_monster_kills,is_gm ON players
    WHEN ${due} BEGIN ${advance} END;
   CREATE TRIGGER IF NOT EXISTS daily_monster_delete477 BEFORE DELETE ON players
    WHEN ${due} BEGIN ${advance} END;
   CREATE TRIGGER IF NOT EXISTS daily_monster_ban477 BEFORE UPDATE OF permanently_banned ON accounts
    WHEN ${due} BEGIN ${advance} END;
   CREATE TRIGGER IF NOT EXISTS daily_monster_account_delete477 BEFORE DELETE ON accounts
    WHEN ${due} BEGIN ${advance} END;`);
  scopeLoadLabDailyRewardTriggers(db);
  const today=day477(now());
  db.prepare(`INSERT INTO ${STATE}(id,active_day,enabled) VALUES(1,?,1) ON CONFLICT(id) DO NOTHING`).run(today);
  // Only a deliberate cold rollback disables this feature. Re-enabling starts
  // with TODAY; V476 days are never converted into retroactive prize days.
  db.prepare(`UPDATE ${STATE} SET active_day=?,enabled=1 WHERE id=1 AND enabled=0`).run(today);
  // Restart after midnight freezes the last active day's still-intact counters
  // before any channel or subsequent migration can overwrite them.
  db.prepare(`UPDATE ${STATE} SET active_day=? WHERE id=1 AND enabled=1 AND active_day<?`).run(today,today);
  db.exec('RELEASE daily_monster_schema477');
 }catch(error){db.exec('ROLLBACK TO daily_monster_schema477; RELEASE daily_monster_schema477');throw error;}
}

// Cold rollback calls this AFTER services are stopped, on the current realm DB.
// It composes with the caller's transaction. Receipts and credited CP survive.
export function disableDailyMonsterReward477(db,{now=Date.now}={}){
 if(!assertDailyMonsterRewardRollbackReady477(db).present)return {present:false};
 db.exec('SAVEPOINT daily_monster_disable477');
 try{
  const today=day477(now());
  db.prepare(`UPDATE ${STATE} SET active_day=? WHERE id=1 AND enabled=1 AND active_day<?`).run(today,today);
  db.prepare(`UPDATE ${STATE} SET enabled=0 WHERE id=1 AND enabled=1`).run();
  // V476 private native workspaces know neither this ledger nor its trigger
  // filter. Remove the writer hooks so old snapshot SQL never references an
  // absent private table, even during statement compilation of a false WHEN.
  for(const trigger of DAILY_MONSTER_WRITER_TRIGGERS477)db.exec(`DROP TRIGGER IF EXISTS ${trigger}`);
  db.exec('RELEASE daily_monster_disable477');return {present:true,disabled:true};
 }catch(error){db.exec('ROLLBACK TO daily_monster_disable477; RELEASE daily_monster_disable477');throw error;}
}

export function createDailyMonsterReward477(db,{now=Date.now,permanent=(_ids,operation)=>operation(),defer=deferDatabaseBackgroundTask}={}){
 if(db.prepare('PRAGMA synchronous').get().synchronous!==2)throw Error('Daily monster reward requires the observed FULL native writer');
 const state=db.prepare(`SELECT active_day,enabled FROM ${STATE} WHERE id=1`);
 const advance=db.prepare(`UPDATE ${STATE} SET active_day=? WHERE id=1 AND enabled=1 AND active_day<?`);
 const pending=db.prepare(`SELECT day,player_id,amount FROM ${RECEIPTS} WHERE status='pending' ORDER BY day LIMIT 1`);
 const receipt=db.prepare(`SELECT player_id,amount,status FROM ${RECEIPTS} WHERE day=?`);
 const player=db.prepare("SELECT id FROM players WHERE id=? AND loadlab_run_id=''");
 const credit=db.prepare("UPDATE players SET core_coins=core_coins+? WHERE id=? AND loadlab_run_id='' RETURNING core_coins");
 const paid=db.prepare(`UPDATE ${RECEIPTS} SET status='paid',paid_at_ms=?,balance_after=? WHERE day=? AND player_id=? AND status='pending'`);
 const missing=db.prepare(`UPDATE ${RECEIPTS} SET status='missing' WHERE day=? AND status='pending' AND NOT EXISTS(SELECT 1 FROM players WHERE id=${RECEIPTS}.player_id AND loadlab_run_id='')`);
 let job=null,nextDue=0;
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
 return {tick(available=()=>true){
  if(job)return job;
  if(!available()||now()<nextDue)return Promise.resolve();
  job=defer(async()=>{
   if(!available())return;
   const time=now(),today=day477(time),current=state.get();
   if(!current?.enabled){nextDue=(today+1)*DAY_MS-OFFSET_MS;return;}
   if(current.active_day<today)transaction(()=>advance.run(today,today));
   // One winner at a time, at most one per existing upkeep invocation. There
   // is no all-player lock, new timer, ranking poll or query in the idle path.
   const entry=pending.get();
   if(entry){
    if(!player.get(entry.player_id))transaction(()=>missing.run(entry.day));
    else await permanent([entry.player_id],()=>{if(available())settleOne(entry);});
   }
   if(!pending.get())nextDue=(today+1)*DAY_MS-OFFSET_MS;
  }).finally(()=>{job=null;});
  return job;
 },drain(){return job??Promise.resolve();}};
}
