import {isDeepStrictEqual} from 'node:util';

// Only independent, already-scoped owner rows can be replaced. Membership,
// receipts, guilds, configuration and unknown notifications retain full reload.
const owned = new Set(['players','player_items','player_storage_items','player_pets','player_stones','dungeon_materials','dungeon_wings','solo_daily_entries']);
const quote = s => '"'+s.replaceAll('"','""')+'"';
export class DungeonSnapshot510 {
 constructor(snapshot){
  this.snapshot=snapshot;this.pending=new Map();this.specs=new Map();
  this.version=0;this.appliedVersion=0;
  this.stats={notifications:0,fullBuilds:0,patches:0,patchedRows:0,reuses:0};
 }
 clear(){this.pending.clear();this.appliedVersion=this.version;}
 queue(change){
  this.stats.notifications++;this.version++;
  const s=this.snapshot,table=change.table;
  if(!owned.has(table)||!s.scopePlayerIds)return false;
  const owner=change.owner??(table==='players'?(change.keys?.[0]??change.id):null);
  if(typeof owner!=='string'||!s.scopePlayerIds.has(owner))return false;
  let spec=this.specs.get(table);
  if(!spec){
   const columns=s.source.prepare(`PRAGMA main.table_info(${quote(table)})`).all();
   const keys=columns.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name);
   if(!keys.length)return false;
   const where=keys.map(k=>quote(k)+'=?').join(' AND ');
   spec={keys,read:s.source.prepare(`SELECT * FROM ${quote(table)} WHERE ${where}`),local:s.workspace.sqlite.prepare(`SELECT * FROM ${quote(table)} WHERE ${where}`),remove:s.workspace.sqlite.prepare(`DELETE FROM ${quote(table)} WHERE ${where}`)};
   this.specs.set(table,spec);
  }
  const keys=change.keys??(spec.keys.length===1?[change.id]:null);
  if(!Array.isArray(keys)||keys.length!==spec.keys.length||keys.some(k=>typeof k!=='string'&&typeof k!=='number'))return false;
  this.pending.set(table+'\u001f'+JSON.stringify(keys),{table,owner,keys:[...keys],spec});
  return true;
 }
 apply(){
  const s=this.snapshot,updates=[];
  for(const {table,owner,keys,spec} of this.pending.values()){
   // Read through the exact existing position/combat view. An ACK's durable
   // row cannot replace a newer, uncommitted resident movement generation.
   const row=spec.read.get(...keys),before=spec.local.get(...keys);
   if(table==='players'&&(!row||!before||row.channel!==before.channel||row.account_id!==before.account_id))return false;
   if(row&&(table==='players'?row.id:row.player_id)!==owner)return false;
   if(!isDeepStrictEqual(row,before))updates.push({table,keys,spec,row});
  }
  if(updates.length){
   const w=s.workspace;
   w.sqlite.exec('PRAGMA foreign_keys=OFF; BEGIN');
   try{
    w.refreshing507=true;
    for(const {table,keys,spec,row}of updates){
     spec.remove.run(...keys);
     if(row){const target=w.tables.get(table);target.insert.run(...target.columns.map(c=>row[c]));}
    }
    w.sqlite.exec('COMMIT');
   }catch(error){w.sqlite.exec('ROLLBACK');throw error;}
   finally{w.refreshing507=false;w.sqlite.exec('PRAGMA foreign_keys=ON');}
   this.stats.patches++;this.stats.patchedRows+=updates.length;
  }else this.stats.reuses++;
  this.clear();return true;
 }
}
