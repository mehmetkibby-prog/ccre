import {pveEntries489} from './pve-multi489.mjs';
// Private IPC snapshots: never returned to a client or a realtime room.
export const statementFrame = s => ({sql:s.sql,params:s.params});
export function captureCombatFrame(store, guard, plans=[], playerId=guard?.params[3]) {
 const selected=new Map();
 const add=(name,keys)=>{const id=keys.join('\u001f');selected.set(name+'\u001e'+id,{name,id,keys});};
 if(playerId){store.syncEntity('players',playerId);store.syncEntity('pve_engagements',playerId);add('players',[playerId]);add('pve_engagements',[playerId]);
  for(const entry of pveEntries489(store.entry('pve_engagements',playerId)?.current)){store.syncEntity('monsters',entry.monster_id);add('monsters',[entry.monster_id]);}}
 for(const plan of plans){store.syncEntity('monsters',plan.target.id);add('monsters',[plan.target.id]);
  if(playerId)for(const [name,keys]of [['monster_participants',[plan.target.id,plan.target.spawn_round,playerId]],['boss_participants',[plan.target.spawn_round,playerId]]]){store.syncParticipant(name,keys);add(name,keys);}}
 const refs=[...selected.values()].map(row=>{const e=store.entry(row.name,row.id);return {...row,e,current:e?.current,generation:e?.generation};});
 return {refs,rows:refs.map(({name,id,keys,e})=>({name,id,keys,entry:e?{...e}:null}))};
}
export function combatFrameStillCurrent(store,refs){
 return refs.every(({name,id,e,current,generation})=>{const next=store.entry(name,id);if(next!==e||next?.generation!==generation)return false;
  if(next?.current===current)return true;
  if(!next?.current||!current)return next?.current===current;
  return store.tables.get(name).spec.columns.every(k=>next.current[k]===current[k]);});
}
export function importCombatFrame(store,rows){
 // Discard the preceding job's private working set. Historical tables stay on
 // the read-only connection, queried by primary key by the original engine.
 for(const t of store.tables.values()){for(const e of t.records.values())t.remove.run(...e.keys);t.records.clear();t.recent.clear();}
 store.dirty.clear();store.pendingByMonster.clear();store.positionVersion=-1;
 for(const {name,id,entry}of rows){if(!entry)continue;const t=store.tables.get(name);t.records.set(id,entry);t.recent.add(id);
  if(entry.current)t.put.run(...t.spec.columns.map(k=>entry.current[k]));
  if(entry.dirtyAt){store.dirty.set(name+'\u001e'+id,{name,id,e:entry});if(name==='monster_participants')store.indexPending(id,entry);}}
}
export function applyCombatChanges(store,changes){
 const published=[];
 for(const {name,id,keys,current,base=null}of changes){const t=store.tables.get(name),old=t.records.get(id);
  const e=old??{base,keys,generation:0,written:0};e.current=current;e.generation++;e.dirtyAt??=store.now();(e.pending??=[]).push([e.generation,store.now()]);e.changedAt=store.now();e.version=++store.serial;
  t.records.set(id,e);t.recent.add(id);if(current)t.put.run(...t.spec.columns.map(k=>current[k]));else t.remove.run(...keys);
  store.dirty.set(name+'\u001e'+id,{name,id,e});if(name==='monster_participants')store.indexPending(id,e);published.push({name,id});
 }
 if(published.length)store.publish(published);
}
export function applyPositionChange(store,id,current){
 const e=store.entries.get(id);e.current=current;e.generation++;e.dirtyAt??=store.now();(e.pending??=[]).push([e.generation,store.now()]);
 store.dirty.add(id);store.recent.add(id);store.version++;
 const pending=store.pendingWrites.get(id);store.pendingWrites.set(id,{entry:e,generation:e.generation,at:pending?.at??store.now(),warnedAt:pending?.warnedAt});store.onChanged?.(id);
}
