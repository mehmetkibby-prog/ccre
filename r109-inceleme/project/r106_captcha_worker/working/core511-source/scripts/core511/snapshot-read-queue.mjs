// Coalesce only already queued actor-world reads, at most four per read-only
// SQLite WAL snapshot. Other messages are FIFO boundaries; replies stay separate.
// Admission, ownership checks, result limits and worker timeouts are unchanged.
export class SnapshotReadQueue {
 constructor({begin,commit,rollback,read,post,turn=()=>new Promise(resolve=>setImmediate(resolve))}){
  Object.assign(this,{begin,commit,rollback,read,post,turn});this.queue=[];this.running=null;
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
    this.begin();opened=true;
    for(const message of group)await this.read(message,{insideTransaction:true,post:reply=>replies.push(reply)});
    this.commit();opened=false;
   }catch(failure){error=failure;if(opened)try{this.rollback();}catch{}}
   if(error)for(const message of group)this.failure(message,error);
   else for(const reply of replies)this.post(reply);
  }
 }
}
