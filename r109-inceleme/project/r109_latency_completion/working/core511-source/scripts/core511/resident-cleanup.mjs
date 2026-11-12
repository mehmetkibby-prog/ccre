import {demand} from './contract.mjs';
export class ResidentCleanup {
 constructor({peer,cycle,lanes,journal,writer,attackMemory=null,fishing=null,onFatal}){Object.assign(this,{peer,cycle,lanes,journal,writer,attackMemory,fishing,onFatal});this.held=null;}
 async freeze({token,cycle,resources}){
  demand(!this.held&&typeof token==='string'&&token.length>=16&&cycle===this.cycle()&&Array.isArray(resources)&&resources.every(k=>/^player:|^monster:/.test(k)),'cleanup_resident_scope');
  const lease=this.lanes.acquire(['maintenance:cleanup',...resources],token);if(!lease)return {token,busy:true};this.held={token,cycle,lease,refreshed:false};
  try{await this.journal.drain();this.lanes.assert(lease);return {token,channel:this.peer.channel,incarnation:this.peer.incarnation,cycle,resources,sequence:this.writer.sequence};}
  catch(error){this.unknown(error);throw error;}
 }
 async commit({token,table,rows}){
  const h=this.held;demand(h?.token===token&&!h.refreshed,'cleanup_resident_fenced');
  try{
   while(this.journal.pending)await this.journal.pending;this.lanes.assert(h.lease);
   const kind=table==='monster_participants'?'participants':table==='boss_participants'?'bossParticipants':null;
   if(kind){this.journal.retire(kind,rows);for(const row of rows){const id=JSON.stringify(kind==='participants'?[row.monster_id,row.spawn_round,row.player_id]:[row.boss_round,row.player_id]);this.attackMemory?.[kind].delete(id);}}
   if(table==='fishing_sessions')for(const row of rows){const current=this.fishing?.get(row.player_id);if(current){demand(current.expires_at_ms===row.expires_at_ms,'cleanup_fishing_changed');this.fishing.delete(row.player_id);}}
   h.refreshed=true;return {token,refreshed:true};
  }catch(error){this.unknown(error);throw error;}
 }
 resume({token,aborted=false}){const h=this.held;demand(h?.token===token&&(aborted||h.refreshed),'cleanup_resident_fenced');this.lanes.release(h.lease);this.held=null;return {token,resumed:true};}
 unknown(error){const lease=this.held?.lease;if(lease?.state==='held')this.lanes.fence(lease);this.onFatal(error);}
}
