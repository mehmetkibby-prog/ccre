import {randomBytes} from 'node:crypto';
import {SharedCombatAuthority,verifySharedLease} from './generated/shared-lease-authority.mjs';
import {demand} from './contract.mjs';

const fields=Object.freeze({participants:['monster_id','spawn_round','player_id','created_at','stone_damage476','stone_first_hit_at_ms476'],bossParticipants:['boss_round','player_id','hit_count','total_damage','created_at']}),key=(kind,row)=>JSON.stringify(kind==='participants'?[row.monster_id,row.spawn_round,row.player_id]:[row.boss_round,row.player_id]),mutable=new Set(['hp','last_damaged_at_ms','root_until_ms','stun_until_ms','control_x','control_y']);

// The fifth process owns both shared HP and its unflushed contribution rows.
// Channels receive an exclusive native lease and return only a nonterminal
// proposal. Acquiring/finishing a lease executes no SQL and creates no receipt.
export class SharedCombatOwner {
 constructor(runtime,{secret=randomBytes(32).toString('hex'),area=null}={}){
  this.runtime=runtime;this.secret=secret;this.area=area;this.lease=null;this.waiters=new Set();this.nextCheckpointR113=runtime.journal.at+5000;
  this.authority=new SharedCombatAuthority({incarnation:runtime.peer.incarnation,secret,load:()=>this.load(),recover:()=>{throw Object.assign(Error('shared_all_owner_recovery_required'),{code:'shared_all_owner_recovery_required'});}});
 }
 get busy(){return Boolean(this.authority.active);}
 async load(){
  const r=this.runtime;if(r.lifecycle.pending)await r.lifecycle.pending;if(r.journal.pending)await r.journal.pending;
  // A continuously occupied native FIFO must not starve the existing five-
  // second checkpoint or unrelated respawns. Service due work BETWEEN leases,
  // before selecting the next borrowed image, never during a source's cast.
  if(this.area===null&&r.started&&!r.jobs?.blocked){const now=r.clock();r.lifecycle.tick(now);if(now>=r.nextRegen){r.nextRegen=now+1000;r.rules.regenerate(r.initial.settings,now);}}
  if(this.area===null)r.journal.poll();
  else if(r.journal.clock()>=this.nextCheckpointR113){const rows=this.snapshot().monsters;await r.journal.flush({targetsR531:new Set(rows.map(m=>m.id)),bossRoundsR113:new Set(rows.filter(m=>m.is_boss).map(m=>m.spawn_round))});this.nextCheckpointR113=r.journal.clock()+5000;}
  if(r.lifecycle.pending)await r.lifecycle.pending;if(r.journal.pending)await r.journal.pending;
  const keys=['shared:combat:'+(this.area??'*'),...[...r.view.monsters.values()].filter(m=>this.area===null||m.area===this.area).map(m=>'monster:'+m.id)];
  while(!(this.lease=r.lanes.acquire(keys,this.authority.active.key)))await r.lanes.available(keys);
  await r.project();if(r.changed.size)await r.project();
  return this.snapshot();
 }
 snapshot(){const r=this.runtime,monsters=[...r.view.monsters.values()].filter(m=>this.area===null||m.area===this.area),ids=new Set(monsters.map(m=>m.id)),rounds=new Set(monsters.filter(m=>m.is_boss).map(m=>m.spawn_round));return structuredClone({cycle:r.initial.world.cycle,areaR113:this.area,monsters,participants:[...r.journal.current.get('participants').values()].filter(p=>ids.has(p.monster_id)),bossParticipants:[...r.journal.current.get('bossParticipants').values()].filter(p=>rounds.has(p.boss_round))});}
 acquire(peer,id){demand(typeof peer?.actor==='string'&&peer.actor.length<=80&&Number.isSafeInteger(peer.epoch)&&peer.epoch>0,'shared_actor_scope');return this.authority.acquire(peer,id).catch(error=>{if(this.lease)this.runtime.fail(error);throw error;});}
 assert(peer,proof){const claims=verifySharedLease(this.secret,proof),a=this.authority.active;demand(a&&a.proof===proof&&a.peer.actor===peer.actor&&a.peer.epoch===peer.epoch&&claims.incarnation===peer.incarnation&&claims.channel===peer.channel&&claims.ownerIncarnation===this.runtime.peer.incarnation,'shared_actor_lease_fenced');this.runtime.lanes.assert(this.lease);return a;}
 publish(peer,changes){
  const r=this.runtime;demand(changes&&Object.keys(changes).sort().join(',')==='bossParticipants,combatEvents,monsters,participants','shared_proposal_fields');
  for(const name of Object.keys(changes))demand(Array.isArray(changes[name])&&changes[name].length<=(name==='combatEvents'?4096:1024),'shared_proposal_size');
  const ids=new Set();for(const next of changes.monsters){
   const prior=r.view.monster(next?.id);demand(prior&&(this.area===null||prior.area===this.area)&&prior.hp>0&&next.hp>0&&next.hp<=prior.hp&&Object.keys(next).length===Object.keys(prior).length&&Object.keys(prior).every(k=>Object.hasOwn(next,k)&&(Object.is(next[k],prior[k])||mutable.has(k)&&Number.isFinite(next[k])))&&!ids.has(next.id),'shared_proposal_monster');ids.add(next.id);
  }
  for(const kind of ['participants','bossParticipants']){const seen=new Set();for(const row of changes[kind]){
   const names=fields[kind];demand(row&&row.player_id===peer.actor&&Object.keys(row).length===names.length&&names.every(k=>Object.hasOwn(row,k)),'shared_proposal_actor');const k=key(kind,row),old=r.journal.current.get(kind).get(k);demand(!seen.has(k),'shared_proposal_duplicate');seen.add(k);
   const target=kind==='participants'?r.view.monster(row.monster_id):[...r.view.monsters.values()].find(m=>m.is_boss&&m.spawn_round===row.boss_round&&(this.area===null||m.area===this.area));demand(target&&(this.area===null||target.area===this.area)&&target.hp>0&&(kind!=='participants'||target.spawn_round===row.spawn_round),'shared_proposal_life');
   for(const field of names.filter(k=>!['player_id','monster_id'].includes(k)))demand(Number.isSafeInteger(row[field])&&row[field]>=0&&(!old||row[field]>=old[field]),'shared_proposal_counter');
  }}
  demand(r.journal.events.length+changes.combatEvents.length<=4096,'shared_event_backpressure');
  for(const e of changes.combatEvents)demand(e&&Object.keys(e).sort().join(',')==='ability,created_at,player_id,role,target_id'&&e.player_id===peer.actor&&r.view.monster(e.target_id)&&(this.area===null||r.view.monster(e.target_id).area===this.area)&&['avci','arkanist','muhafiz'].includes(e.role)&&Number.isSafeInteger(e.ability)&&e.ability>=0&&e.ability<=3&&Number.isSafeInteger(e.created_at),'shared_proposal_event');
  // Every row is validated before publishing any part of the proposal.
  r.journal.changed(changes);for(const row of changes.monsters){r.view.setMonster(row);r.changed.set(row.id,row);}
 }
 async finish(peer,{proof,changes}){
  this.assert(peer,proof);try{
   const answer=await this.authority.finish(peer,{proof,value:changes},value=>this.publish(peer,value),async()=>{await this.runtime.project();this.runtime.lanes.release(this.lease);this.lease=null;});this.wake();return answer;
  }catch(error){this.runtime.fail(error);throw error;}
 }
 async checkpoint(peer,{proof}){this.assert(peer,proof);const r=this.runtime;if(this.area===null)await r.journal.drain();else{if(r.journal.pending)await r.journal.pending;const rows=this.snapshot().monsters;await r.journal.flush({targetsR531:new Set(rows.map(m=>m.id)),bossRoundsR113:new Set(rows.filter(m=>m.is_boss).map(m=>m.spawn_round))});}this.assert(peer,proof);return {sequence:r.writer.sequence};}
 async reload(peer,{proof,snapshot}){
  if(this.area!==null)return this.reloadArea(peer,{proof,snapshot});
  this.assert(peer,proof);const r=this.runtime;demand(snapshot?.world?.cycle===r.initial.world.cycle&&!r.journal.pending&&Object.values(r.journal.snapshot()).every(rows=>!rows.length),'shared_reload_requires_checkpoint');
  demand(Array.isArray(snapshot.monsters)&&snapshot.monsters.every(m=>m.channel===0),'shared_reload_scope');
  r.view.monsters.clear();for(const row of snapshot.monsters)r.view.setMonster(row);
  for(const kind of ['monsters','participants','bossParticipants']){r.journal.base.get(kind).clear();r.journal.current.get(kind).clear();r.journal.hydrate(kind,snapshot[kind]??[]);}
  // This snapshot is read only after the native command's durable ACK.
  // Publish its committed world HP now, while retaining the exclusive lease.
  // Inventory hydration may take longer; it must not hide a committed death.
  // No new shared cast is admitted until the existing finish/release protocol.
  r.fullNeeded=true;await r.project({full:true});this.assert(peer,proof);return {reloaded:true};
 }
 async reloadArea(peer,{proof,snapshot}){
  this.assert(peer,proof);const r=this.runtime;if(r.journal.pending)await r.journal.pending;this.assert(peer,proof);
  demand(snapshot?.world?.cycle===r.initial.world.cycle&&Array.isArray(snapshot.monsters)&&snapshot.monsters.every(m=>m.channel===0),'shared_reload_scope');
  const old=this.snapshot(),monsters=snapshot.monsters.filter(m=>m.area===this.area),ids=new Set([...old.monsters,...monsters].map(m=>m.id)),rounds=new Set([...old.monsters,...monsters].filter(m=>m.is_boss).map(m=>m.spawn_round));
  const belongs=(kind,row)=>kind==='monsters'?ids.has(row.id):kind==='participants'?ids.has(row.monster_id):rounds.has(row.boss_round);
  const dirty=r.journal.snapshot();demand(['monsters','participants','bossParticipants'].every(kind=>dirty[kind].every(row=>!belongs(kind,row.current)))&&dirty.combatEvents.every(e=>!ids.has(e.target_id)),'shared_reload_requires_checkpoint');
  for(const m of old.monsters)r.view.monsters.delete(m.id);for(const m of monsters){r.view.setMonster(m);r.changed.set(m.id,m);}
  for(const kind of ['monsters','participants','bossParticipants']){for(const maps of [r.journal.base,r.journal.current])for(const [key,row]of maps.get(kind))if(belongs(kind,row))maps.get(kind).delete(key);r.journal.hydrate(kind,kind==='monsters'?monsters:(snapshot[kind]??[]).filter(row=>belongs(kind,row)));}
  // Deletion needs a full projection, but never a wholesale memory replacement.
  const next=new Set(monsters.map(m=>m.id));if(old.monsters.some(m=>!next.has(m.id)))r.fullNeeded=true;
  await r.project();this.assert(peer,proof);return {reloaded:true};
 }
 async idle(){if(!this.authority.active&&!this.authority.queue.length)return;await new Promise(resolve=>this.waiters.add(resolve));}
 wake(){if(!this.authority.active&&!this.authority.queue.length){for(const resolve of this.waiters)resolve();this.waiters.clear();}}
 close(){this.authority.close();}
}
