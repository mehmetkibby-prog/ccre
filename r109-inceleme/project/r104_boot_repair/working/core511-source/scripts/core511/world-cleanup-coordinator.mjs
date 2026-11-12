import {randomUUID} from 'node:crypto';
import {CLEANUP_ORDER,CLEANUP_BATCH_SIZE,CLEANUP_MAX_BATCHES} from './world-cleanup.mjs';
import {demand} from './contract.mjs';
export class WorldCleanupCoordinator {
 constructor(world){this.world=world;this.core=world.core;this.channels=world.core.channelSupervisor;this.cursors=new Map();this.held=null;this.running=null;this.core.writer.cleanupCoordinator=this;}
 run(peer,{nowMs,cycle}){
  demand(!this.running&&this.world.row?.peer.incarnation===peer.incarnation&&Number.isSafeInteger(nowMs)&&nowMs>0&&nowMs<=this.core.clock()+5000,'cleanup_request');
  this.running=this.execute(peer,nowMs,cycle).finally(()=>{this.running=null;});return this.running;
 }
 async execute(peer,nowMs,cycle){
  let removed=0;
  for(const table of CLEANUP_ORDER)for(let batch=0;batch<CLEANUP_MAX_BATCHES;batch++){
   const answer=await this.channels.serial(()=>this.world.serial(()=>this.core.serial(()=>this.batch(peer,{table,nowMs,cycle}))));
   if(answer.busy)return {removed,deferred:true};removed+=answer.removed;
   if(answer.count<CLEANUP_BATCH_SIZE)break;
   await new Promise(resolve=>setImmediate(resolve));
  }
  return {removed};
 }
 assertHeld(sql,payload,context){
  const h=this.held;demand(h&&h.token===payload.token&&h.ready&&h.peer.incarnation===context.peer.incarnation&&JSON.stringify(payload.plan)===JSON.stringify(h.plan),'cleanup_writer_fenced');
  demand(sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle===h.cycle,'cleanup_cycle_fenced');
  for(const row of h.rows){const owner=this.core.writer.system.owner(row.peer.channel===0?'world':'channel:'+row.peer.channel,sql);demand(owner?.online===1&&owner.incarnation===row.peer.incarnation&&owner.sequence>=row.ack.sequence&&row.ack.token===h.token,'cleanup_process_fenced');}
  return true;
 }
 async batch(peer,{table,nowMs,cycle}){
  demand(this.world.row?.state==='running'&&this.world.row.peer.incarnation===peer.incarnation&&!this.world.global.held&&!this.held,'cleanup_world_fenced');
  const plan=(await this.core.reader.query('kernel511_cleanup_batch',{table,nowMs,cursor:this.cursors.get(table)??null})).rows;
  if(!plan.rows.length){this.advance(plan);return {count:plan.count,removed:0};}
  const token=randomUUID(),rows=plan.resources.length?[this.world.row,...[...this.core.processes.values()].filter(r=>r.online)].map(({peer,control})=>({peer,control})):[],h={token,cycle,plan,peer,rows,ready:false};this.held=h;
  try{
   await Promise.all(rows.map(async row=>{row.ack=await row.control.request('cleanup_freeze',{token,cycle,resources:plan.resources});}));
   if(rows.some(row=>row.ack.busy)){await Promise.all(rows.filter(row=>!row.ack.busy).map(row=>row.control.request('cleanup_resume',{token,aborted:true})));this.held=null;return {busy:true};}
   for(const row of rows)demand(row.ack.token===token&&row.ack.cycle===cycle&&row.ack.incarnation===row.peer.incarnation&&JSON.stringify(row.ack.resources)===JSON.stringify(plan.resources),'cleanup_freeze_ack');h.ready=true;
   const ack=await this.world.row.control.request('cleanup_execute',{key:'world-cleanup:'+token,kind:'world_cleanup_batch',payload:{token,plan}});demand(ack.key==='world-cleanup:'+token&&ack.result.table===table,'cleanup_commit_ack');
   await Promise.all(rows.map(async row=>{const reply=await row.control.request('cleanup_commit',{token,...ack.result});demand(reply.token===token&&reply.refreshed,'cleanup_refresh_ack');}));
   await Promise.all(rows.map(async row=>{const reply=await row.control.request('cleanup_resume',{token});demand(reply.token===token&&reply.resumed,'cleanup_resume_ack');}));this.held=null;this.advance(plan);return {count:plan.count,removed:ack.result.rows.length};
  }catch(error){this.world.global.held={phase:'unknown',token};this.core.onFault({error,cleanup:true});this.world.global.recover({error});this.held=null;throw error;}
 }
 advance(plan){if(plan.cursor)this.cursors.set(plan.table,plan.cursor);else this.cursors.delete(plan.table);}
}
