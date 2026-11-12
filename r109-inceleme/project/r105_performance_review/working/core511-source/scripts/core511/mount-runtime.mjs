import {mountAllowed,mountDefinition,mountEnabled} from './mounts-model.mjs';
import {gameplayR55} from './r55-gameplay-options.mjs';
import {gameplayR58} from './r58-gameplay-options.mjs';
import {gameplayR60} from './r60-options.mjs';

// Ephemeral riding authority is owned by exactly one resident epoch. It never
// enters a players row, a combat frame, a checkpoint or a durable receipt.
const ownerKey=o=>o&&JSON.stringify([o.epoch,o.incarnation,o.channel]);
const scope=(p,cycle)=>({cycle,channel:p.channel,area:p.area,arena:p.arena_match_id||'',revision:p.realtime_scope_version});
const sameScope=(s,p,cycle)=>s.cycle===cycle&&s.channel===p.channel&&s.area===p.area&&s.arena===(p.arena_match_id||'')&&s.revision===p.realtime_scope_version;
const sameOwner=(entry,owner)=>owner&&entry.ownerEpoch===owner.epoch&&entry.ownerIncarnation===owner.incarnation&&entry.ownerChannel===owner.channel;
const attackActions=new Set(['attack','pvp_attack','guardian_dash','cast_support456']);
const failure=code=>({ok:false,status:409,code,mount:null});
export class ResidentMounts {
 constructor({owner,player,cycle,engagement=()=>null,locked=()=>false,clock=Date.now,enabled=mountEnabled(),stateFix=gameplayR55.mountState,mountedCombat=gameplayR58.mountCombat,changed=()=>{}}){
  Object.assign(this,{owner,player,cycle,engagement,locked,clock,enabled,stateFix,mountedCombat,changed});this.entries=new Map();this.revision=0;
 }
 hydrate(id,bundle){
  if(!this.enabled)return;
  const owner=this.owner(id),key=ownerKey(owner);if(!key)return;
  let entry=this.entries.get(id);
  if(!entry||entry.owner!==key){if(entry?.mount)this.touch(id);entry={owner:key,ownerEpoch:owner.epoch,ownerIncarnation:owner.incarnation,ownerChannel:owner.channel,mount:null,receipts:new Map(),nextMountAt:0};this.entries.set(id,entry);}
  entry.owned=new Set((bundle?.enabled===true&&Array.isArray(bundle.owned)?bundle.owned:[]).filter(kind=>mountDefinition(kind)));
  entry.selected=entry.owned.has(bundle?.selected)?bundle.selected:'';
  if(entry.mount&&(!entry.owned.has(entry.mount.kind)||entry.mount.kind!==entry.selected))this.dismount(id);
  this.active(id);
 }
 touch(id){this.revision++;this.changed(id);}
 dismount(id){const entry=this.entries.get(id);if(!entry?.mount)return false;entry.mount=null;entry.scope=null;this.touch(id);return true;}
 forget(id){const entry=this.entries.get(id);if(!entry)return;if(entry.mount)this.touch(id);this.entries.delete(id);}
 active(id,row=this.player(id),now=this.clock()){
  if(!this.enabled)return null;const entry=this.entries.get(id);if(!entry?.mount)return null;
  const stale=!row||!sameOwner(entry,this.owner(id))||!sameScope(entry.scope,row,this.cycle())||!mountAllowed(row,now,{locked:this.locked(id),riding:this.mountedCombat})||!entry.owned.has(entry.mount.kind);
  const hit=!this.mountedCombat&&!stale&&(row.hp<entry.hp||Number(row.last_monster_hit_at??0)>entry.hitAt||Number(row.attack_one_at??0)>entry.attackOne||Number(row.attack_two_at??0)>entry.attackTwo||Number(row.attack_three_at??0)>entry.attackThree||Number(row.attack_four_at??0)>entry.attackFour||Number(row.combat_lock_until_ms??0)>entry.combatAt||!this.stateFix&&Number(row.hp_revision??0)!==entry.hpRevision&&row.hp<=entry.hp);
  if(stale||hit){this.dismount(id);return null;}return entry.mount;
 }
 observe(id,before,after){
  const entry=this.entries.get(id);if(!entry?.mount)return;
  if(!this.mountedCombat&&before&&(after.hp<before.hp||Number(after.last_monster_hit_at??0)>Number(before.last_monster_hit_at??0)))this.dismount(id);
  if(this.active(id,after)){entry.hp=after.hp;entry.hpRevision=Number(after.hp_revision??0);}
 }
 public(id){return this.active(id);}
 multiplier(id,row,now){return this.active(id,row,now)?1.25:1;}
 rejectAction(id,input){
  if(!this.mountedCombat||!this.entries.get(id)?.mount||!attackActions.has(input.action))return;
  const basic=['attack','pvp_attack'].includes(input.action)&&Math.min(3,Math.max(0,Math.floor(Number(input.ability)||0)))===0;
  if(!basic&&this.active(id))return {status:409,body:{ok:false,code:'mounted_basic_attack_only',error:'Binek üzerinde yalnız düz vuruş kullanabilirsin. Yetenek kullanmak için in.'}};
 }
 beforeAction(id,input,now){
  if(!this.entries.get(id)?.mount)return;
  const rejected=this.rejectAction(id,input);if(rejected)return rejected;
  // /api/dungeon sync is a background read even while riding in an ordinary
  // map. Only a committed room/fishing transition may invalidate R60 riding;
  // active() checks the authoritative scope and mode lock after hydration.
  if(this.mountedCombat){if(!gameplayR60.mountState&&(input.action==='start_fishing'||input.action==='dungeon'))this.dismount(id);return;}
  // Due retaliation must enter the exact original durable/native writer path
  // at walking speed. No mounted flag is trusted in a writer payload.
  const engagement=this.engagement(id),due=Number(engagement?.next_hit_at_ms??Infinity)<=now&&(!this.stateFix||Number(engagement?.expires_at_ms??0)>now);
  if(attackActions.has(input.action)||input.action==='start_fishing'||input.action==='dungeon'||input.action==='move'&&due)this.dismount(id);
 }
 command({id,epoch,kind,mounted,requestId},{busy=false}={}){
  if(!this.enabled)return failure('mount_disabled');
  const owner=this.owner(id),entry=this.entries.get(id),row=this.player(id),now=this.clock();
  if(!owner||owner.epoch!==epoch||entry?.owner!==ownerKey(owner)||!row)return failure('mount_owner_fenced');
  if(typeof mounted!=='boolean'||typeof requestId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/.test(requestId)||kind!==undefined&&!mountDefinition(kind))return failure('mount_invalid');
  const selected=kind??entry.selected,operation=JSON.stringify([mounted,selected]),old=entry.receipts.get(requestId);
  if(old){if(old!==operation)return failure('mount_request_conflict');return {ok:true,replayed:true,mount:this.public(id)};}
  if(mounted){
   if(busy)return failure('mount_actor_busy');
   if(!mountDefinition(selected)||!entry.owned.has(selected)||selected!==entry.selected)return failure('mount_not_owned');
   const engagement=this.engagement(id);
   if(!mountAllowed(row,now,{locked:this.locked(id)})||engagement&&Number(engagement.expires_at_ms??Infinity)>now)return failure('mount_combat_or_area');
   if(!this.active(id,row,now)&&now<entry.nextMountAt)return failure('mount_cooldown');
   if(!entry.mount){entry.mount=Object.freeze({kind:selected,mounted:true});entry.scope=scope(row,this.cycle());entry.hp=row.hp;entry.hpRevision=Number(row.hp_revision??0);entry.hitAt=Number(row.last_monster_hit_at??0);entry.attackOne=Number(row.attack_one_at??0);entry.attackTwo=Number(row.attack_two_at??0);entry.attackThree=Number(row.attack_three_at??0);entry.attackFour=Number(row.attack_four_at??0);entry.combatAt=Number(row.combat_lock_until_ms??0);entry.nextMountAt=now+750;this.touch(id);}
  }else this.dismount(id);
  if(entry.receipts.size>=16)entry.receipts.delete(entry.receipts.keys().next().value);entry.receipts.set(requestId,operation);
  return {ok:true,mount:this.public(id)};
 }
}

// Reuse all native debt/jitter decisions and collision/epoch validation. Only
// server-confirmed riding changes the distance-to-time conversion.
export function mountMovementRules(rules,multiplier){
 return {...rules,evaluateMovementBudget:(role,distance,now,checkedAt,debt)=>{
  if(multiplier(now)!==1.25)return rules.evaluateMovementBudget(role,distance,now,checkedAt,debt);
  const result=rules.evaluateMovementBudget(role,distance/1.25,now,checkedAt,debt);
  return {...result,speed:result.speed*1.25,maxSingleDistance:result.maxSingleDistance*1.25};
 }};
}
