import {castleEnabled,CASTLE_AREA} from './castle-model-r59.mjs';
import {demand,validChannel} from './contract.mjs';
import {NATIVE_ACTIONS} from './generated/action-names.mjs';
import {NATIVE_SERVICE_ACTIONS} from './mode-writer.mjs';

// These original native actions can read or reward foreign residents. Their
// existing shared path drains all owners and reloads CURRENT DB before release.
// Never infer their recipients from a caller's array or a cached party roster.
export const SHARED_NATIVE_ACTIONS=Object.freeze(['claim_rewards','collect','invite_party','reject_party','accept_party','kick_party','leave_party','arena_join_queue','arena_cancel_queue','arena_ack_result']);
const shared=new Set(SHARED_NATIVE_ACTIONS);
const local=new Set(NATIVE_ACTIONS.filter(action=>!shared.has(action)&&action!=='guardian_dash'));

// The native movement/combat/skill/mode engines are already composed by
// ChannelRuntime. This provider binds the remaining cold resource contract.
// A production channel always has the independent world: every terminal PvE
// or PvP write goes through its all-owner barrier, including local targets.
export function createChannelMechanics({peer,initial,runtime}){
 demand(validChannel(peer?.channel)&&typeof runtime==='function'&&Number.isSafeInteger(initial?.sharedWorld?.epoch)&&initial.sharedWorld.epoch>0,'native_mechanics_world_required');
 const channel=()=>{const r=runtime();demand(r?.peer===peer&&r.channel?.sharedCombat===r.sharedCombat&&r.channel.attack.shared===r.sharedCombat&&r.channel.pvp.shared===r.sharedCombat,'native_mechanics_runtime_binding');return r.channel;};
 return Object.freeze({
  footprint(id,input){
   const c=channel(),owner=c.owners.get(id),player=c.view.player(id);
   demand(owner?.channel===peer.channel&&owner.incarnation===peer.incarnation&&player?.id===id&&player.channel===peer.channel,'native_mechanics_actor');
   demand(input&&typeof input==='object'&&!Array.isArray(input),'native_mechanics_input');
   const localClaim=input.action==='claim_rewards'?c.localClaimScopes?.get(input):null;
   if(localClaim)return {players:localClaim.ids,resources:[...localClaim.ids.map(pid=>'player:'+pid),...localClaim.targets.map(t=>'monster:'+t.id)],localScope:{kind:'claim',targets:localClaim.targets,...(localClaim.completedR56===true?{completedR56:true}:{}),...(localClaim.nativeLimit===true?{nativeLimit:true}:{})}};
   const collect=input.action==='collect'?c.localCollectScopes?.get(input):null;
   if(collect)return {players:collect.ids,resources:collect.ids.map(pid=>'player:'+pid),localScope:collect.scope};
   if(input.action==='mode'){
    demand(Object.hasOwn(NATIVE_SERVICE_ACTIONS,input.kind)&&input.command&&typeof input.command==='object'&&!Array.isArray(input.command),'native_mechanics_mode');
    demand(!(input.kind==='guild_village'&&input.command.action==='revoke'),'native_mechanics_shared_required');
   }else demand(local.has(input.action),'native_mechanics_shared_required');
   // Original local inventory/currency/respawn/travel and service commands
   // mutate this actor's image. Native validation still selects items, recipes,
   // balances and receipts; settlementFootprint adds due monster lanes later.
   return {players:[id],resources:['player:'+id]};
  },
  affectedAttack(){channel();throw Object.assign(Error('native_mechanics_terminal_world_required'),{code:'native_mechanics_terminal_world_required'});},
  affectedPvp(context,ids){const c=channel();if(castleEnabled()&&context?.actionSnapshot?.player?.area===CASTLE_AREA){demand(ids.length<=30&&ids.every(id=>c.owners.has(id)&&c.view.player(id)?.area===CASTLE_AREA),'castle_pvp_participants');return ids;}throw Object.assign(Error('native_mechanics_terminal_world_required'),{code:'native_mechanics_terminal_world_required'});}
 });
}
