import {demand} from './contract.mjs';
import {motionTrigger} from './motion-trigger.mjs';
export const MOVEMENT_READ_FIELDS=Object.freeze(['id','role','x','y','hp','hp_revision','area','channel','arena_match_id','movement_checked_at_ms','movement_debt_ms','position_revision','root_until_ms','realtime_scope_version']);
// The original V510 movement function calls these two storage operations.
// All collision, speed/debt, rooted, revision and scope decisions remain in
// its mechanically extracted body. This adapter transcribes its SQL CAS.
export class MovementMemory {
 constructor({state,world,fishing,pveHitDue,epoch,wall=Date.now}){
  demand(state&&world&&fishing instanceof Map&&typeof pveHitDue==='function'&&typeof epoch==='function','movement_memory_contract');
  Object.assign(this,{state,world,fishing,pveHitDue,epoch,wall});
 }
 read(playerId,accountId,nowMs){
  const row=this.state.read('players',playerId);if(!row||row.account_id!==accountId)return null;
  this.state.assertOwner(playerId,this.epoch(playerId));
  const result={};for(const key of MOVEMENT_READ_FIELDS)result[key]=row[key];return {...result,world_cycle:this.world.cycle??1,pve_hit_due:this.pveHitDue(playerId,nowMs)?1:0};
 }
 checkpoint(session,row,payload,nowMs,targetX,targetY,movement){
  const playerId=session.player?.id??'',current=this.state.read('players',playerId);if(!current)return null;
  this.state.assertOwner(playerId,this.epoch(playerId));
  if(current.account_id!==session.account.id||current.hp<=0||current.area!==row.area||
   current.position_revision!==row.position_revision||current.movement_checked_at_ms!==row.movement_checked_at_ms||current.movement_debt_ms!==row.movement_debt_ms||
   current.realtime_scope_version!==row.realtime_scope_version||current.channel!==row.channel||current.arena_match_id!==row.arena_match_id||
   (this.world.cycle??1)!==row.world_cycle||current.x!==row.x||current.y!==row.y||current.root_until_ms>nowMs||
   (this.world.reset_at??0)>Math.floor(nowMs/1000)||(this.fishing.get(playerId)?.expires_at_ms??-Infinity)>=nowMs)return null;
  const validMotion=typeof payload.motionStreamId==='string'&&/^[A-Za-z0-9-]{16,80}$/.test(payload.motionStreamId)&&Number.isSafeInteger(payload.motionSequence)&&payload.motionSequence>=1;
  const patch={x:targetX,y:targetY,movement_checked_at_ms:nowMs,movement_debt_ms:movement.nextDebtMs,
   position_revision:current.position_revision+1,motion_stream_id:validMotion?payload.motionStreamId:'',motion_sequence:validMotion?payload.motionSequence:0,last_seen:Math.floor(nowMs/1000)};
  const motion=motionTrigger(current,{x:targetX,y:targetY,area:current.area,channel:current.channel},this.wall());
  if(Object.hasOwn(motion,'last_movement_at_ms'))patch.last_movement_at_ms=motion.last_movement_at_ms;
  const moved=this.state.patch('players',playerId,patch);
  return {x:moved.x,y:moved.y,position_revision:moved.position_revision};
 }
}
