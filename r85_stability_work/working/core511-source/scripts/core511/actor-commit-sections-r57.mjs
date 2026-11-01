import {compactCommitRowsR61} from './compact-commit-rows-r61.mjs';
import {commitSectionsR57} from './r57-options.mjs';
import {readActorDropsR52} from './actor-drop-read-r52.mjs';
import {stageStartR51,stageEndR51} from './stage-timing-r51.mjs';
import {captureMaterialSectionsR60} from './reward-sections-r60.mjs';

// This optional, bounded snapshot is read inside the SAME native reward
// transaction. It travels only with its live post-fsync ACK, never its receipt.
// Replay/unknown-outcome recovery therefore uses the authoritative reader.
export const COMMIT_SECTIONS_MAX_BYTES_R57=512*1024;
export const commitSectionMetricsR57={captured:0,fallback:0,bounds:0};
export function captureCommitSectionsR57(sql,result,{nowMs=Date.now()}={}){
 if(!commitSectionsR57||!sql.isTransaction||result.actorSectionsR52?.readSections!==true)return result;
 const proof=result.actorSectionsR52,at=stageStartR51();
 try{
  const actors=proof.actors.filter(p=>p.owner).map(p=>({actor:p.id,epoch:p.owner.epoch,area:result.players.find(row=>row.id===p.id)?.area}));
  if(!actors.length)return result;
  const first=proof.actors.find(p=>p.owner).owner;
  const snapshot=captureMaterialSectionsR60(sql,readActorDropsR52(sql,[first.channel,first.incarnation,proof.cycle,nowMs,actors,proof.readDrops===true],{insideTransaction:true}),result);
  if(snapshot?.complete!==true){commitSectionMetricsR57.bounds++;return result;}
  const value={...result,actorCommitSectionsR57:{...compactCommitRowsR61(snapshot,result.players),readAtMs:nowMs}};
  // Includes original reward rows/events/checkpoint ACKs, so the new section
  // cannot push an otherwise bounded reply across the IPC frame limit.
  if(Buffer.byteLength(JSON.stringify(value))>COMMIT_SECTIONS_MAX_BYTES_R57){commitSectionMetricsR57.bounds++;return result;}
  commitSectionMetricsR57.captured++;return value;
 }catch{commitSectionMetricsR57.fallback++;return result;}
 finally{stageEndR51('reward.commitSectionsR57',at);}
}
