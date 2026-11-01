import {demand} from './contract.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {actorSectionReuseR52} from './r52-options.mjs';
import {ACTOR_DROPS_SQL_R52,ACTOR_REFRESH_LIMITS_R52,ACTOR_GROUP_READ_LIMITS_R56} from './actor-section-reuse-r52.mjs';
import {sectionReadGroupR56} from './r56-options.mjs';

// Exact full native drop sections, not a delta or a truncated snapshot. One
// read-only WAL transaction covers <=4 owners, or <=25 with a 512 KiB total
// response bound. Per-owner bounds and every ownership/section check remain.
export function readActorDropsR52(sql,params,{insideTransaction=false}={}){
 demand(actorSectionReuseR52&&Array.isArray(params)&&params.length===6,'actor_drop_read_parameters');
 const [channel,incarnation,cycle,nowMs,actors,includeDrops]=params;
 demand(typeof includeDrops==='boolean'&&[1,2,3,4].includes(channel)&&typeof incarnation==='string'&&Number.isSafeInteger(cycle)&&Number.isSafeInteger(nowMs)&&nowMs>=0&&Array.isArray(actors)&&actors.length>0&&actors.length<=(sectionReadGroupR56?ACTOR_GROUP_READ_LIMITS_R56.actors:ACTOR_REFRESH_LIMITS_R52.readBatch)&&new Set(actors.map(row=>row?.actor)).size===actors.length,'actor_drop_read_parameters');
 if(insideTransaction)demand(sql.isTransaction,'actor_drop_read_transaction');else sql.exec('BEGIN');
 try{
  demand(prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get()?.cycle===cycle,'actor_drop_read_cycle');
  const values=[];let responseBytes=256;
  for(const wanted of actors){
   demand(typeof wanted.actor==='string'&&Number.isSafeInteger(wanted.epoch)&&wanted.epoch>0&&typeof wanted.area==='string','actor_drop_read_parameters');
   const owner=prepareCached477(sql,`SELECT o.channel,o.incarnation,o.epoch,o.state FROM kernel511_channel_owners o
    LEFT JOIN kernel511_admissions a ON a.player_id=o.player_id AND a.epoch=o.epoch AND a.channel=o.channel
    LEFT JOIN kernel511_simulations s ON s.player_id=o.player_id AND s.epoch=o.epoch AND s.channel=o.channel
    WHERE o.player_id=? AND (a.player_id IS NOT NULL OR s.player_id IS NOT NULL)`).get(wanted.actor);
   demand(owner&&owner.state==='active'&&owner.channel===channel&&owner.incarnation===incarnation&&owner.epoch===wanted.epoch,'actor_drop_read_owner_fenced');
   const player=prepareCached477(sql,'SELECT * FROM players WHERE id=?').get(wanted.actor);
   demand(player&&player.area===wanted.area&&player.channel===channel&&!player.arena_match_id,'actor_drop_read_scope');
   const engagement=prepareCached477(sql,'SELECT * FROM pve_engagements WHERE player_id=?').get(wanted.actor)??null;
   const drops=includeDrops?prepareCached477(sql,ACTOR_DROPS_SQL_R52).all(wanted.actor,Math.floor(nowMs/1000),wanted.area,wanted.area,wanted.area,wanted.area,wanted.area):undefined;
   const entry={id:wanted.actor,owner:{channel,incarnation,epoch:owner.epoch},player,engagement,...(includeDrops?{drops}:{})};
   const bytes=Buffer.byteLength(JSON.stringify(entry));responseBytes+=bytes+1;
   if(includeDrops&&(drops.length>ACTOR_REFRESH_LIMITS_R52.drops||drops.some(row=>row.monster_id==='dragon-world-1'))||bytes>ACTOR_REFRESH_LIMITS_R52.proofBytes||sectionReadGroupR56&&actors.length>ACTOR_REFRESH_LIMITS_R52.readBatch&&responseBytes>ACTOR_GROUP_READ_LIMITS_R56.bytes){if(!insideTransaction)sql.exec('COMMIT');return {version:1,complete:false,reason:'bounds'};}
   values.push(entry);
  }
  if(!insideTransaction)sql.exec('COMMIT');return {version:1,complete:true,cycle,actors:values};
 }catch(error){if(!insideTransaction)sql.exec('ROLLBACK');throw error;}
}
