import {feature504} from "../../../../native510-bb3a6cc689c6/vds-server/src/features504.mjs";
import {guildSkillLevel,EMPTY_GUILD_BUFF} from "../../../../native510-bb3a6cc689c6/lib/guild-skill.mjs";
export function createNativeGuildSync(db,{now=Date.now,refreshHp}={}){
const buffs=new Map();
let observing=false;
let revision=0;
let syncedRevision=-1;
let nextExpiry=Infinity;
let scanStartedAt=-Infinity;
const bonuses=id=>{const s=db.prepare('SELECT s.* FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=? AND s.active_until>?').get(id,now());return s?{...guildSkillLevel(s.active_level),until:s.active_until}:EMPTY_GUILD_BUFF;};
function* syncSteps(){
  const startedAt=now(),startedRevision=revision;
  // No TTL: unchanged membership/skill rows can change HP only at their actual
 // expiry. A backwards clock forces a fresh reconciliation as well.
  if(observing&&syncedRevision===startedRevision&&startedAt>=scanStartedAt&&startedAt<nextExpiry)return;
  let expiry=Infinity;
  const cooperative504=feature504('cooperativeJobs');let unchanged504=0;
  let current;
  if(!cooperative504){
   current=new Map(db.prepare('SELECT m.player_id,s.active_level,s.active_until FROM guild_members m JOIN guild_skills s ON s.guild_id=m.guild_id').all().map(s=>{
   if(s.active_until>startedAt)expiry=Math.min(expiry,s.active_until);
   return [s.player_id,s.active_until>now()?guildSkillLevel(s.active_level).hp:0];
  }));
  }else{
   current=new Map();let prepared504=0;
   const rows504=db.prepare('SELECT m.player_id,s.active_level,s.active_until FROM guild_members m JOIN guild_skills s ON s.guild_id=m.guild_id').all();
   for(const s of rows504){
    if(s.active_until>startedAt)expiry=Math.min(expiry,s.active_until);
    current.set(s.player_id,s.active_until>now()?guildSkillLevel(s.active_level).hp:0);
    // Pure bounded map preparation. Never suspend an owner HP transaction.
    if(++prepared504%512===0)yield;
   }
  }
  for(const id of new Set([...buffs.keys(),...current.keys()])){
   if(buffs.get(id)===(current.get(id)??0)){if(!current.has(id))buffs.delete(id);if(cooperative504&&++unchanged504%512===0)yield;continue;}
   // Only changed owners need a second query. Re-read immediately before HP
   // correction; an activation between I/O turns must not apply stale stats.
   const hp=bonuses(id).hp??0;
   if(buffs.get(id)!==hp)yield refreshHp(id);
   if(current.has(id))buffs.set(id,hp);else buffs.delete(id);
   yield;
  }
  // Publish only the revision captured BEFORE the scan, and only after every
  // awaited HP repair succeeded. Mid-scan commits, cancellation and failures
  // must not mark newer state as reconciled.
  syncedRevision=startedRevision;nextExpiry=expiry;scanStartedAt=startedAt;
 }
return {begin:()=>syncSteps(),observeCommits(){observing=true;revision++;},committed(changes){if(observing&&changes?.some(row=>row.table==='guild_members'||row.table==='guild_skills'))revision++;}};}
