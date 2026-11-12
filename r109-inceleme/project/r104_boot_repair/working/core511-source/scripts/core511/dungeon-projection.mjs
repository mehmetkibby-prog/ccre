import {dungeonGroundLootDeadline,dungeonGroundLootExpired} from './dungeon-ground-expiry.mjs';
import {demand} from './contract.mjs';

// One native projection for a committed room version, shared across viewers.
// Viewer filtering must happen before returning a packet: hidden GMs are only
// visible to themselves and their effects follow the identical native rule.
export class DungeonProjection {
 constructor(resident){this.resident=resident;this.rooms=new Map();this.sent=new Map();this.metrics={builds:0,hits:0};}
 snapshot(id,now){
  const resident=this.resident,run=resident.runFor(id);if(!run)return null;
  const version=resident.versions.get(run.id)??0;let cached=this.rooms.get(run.id);
  if(!cached||cached.version!==version||now>=cached.until){
   // The previous image remains visible until a terminal operation is durable.
   // A pending expiry refresh must never mutate the published old room.
   if(resident.pending.has(id)){if(!cached)return null;}
   else{
    const engine={now:()=>now,refreshPumpkin499:member=>{
     demand(!member.stats||member.left||member.stats.pumpkinRevision499===1&&(!member.stats.pumpkinActive499||member.stats.pumpkinUntil499>now),'dungeon_projection_requires_refresh');
    }};
    const shared=resident.rules.projectDungeonAll.call(engine,run),hidden=new Set(run.members.filter(p=>p.gmInvisible).map(p=>p.id));
    const deadlines=[dungeonGroundLootDeadline(run),...run.members.flatMap(p=>[p.inputAt+801,p.stats?.arenaWingsActive477?p.stats.arenaWingsExpiresAt477:0,p.stats?.pumpkinActive499?p.stats.pumpkinUntil499:0])].filter(at=>Number.isFinite(at)&&at>now);
    cached={run,version,shared,hidden,views:new Map(),until:Math.min(Infinity,...deadlines)};this.rooms.set(run.id,cached);this.metrics.builds++;
   }
  }else this.metrics.hits++;
  let view=cached.views.get(cached.hidden.has(id)?id:'public');
  if(!view){const hidden=p=>cached.hidden.has(p)&&p!==id;view={...cached.shared,members:cached.shared.members.filter(p=>!hidden(p.id)),effects:cached.shared.effects.filter(e=>!hidden(e.actorId))};cached.views.set(cached.hidden.has(id)?id:'public',view);}
  // applyResult installs the committed room before asynchronous channel refresh
  // releases pending. Its newer clock cannot label the still-withheld old
  // coordinates: that creates a false stationary movement sample. Ordinary
  // non-pending clock-only snapshots retain the exact native current clock.
  const motionTime=resident.pending.has(id)?cached.run.motionTime:run.motionTime;
  return {run:{...view,...(dungeonGroundLootExpired(run,now)?{groundLoot:[]}:{}),motionTime,serverTime:now},...(run.mode==='solo'?{solo:{settings:run.solo,used:0,remaining:0}}:{}),settings:run.cfg,materials:resident.materials.get(id)??{}};
 }
 changed(id,now){
  const run=this.resident.runFor(id),previous=this.sent.get(id);if(!run){this.sent.delete(id);return previous?{run:null}:null;}
  const version=this.resident.versions.get(run.id)??0;if(previous?.runId===run.id&&previous.version===version&&now<(this.rooms.get(run.id)?.until??0))return null;
  // A pending refresh can return the earlier cached image. Acknowledge only
  // that published version so release can publish the new room without waiting
  // for another simulation change (including a stationary or completed room).
  const snapshot=this.snapshot(id,now);if(snapshot)this.sent.set(id,{runId:run.id,version:this.rooms.get(run.id).version});return snapshot;
 }
 forget(id){this.sent.delete(id);for(const [key,entry]of this.rooms)if(!this.resident.runs.has(key))this.rooms.delete(key);}
}
