import {rewardAsyncReplyR54} from './r54-options.mjs';
import {ordinaryRuneRewardR87} from './rune-reward-scope-r87.mjs';
const trusted=new WeakSet(),scopes=new WeakMap(),areas=new Set(['forest','frozen','ancient']);
// R88: Rune V2 ordinary kills already commit their reward in the joined death
// transaction (R87). Give them the same provisional (202, presentation-only)
// lethal reply so the R86 motion permit applies. Only the four exact ordinary
// species qualify: the Rune boss can carry is_boss=0, so the flag alone is not
// trusted. Final HP/kill/rewards still arrive only after the durable ACK.
const runePreviewR88=process.env.CORE511_R88_RUNE_MOVEMENT!=='0';
const previewArea=area=>areas.has(area)||runePreviewR88&&area==='rune_v2';
const previewMonster=m=>areas.has(m.area)||runePreviewR88&&ordinaryRuneRewardR87(m);
export function previewDeathR54(plans,read,context,accepted,now){
 if(!rewardAsyncReplyR54||!context||plans.length<1||plans.length>512||!previewArea(context.player.area)||context.player.arena_match_id||context.player.instance_id||context.player.instanceId)return null;
 const intentId=context.payload?.intentId;if(typeof intentId!=='string'||! /^[A-Za-z0-9:_-]{1,120}$/.test(intentId))return null;
 const hits=[],provisionalHits=[],targets=[];let lethal=false;
 for(const plan of plans){const m=read(plan.target.id);
  if(!m||!previewMonster(m)||m.channel!==context.player.channel||m.is_boss||m.is_stone||m.hp<=0||m.spawn_round!==plan.target.spawn_round||!Number.isFinite(plan.rolled)||plan.rolled<=0)return null;
  const hp=Math.max(0,m.hp-plan.rolled);
  targets.push(m.id);lethal ||= hp===0;
  // Existing clients interpret ANY confirmed hp=0 as death, regardless of
  // `killed`. Keep authoritative HP unchanged until disk ACK; damage is visual.
  const confirmed={id:m.id,spawnRound:m.spawn_round,damage:plan.rolled,hp:m.hp,killed:false,killPending:hp===0},provisional={id:m.id,spawnRound:m.spawn_round,damage:plan.rolled,hp,killPending:hp===0};
  if(hits.length<32){hits.push(confirmed);provisionalHits.push(provisional);}
  else if(hp===0&&!provisionalHits.some(h=>h.killPending)){hits[31]=confirmed;provisionalHits[31]=provisional;}
 }
 if(!lethal)return null;
 // A provisional reply must not create a long-lived generic pending notice.
 // Final HP/kill/rewards still arrive only through their durable result paths.
 const reply={type:'action',status:202,body:{combatPending:true,combatPhase:'pending',rewardPending:false,xp:0,groundDrops:0,intentId,hits,provisionalHits,...(plans.length>32?{previewTargetsCapped:true,totalHitTargets:plans.length}:{}),cycle:context.player.world_cycle,channel:context.player.channel,area:context.player.area,serverAt:now,nextAttackAtMs:accepted.reserved_until,cooldownRemainingMs:Math.max(0,accepted.reserved_until-now)}};
 scopes.set(reply,targets);return reply;
}
export function acceptDeathPreviewR54(reply,lease){
 if(!rewardAsyncReplyR54||!reply||lease?.state!=='held'||!scopes.has(reply))return null;
 for(const id of scopes.get(reply))if(!lease.keys.includes('monster:'+id))return null;
 trusted.add(reply);return reply;
}
export const isDeathPreviewR54=reply=>rewardAsyncReplyR54&&trusted.has(reply);
export function rejectDeathPreviewR54(loop,reply,id,input,now){
 if(!reply)return;
 loop.publish(reply.body.cycle,reply.body.channel,reply.body.area,{type:'monster_reject',eventId:'monster-reject:'+reply.body.intentId+':r54',intentId:reply.body.intentId,attackerId:id,targetId:input.targetId,spawnRound:input.spawnRound,serverAt:now});
}
