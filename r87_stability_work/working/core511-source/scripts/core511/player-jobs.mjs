import {readDailyPendingR76,dailyReceiptR76,settleDailyRewardR76,settleDailyWinnerTopupR76} from './daily-monster-rewards-r76.mjs';
import {premiumDueQueries,DAILY_STATE_SQL,DAILY_PLAYER_SQL,nativeDailyDay,createNativeDailyJobs} from './generated/player-job-rules.mjs';
import {demand} from './contract.mjs';
export function readPlayerJobs(sql,{kind,nowMs}){
 demand(['premium','daily'].includes(kind)&&Number.isSafeInteger(nowMs)&&nowMs>0,'player_jobs_read');sql.exec('BEGIN');
 try{
  let result;
  if(kind==='premium'){
   const flags={hasStorage:!!sql.prepare("SELECT 1 FROM sqlite_master WHERE name='player_storage_items'").get(),hasPets:!!sql.prepare("SELECT 1 FROM sqlite_master WHERE name='player_pets'").get()},seen=new Set();
   for(const [query,at]of premiumDueQueries(nowMs,flags))for(const {id}of sql.prepare(query+' LIMIT 32').all(at))seen.add(id);result={actors:[...seen]};
  }else{const state=sql.prepare(DAILY_STATE_SQL).get(),pending=readDailyPendingR76(sql);result={state:state?{...state}:null,pending:pending?{...pending}:null,present:pending?!!sql.prepare(DAILY_PLAYER_SQL).get(pending.player_id):false,today:nativeDailyDay(nowMs)};}
  sql.exec('COMMIT');return result;
 }catch(error){sql.exec('ROLLBACK');throw error;}
}
export function createPlayerJobHandler({database,services,assertHeld,clock=Date.now}){
 demand(database?.sqlite===services.sql&&typeof database.atomic==='function'&&typeof database.durableAfterCommit==='function'&&typeof assertHeld==='function','player_job_fence_required');
 const assertDurable=()=>{const mode=database.sqlite.prepare('PRAGMA synchronous').get().synchronous;demand(mode===2||mode===1&&database.walSync&&!database.walSync.failed,'player_job_durability_required');return true;},daily=createNativeDailyJobs(services.database,{now:()=>services.active?.nowMs??clock(),assertDurable});
 return (sql,payload,context)=>{
  demand(sql.isTransaction&&context.peer.channel===0&&context.peer.role==='world'&&['premium','guild_sync','daily_advance','daily_pay','daily_missing'].includes(payload?.job),'player_job_owner');demand(assertHeld(sql,payload,context)===true,'player_job_not_frozen');assertDurable();
  return services.run(payload,()=>{
   if(payload.job==='premium'){demand(typeof payload.actor==='string','player_job_actor');return {job:payload.job,actor:payload.actor,expired:services.globals.__colPremium.expireOwner(payload.actor)};}
   if(payload.job==='guild_sync'){demand(typeof payload.actor==='string','player_job_actor');services.globals.__colPremium.refreshHp(payload.actor);return {job:payload.job,actor:payload.actor};}
   if(payload.job==='daily_advance'){daily.advanceDay(nativeDailyDay(payload.nowMs));return {job:payload.job};}
   demand(Number.isSafeInteger(payload.entry?.day),'daily_job_entry');
   if(payload.job==='daily_pay')demand(payload.actor===payload.entry.player_id,'daily_job_actor');
   if(payload.entry.rewardVersion===76)settleDailyRewardR76(sql,payload.entry,{nowMs:payload.nowMs,missing:payload.job==='daily_missing',assertDurable});
   else{if(payload.job==='daily_pay')daily.settleOne(payload.entry);else daily.markMissing(payload.entry.day);settleDailyWinnerTopupR76(sql,payload.entry,{nowMs:payload.nowMs,missing:payload.job==='daily_missing',assertDurable});}
   return {job:payload.job,receipt:dailyReceiptR76(sql,payload.entry)};
  });
 };
}
