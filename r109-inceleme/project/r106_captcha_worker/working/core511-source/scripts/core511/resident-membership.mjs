// Cold native snapshots, retained only while their actor is owned here. Keep
// the public Maps stable because combat frame readers close over them.
export class ResidentMembership {
 constructor(){this.snapshots=new Map();this.parties=new Map();this.arenas=new Map();this.teams=new Map();}
 hydrate(bundle){
  this.snapshots.set(bundle.player.id,{revision:bundle.revision,party:bundle.party?.id??null,
   members:bundle.partyMembers.map(m=>({player:m.player_id,party:m.party_id,live:m.live_channel511??null})),
   arena:bundle.arena?Object.freeze({...bundle.arena}):null,
   teams:bundle.arenaPlayers.map(p=>({match:p.match_id,player:p.player_id,team:p.team}))});
  this.rebuild();
 }
 forget(id){this.snapshots.delete(id);this.rebuild();}
 rebuild(){
  this.parties.clear();this.arenas.clear();this.teams.clear();
  for(const row of [...this.snapshots.values()].sort((a,b)=>a.revision-b.revision)){
   for(const m of row.members)this.parties.set(m.player,m.party);
   if(row.arena)this.arenas.set(row.arena.id,row.arena);
   for(const p of row.teams)this.teams.set(p.match+':'+p.player,p.team);
  }
  // A resident's own snapshot is authoritative even while a cold group is
  // being refreshed. A peer's older roster must not restore its membership.
  for(const [id,row]of this.snapshots)if(row.party)this.parties.set(id,row.party);else this.parties.delete(id);
 }
}
