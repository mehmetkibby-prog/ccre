// A reader owns a pending-key map, not a reconstructed copy of the entire
// recent combat cache. FIFO worker messages make advancing its cursor safe.
export class CombatProjection {
 constructor(store){this.store=store;this.cursors=new Set();this.expiry=new Map();this.retained=new Map();this.expiryAt=0;this.stats={calls:0,visited:0,rows:0,removed:0,bootstrapRows:0,maxVisited:0,maxMs:0};}
 key(name,id){return name+'\u001e'+id;}
 retain(changes){
  // A shared owner must publish its complete leased monster snapshot, even
  // while its task awaits a durable ACK in another asynchronous context.
  const keys=new Set(changes.map(({name,id})=>this.key(name,id)));
  for(const key of keys)this.retained.set(key,(this.retained.get(key)??0)+1);
  let released=false;
  return ()=>{if(released)return;released=true;for(const key of keys){const count=this.retained.get(key);if(count>1)this.retained.set(key,count-1);else this.retained.delete(key);}};
 }
 changed(changes){
  for(const {name,id} of changes){
   const key=this.key(name,id),e=this.store.tables.get(name)?.records.get(id);
   this.expiry.delete(key);
   if(e){
    // Keep insertion order chronological even if wall time moves backwards.
    this.expiryAt=Math.max(this.expiryAt,this.store.now()+30000);
    this.expiry.set(key,{name,id,e,at:this.expiryAt});
   }
   for(const cursor of this.cursors)cursor.pending.set(key,{name,id});
  }
 }
 createCursor(){
  const cursor={pending:new Map(),known:new Map(),closed:false};
  // Once per new worker; normal reads never enumerate recent/records again.
  for(const [name,t] of this.store.tables)for(const id of t.recent){cursor.pending.set(this.key(name,id),{name,id});this.stats.bootstrapRows++;}
  this.cursors.add(cursor);return cursor;
 }
 closeCursor(cursor){if(!cursor)return;cursor.closed=true;cursor.pending.clear();cursor.known.clear();this.cursors.delete(cursor);}
 expire(){
  const now=this.store.now(),changes=[],started=performance.now();
  // Expiry is bounded and shares the existing read/maintenance cadence. No
  // extra timer, history scan, or unbounded 30-second deletion burst.
  for(let n=0;n<64&&performance.now()-started<2;n++){
   const first=this.expiry.entries().next().value;if(!first||first[1].at>now)break;
   const [key,{name,id,e}]=first;this.expiry.delete(key);
   const t=this.store.tables.get(name);if(t.records.get(id)!==e)continue;
   if(e.dirtyAt||this.retained.has(key)){this.changed([{name,id}]);continue;}
   t.recent.delete(id);t.remove?.run(...e.keys);t.records.delete(id);changes.push({name,id});
  }
  if(changes.length)this.store.publish(changes);
 }
 project(name,e){
  if(e.projected&&e.projected.version===e.version)return e.projected;
  const fields=this.store.tables.get(name).projectionFields;
  const narrow=row=>{if(!row||!fields)return row;const result={};for(const key of fields)result[key]=row[key];return result;};
  return e.projected={base:narrow(e.base),current:narrow(e.current),keys:e.keys,version:e.version};
 }
 delta(cursor){
  if(!this.cursors.has(cursor)||cursor.closed)throw Error('Combat projection cursor is closed');
  const started=performance.now();this.expire();const tables={};let visited=0,rows=0,removed=0;
  for(const [key,{name,id}] of cursor.pending){
   visited++;const e=this.store.tables.get(name)?.records.get(id);
   const visible=e&&(!['monster_participants','boss_participants'].includes(name)||e.dirtyAt);
   if(!visible){if(cursor.known.delete(key)){(tables[name]??={entries:[],removed:[]}).removed.push(id);removed++;}continue;}
   const projected=this.project(name,e);
   if(cursor.known.get(key)!==projected){(tables[name]??={entries:[],removed:[]}).entries.push([id,projected]);cursor.known.set(key,projected);rows++;}
  }
  cursor.pending.clear();this.stats.calls++;this.stats.visited+=visited;this.stats.rows+=rows;this.stats.removed+=removed;
  this.stats.maxVisited=Math.max(this.stats.maxVisited,visited);this.stats.maxMs=Math.max(this.stats.maxMs,performance.now()-started);
  return {version:this.store.version,delta:true,tables};
 }
 // Explicit one-shot compatibility snapshot for diagnostics/tests only.
 snapshot(){
  const cursor=this.createCursor();try{const delta=this.delta(cursor);for(const name of this.store.tables.keys())delta.tables[name]??={entries:[],removed:[]};return {...delta,delta:false};}finally{this.closeCursor(cursor);}
 }
}
