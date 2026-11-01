import {createHash} from 'node:crypto';
import {joinedAckR57} from './r57-options.mjs';
import {normalizeEncounterPlan} from './encounter-clock.mjs';
import {demand} from './contract.mjs';
const digest=text=>createHash('sha256').update(text).digest('hex');
const expected=payload=>({saved:payload.current,...(payload.pve===undefined?{}:{encounter:normalizeEncounterPlan(payload.pve).current})});
// The channel already owns this immutable checkpoint image. A successful
// journal may echo its digest rather than send/store every encounter twice.
// Any native normalization not reconstructible from that image keeps the full
// old ACK. This runs after the full handler/CAS, inside the same transaction;
// neither the receipt nor its live response is released before fsync.
export function compactJoinedAckR57(id,payload,value){
 const row={id,...value};if(!joinedAckR57)return row;
 const text=JSON.stringify(value);if(text.length<1024||text!==JSON.stringify(expected(payload)))return row;
 return {id,joinedAckSha256R57:digest(text)};
}
export function expandJoinedAckR57(row,id,payload){
 if(!row||!Object.hasOwn(row,'joinedAckSha256R57'))return row;
 demand(Object.keys(row).sort().join(',')==='id,joinedAckSha256R57'&&row.id===id&&typeof row.joinedAckSha256R57==='string'&&/^[a-f0-9]{64}$/.test(row.joinedAckSha256R57),'checkpoint_join_ack');
 const value=expected(payload);demand(digest(JSON.stringify(value))===row.joinedAckSha256R57,'checkpoint_join_ack');
 return {id,...value};
}
