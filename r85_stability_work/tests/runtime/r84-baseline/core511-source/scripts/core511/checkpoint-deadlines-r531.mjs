// First unpersisted mutation per monster, with an independent double buffer for
// each immutable snapshot. A part advances only after its own durable receipt.
export class CheckpointDeadlinesR531 {
 constructor(){this.dirty=new Map();this.captured=new Map();}
 change(id,current,base,now,same){
  const capture=this.captured.get(id);
  if(same(current,base)){this.dirty.delete(id);return;}
  if(!this.dirty.has(id))this.dirty.set(id,now);
  if(capture&&capture.after===null&&!same(current,capture.current))capture.after=now;
 }
 capture(rows,at){for(const {current}of rows)this.captured.set(current.id,{current,at,after:null});}
 acknowledged(rows,current,same){
  for(const pair of rows){const id=pair.current.id,capture=this.captured.get(id);if(capture?.current!==pair.current)continue;
   if(same(current(id),pair.current))this.dirty.delete(id);
   else this.dirty.set(id,capture.after??capture.at);
   this.captured.delete(id);
  }
 }
 cancel(rows){for(const {current}of rows)if(this.captured.get(current.id)?.current===current)this.captured.delete(current.id);}
 forget(id){this.dirty.delete(id);this.captured.delete(id);}
 overdue(id,now,fallback,window){return now-(this.dirty.get(id)??fallback)>=window;}
}
