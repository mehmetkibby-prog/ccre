import {readResourceMonstersR56} from './resource-reads-r56.mjs';
import {demand} from './contract.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {requestGuardCache} from './r50-writer-options.mjs';

// Each memo belongs to ONE synchronous, read-only guard invocation. No result
// survives a checkpoint write, transaction, owner/epoch change or next request.
// Keep malformed large input bounded too; excess keys retain the original reads.
const memo=read=>{
 if(!requestGuardCache)return read;
 const values=new Map();
 return key=>{if(values.has(key))return values.get(key);const value=read(key);if(values.size<4096)values.set(key,value);return value;};
};
export function createCheckpointResourceGuard(authority){
 return (sql,payload,context)=>{
  const channel=context.peer.channel;
  demand(payload&&['monsters','participants','bossParticipants','combatEvents'].every(k=>Array.isArray(payload[k])),'system_combat_fields');
  const monstersR56=readResourceMonstersR56(sql,[...payload.monsters.map(p=>p?.current?.id),...payload.participants.map(p=>p?.current?.monster_id),...payload.combatEvents.map(e=>e?.target_id)],'channel');
  const owns=memo(id=>(monstersR56?monstersR56.get(id):prepareServerStatement(sql,'SELECT channel FROM monsters WHERE id=?').get(id))?.channel===channel);
  for(const pair of payload.monsters)demand(owns(pair.current?.id),'system_monster_scope');
  if(channel===0){
   // Shared historical credit remains valid after its actor disconnects or
   // transfers. It requires an existing player, not a current local admission.
   const boss=memo(round=>prepareServerStatement(sql,'SELECT 1 FROM monsters WHERE channel=0 AND is_boss=1 AND spawn_round=? AND hp>0').get(round));
   const exists=memo(id=>prepareServerStatement(sql,'SELECT 1 FROM players WHERE id=?').get(id));
   for(const pair of payload.participants)demand(owns(pair.current?.monster_id),'system_monster_scope');
   for(const pair of payload.bossParticipants)demand(boss(pair.current?.boss_round),'system_boss_scope');
   for(const event of payload.combatEvents)demand(owns(event.target_id)&&exists(event.player_id),'system_shared_event_scope');
   return true;
  }
  // assertSimulated/assertAdmitted/assertProcess are read-only, with no clock
  // or expiring-lease test. Every distinct actor still executes every fence.
  const player=memo(id=>{const owner=authority.owner(id,sql);demand(owner?.channel===channel,'system_participant_scope');authority.assertSimulated(sql,context.peer,id,owner.epoch,{allowDraining:true});});
  const boss=memo(round=>prepareServerStatement(sql,'SELECT 1 FROM monsters WHERE channel=? AND is_boss=1 AND spawn_round=? AND hp>0').get(channel,round));
  for(const pair of payload.participants){demand(owns(pair.current?.monster_id),'system_monster_scope');player(pair.current?.player_id);}
  for(const pair of payload.bossParticipants){player(pair.current?.player_id);demand(boss(pair.current?.boss_round),'system_boss_scope');}
  for(const event of payload.combatEvents){player(event.player_id);if(!owns(event.target_id))player(event.target_id);}
  return true;
 };
}
