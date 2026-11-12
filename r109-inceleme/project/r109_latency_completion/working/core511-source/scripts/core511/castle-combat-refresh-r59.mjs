import {castleEnabled,CASTLE_AREA,CASTLE_CHANNEL} from './castle-model-r59.mjs';
// Post-fsync refresh only. Every native hit/death statement, trigger, journal
// and ownership/resource fence still runs. Unknown side effects reload fully.
const fields=new Set(['hp','hp_revision','respawn_at_ms','last_seen','last_monster_hit_at','combat_lock_until_ms','attack_one_at','attack_two_at','attack_three_at','attack_four_at','stun_until_ms','root_until_ms','special_guard_until_ms']);
const tables=new Set(['players','combat_events','pve_engagements','auth_rate_limits']);
export const castleCombatStatsR59={certified:0,applied:0,actors:0,fallback:0,reasons:{}};
const no=why=>{castleCombatStatsR59.fallback++;castleCombatStatsR59.reasons[why]=(castleCombatStatsR59.reasons[why]??0)+1;return false;};
export const castleCombatCandidateR59=(kind,payload)=>castleEnabled()&&kind==='pvp_attack'&&!payload.sharedLease&&payload.expected?.player?.area===CASTLE_AREA;
export function certifyCastleCombatR59(sql,kind,payload,context,result){
 if(!castleCombatCandidateR59(kind,payload))return result;
 const audit=result.sharedRefresh,players=result.players;
 if(![200,409,423,429].includes(result.result?.status)||audit?.version!==1||audit.all!==false||!Array.isArray(audit.tables)||audit.tables.some(t=>!tables.has(t))||!Array.isArray(players)||!players.length||players.length>30||result.monsters?.length||result.moves?.length||result.arena)return result;
 const ids=new Set(players.map(p=>p.id));if(ids.size!==players.length||audit.actors.some(id=>!ids.has(id))||result.encounters?.length!==players.length||result.encounters.some(([id,row])=>!ids.has(id)||row!==null))return result;
 const owners=[];for(const p of players){if(p.area!==CASTLE_AREA||p.channel!==CASTLE_CHANNEL||p.arena_match_id)return result;const owner=sql.prepare('SELECT player_id,channel,incarnation,epoch,state FROM kernel511_channel_owners WHERE player_id=?').get(p.id);if(owner?.state!=='active'||owner.channel!==context.peer.channel||owner.incarnation!==context.peer.incarnation)return result;owners.push(owner);}
 castleCombatStatsR59.certified++;return {...result,castleCombatR59:{version:1,cycle:sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle,owners}};
}
export function applyCastleCombatR59(runtime,result){
 if(!castleEnabled()||!result.castleCombatR59)return false;
 const c=runtime.channel,proof=result.castleCombatR59,audit=result.sharedRefresh,players=result.players;
 if(proof.version!==1||proof.cycle!==c.world.cycle||!Array.isArray(players)||players.length>30||proof.owners?.length!==players.length||audit?.all!==false||audit.tables.some(t=>!tables.has(t)))return no('proof');
 const updates=[],seen=new Set();for(let i=0;i<players.length;i++){
  const row=players[i],owner=c.owners.get(row.id),actor=c.kernel.players.get(row.id),before=c.view.player(row.id),sub=runtime.world.subscribers.get(row.id),fence=proof.owners[i];
  if(seen.has(row.id)||fence?.player_id!==row.id||!owner||owner.epoch!==fence.epoch||owner.channel!==fence.channel||owner.incarnation!==fence.incarnation||!actor?.barrier||actor.suspended||actor.externalHold||actor.epoch!==owner.epoch||!c.lanes.busy(['player:'+row.id]))return no('fence');seen.add(row.id);
  if(!before||before.area!==CASTLE_AREA||row.area!==CASTLE_AREA||row.channel!==CASTLE_CHANNEL||row.arena_match_id||!c.frames.entries.get(row.id)?.valid||!sub?.ownerRow||sub.data.area!==CASTLE_AREA||sub.data.channel!==CASTLE_CHANNEL||!sub.data.players.some(p=>p.id===row.id)||c.view.engagements.has(row.id))return no('scope');
  const changed=Object.keys(row).filter(key=>!fields.has(key)&&(!Object.hasOwn(before,key)||!Object.is(row[key],before[key])));if(changed.length)return no('column:'+changed.slice(0,5).join(','));
  c.state.assertOwner(row.id,owner.epoch);updates.push({row,owner,sub});
 }
 // Synchronous all-recipient validation above: no partially applied refresh.
 for(const {row,owner,sub}of updates){c.view.setPlayer(c.presence.merge(row,owner.epoch));c.view.setEngagement(row.id,null);const own={...sub.ownerRow};for(const key of fields)if(Object.hasOwn(own,key))own[key]=row[key];sub.ownerRow=own;sub.data={...sub.data,players:sub.data.players.map(p=>p.id===row.id?own:p)};sub.cache=null;sub.privateOwnerCache=null;sub.revision++;runtime.slimReload.forget(row.id);}
 castleCombatStatsR59.applied++;castleCombatStatsR59.actors+=updates.length;return true;
}
