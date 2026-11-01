import {demand} from './contract.mjs';

// Leave room for the existing system receipt envelope (256 KiB). Neither
// writer/receipt nor IPC limits are raised. A monster's HP and contribution
// rows must share a transaction, including bosses sharing a contribution round.
export const CHECKPOINT_BATCH_BYTES=224*1024;
const kinds=['monsters','participants','bossParticipants','combatEvents'];
const empty=()=>({monsters:[],participants:[],bossParticipants:[],combatEvents:[]});
const overhead=Buffer.byteLength(JSON.stringify(empty()));
const fits=(bytes,counts)=>bytes<=CHECKPOINT_BATCH_BYTES&&kinds.every(k=>counts[k]<=(k==='combatEvents'?4096:1024));
export function combatCheckpointBatches(payload,monsterFor){
 const groups=new Map();let total=overhead;const counts=Object.fromEntries(kinds.map(k=>[k,0]));
 const monsterGroup=id=>{const m=monsterFor(id);return m?.is_boss?'boss:'+m.spawn_round:'monster:'+id;};
 for(const kind of kinds)for(const row of payload[kind]){
  const value=row.current,group=kind==='monsters'?monsterGroup(value.id):kind==='participants'?monsterGroup(value.monster_id):kind==='bossParticipants'?'boss:'+value.boss_round:monsterGroup(row.target_id);
  let unit=groups.get(group);if(!unit){unit={payload:empty(),bytes:0};groups.set(group,unit);}
  // One size computation per dirty row at checkpoint time, never per attack.
  const bytes=Buffer.byteLength(JSON.stringify(row))+1;
  unit.payload[kind].push(row);unit.bytes+=bytes;total+=bytes;counts[kind]++;
 }
 if(fits(total,counts))return [payload]; // Preserve the exact small request.
 const batches=[];let batch=empty(),bytes=overhead;
 for(const unit of groups.values()){
  const sizes=Object.fromEntries(kinds.map(k=>[k,unit.payload[k].length]));
  // Validate all units before any submission. Never split HP from credits or
  // silently omit an oversized/invalid unit to make a checkpoint appear saved.
  demand(fits(overhead+unit.bytes,sizes),'combat_checkpoint_unit_size');
  if(!fits(bytes+unit.bytes,Object.fromEntries(kinds.map(k=>[k,batch[k].length+sizes[k]])))){batches.push(batch);batch=empty();bytes=overhead;}
  for(const kind of kinds)batch[kind].push(...unit.payload[kind]);bytes+=unit.bytes;
 }
 if(kinds.some(k=>batch[k].length))batches.push(batch);
 return batches;
}
