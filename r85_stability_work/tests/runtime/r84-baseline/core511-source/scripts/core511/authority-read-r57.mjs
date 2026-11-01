import {prepareServerStatement} from './server-statements.mjs';
import {opaqueId} from './generated/owner-protocol.mjs';
import {authorityReadR57} from './r57-options.mjs';
import {demand} from './contract.mjs';
// A single read-only guard can inspect its <=25 resource owners together.
// The rows never survive that synchronous guard or cross native writes.
export function readResourceActorFencesR57(sql,ids){
 if(!authorityReadR57||ids.length<1||ids.length>25)return null;
 const wanted=[...new Set(ids.map(opaqueId))];
 const rows=prepareServerStatement(sql,`SELECT j.value r57_actor,p.id r57_exists,o.*,a.player_id r57_admitted,a.channel r57_a_channel,a.epoch r57_a_epoch,
 s.player_id r57_simulated,s.channel r57_s_channel,s.epoch r57_s_epoch
 FROM json_each(?) j LEFT JOIN players p ON p.id=j.value LEFT JOIN kernel511_channel_owners o ON o.player_id=j.value
 LEFT JOIN kernel511_admissions a ON a.player_id=j.value LEFT JOIN kernel511_simulations s ON s.player_id=j.value`).all(JSON.stringify(wanted));
 return new Map(rows.map(row=>{const id=row.r57_actor,exists=row.r57_exists!==null;delete row.r57_actor;delete row.r57_exists;return [id,{...split(row),exists}];}));
}
export function assertResourceActorFenceR57(authority,sql,peer,fence,{checkProcess=true}={}){
 const {owner,admission,simulation}=fence;if(checkProcess)authority.assertProcess(peer.channel,peer.incarnation,sql);
 const permit=admission??simulation;
 demand(owner&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&(owner.state==='active'||owner.state==='draining')&&permit&&permit.channel===peer.channel&&permit.epoch===owner.epoch,admission?'owner_epoch_fenced':'simulation_epoch_fenced');
}
function split(row){
 const admission=row.r57_admitted===null?null:{player_id:row.r57_admitted,channel:row.r57_a_channel,epoch:row.r57_a_epoch};
 const simulation=row.r57_simulated===null?null:{player_id:row.r57_simulated,channel:row.r57_s_channel,epoch:row.r57_s_epoch};
 for(const key of ['r57_admitted','r57_a_channel','r57_a_epoch','r57_simulated','r57_s_channel','r57_s_epoch'])delete row[key];
 return {owner:row.player_id===null?null:row,admission,simulation};
}
// One current synchronous SQL snapshot, never a cache. Keep admission's
// precedence over passive simulation, including a corrupt/missing owner.
export function readActorFenceR57(sql,id){
 const row=prepareServerStatement(sql,`SELECT o.*,a.player_id r57_admitted,a.channel r57_a_channel,a.epoch r57_a_epoch,
 s.player_id r57_simulated,s.channel r57_s_channel,s.epoch r57_s_epoch
 FROM (SELECT ? AS actor) wanted LEFT JOIN kernel511_channel_owners o ON o.player_id=wanted.actor
 LEFT JOIN kernel511_admissions a ON a.player_id=wanted.actor LEFT JOIN kernel511_simulations s ON s.player_id=wanted.actor`).get(opaqueId(id));
 return split(row);
}
