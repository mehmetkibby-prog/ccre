// Exact storage predicates for the generated native guardian/trap rules.
// No SQL parsing, promises or ambient database access in this adapter.
import {motionTrigger} from './motion-trigger.mjs';
const pick=(row,keys)=>row?Object.fromEntries(keys.map(k=>[k,row[k]])):null;
const motion=['x','y','position_revision','hp','hp_revision','root_until_ms','stun_until_ms'];
const same=(p,area,channel,arena,version)=>p&&p.area===area&&p.channel===channel&&p.arena_match_id===arena&&(version===undefined||p.realtime_scope_version===version);
export class CombatControls {
 constructor({player,monster,setPlayer,setMonster}){Object.assign(this,{player,monster,setPlayer,setMonster});}
 ownPlayer(id,area,channel,arena,version){const p=this.player(id);return same(p,area,channel,arena,version)?pick(p,['x','y','hp','position_revision','root_until_ms','stun_until_ms']):null;}
 targetPlayer(id,area,channel,arena,version,ability){const p=this.player(id);return same(p,area,channel,arena,version)&&(ability!==1||p.hp>0)?pick(p,['x','y','realtime_scope_version']):null;}
 movePlayer(x,y,now,root,stun,id,area,channel,arena,oldX,oldY,version){
  const p=this.player(id);if(!same(p,area,channel,arena,version)||p.hp<=0||p.x!==oldX||p.y!==oldY)return null;
  const next={...p,x,y,position_revision:p.position_revision+1,movement_checked_at_ms:now,movement_debt_ms:0,motion_stream_id:'',motion_sequence:0,hp_revision:p.hp_revision+1,root_until_ms:Math.max(p.root_until_ms,root),stun_until_ms:Math.max(p.stun_until_ms,stun)};
  this.setPlayer(motionTrigger(p,next));return pick(next,motion);
 }
 stunPlayer(root,stun,id,area,channel,arena,x,y){
  const p=this.player(id);if(!same(p,area,channel,arena)||p.hp<=0||p.x!==x||p.y!==y)return null;
  const next={...p,root_until_ms:Math.max(p.root_until_ms,root),stun_until_ms:Math.max(p.stun_until_ms,stun),hp_revision:p.hp_revision+1};this.setPlayer(next);return pick(next,motion);
 }
 controlMonster(x,y,root,stun,id,round,area,channel){
  const p=this.monster(id);if(!p||p.hp<=0||p.spawn_round!==round||p.area!==area||(p.channel!==0&&p.channel!==channel)||p.is_stone!==0)return null;
  const next={...p,control_x:x,control_y:y,root_until_ms:Math.max(p.root_until_ms,root),stun_until_ms:Math.max(p.stun_until_ms,stun)};this.setMonster(next);return pick(next,['root_until_ms','stun_until_ms']);
 }
 rootMonster(root,x,y,id,round,area,channel){
  const p=this.monster(id);if(!p||p.hp<=0||p.spawn_round!==round||p.area!==area||p.channel!==channel||p.is_boss!==0||p.is_stone!==0)return null;
  const next={...p,root_until_ms:Math.max(p.root_until_ms,root),control_x:x,control_y:y};this.setMonster(next);return pick(next,['root_until_ms','stun_until_ms']);
 }
 rootPlayer(root,id,area,channel,arena,version,casterId,specialization,casterVersion){
  const p=this.player(id),caster=this.player(casterId);
  if(!same(p,area,channel,arena,version)||p.hp<=0||!same(caster,p.area,p.channel,p.arena_match_id,casterVersion)||caster.hp<=0||caster.specialization!==specialization||caster.loadlab_run_id!==p.loadlab_run_id)return null;
  const next={...p,root_until_ms:Math.max(p.root_until_ms,root),hp_revision:p.hp_revision+1};this.setPlayer(next);return pick(next,['x','y','hp','hp_revision','position_revision','root_until_ms','stun_until_ms']);
 }
 dashRead(id){return pick(this.player(id),['x','y']);}
 dashMove(x,y,now,cooldown,checked,id,rootAt,stunAt,cooldownAt,area,channel,arena,version,oldX,oldY){
  const p=this.player(id);if(!same(p,area,channel,arena,version)||p.role!=='muhafiz'||p.hp<=0||p.rod_equipped!==0||p.root_until_ms>rootAt||p.stun_until_ms>stunAt||p.attack_three_at>cooldownAt||p.x!==oldX||p.y!==oldY)return null;
  const next={...p,x,y,attack_three_at:now+cooldown,position_revision:p.position_revision+1,hp_revision:p.hp_revision+1,movement_checked_at_ms:checked,movement_debt_ms:0,motion_stream_id:'',motion_sequence:0};this.setPlayer(motionTrigger(p,next));return pick(next,motion);
 }
}
