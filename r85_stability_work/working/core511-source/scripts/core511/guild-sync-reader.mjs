import {createNativeGuildSync} from './generated/guild-sync-rules.mjs';
import {readGuildRevision} from './guild-state.mjs';
import {demand} from './contract.mjs';
// One synchronous generator step per query. Its native yielded repair cannot
// advance the cached HP/revision until the parent has awaited the owned write.
export class GuildSyncReader {
 constructor(sql){this.sql=sql;this.incarnation=null;this.context=null;this.rules=null;this.nowMs=0;this.seen=-1;}
 step({incarnation,token,sequence,start=false,nowMs,durableRevision}){
  demand(typeof incarnation==='string'&&incarnation.length>=16&&typeof token==='string'&&token.length>=16&&Number.isSafeInteger(sequence)&&sequence>=0&&Number.isSafeInteger(nowMs)&&nowMs>0&&Number.isSafeInteger(durableRevision)&&durableRevision>=0,'guild_sync_read_scope');this.nowMs=nowMs;
  if(incarnation!==this.incarnation){demand(start&&sequence===0,'guild_sync_new_owner');this.incarnation=incarnation;this.context=null;this.seen=-1;this.rules=createNativeGuildSync(this.sql,{now:()=>this.nowMs,refreshHp:actor=>({actor})});this.rules.observeCommits();}
  if(start&&!this.context){demand(sequence===0,'guild_sync_start_sequence');this.context={token,sequence:0,steps:this.rules.begin()};}
  const ctx=this.context;demand(ctx?.token===token&&ctx.sequence===sequence&&(!start||sequence===0),'guild_sync_step_fenced');
  this.sql.exec('BEGIN');try{
   const revision=readGuildRevision(this.sql);if(revision>durableRevision){this.sql.exec('COMMIT');return {token,sequence,ahead:revision};}
   if(revision!==this.seen){this.rules.committed([{table:'guild_members'}]);this.seen=revision;}
   const step=ctx.steps.next();demand(!step?.then&&!step.value?.then,'guild_sync_async_step');ctx.sequence++;const result={token,sequence:ctx.sequence,done:step.done,actor:step.value?.actor??null,revision};this.sql.exec('COMMIT');if(step.done)this.context=null;return result;
  }catch(error){this.sql.exec('ROLLBACK');this.context=null;this.incarnation=null;throw error;}
 }
}
