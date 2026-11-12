import {demand} from './contract.mjs';

// External native configuration has no world-period transaction. Keep the
// same simulation incarnation/cycle and regeneration clocks while replacing
// committed images behind an all-owner barrier.
export class SharedConfiguration {
 constructor(runtime){this.runtime=runtime;this.held=null;}
 async freeze({token,cycle}){
  const r=this.runtime;demand(typeof token==='string'&&token.length>=16&&token.length<=160&&cycle===r.initial.world.cycle&&r.jobs&&!r.jobs.enabled&&!r.jobs.pending&&!r.jobs.blocked&&!this.held,'configuration_world_freeze');
  const h={token,cycle,phase:'freezing',lease:null};this.held=h;r.jobs.blocked=true;
  try{
   await r.sharedCombat.idle();if(r.lifecycle.pending)await r.lifecycle.pending;await r.journal.drain();await r.writer.drain();await r.project();
   h.lease=r.lanes.acquire(['global:configuration',...[...r.view.monsters.keys()].map(id=>'monster:'+id)],token);demand(h.lease,'configuration_world_resources');h.phase='frozen';
   return {token,cycle,incarnation:r.peer.incarnation,epoch:r.writer.epoch,sequence:r.writer.sequence,frozen:true};
  }catch(error){this.fail(error);throw error;}
 }
 validate(token){const h=this.held;demand(h?.token===token&&h.phase==='frozen','configuration_world_fenced');this.runtime.lanes.assert(h.lease);return h;}
 async refresh({token,snapshot}){
  const h=this.validate(token),r=this.runtime;
  try{
   demand(!h.refreshed&&snapshot?.world?.cycle===h.cycle&&snapshot.system.incarnation===r.peer.incarnation&&snapshot.system.epoch===r.writer.epoch&&snapshot.system.sequence===r.writer.sequence&&!r.sharedCombat.busy&&!r.journal.pending&&!r.lifecycle.pending&&Object.values(r.journal.snapshot()).every(rows=>!rows.length),'configuration_world_snapshot');
   const next=new Map(snapshot.monsters.map(m=>{demand(m.channel===0,'configuration_world_monster');return [m.id,m];}));
   for(const [id,old]of r.view.monsters)if(!next.has(id)||next.get(id).spawn_round!==old.spawn_round)r.rules.forget(id);
   r.view.monsters.clear();for(const row of next.values())r.view.setMonster(row);
   r.view.engagements.clear();r.view.engagedByMonster.clear();r.view.owners.clear();r.view.receive(snapshot.engagements);
   for(const kind of ['monsters','participants','bossParticipants']){r.journal.base.get(kind).clear();r.journal.current.get(kind).clear();r.journal.hydrate(kind,snapshot[kind]??[]);}
   r.initial={...snapshot,globalJobs:true};r.worldPoint=snapshot.worldPoint;r.rules.config.clear();for(const [key,row]of Object.entries(snapshot.config))r.rules.config.set(key,row);
   r.changed.clear();await r.project({full:true});h.refreshed=true;return {token,cycle:h.cycle,refreshed:true};
  }catch(error){this.fail(error);throw error;}
 }
 resume({token}){const h=this.validate(token),r=this.runtime;demand(h.refreshed,'configuration_world_not_refreshed');r.lanes.release(h.lease);this.held=null;r.jobs.blocked=false;return {token,cycle:h.cycle,resumed:true};}
 fail(error){const h=this.held;if(h){h.phase='unknown';if(h.lease?.state==='held')this.runtime.lanes.fence(h.lease);}this.runtime.fail(error);}
}
