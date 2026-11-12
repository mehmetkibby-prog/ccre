// A resource-planning hint, never reward authority. Respawn evicts old combat
// participants; delayed claims still need their actors in the local lease.
// Unknown/expired/overflowed histories use the existing shared path. The writer
// still checks current DB contributors and party rosters before executing.
export class ClaimHistoryR51 {
 constructor({clock=Date.now,limit=4096,ttl=120000}={}){Object.assign(this,{clock,limit,ttl});this.rows=new Map();}
 remember(row){
  const key=JSON.stringify([row.monster_id,row.spawn_round]),now=this.clock();let entry=this.rows.get(key);
  if(!entry){while(this.rows.size>=this.limit)this.rows.delete(this.rows.keys().next().value);this.rows.set(key,entry={actors:new Set(),at:now,complete:true});}
  if(now-entry.at>this.ttl){entry.complete=false;return;}
  if(entry.actors.size>=100&&!entry.actors.has(row.player_id)){entry.complete=false;return;}
  entry.actors.add(row.player_id);
 }
 get(id,round){const key=JSON.stringify([id,round]),entry=this.rows.get(key);if(!entry)return null;if(this.clock()-entry.at>this.ttl){this.rows.delete(key);return null;}return entry.complete?[...entry.actors]:null;}
}
