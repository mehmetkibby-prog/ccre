// This index never decides whether a row is dirty: snapshot retains the
// original field comparison. It skips only rows sharing the exact same object
// as their durable base. Equal-but-distinct rows remain candidates, including
// after a transient change is reverted, so an in-place mutation cannot hide.
class TrackedMap extends Map {
 constructor(changed,cleared){super();this.changed=changed;this.cleared=cleared;}
 set(id,row){const added=!this.has(id);super.set(id,row);this.changed(id,added,false);return this;}
 delete(id){const removed=super.delete(id);if(removed)this.changed(id,false,true);return removed;}
 clear(){if(!this.size)return;super.clear();this.cleared();}
}

export class CombatCheckpointIndex {
 constructor(kinds){
  this.kinds=kinds;this.rows=new Map();this.base=new Map();this.current=new Map();
  for(const kind of kinds){
   const row={candidates:new Set(),order:new Map(),serial:0};this.rows.set(kind,row);
   row.base=new TrackedMap(id=>this.reconcile(row,id),()=>{for(const id of row.current.keys())this.reconcile(row,id);});
   row.current=new TrackedMap((id,added,removed)=>{
    if(removed)row.order.delete(id);else if(added)row.order.set(id,++row.serial);
    this.reconcile(row,id);
   },()=>{row.candidates.clear();row.order.clear();row.serial=0;});
   this.base.set(kind,row.base);this.current.set(kind,row.current);
  }
 }
 reconcile(row,id){
  const current=row.current.get(id),base=row.base.get(id)??null;
  if(row.current.has(id)&&(current===undefined||current!==base))row.candidates.add(id);
  else row.candidates.delete(id);
 }
 // Known cold paths clear these Maps directly. Their set/delete/clear methods
 // are tracked too. If a caller replaces a Map itself, use the legacy scan.
 owns(base,current){return this.kinds.every(kind=>base.get(kind)===this.rows.get(kind).base&&current.get(kind)===this.rows.get(kind).current);}
 snapshot(kind,same){
  const row=this.rows.get(kind),ids=[...row.candidates].sort((a,b)=>row.order.get(a)-row.order.get(b)),changes=[];
  for(const id of ids){const base=row.base.get(id)??null,current=row.current.get(id);if(!same(kind,base,current))changes.push({base,current});}
  return changes;
 }
}
