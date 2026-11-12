// A lost WebSocket ACK may fall back to HTTP. Both transports share this
// bounded, scope-bound single flight after fresh session authorization.
export class CombatRequests{
 constructor({now=Date.now,limit=8192}={}){this.now=now;this.limit=limit;this.entries=new Map();this.expiry=[];}
 rememberExpiry(id,row){
  // Settlements may arrive out of order, and wall time may move backwards.
  // Index the original admission expiry; never extend a retry's lifetime.
  const heap=this.expiry,item={id,row};let index=heap.length;heap.push(item);
  while(index){const parent=(index-1)>>1;if(heap[parent].row.expires<=row.expires)break;heap[index]=heap[parent];index=parent;}heap[index]=item;
 }
 expire(now){
  const heap=this.expiry;
  while(heap.length&&heap[0].row.expires<=now){
   const first=heap[0],last=heap.pop();
   if(heap.length){
    let index=0;
    while(index*2+1<heap.length){let child=index*2+1;if(child+1<heap.length&&heap[child+1].row.expires<heap[child].row.expires)child++;if(last.row.expires<=heap[child].row.expires)break;heap[index]=heap[child];index=child;}heap[index]=last;
   }
   if(this.entries.get(first.id)===first.row)this.entries.delete(first.id);
  }
 }
 async run(key,execute){
  const now=this.now();this.expire(now);
  const existing=this.entries.get(key);if(existing)return (await existing.promise).clone();
  if(this.entries.size>=this.limit)return Response.json({error:'Saldırı kuyruğu dolu.',code:'combat_busy'},{status:429});
  const row={expires:now+30000,settled:false};this.entries.set(key,row);
  row.promise=Promise.resolve().then(execute).then(response=>{row.settled=true;this.rememberExpiry(key,row);return response;},error=>{this.entries.delete(key);throw error;});
  return (await row.promise).clone();
 }
}
