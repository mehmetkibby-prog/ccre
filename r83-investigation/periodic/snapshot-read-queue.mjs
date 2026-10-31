// Coalesce only already queued actor-world reads, at most four per read-only
// SQLite WAL snapshot. Other messages are FIFO boundaries; replies stay separate.
// Admission, ownership checks, result limits and worker timeouts are unchanged.
export class SnapshotReadQueue {
 constructor({begin,commit,rollback,read,post,turn=()=>new Promise(resolve=>setImmediate(resolve)),clock=()=>performance.now(),batchBudgetMs=8}){
  Object.assign(this,{begin,commit,rollback,read,post,turn,clock,batchBudgetMs});this.queue=[];this.running=null;
 }
 push(message){this.queue.push(message);return this.start();}
 start(){
  if(!this.running)this.running=this.drain().finally(()=>{this.running=null;if(this.queue.length)this.start();});
  return this.running;
 }
 failure(message,error){this.post({id:message.id,ok:false,code:typeof error?.code==='string'?error.code:'read_worker_failed'});}
 async drain(){
  while(this.queue.length){
   await this.turn();
   const group=[this.queue.shift()];
   if(group[0].name==='kernel511_actor_world')while(group.length<4&&this.queue[0]?.name==='kernel511_actor_world')group.push(this.queue.shift());
   if(group.length===1){try{await this.read(group[0]);}catch(error){this.failure(group[0],error);}continue;}
   const replies=[];let opened=false,error=null;
   try{
    this.begin();opened=true;const started=this.clock();
    for(let index=0;index<group.length;index++){
     await this.read(group[index],{insideTransaction:true,post:reply=>replies.push(reply)});
     // A completed actor refresh must not wait behind several more expensive
     // actors merely to share a read transaction. Finish at this complete-read
     // boundary, never inside ownership validation/SQL. Unstarted requests
     // retain FIFO ahead of messages that arrived while the read was running.
     if(index+1<group.length&&this.clock()-started>=this.batchBudgetMs){
      this.queue.unshift(...group.splice(index+1));break;
     }
    }
    this.commit();opened=false;
   }catch(failure){error=failure;if(opened)try{this.rollback();}catch{}}
   if(error)for(const message of group)this.failure(message,error);
   else for(const reply of replies)this.post(reply);
  }
 }
}
