import {randomUUID} from 'node:crypto';
import {ResidentDungeon,validDungeonCommand} from './dungeon-runtime.mjs';
import {DEFER_INPUT} from './fixed-loop.mjs';
import {demand} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {gameplayR55} from './r55-gameplay-options.mjs';

// The same actor leases used for open-world combat and legacy HTTP operations
// also cover dungeon rooms. SQL and asynchronous cold reads only run behind a
// durable barrier; entering a room cannot race a queued movement/checkpoint.
export class DungeonChannel {
 constructor(channel,{globals,progressionSettings,initial,actorsFor,clock=Date.now,progressFix=gameplayR55.dungeonProgress}){
  demand(channel?.kernel&&typeof actorsFor==='function','dungeon_channel_dependencies');
  Object.assign(this,{channel,clock,progressFix});this.incarnation=randomUUID();this.pending=new Map();
  this.resident=new ResidentDungeon({channel:channel.peer.channel,globals,progressionSettings,clock,progressFix,
   assertOwned:id=>{const o=channel.owners.get(id);demand(o?.channel===channel.peer.channel&&o.incarnation===channel.peer.incarnation,'dungeon_owner_fenced');return o.epoch;},actorsFor,
   onFatal:e=>channel.fail(e),
   submit:async event=>{
    const token=this.pending.get(event.actor);demand(token&&event.payload.actors.every(id=>this.pending.get(id)===token),'dungeon_lease_missing');channel.lanes.assert(token.lease);
    await Promise.all(event.payload.actors.map(id=>channel.checkpoints.drain(id)));
    // An established group/solo room writes no open-world monster/contribution
    // rows. Its members remain leased and actor-checkpointed through ACK.
    // Entry, tower and any outstanding open-world engagement keep the old drain.
    const localRoom=this.progressFix&&event.payload.run&&event.payload.run.mode!=='tower'&&event.payload.actors.every(id=>!channel.view.engagements.get(id));
    if(!localRoom)await channel.combatCheckpoints.drain();channel.lanes.assert(token.lease);
    return channel.writer.submit(event);
   },
   onCommitted:async result=>{
    await channel.applyCommit(result);
    for(const player of result.players)channel.checkpoints.hydrateCommitted(player);
    // Dungeon commands may retire encounters at entry/leave. Reloaded bundles
    // are already authoritative before any room actor or rare-route can resume.
    for(const player of result.players)channel.encounters.hydrateCommitted(player.id,channel.view.engagements.get(player.id)??null);
   }
  });this.resident.hydrate(initial);
 }
 actors(id,input){const room=this.resident.runFor(id);return room?room.members.filter(p=>!p.left).map(p=>p.id):this.resident.actorsFor(id,input);}
 ready(ids,{draining=null}={}){
  const {kernel,lanes}=this.channel;return ids.every(id=>{const p=kernel.players.get(id);return p&&!p.barrier&&(!p.suspended||(draining instanceof Set?draining.has(id):id===draining))&&!this.pending.has(id)&&!this.resident.pending.has(id)&&!lanes.busy(['player:'+id]);});
 }
 start(id,operation,{now=this.clock(),draining=null,reply=false}={}){
  const room=operation.runId?this.resident.runs.get(operation.runId)?.run:this.resident.runFor(id),members=room?.members.filter(p=>!p.left).map(p=>p.id),ids=members?.length?members:room?[room.leaderId]:this.actors(id,operation.input);
  if(!this.ready(ids,{draining}))return DEFER_INPUT;
  const lease=this.channel.lanes.acquire([...ids.map(p=>'player:'+p),'dungeon:'+(room?.id??'entry:'+ids.slice().sort().join(','))],this.incarnation);if(!lease)return DEFER_INPUT;
  const token={lease,promise:null};for(const actor of ids)this.pending.set(actor,token);
  const release=()=>{this.channel.lanes.assert(lease);for(const actor of ids){demand(this.pending.get(actor)===token,'dungeon_lease_changed');this.pending.delete(actor);}this.channel.lanes.release(lease);};
  try{
   const step=this.resident.step(id,operation,{now,resources:lease.keys});
   if(!step.durable){release();return {type:'dungeon',...step.result};}
   const complete=()=>step.completion.then(value=>{release();return value;},error=>{
    const rejected=actorFaultIsolation?actorRejection(error):null;
    if(rejected&&!this.resident.failure&&ids.includes(rejected.actor)&&this.channel.owners.get(rejected.actor)?.epoch===rejected.epoch&&ids.every(actor=>this.pending.get(actor)===token)){
     if(lease.state==='held')this.channel.lanes.reject(lease,error);for(const actor of ids)this.pending.delete(actor);
    }else if(lease.state==='held')this.channel.lanes.fence(lease);throw error;
   });
   token.promise=draining?complete():this.channel.kernel.durableGroup(ids,complete,{replyTo:reply?id:null,emitReceipt:false,ackResult:value=>({type:'dungeon',...value})});
   return {type:'dungeon',pending:true,completion:token.promise};
  }catch(error){if(lease.state==='held')this.channel.lanes.fence(lease);throw error;}
 }
 action(context){const {id,input,now}=context;if(actorFaultIsolation&&!(input.action==='dungeon'&&validDungeonCommand(input.command)))return {type:'action',status:400,body:{code:'dungeon_protocol_command',error:'Geçersiz kule işlemi.'}};demand(input.action==='dungeon'&&input.command&&typeof input.command==='object','dungeon_protocol_command');if(input.command.action==='create'&&!this.resident.runFor(id)&&this.channel.sharedCombat)return this.channel.sharedCombat.dungeonEntry(context);const result=this.start(id,{kind:'command',input:input.command},{now,reply:true});return result===DEFER_INPUT?result:result.pending?{type:'dungeon'}:result;}
 async applyEntry(value){
  demand(value.players.every(p=>this.channel.owners.has(p.id))&&(!value.run||value.run.members.every(p=>this.channel.owners.has(p.id))),'dungeon_entry_local_scope');
  this.resident.applyResult(value);await this.resident.onCommitted(value);
 }
 applyCleanup({finished,notices,at}){
  demand(!this.pending.size&&!this.resident.pending.size&&Array.isArray(finished)&&Array.isArray(notices)&&Number.isSafeInteger(at),'dungeon_cleanup_pending');
  for(const {id}of finished){const entry=this.resident.runs.get(id);demand(!entry||entry.run.members.every(p=>p.left===true),'dungeon_cleanup_live_room');this.resident.runs.delete(id);this.resident.versions.delete(id);}
  for(const [id,notice]of this.resident.notices)if(at-notice.at>300000)this.resident.notices.delete(id);for(const [id,notice]of notices)this.resident.notices.set(id,notice);
 }
 tick({now}){
  for(const [runId,entry]of this.resident.runs){const ids=entry.run.members.filter(p=>!p.left).map(p=>p.id),actor=ids[0]??entry.run.leaderId;if(!this.ready(ids.length?ids:[actor]))continue;
   this.start(actor,{kind:'tick',runId,elapsed:Math.min(.2,Math.max(0,(now-(entry.lastTick??this.resident.lastTick))/1000))},{now});
  }
 }
 refreshActor(bundle){
  this.resident.players.set(bundle.player.id,bundle.player);
  if(bundle.dungeon){for(const [id,rid]of bundle.dungeon.memberships)this.resident.memberships.set(id,rid);for(const [id,m]of bundle.dungeon.materials)this.resident.materials.set(id,m);}
 }
 locked(id){return Boolean(this.resident.memberships.get(id));}
 seen(id,at){this.resident.seen(id,at);}
 async drain(id){
  const prior=this.pending.get(id);if(prior?.promise)await prior.promise;
  const run=this.resident.runFor(id);if(!run)return;
  const result=this.start(id,{kind:'checkpoint',runId:run.id},{draining:id});demand(result!==DEFER_INPUT&&result.completion,'dungeon_drain_pending');await result.completion;
 }
 drainGroup(ids){return this.drainActors(ids,{complete:true});}
 async drainActors(ids,{complete=false}={}){
  const selected=new Set(ids),runs=new Map();for(const id of ids){const prior=this.pending.get(id);if(prior?.promise)await prior.promise;const run=this.resident.runFor(id);if(run)runs.set(run.id,run);}
  for(const run of runs.values()){const members=run.members.filter(p=>!p.left).map(p=>p.id),actor=members.find(id=>selected.has(id))??run.leaderId;if(complete)demand(members.every(id=>selected.has(id))&&selected.has(actor),'dungeon_partial_group_drain');const result=this.start(actor,{kind:'checkpoint',runId:run.id},{draining:selected});demand(result!==DEFER_INPUT&&result.completion,'dungeon_group_drain_pending');await result.completion;}
 }
 drop(id){demand(!this.pending.has(id)&&!this.resident.memberships.get(id),'dungeon_member_still_owned');this.resident.players.delete(id);this.resident.memberships.delete(id);this.resident.materials.delete(id);this.resident.notices.delete(id);this.resident.presence.delete(id);}
}
