import {randomUUID} from 'node:crypto';
import {demand} from './contract.mjs';
import {retiredFreezeOwner} from './freeze-redirect.mjs';
import {coldSettlementResources} from './settlement-resources.mjs';

// Trusted coordinator-only barrier for native party cleanup during transfer.
// An accepted party/guild operation may finish while this group is freezing.
// After closure, new shared terminal work waits until every refreshed owner
// has resumed. No client supplies this membership, token or ownership proof.
export class TransferFreezeGroup {
 constructor(core,source){
  this.core=core;this.source=source;this.entries=new Map();this.phase='freezing';
  this.done=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});void this.done.catch(()=>{});core.transferGroups.add(this);
 }
 related(){const c=this.core;return [this.source,...c.database.sqlite.prepare('SELECT player_id FROM party_members WHERE party_id=(SELECT party_id FROM party_members WHERE player_id=?)').all(this.source).map(r=>r.player_id)];}
 add(ids){
  const c=this.core;c.permanent.assertAvailable(ids);
  for(const id of new Set(ids)){
   if(this.entries.has(id))continue;const admission=c.authority.admission(id),simulation=c.authority.simulation(id);if(!admission&&!simulation)continue;
   const owner=c.authority.owner(id);demand(!c.transitions.has(id)&&owner?.state==='active'&&(admission??simulation).epoch===owner.epoch,'transfer_group_owner');
   const entry={owner:{...owner},request:{id,epoch:owner.epoch,token:randomUUID()},admission,simulation,phase:'freezing',needsFreeze:true,group:this};this.entries.set(id,entry);c.transitions.set(id,entry);
  }
  demand(this.entries.has(this.source)&&this.entries.size<=100,'transfer_group_scope');
 }
 verifyAdmission(entry){const c=this.core,id=entry.request.id,admission=c.authority.admission(id),simulation=c.authority.simulation(id);demand(entry.admission?admission?.session_id===entry.admission.session_id:!admission&&simulation?.run_id===entry.simulation?.run_id,'transfer_group_session');}
 redirect(entry,ack){
  const c=this.core,{id,token}=entry.request;entry.owner=retiredFreezeOwner(c.authority,id,entry.owner,ack,token);this.verifyAdmission(entry);entry.request={id,epoch:entry.owner.epoch,token:randomUUID()};entry.needsFreeze=true;
 }
 async freeze(){
  const c=this.core;
  for(;;){
   while(c.sharedWorld?.combat.terminal)await c.sharedWorld.combat.terminalIdle();this.add(this.related());
   const groups=new Map();for(const entry of this.entries.values())if(entry.needsFreeze){const key=entry.owner.channel+':'+entry.owner.incarnation,rows=groups.get(key)??[];rows.push(entry);groups.set(key,rows);}
   await Promise.all([...groups.values()].map(async rows=>{
    const endpoint=c.process(rows[0].owner).control,requests=rows.map(e=>e.request),answers=rows.length===1?[await endpoint.request('freeze',requests[0])]:await endpoint.request('freeze_group',{requests});demand(answers.length===rows.length,'transfer_group_ack_count');
    for(const [i,entry]of rows.entries()){
     const ack=answers[i];if(ack.retired){this.redirect(entry,ack);continue;}
     const owner=c.authority.owner(entry.request.id);demand(ack.token===entry.request.token&&ack.epoch===entry.owner.epoch&&ack.channel===entry.owner.channel&&ack.incarnation===entry.owner.incarnation&&owner?.epoch===entry.owner.epoch&&owner.incarnation===entry.owner.incarnation&&owner.sequence===ack.finalSequence,'transfer_group_freeze_ack');
     this.verifyAdmission(entry);entry.ack=ack;entry.needsFreeze=false;
    }
   }));
   while(c.sharedWorld?.combat.terminal)await c.sharedWorld.combat.terminalIdle();
   // A borrowed, already-frozen actor can return through a native guild result
   // while a different channel still drains. Require an explicit old-owner
   // retirement reply; a changed SQLite owner by itself is never sufficient.
   for(const entry of this.entries.values())if(!entry.needsFreeze){const owner=c.authority.owner(entry.request.id);if(owner?.epoch!==entry.owner.epoch||owner.incarnation!==entry.owner.incarnation)this.redirect(entry,await c.process(entry.owner).control.request('freeze',entry.request));}
   this.add(this.related());if([...this.entries.values()].some(e=>e.needsFreeze))continue;
   if(coldSettlementResources(c.database.sqlite,this.source).length){
    demand(c.sharedWorld?.combat,'transfer_shared_world_required');const related=JSON.stringify([...new Set(this.related())].sort());
    this.settlement=await c.sharedWorld.combat.acquireCold(this);
    // An earlier accepted guild/party cast may have borrowed the old freeze
    // while this read waited in the world FIFO. Release before freezing any
    // new or redirected actor; its accepted work may itself need that FIFO.
    const stable=related===JSON.stringify([...new Set(this.related())].sort())&&[...this.entries.values()].every(entry=>{const owner=c.authority.owner(entry.request.id);return owner?.epoch===entry.owner.epoch&&owner.incarnation===entry.owner.incarnation&&owner.sequence===entry.ack.finalSequence;});
    if(!stable){await this.finishSettlement();continue;}
    await c.sharedWorld.combat.checkpointCold(this.settlement,this);
   }
   for(const entry of this.entries.values())entry.phase='frozen';this.phase='frozen';return this.entries.get(this.source);
  }
 }
 relocated(id,owner,request,ack){
  const entry=this.entries.get(id);demand(entry&&ack?.id===id&&ack.token===request.token&&ack.epoch===owner.epoch&&ack.channel===owner.channel&&ack.incarnation===owner.incarnation&&!ack.retired&&ack.finalSequence===owner.sequence,'transfer_import_hold');
  this.verifyAdmission(entry);entry.owner={...owner};entry.request=request;entry.ack=ack;
 }
 async finishSettlement(){if(this.settlement){await this.core.sharedWorld.combat.finishCold(this.settlement,this);this.settlement=null;}}
 async rejectFreeze(error){
  if(this.phase!=='freezing'||this.settlement||!this.core.actorIsolation||!await this.core.actorIsolation.rejectTransitions([...this.entries.values()],error))return false;
  this.core.transferGroups.delete(this);this.phase='released';this.resolve();return true;
 }
 async release(){
  const c=this.core;await this.finishSettlement();this.phase='refreshing';for(const entry of this.entries.values())entry.phase='refreshing';
  await Promise.all([...this.entries.values()].map(async entry=>{const ack=await c.process(entry.owner).control.request('refresh_frozen',entry.request);demand(ack?.id===entry.request.id&&ack.token===entry.request.token&&ack.epoch===entry.owner.epoch&&ack.refreshed,'transfer_group_refresh_ack');}));
  this.phase='releasing';for(const entry of this.entries.values())entry.phase='releasing';
  await Promise.all([...this.entries.values()].map(async entry=>{const ack=await c.process(entry.owner).control.request('resume',entry.request);demand(ack?.token===entry.request.token&&ack.epoch===entry.owner.epoch&&ack.resumed,'transfer_group_resume_ack');}));
  for(const [id,entry]of this.entries){demand(c.transitions.get(id)===entry,'transfer_group_replaced');c.transitions.delete(id);}c.transferGroups.delete(this);this.phase='released';this.resolve();
 }
 fail(error){
  if(this.phase==='unknown'||this.phase==='released')return;this.phase='unknown';for(const entry of this.entries.values())entry.phase='unknown';this.reject(error);this.core.transferGroups.delete(this);if(this.settlement)this.core.sharedWorld.combat.fail(error);
  for(const entry of this.entries.values())this.core.onFault({actor:entry.request.id,incarnation:entry.owner.incarnation,error});
 }
}
