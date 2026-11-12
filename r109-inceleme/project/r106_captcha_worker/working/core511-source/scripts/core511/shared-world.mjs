import {performance} from 'node:perf_hooks';
import {WorldClock} from './world-clock.mjs';
import {CombatCheckpoints} from './combat-checkpoint.mjs';
import {OrderedSystemClient} from './system-writer.mjs';
import {pveEntries489} from './generated/aggro-rules.mjs';
import {demand,TICK_MS} from './contract.mjs';
import {ResourceLanes} from './resource-lanes.mjs';
import {MonsterLifecycle} from './monster-lifecycle.mjs';
import {acceptWorldPoint} from './world-state.mjs';
import {SharedWorldJobs} from './shared-world-jobs.mjs';
import {ResidentCleanup} from './resident-cleanup.mjs';
import {SharedCombatOwner} from './shared-combat-owner.mjs';
import {SharedConfiguration} from './shared-configuration.mjs';

export class SharedWorldMemory {
 constructor(){this.monsters=new Map();this.engagements=new Map();this.engagedByMonster=new Map();this.owners=new Map();}
 monster(id){return this.monsters.get(id)??null;}
 setMonster(row){demand(row?.channel===0,'shared_monster_scope');this.monsters.set(row.id,Object.freeze({...row}));}
 setEngagement(id,row){
  for(const e of pveEntries489(this.engagements.get(id))){const set=this.engagedByMonster.get(e.monster_id);set?.delete(id);if(!set?.size)this.engagedByMonster.delete(e.monster_id);}
  if(!row){this.engagements.delete(id);return;}
  const next=Object.freeze({...row});this.engagements.set(id,next);
  for(const e of pveEntries489(next))if(this.monsters.has(e.monster_id)){let set=this.engagedByMonster.get(e.monster_id);if(!set)this.engagedByMonster.set(e.monster_id,set=new Set());set.add(id);}
 }
 receive(rows){
  demand(Array.isArray(rows)&&rows.length<=512,'shared_engagement_size');
  for(const {actor,epoch,channel,incarnation,engagement}of rows){
   demand(typeof actor==='string'&&[1,2,3,4].includes(channel)&&typeof incarnation==='string'&&Number.isSafeInteger(epoch)&&epoch>0,'shared_engagement_owner');
   const old=this.owners.get(actor);if(old?.epoch>epoch)continue;
   demand(!old||old.epoch<epoch||old.channel===channel&&old.incarnation===incarnation,'shared_engagement_fenced');
   demand(engagement===null||engagement?.player_id===actor,'shared_engagement_actor');this.owners.set(actor,{epoch,channel,incarnation});this.setEngagement(actor,engagement);
  }
 }
}

// Independent fifth simulation process. Shared HP/regen is authoritative here;
// every channel only receives projections. Native respawn/reset/reward jobs
// are added through the separate world lifecycle adapter, not emulated here.
export class SharedWorldRuntime {
 constructor({peer,initial,request,clock=Date.now,onFatal=()=>{}}){
  demand(peer?.channel===0&&peer.role==='world'&&initial.system?.incarnation===peer.incarnation&&typeof request==='function','shared_world_boot');
  Object.assign(this,{peer,initial,request,clock,onFatal});this.view=new SharedWorldMemory();for(const row of initial.monsters)this.view.setMonster(row);this.view.receive(initial.engagements);
  this.worldPoint=initial.worldPoint??null;
  this.jobs=initial.globalJobs?new SharedWorldJobs(this):null;
  this.writer=new OrderedSystemClient({owner:initial.system,request:command=>request('system_command',command),onUnknown:e=>this.fail(e)});
  this.journal=new CombatCheckpoints({submit:e=>this.writer.submit(e),onFatal:e=>this.fail(e)});this.journal.hydrate('monsters',initial.monsters);
  for(const kind of ['participants','bossParticipants'])this.journal.hydrate(kind,initial[kind]??[]);
  this.changed=new Map();this.version=0;this.projecting=null;this.started=false;this.failure=null;this.nextRegen=clock()+1000;this.metrics={ticks:0,maxMs:0,samples:[],slowest:[]};this.elu=performance.eventLoopUtilization();
  this.lanes=new ResourceLanes();
  this.cleanupControl=new ResidentCleanup({peer,cycle:()=>this.initial.world.cycle,lanes:this.lanes,journal:this.journal,writer:this.writer,onFatal:error=>this.fail(error)});
  this.rules=new WorldClock({view:this.view,owns:m=>m.channel===0,blocked:id=>this.lanes.busy(['monster:'+id]),clock,changed:changes=>{this.journal.changed(changes);for(const row of changes.monsters)this.changed.set(row.id,row);}});
  this.lifecycle=new MonsterLifecycle({clock:this.rules,settings:()=>this.initial.settings,view:this.view,lanes:this.lanes,journal:this.journal,submit:e=>this.writer.submit(e),committed:result=>{for(const id of result.removed??[]){this.view.monsters.delete(id);this.rules.forget(id);this.changed.delete(id);this.fullNeeded=true;}for(const m of result.monsters){this.view.setMonster(m);this.changed.set(m.id,m);}},onFatal:e=>this.fail(e)});
  this.sharedCombat=new SharedCombatOwner(this);
  this.configuration=new SharedConfiguration(this);
  for(const [key,row]of Object.entries(initial.config??{}))this.rules.config.set(key,row);
 }
 async project({full=false}={}){
  if(this.projecting){await this.projecting;if(full)return this.project({full:true});return;}
  full=full||this.fullNeeded===true;if(!full&&!this.changed.size)return;this.fullNeeded=false;
  const rows=full?[...this.view.monsters.values()]:[...this.changed.values()];this.changed.clear();
  const payload={epoch:this.initial.system.epoch,incarnation:this.peer.incarnation,version:++this.version,cycle:this.initial.world.cycle,full,monsters:rows};
  const task=this.request('world_projection',payload);this.projecting=task;
  try{await task;}catch(error){this.fail(error);throw error;}finally{if(this.projecting===task)this.projecting=null;}
 }
 setWorld(point){if(acceptWorldPoint(this.worldPoint,point)){demand(point.world.cycle===this.initial.world.cycle,'world_state_cycle_requires_reset');this.worldPoint=point;this.initial.world={...point.world};}return {revision:this.worldPoint.revision};}
 tick(){
  if(!this.started||this.failure)return;const at=performance.now(),now=this.clock();
  try{this.jobs?.tick(now);if(!this.jobs?.blocked&&!this.sharedCombat.busy){this.lifecycle.tick(now);if(now>=this.nextRegen){this.nextRegen=now+1000;this.rules.regenerate(this.initial.settings,now);}this.journal.poll();void this.project().catch(()=>{});}}
  catch(error){this.fail(error);throw error;}
  finally{const ms=performance.now()-at,m=this.metrics;m.ticks++;m.maxMs=Math.max(m.maxMs,ms);m.samples.push(ms);if(m.samples.length>16384)m.samples.shift();m.slowest.push({tick:m.ticks,at:now,ms});m.slowest.sort((a,b)=>b.ms-a.ms);m.slowest.length=Math.min(10,m.slowest.length);}
 }
 async activate(){demand(!this.started,'shared_world_already_started');await this.project({full:true});this.started=true;this.nextTick=performance.now()+TICK_MS;const tick=()=>{if(!this.started)return;try{this.tick();}catch{return;}this.nextTick=Math.max(this.nextTick+TICK_MS,performance.now());this.timer=setTimeout(tick,Math.max(0,this.nextTick-performance.now()));};this.timer=setTimeout(tick,TICK_MS);return {started:true};}
 stop(){this.started=false;clearTimeout(this.timer);}
 async drain(){this.stop();await this.jobs?.drain();await this.sharedCombat.idle();await this.lifecycle.drain();await this.journal.drain();await this.writer.drain();await this.project();return {drained:true,sequence:this.writer.sequence};}
 fail(error){if(this.failure)return;this.failure=error;this.stop();this.onFatal(error);}
 snapshot(){const sorted=[...this.metrics.samples].sort((a,b)=>a-b);return {ticks:this.metrics.ticks,maxMs:this.metrics.maxMs,tickP95Ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]??0,slowest:this.metrics.slowest,monsters:this.view.monsters.size,sequence:this.writer.sequence,version:this.version,elu:performance.eventLoopUtilization(this.elu).utilization};}
}
