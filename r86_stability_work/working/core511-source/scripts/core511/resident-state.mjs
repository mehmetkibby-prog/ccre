import {SpatialGrid} from './spatial-grid.mjs';
import {demand,validChannel} from './contract.mjs';
import {immutableRow} from './immutable-row.mjs';
const kinds=new Set(['players','monsters','drops','dungeons']);
export class ResidentState {
 constructor(channel) {
  demand(validChannel(channel),'invalid_channel');
  this.channel=channel;this.tables=new Map([...kinds].map(k=>[k,new Map()]));
  this.grids=new Map(['players','monsters','drops'].map(k=>[k,new SpatialGrid()]));
  this.versions=new Map();this.sequence=0;this.dirty=new Map();this.owners=new Map();this.epochs=new Map();
 }
 room(row) { return JSON.stringify([row.cycle,row.channel,row.area,row.instanceId??'']); }
 table(kind) { demand(kinds.has(kind),'invalid_entity_kind');return this.tables.get(kind); }
 read(kind,id) { return this.table(kind).get(id)??null; }
 put(kind,row,metadata=null) {
  demand(row&&typeof row.id==='string'&&row.channel===this.channel,'entity_channel_scope');
  const table=this.table(kind),old=table.get(row.id);
  // Hot rows contain only scalar columns. Derived arrays/maps have their own
  // versioned stores rather than mutable aliases within a row.
  if(metadata)demand(!Object.hasOwn(metadata,'id')&&!Object.hasOwn(metadata,'channel'),'identity_patch_forbidden');
  const next=metadata?{...row,...metadata}:row;
  for(const value of Object.values(next)){
   const type=typeof value;
   demand(value===null||type==='string'||type==='number'||type==='boolean'||type==='undefined','nested_entity_value');
  }
  // A frozen scalar row cannot change through an alias. Keep that identity
  // across the combat overlay and resident store instead of copying it again.
  const stored=immutableRow(next);
  this.grids.get(kind)?.upsert(stored);table.set(row.id,stored);this.touch(kind,stored,old);return stored;
 }
 patch(kind,id,fields) {
  const row=this.read(kind,id);demand(row,'entity_missing');
  demand(!Object.hasOwn(fields,'id')&&!Object.hasOwn(fields,'channel'),'identity_patch_forbidden');
  if(Object.keys(fields).every(k=>Object.is(row[k],fields[k])))return row;
  return this.put(kind,{...row,...fields});
 }
 remove(kind,id) {
  const table=this.table(kind),old=table.get(id);if(!old)return;
  table.delete(id);this.grids.get(kind)?.remove(id);this.touch(kind,null,old);
 }
 touch(kind,row,old) {
  const id=(row??old).id;this.dirty.set(kind+':'+id,{kind,id,row});
  const nextRoom=row&&this.room(row),oldRoom=old&&this.room(old);
  if(nextRoom)this.versions.set(nextRoom,(this.versions.get(nextRoom)??0)+1);
  if(oldRoom&&oldRoom!==nextRoom)this.versions.set(oldRoom,(this.versions.get(oldRoom)??0)+1);
  this.sequence++;
 }
 claim(playerId,epoch) {
  demand(Number.isSafeInteger(epoch)&&epoch>0,'invalid_owner_epoch');
  demand(this.read('players',playerId),'owner_player_missing');
  demand(!this.owners.has(playerId),'owner_still_present');
  demand(epoch>(this.epochs.get(playerId)??0),'owner_epoch_reused');
  this.epochs.set(playerId,epoch);
  this.owners.set(playerId,{epoch,state:'active',pending:0});
 }
 assertOwner(playerId,epoch,{allowDraining=false,allowQuiesced=false}={}) {
  const owner=this.owners.get(playerId);
  demand(owner&&owner.epoch===epoch&&(owner.state==='active'||allowDraining&&owner.state==='draining'||allowQuiesced&&owner.state==='quiesced'),'owner_epoch_fenced');
  return owner;
 }
 quiesce(playerId,epoch){const owner=this.assertOwner(playerId,epoch);demand(owner.pending===0,'owner_not_drained');owner.state='quiesced';this.grids.get('players').remove(playerId);}
 resume(playerId,epoch){const owner=this.assertOwner(playerId,epoch,{allowDraining:true,allowQuiesced:true});demand(owner.pending===0,'owner_not_drained');owner.state='active';this.grids.get('players').upsert(this.read('players',playerId));}
 freeze(playerId,epoch) { this.assertOwner(playerId,epoch,{allowQuiesced:true,allowDraining:true}).state='draining';this.grids.get('players').remove(playerId); }
 release(playerId,epoch) {
  const owner=this.assertOwner(playerId,epoch,{allowDraining:true});
  demand(owner.state==='draining'&&owner.pending===0,'owner_not_drained');
  this.owners.delete(playerId);this.remove('players',playerId);
 }
 changes() { const changes=[...this.dirty.values()];this.dirty.clear();return changes; }
}
