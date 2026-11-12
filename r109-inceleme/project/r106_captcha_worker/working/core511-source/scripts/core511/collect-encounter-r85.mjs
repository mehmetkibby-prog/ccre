import {createHash} from 'node:crypto';
import {ENCOUNTER_FIELDS} from './encounter-checkpoint.mjs';
import {expandJoinedAckR57} from './joined-ack-r57.mjs';
import {soloCollectJoinR85} from './collect-join-r85.mjs';
import {prepareCached477} from './writer-statements.mjs';

const fields=Object.freeze([...ENCOUNTER_FIELDS]);
function exactEncounter(row,actor){
 if(row===null)return true;
 return row&&typeof row==='object'&&!Array.isArray(row)&&Object.keys(row).length===fields.length&&fields.every(k=>Object.hasOwn(row,k))&&row.player_id===actor&&typeof row.monster_id==='string'&&typeof row.attackers489==='string'&&fields.filter(k=>!['player_id','monster_id','attackers489'].includes(k)).every(k=>Number.isSafeInteger(row[k])&&row[k]>=0);
}
const text=row=>JSON.stringify(row===null?null:fields.map(k=>row[k]));
const digest=row=>createHash('sha256').update(text(row)).digest('hex');
const same=(a,b,actor)=>exactEncounter(a,actor)&&exactEncounter(b,actor)&&text(a)===text(b);
function resultEncounter(result,actor){
 const rows=result.encounters;
 return Array.isArray(rows)&&rows.length===1&&Array.isArray(rows[0])&&rows[0].length===2&&rows[0][0]===actor?rows[0][1]:undefined;
}

// CollectWriteAudit separately rejects EVERY foreign pve row write, including
// orphan/null owners. Keep pve_engagements visible in SharedRefresh. This proof
// only certifies that its final single-actor row is the already-ACKed journal.
export function certifyCollectEncounterR85(sql,payload,result){
 const actor=payload.localScope?.owner,joined=payload.claimActorsR56,saved=result.claimActorsR56,player=result.players?.find(p=>p.id===actor);
 if(!sql.isTransaction||!Array.isArray(joined)||joined.length!==1||joined[0].actor!==actor||!Number.isSafeInteger(joined[0].epoch)||joined[0].epoch<1||joined[0].payload?.pve===undefined||!Array.isArray(saved)||saved.length!==1||saved[0].id!==actor||!soloCollectJoinR85({id:actor,input:payload.input,scope:payload.localScope,resources:payload.resources,sharedLease:payload.sharedLease,player,channel:player?.channel}))return null;
 let ack;try{ack=expandJoinedAckR57(saved[0],actor,joined[0].payload);}catch{return null;}
 const row=resultEncounter(result,actor);
 if(!ack?.saved||JSON.stringify(ack.saved)!==JSON.stringify(joined[0].payload.current)||!same(ack.encounter,row,actor))return null;
 const current=prepareCached477(sql,'SELECT * FROM pve_engagements WHERE player_id=?').get(actor)??null;
 if(!same(current,row,actor))return null;
 return {version:1,actor,epoch:joined[0].epoch,sha256:digest(row)};
}

// Called before any collect light mutation. finishR53 already validated and
// applied the exact journal ACK; the resident encounter must still equal it.
export function validCollectEncounterR85(runtime,result,context){
 const changed=result.sharedRefresh?.tables?.includes('pve_engagements'),meta=result.collectLight?.joinedEncounterR85;
 if(!changed)return meta===undefined;
 const actor=context?.id,c=runtime.channel;
 if(!meta||Object.keys(meta).sort().join(',')!=='actor,epoch,sha256,version'||meta.version!==1||meta.actor!==actor||!Number.isSafeInteger(meta.epoch)||meta.epoch<1||typeof meta.sha256!=='string'||!/^[a-f0-9]{64}$/.test(meta.sha256)||c.owners.get(actor)?.epoch!==meta.epoch||typeof c.view.engagements?.get!=='function')return false;
 const row=resultEncounter(result,actor),resident=c.view.engagements.get(actor)??null;
 return same(row,resident,actor)&&digest(row)===meta.sha256;
}
