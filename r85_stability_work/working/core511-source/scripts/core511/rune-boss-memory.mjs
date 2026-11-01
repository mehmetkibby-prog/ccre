import {createRuneBossRules} from './generated/rune-boss-rules.mjs';
import {createRetaliationRules} from './generated/retaliation-rules.mjs';
import {OperationRandom} from './operation-random.mjs';
import {demand,validChannel} from './contract.mjs';
const squared=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;

// Storage predicates from the pinned native statements. This port owns only
// private overlays: neither a native SQL handle nor a writer is reachable here.
export class RuneBossMemoryPort {
 constructor({view,channel,owners,frameFor,associated,config,states,nowMs,writerNow=nowMs}){
  demand(validChannel(channel)&&typeof view?.monster==='function'&&typeof view?.player==='function'&&typeof frameFor==='function'&&typeof associated==='function','rune_memory_dependencies');Object.assign(this,{channel,owners,frameFor,associated,config,nowMs,writerNow});this.worldLoop=view;this.states=new Map(states);this.players=new Map();this.operations=[];
 }
 player(id){return this.players.get(id)??this.worldLoop.player(id);}
 real(p){return p&&p.loadlab_run_id===''&&p.is_gm===0&&p.arena_match_id===''&&!this.associated(p.id);}
 readPlayers(ids,channel){return [...new Set(ids)].map(id=>this.player(id)).filter(p=>p?.area==='rune_v2'&&p.channel===channel&&p.hp>0&&this.real(p)).sort((a,b)=>String(a.id).localeCompare(String(b.id))).slice(0,25).map(p=>{const frame=this.frameFor(p.id);return {...frame,...p,world_cycle:frame.world_cycle,core_wings:frame.core_wings,armor_json484:frame.armor_json484};});}
 prepare(kind,...args){demand(['wave','basic','impact','target','cancel'].includes(kind),'rune_memory_statement');return {kind,args};}
 initialize(session,basicMs,cooldown,id,channel,spawn){
  this.operations.push('initialize');const boss=this.worldLoop.monster(id);if(!boss||boss.area!=='rune_v2'||boss.channel!==channel||boss.hp<=0||boss.spawn_round!==spawn||boss.loadlab_run_id!=='')return [{results:[]}];
  const old=this.states.get(id),next={id,spawn_round:spawn,session,seq:old?old.seq+1:0,next_basic_at_ms:this.writerNow+basicMs,next_wave_at_ms:this.writerNow+cooldown,phase:'idle',cast_id:'',starts_at_ms:0,impact_at_ms:0,expires_at_ms:0,x:boss.x,y:boss.y,wave_damage:0,channel};this.states.set(id,next);return [{results:[next]}];
 }
 projection(args){
  const [playerId,id,spawn,channel,x,y,root,cx,cy,at,scope,px,py,seen,radius]=args,b=this.worldLoop.monster(id),p=this.player(playerId);
  return b&&b.spawn_round===spawn&&b.channel===channel&&b.area==='rune_v2'&&b.hp>0&&b.x===x&&b.y===y&&(b.root_until_ms??0)===root&&(b.control_x??0)===cx&&(b.control_y??0)===cy&&(root<=at||root>this.writerNow)&&p?.hp>0&&p.area==='rune_v2'&&p.channel===b.channel&&p.realtime_scope_version===scope&&p.x===px&&p.y===py&&p.last_seen>=seen&&this.real(p)&&squared(p,b)<=radius;
 }
 bossGuard(state,at){const b=this.worldLoop.monster(state.id);return b&&b.spawn_round===state.spawn_round&&b.area==='rune_v2'&&b.channel===state.channel&&b.hp>0&&b.stun_until_ms<=at&&b.loadlab_run_id===''&&b.is_boss===0&&b.is_stone===0&&b.summoned===0;}
 guardedBatch(guard,statements){
  this.operations.push(guard.kind);const saved=this.guard(guard);if(!saved)return {guard:{results:[]},results:[]};this.states.set(saved.id,saved);return {guard:{results:[saved]},results:statements.map(statement=>({results:this.target(statement)}))};
 }
 guard({kind,args:a}){
  if(kind==='cancel'){const [basic,wave,id,session,seq]=a,s=this.states.get(id);return s&&s.session===session&&s.seq===seq&&s.phase==='telegraph'?{...s,seq:s.seq+1,phase:'idle',next_basic_at_ms:basic,next_wave_at_ms:Math.max(s.next_wave_at_ms,wave)}:null;}
  const enabled=this.config.config.enabled===true,wave=(this.config.config.monsters.boss.waveDamage??20)>0;
  if(kind==='wave'){
   const [cast,x,y,damage,cooldown,basic,id,session,seq,spawn,due,stun,revision,...projection]=a,s=this.states.get(id);
   if(!s||s.session!==session||s.seq!==seq||s.spawn_round!==spawn||s.next_wave_at_ms>due||!this.bossGuard(s,stun)||!enabled||!wave||this.config.revision!==revision||!this.projection(projection))return null;
   return {...s,seq:s.seq+1,phase:'telegraph',cast_id:cast,starts_at_ms:this.writerNow,impact_at_ms:this.writerNow+800,expires_at_ms:this.writerNow+1100,x,y,wave_damage:damage,next_wave_at_ms:this.writerNow+cooldown,next_basic_at_ms:this.writerNow+800+basic};
  }
  demand(kind==='basic'||kind==='impact','rune_memory_guard');const [phase,basic,id,session,seq,spawn,due,...tail]=a,s=this.states.get(id),impact=kind==='impact',stun=tail[impact?1:0];
  if(!s||s.session!==session||s.seq!==seq||s.spawn_round!==spawn||!this.bossGuard(s,stun)||!enabled)return null;
  if(impact){if(s.phase!=='telegraph'||s.impact_at_ms>due||s.expires_at_ms<tail[0]||s.impact_at_ms>this.writerNow||s.expires_at_ms<this.writerNow||!wave)return null;}
  else if(!['idle','impact'].includes(s.phase)||s.next_basic_at_ms>due||!this.projection(tail.slice(1)))return null;
  return {...s,seq:s.seq+1,phase,next_basic_at_ms:this.writerNow+basic};
 }
 target({kind,args:a}){
  demand(kind==='target','rune_memory_target');const [amount,gemThreshold,deathThreshold,id,channel,scope,armor,seen,x1,x2,y1,y2,radius,monsterId,spawn,bossChannel,stun,homeRadius]=a,p=this.player(id),b=this.worldLoop.monster(monsterId);
  if(!p||p.hp<=0||p.area!=='rune_v2'||p.channel!==channel||p.realtime_scope_version!==scope||!this.real(p)||(this.frameFor(id).armor_json484??'[]')!==armor||p.last_seen<seen||(p.x-x1)*(p.x-x2)+(p.y-y1)*(p.y-y2)>radius||!b||b.spawn_round!==spawn||b.hp<=0||b.area!=='rune_v2'||b.channel!==bossChannel||b.stun_until_ms>stun||b.loadlab_run_id!==''||squared(p,b)>homeRadius)return [];
  const next={...p,hp:Math.max(0,p.hp-amount),hp_revision:p.hp_revision+1,gems:p.hp<=gemThreshold?Math.max(0,p.gems-Math.trunc(p.gems/20)):p.gems,respawn_at_ms:p.hp<=deathThreshold?this.writerNow+2600:0,last_monster_hit_at:this.writerNow,last_seen:Math.trunc(this.writerNow/1000),combat_lock_until_ms:Math.max(p.combat_lock_until_ms,this.writerNow+5000)};this.players.set(id,next);
  return [Object.fromEntries(['id','hp','max_hp','hp_revision','respawn_at_ms','gems','last_monster_hit_at'].map(k=>[k,next[k]]))];
 }
}

export class RuneBossMemory {
 constructor({view,channel,owners,frameFor,associated,globals,settings,clock=Date.now,session}){
  demand(typeof session==='string'&&session.length>=16&&typeof settings==='function','rune_memory_session');Object.assign(this,{view,channel,owners,frameFor,associated,globals,settings,clock});this.context={session,states:new Map(),running:null};this.states=new Map();this.active=null;
  this.rules=createRuneBossRules({globals,uuid:()=>{demand(this.active,'rune_uuid_outside_step');return this.active.uuid();}});
  this.combat=createRetaliationRules({globals,fourChannels:true,now:()=>this.nowMs,random:()=>{demand(this.active,'rune_random_outside_step');return this.active.roll();}});
 }
 plan(nowMs,{seed=OperationRandom.seed(),writerNow=nowMs}={}){
  demand(!this.active&&Number.isSafeInteger(nowMs),'rune_step_context');const previousViews=new Map(this.rules.views),context={...this.context,states:new Map(this.context.states)},events=[];this.nowMs=nowMs;this.active=new OperationRandom(seed);
  try{
   const port=new RuneBossMemoryPort({view:this.view,channel:this.channel,owners:this.owners,frameFor:this.frameFor,associated:this.associated,config:this.globals.__colRuneV2.settings(),states:this.states,nowMs,writerNow});
   this.rules.runMemory(port,context,{settings:this.settings(),damage:this.combat.runeBossDamage,cadence:this.combat.pveAttackCadenceMs,position:this.combat.monsterCombatPosition,publish:event=>events.push(event),nowMs,clock:this.clock});
   return {seed,nowMs,context,states:port.states,players:port.players,events,operations:port.operations,durable:port.operations.some(kind=>['initialize','wave','cancel'].includes(kind))||events.some(e=>e.dead),views:new Map(this.rules.views)};
  }finally{this.active=null;this.rules.views.clear();for(const [id,view]of previousViews)this.rules.views.set(id,view);}
 }
 commit(plan){this.context=plan.context;this.states=plan.states;this.rules.views.clear();for(const [id,view]of plan.views)this.rules.views.set(id,view);}
 wave(...args){return this.rules.wave(...args);}
}
