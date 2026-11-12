import {pveEntries489} from '../../../native510-bb3a6cc689c6/vds-server/src/pve-multi489.mjs';
import {NATIVE_ACTIONS} from './generated/action-names.mjs';
import {demand} from './contract.mjs';

const actions=new Set(NATIVE_ACTIONS.filter(action=>action==='use_potion'||action.startsWith('travel_')));
export const settlesNativeRetaliation=input=>actions.has(input?.action);
// Preserve the original multi-attacker head gate, native entry order and
// accepted request time. A channel tick may already be later than that time.
export function dueSettlementEntries(row,receivedAtMs){
 if(!row||row.next_hit_at_ms>receivedAtMs)return [];
 return pveEntries489(row).filter(entry=>entry.next_hit_at_ms<=receivedAtMs);
}
export function settlementFootprint(view,id,input,receivedAtMs){
 return settlesNativeRetaliation(input)?dueSettlementEntries(view.engagements.get(id),receivedAtMs).map(e=>'monster:'+e.monster_id):[];
}
export function settlementNeedsShared(view,id,input,receivedAtMs){
 return settlementFootprint(view,id,input,receivedAtMs).some(key=>{const monster=view.monster(key.slice(8));return !monster||monster.channel===0;});
}
// Cold joins and transfers read their native clock after asynchronous drains.
// Reserve every current-life incoming target that could become due meanwhile.
// This also covers a local control cast after the old actor's journal drained.
export function coldSettlementResources(sql,id){
 const player=sql.prepare('SELECT area,channel FROM players WHERE id=?').get(id),row=sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id),groups=new Map();
 for(const entry of row?pveEntries489(row):[]){
  const monster=sql.prepare('SELECT area,channel,hp,spawn_round FROM monsters WHERE id=?').get(entry.monster_id);
  if(monster&&(monster.hp<=0||monster.spawn_round!==entry.spawn_round||monster.area!==player?.area||monster.channel!==0&&monster.channel!==player.channel))continue;
  const channel=monster?.channel??0,keys=groups.get(channel)??new Set();keys.add('monster:'+entry.monster_id);groups.set(channel,keys);
 }
 return [...groups].sort(([a],[b])=>a-b).map(([channel,keys])=>({channel,resources:[...keys].sort()}));
}
export function assertSettlementResources(sql,payload,context){
 if(!settlesNativeRetaliation(payload.input))return true;
 demand(sql.isTransaction&&Number.isSafeInteger(payload.receivedAtMs)&&Array.isArray(payload.resources),'settlement_resource_scope');
 const player=sql.prepare('SELECT area,channel FROM players WHERE id=?').get(context.actor),row=sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(context.actor),held=new Set(payload.resources);
 for(const entry of dueSettlementEntries(row,payload.receivedAtMs)){
  const monster=sql.prepare('SELECT area,channel,hp,spawn_round FROM monsters WHERE id=?').get(entry.monster_id);
  // Original retaliation clears absent, dead, old-life and foreign-scope
  // entries. They cannot apply a hit and do not borrow another channel's lane.
  if(!monster||monster.hp<=0||monster.spawn_round!==entry.spawn_round||monster.area!==player?.area||monster.channel!==0&&monster.channel!==player.channel)continue;
  demand(held.has('monster:'+entry.monster_id),'settlement_monster_unlocked');
  demand(monster.channel!==0||payload.sharedLease,'settlement_shared_lease_required');
 }
 return true;
}
