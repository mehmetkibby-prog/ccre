// Resident position membership belongs to the already-authoritative entry.
// Do not keep a second, lifetime-sized Set of player IDs just to discover edits.
// This marker is not projected, persisted, or part of the movement protocol.
const recentEntry = Symbol('resident-position-recent');
export const RESIDENT_POSITION_PENDING_LIMIT = 512;

class PositionChangeCursor {
  constructor(owner) { this.owner=owner; this.pending=new Set(); this.full=true; }
  changed(id) {
    if(this.full)return;
    this.pending.add(id);
    if(this.pending.size>RESIDENT_POSITION_PENDING_LIMIT)this.invalidate();
  }
  invalidate() { this.pending.clear(); this.full=true; }
  keys() { return this.full?this.owner.values():this.pending.values(); }
  applied() { this.pending.clear(); this.full=false; }
  close() { this.owner.cursors.delete(this);this.pending.clear(); }
}

// Legacy/nonresident projection pruning keeps its original Set semantics.
// Resident membership survives any elapsed time: presence SQL supports captured
// cutoffs and 45-second community queries, and durable last_seen can move back.
export class PositionRecentSet extends Set {
  constructor(store) { super(); this.store=store; this.cursors=new Set(); this.residentInitialized=false; }
  resident() {
    if(!this.store.resident)return false;
    if(!this.residentInitialized){
      for(const id of super.values()){const entry=this.store.entries.get(id);if(entry)entry[recentEntry]=true;}
      super.clear();this.residentInitialized=true;
    }
    return true;
  }
  add(id) {
    if(!this.resident()){super.add(id);return this;}
    const entry=this.store.entries.get(id);
    if(entry)entry[recentEntry]=true;
    for(const cursor of this.cursors)cursor.changed(id);
    return this;
  }
  delete(id) {
    if(!this.resident())return super.delete(id);
    const entry=this.store.entries.get(id),present=Boolean(entry?.[recentEntry]);
    if(entry)delete entry[recentEntry];
    // A removal is still delivered when entries.delete preceded recent.delete.
    for(const cursor of this.cursors)cursor.changed(id);
    return present;
  }
  has(id) { return this.resident()?Boolean(this.store.entries.get(id)?.[recentEntry]):super.has(id); }
  *values() {
    if(!this.resident()){yield*super.values();return;}
    for(const [id,entry]of this.store.entries)if(entry[recentEntry])yield id;
  }
  keys() { return this.values(); }
  [Symbol.iterator]() { return this.values(); }
  *entries() { for(const id of this.values())yield [id,id]; }
  forEach(callback,thisArg) { for(const id of this.values())callback.call(thisArg,id,id,this); }
  get size() { if(!this.resident())return super.size;let n=0;for(const id of this.values())n++;return n; }
  clear() {
    if(!this.resident()){super.clear();return;}
    for(const entry of this.store.entries.values())delete entry[recentEntry];
    for(const cursor of this.cursors)cursor.invalidate();
  }
  createCursor() {
    if(!this.resident())return null;
    const cursor=new PositionChangeCursor(this);this.cursors.add(cursor);return cursor;
  }
}

// One resident SQLite connection owns this index. Keep every indexed candidate
// needed for exact SQL semantics; bound JS caches and synchronize only edits.
// No TTL, no new timer, no durable write, and no dirty/in-flight entry eviction.
export function createResidentPresenceRefresh(database,store,{prepare,exec,put,remove}) {
  const cursor=store.recent.createCursor(),values=new Map();
  if(!cursor)throw Error('Resident position cursor required');
  const clear=prepare("DELETE FROM temp.col_memory_presence WHERE source='position'");
  let version=-1,transactionDirty=false;
  const invalidate=()=>{cursor.invalidate();values.clear();version=-1;};
  const cache=(id,seen)=>{
    values.delete(id);values.set(id,seen);
    if(values.size>RESIDENT_POSITION_PENDING_LIMIT)values.delete(values.keys().next().value);
  };
  // A read-only durable connection can still change TEMP tables. If a caller
  // rolls those writes back, its next refresh must reconstruct the TEMP index.
  database.exec=sql=>{
    let result;
    try{result=exec(sql);}catch(error){
      if(transactionDirty&&!database.isTransaction){invalidate();transactionDirty=false;}
      throw error;
    }
    if(transactionDirty&&/^\s*ROLLBACK\b/i.test(sql))invalidate();
    if(!database.isTransaction)transactionDirty=false;
    return result;
  };
  const close=database.close.bind(database);
  database.close=()=>{const result=close();cursor.close();values.clear();return result;};
  return ()=>{
    // SQLite can automatically roll back a transaction on a statement error;
    // raw transaction helpers may also bypass the public exec wrapper.
    if(transactionDirty&&!database.isTransaction){invalidate();transactionDirty=false;}
    if(version===store.version&&!cursor.full&&!cursor.pending.size)return;
    try{
      if(cursor.full){if(database.isTransaction)transactionDirty=true;clear.run();values.clear();}
      for(const id of cursor.keys()){
        const entry=store.entries.get(id);
        if(entry&&store.recent.has(id)){
          const seen=Math.floor(entry.current.movement_checked_at_ms/1000);
          if(values.get(id)!==seen){if(database.isTransaction)transactionDirty=true;put.run(id,seen);cache(id,seen);}
        }else{
          if(database.isTransaction)transactionDirty=true;
          remove.run(id);values.delete(id);
        }
      }
      cursor.applied();version=store.version;
    }catch(error){invalidate();throw error;}
  };
}
