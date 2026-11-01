import {isAdventureArea} from './adventure-maps.mjs';
import {randomUUID} from 'node:crypto';
import {OperationRandom} from './operation-random.mjs';
import {publicAdventure,adventureProgress,towerNeedsCatchup} from './adventure-service.mjs';
import {demand} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorRejection} from './actor-rejection.mjs';

// Only map objectives and deadlines. Movement, targeting, combat, retaliation,
// rewards and world projection use the ordinary channel implementations.
export class AdventureChannel {
 constructor(runtime,initial={}){this.runtime=runtime;this.channel=runtime.channel;this.pending=null;this.bundles=new Map();this.sent=new Map();this.reset(initial);}
 reset(initial={}){this.lootRevisions=new Map(initial.lootRevisions??[]);this.loot=new Map((initial.loot??[]).map(c=>[c.id,c]));this.runs=new Map((initial.runs??[]).map(r=>[r.id,r]));this.portals=new Map((initial.portals??[]).map(p=>[p.id,p]));this.schedules=new Map((initial.schedules??[]).map(s=>[s.id,s]));this.scheduleRetryAt=new Map();this.nextScheduleAttempt=0;this.projectionCache=null;for(const [id,p]of initial.profiles??[])this.runtime.services.adventureProfiles.set(id,Object.freeze(p));this.sent.clear();}
 refresh(bundle){const b=bundle.adventure;if(!b)return;this.projectionCache=null;this.bundles.set(bundle.player.id,b);if(b.run)this.refreshLoot({runId:b.run.id,revision:b.lootRevision??0,loot:b.loot??[]});if(b.retiredRunId){this.refreshLoot({runId:b.retiredRunId,revision:(this.lootRevisions.get(b.retiredRunId)??0)+1,loot:[]});this.runs.delete(b.retiredRunId);for(const [id,p]of this.portals)if(p.run_id===b.retiredRunId)this.portals.delete(id);}if(b.run)this.runs.set(b.run.id,b.run);for(const p of b.portals)this.portals.set(p.id,p);this.sent.delete(bundle.player.id);}
 refreshLoot(snapshot){if(!snapshot?.runId||!Array.isArray(snapshot.loot))return;const revision=snapshot.revision??0;if(!Number.isSafeInteger(revision)||revision<(this.lootRevisions.get(snapshot.runId)??0))return;this.lootRevisions.set(snapshot.runId,revision);for(const [id,chest]of this.loot)if(chest.runId===snapshot.runId)this.loot.delete(id);for(const chest of snapshot.loot)this.loot.set(chest.id,chest);this.sent.clear();}
 forget(id){this.bundles.delete(id);this.sent.delete(id);}
 tick(now){
  const c=this.channel;if(this.pending||c.backgroundPaused)return;
  if(now>=(this.pruneAt??0)){this.pruneAt=now+1000;for(const [id,p]of this.portals)if(p.closes_ms<=now&&(!this.runs.has(p.run_id)||this.runs.get(p.run_id).status!=='active'||this.runs.get(p.run_id).deadline_ms>0))this.portals.delete(id);
   const occupied=new Set([...c.view.players.values()].map(p=>p.area)),idle=[];
   for(const m of c.view.monsters.values())if(isAdventureArea(m.area)&&!occupied.has(m.area)&&!c.lanes.busy(['monster:'+m.id])){idle.push(m.id);if(idle.length===128)break;}
   const removed=c.combatCheckpoints.retireIdleMonsters(idle);for(const id of removed){c.view.removeMonster(id);c.state.remove('monsters',id);c.worldClock.forget(id);this.runtime.services.adventureProfiles.delete(id);}if(removed.length)c.attackMemory.committed({monsters:[],participants:[],bossParticipants:[],removed});
  }
  const scheduled=now>=this.nextScheduleAttempt?[...this.schedules.values()].find(s=>s.at_ms<=now&&(this.scheduleRetryAt.get(s.id)??0)<=now):null;
  if(scheduled)return this.execute([],null,scheduled.id,now);
  for(const run of this.runs.values()){
   if(run.status!=='active'){if(![...this.bundles.values()].some(b=>b.member?.run_id===run.id&&!b.member.departed))this.runs.delete(run.id);continue;}
   const ids=[...this.bundles].filter(([id,b])=>b.member?.run_id===run.id&&!b.member.departed&&c.owners.has(id)&&(c.view.player(id)?.area===run.area||towerNeedsCatchup(run,c.view.player(id)))).map(([id])=>id);
   if(!ids.length){const portal=[...this.portals.values()].find(p=>p.run_id===run.id);if(!run.deadline_ms&&portal?.closes_ms<=now||run.deadline_ms&&run.deadline_ms<=now||run.cycle!==c.world.cycle)if(this.execute([],run,null,now)!==false)return;continue;}
   const dead=ids.some(id=>c.view.player(id)?.hp<=0),monsters=[...c.view.monsters.values()].filter(m=>m.area===run.area&&m.hp>0);
   const hazard=run.state.hazard,pattern=run.kind==='tower'&&run.state.floor===10&&Object.values(run.config.patterns??{}).some(p=>p.enabled)&&monsters.some(m=>this.runtime.services.adventureProfiles.get(m.id)?.kind==='azrail');
   const due=dead||ids.some(id=>towerNeedsCatchup(run,c.view.player(id)))||run.deadline_ms<=now||run.cycle!==c.world.cycle||!run.state.clear&&!monsters.length&&(!run.state.nextWaveAt||run.state.nextWaveAt<=now)||run.state.objective==='seals'&&!run.state.bossSpawned&&!monsters.some(m=>this.runtime.services.adventureProfiles.get(m.id)?.kind==='seal')||pattern&&(hazard?now>=hazard.at:now>=(run.state.nextHazardAt??0));
   // Only an explicit pre-submission refusal permits trying another room.
   // A started or unknown outcome retains the one-operation tick boundary.
   if(due&&this.execute(ids,run,null,now)!==false)return;
  }
 }
 execute(ids,run,scheduleId,now){
  const c=this.channel;if(ids.some(id=>{const p=c.kernel.players.get(id);return !p||p.barrier||p.suspended||p.quiescer;}))return false;
  const monsterIds=run?[...c.view.monsters.values()].filter(m=>m.area===run.area).map(m=>m.id):[];
  const lease=c.lanes.acquire(['adventure:'+(run?.id??scheduleId),...ids.map(id=>'player:'+id),...monsterIds.map(id=>'monster:'+id)],'adventure:'+randomUUID());if(!lease)return false;
  let submitted=false;
  const actorRejected=error=>{const rejected=actorFaultIsolation&&!submitted?actorRejection(error):null;return rejected&&ids.includes(rejected.actor)&&c.owners.get(rejected.actor)?.epoch===rejected.epoch;};
  const work=async()=>{try{
   await Promise.all(ids.map(id=>c.checkpoints.drain(id)));await c.combatCheckpoints.drain();c.lanes.assert(lease);
   submitted=true;let result=await this.write(ids,run,scheduleId,now);
   if(result.run?.state.hazard&&result.run.state.hazard.at-this.runtime.clock()<500)result=await this.write(ids,result.run,null,this.runtime.clock(),true);
   if(scheduleId){if(result.schedulePending){this.nextScheduleAttempt=this.runtime.clock()+5000;this.scheduleRetryAt.set(scheduleId,this.nextScheduleAttempt);}else{this.schedules.delete(scheduleId);this.scheduleRetryAt.delete(scheduleId);}}
   if(result.run)this.runs.set(result.run.id,result.run);if(result.mistLoot)this.refreshLoot(result.mistLoot);
   for(const portal of result.portals??[])this.portals.set(portal.id,portal);
   for(const [id,p]of result.profiles??[])this.runtime.services.adventureProfiles.set(id,Object.freeze(p));
   for(const monster of result.monsters??[])c.setMonster(monster);
   if(result.players?.length){
    await c.applyCommit(result);
    // Deadline/death exits durably delete the old PvE encounter. Rebase both
    // checkpoints from that committed bundle while the actor lane/barrier is
    // still held, just as ActionLoop does for an explicit leave. Otherwise the
    // next movement/HP flush compares against the deleted encounter and fences
    // the channel. No CAS, owner/epoch check or durable ACK is bypassed.
    for(const p of result.players)if(c.owners.has(p.id)){
     c.checkpoints.hydrateCommitted(p);
     c.encounters.hydrateCommitted(p.id,c.view.engagements.get(p.id)??null);
    }
   }
   this.sent.clear();this.projectionCache=null;c.lanes.release(lease);return result;
  }catch(error){if(actorFaultIsolation&&submitted&&actorRejection(error))error=Object.assign(Error('adventure_step_outcome_unknown'),{code:'adventure_step_outcome_unknown',cause:error});if(lease.state==='held'){if(actorRejected(error))c.lanes.reject(lease,error);else c.lanes.fence(lease);}throw error;}};
  const task=ids.length?c.kernel.durableGroup(ids,work,{emitReceipt:false}):work();this.pending=task;task.catch(e=>{if(!actorRejected(e))c.fail(e);}).finally(()=>{if(this.pending===task)this.pending=null;});return true;
 }
 write(ids,run,scheduleId,nowMs,cancel=false){const c=this.channel,key='adventure:'+randomUUID(),payload={runId:run?.id??null,revision:run?.revision??null,scheduleId,nowMs,cancel,seed:OperationRandom.seed(),actors:ids.map(id=>({id,epoch:c.owners.get(id).epoch,sequence:c.writer.finalSequence(id)}))};return c.systemWriter.submit({key,kind:'adventure_step',payload}).then(ack=>{demand(ack.key===key&&ack.result,'adventure_ack_mismatch');return ack.result;});}
 // All subscribers share one bounded scan per 100 ms; per-player projections
 // only serialize when objective counts or state change, never once per frame.
 projection(run,now){
  let cache=this.projectionCache;if(!cache||now>=cache.until||!cache.areas.has(run.area)){
   const areas=new Map();for(const r of this.runs.values())if(r.status==='active')areas.set(r.area,{run:r,monsters:[],profiles:[]});if(!areas.has(run.area))areas.set(run.area,{run,monsters:[],profiles:[]});
   for(const m of this.channel.view.monsters.values()){const group=areas.get(m.area);if(!group)continue;group.monsters.push(m);const profile=this.runtime.services.adventureProfiles.get(m.id);if(profile)group.profiles.push([m.id,profile]);}
   for(const group of areas.values())group.progress=adventureProgress(group);this.projectionCache=cache={until:now+100,areas};
  }return cache.areas.get(run.area);
 }
 project(id,now){
  const c=this.channel,p=c.view.player(id),b=this.bundles.get(id);if(!p||!b)return null;const run=b.run?this.runs.get(b.run.id)??b.run:null;
  const portals=[...this.portals.values()].filter(x=>x.channel===p.channel&&x.area===p.area&&x.opens_ms<=now&&x.closes_ms>now&&x.entered<x.capacity);
  const visibleRun=run?.status==='active'&&p.area===run.area?run:null,projection=visibleRun?this.projection(visibleRun,now):{monsters:[],profiles:[],progress:null},bundle={...b,run:visibleRun,monsters:projection.monsters,profiles:projection.profiles,portals},progress=projection.progress;
  const loot=visibleRun?[...this.loot.values()].filter(chest=>chest.runId===visibleRun.id&&chest.channel===p.channel&&chest.area===p.area&&chest.expiresAt>now):[];
  const key=[...loot.map(chest=>chest.id),run?.revision??0,b.chestClaimed===true,p.area,progress?.remaining??0,progress?.sealsRemaining??0,progress?.bossRemaining??0,...portals.map(x=>x.id+':'+x.entered)].join('|');if(this.sent.get(id)===key)return null;this.sent.set(id,key);
  const data=publicAdventure({...bundle,loot},progress);
  return data;
 }
 async drain(){if(this.pending)await this.pending;}
}
