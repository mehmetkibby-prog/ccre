import {CASTLE_AREA} from './castle-model-r59.mjs';
import {demand,kernelError} from './contract.mjs';

const same=(p,area,channel,arena,version)=>p&&p.area===area&&p.channel===channel&&p.arena_match_id===arena&&(version===undefined||p.realtime_scope_version===version);
const distance=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
const pick=(row,names)=>Object.fromEntries(names.map(k=>[k,row[k]]));

export class SupportMemory {
 constructor({player,players,setPlayer,party,arena,team,blocked=()=>false,guild=()=>null}){
  for(const fn of [player,players,setPlayer,party,arena,team,blocked])demand(typeof fn==='function','support_views_unbound');Object.assign(this,{player,players,setPlayer,party,arena,team,blocked,guild});
 }
 friendly(caster,target){
  if(caster.area===CASTLE_AREA){const id=this.guild(caster.id);return Boolean(id&&id===this.guild(target.id));}
  const own=this.party(caster.id),peer=this.party(target.id);if(!own||own!==peer)return false;
  if(caster.area==='arena'){const a=this.team(caster.arena_match_id,caster.id),b=this.team(caster.arena_match_id,target.id);return a!==null&&a!==undefined&&a===b&&target.arena_match_id===caster.arena_match_id;}
  return target.arena_match_id==='';
 }
 reserve(args){return {args};}
 targets(caster,time){
  const live=this.player(caster.id);if(!live)return {results:[]};
  const selected=this.players(caster).filter(p=>p.hp>0&&p.loadlab_run_id===live.loadlab_run_id&&(!p.loadlab_run_id||p.loadlab_team===live.loadlab_team)&&same(p,caster.area,caster.channel,caster.arena_match_id)&&(p.id===caster.id||(p.last_seen>=Math.floor(time/1000)-30&&p.hp<p.max_hp))&&distance(p,live)<=102400&&(p.id===caster.id||this.friendly(caster,p)));
  selected.sort((a,b)=>(b.id===caster.id)-(a.id===caster.id)||distance(a,live)-distance(b,live)||(a.id<b.id?-1:a.id>b.id?1:0));
  return {results:selected.slice(0,5).map(row=>pick(row,['id','hp','max_hp','x','y','realtime_scope_version']))};
 }
 healPlan(args,other){return {args,other};}
 commitSupport(reserve,plans){
  const [at,cooldown,guardUntil,combatUntil,id,stunAt,cooldownAt,specialization,role,area,channel,arenaId,version,arenaStarts,arenaEnds]=reserve.args,p=this.player(id);
  if(!same(p,area,channel,arenaId,version)||p.hp<=0||p.level<30||p.rod_equipped!==0||p.stun_until_ms>stunAt||p.attack_four_at>cooldownAt||p.specialization!==specialization||p.role!==role)return {guard:{results:[]},results:[]};
  if(area==='arena'){const match=this.arena(arenaId);if(!match||!['countdown','active'].includes(match.status)||match.starts_at_ms>arenaStarts||(match.id.startsWith('guild-')&&match.starts_at_ms+600000<=arenaEnds))return {guard:{results:[]},results:[]};}
  const ids=[id,...plans.map(plan=>plan.args[1])];if(ids.some(id=>this.blocked(id)))throw kernelError('combat_resource_pending');
  const caster={...p,attack_four_at:Math.max(p.attack_four_at,at)+cooldown,special_guard_until_ms:guardUntil,combat_lock_until_ms:Math.max(p.combat_lock_until_ms,combatUntil)},changes=new Map([[id,caster]]),results=[];
  for(const {args,other}of plans){
   const [rate,targetId,targetArea,targetChannel,targetArena,targetVersion,ownId]=args;
   const tail=args.slice(other?8:7),[casterId,branch,until,casterVersion]=tail,target=changes.get(targetId)??this.player(targetId);
   if(!same(target,targetArea,targetChannel,targetArena,targetVersion)||target.hp<=0||target.hp>=target.max_hp||!(target.id===ownId||other&&this.friendly(caster,target))||caster.id!==casterId||caster.hp<=0||caster.specialization!==branch||caster.attack_four_at!==until||caster.loadlab_run_id!==target.loadlab_run_id||!same(caster,target.area,target.channel,target.arena_match_id,casterVersion)||distance(target,caster)>102400){results.push({results:[]});continue;}
   const healed={...target,hp:Math.min(target.max_hp,target.hp+Math.max(1,Math.round(target.max_hp*rate))),hp_revision:target.hp_revision+1};changes.set(target.id,healed);results.push({results:[pick(healed,['id','hp','max_hp','hp_revision'])]});
  }
  for(const row of changes.values())this.setPlayer(row);
  return {guard:{results:[{reserved_until:caster.attack_four_at,special_guard_until_ms:caster.special_guard_until_ms}]},results};
 }
}
