import {demand} from './contract.mjs';

// Read-only parent control. World FIFO ownership must precede this local lane,
// so an earlier accepted terminal cast can finish its all-actor barrier first.
export class ResidentSettlementRead {
 constructor({peer,cycle,lanes,journal,writer,monster,onFatal}){Object.assign(this,{peer,cycle,lanes,journal,writer,monster,onFatal});this.held=null;}
 async freeze({token,cycle,resources}){
  demand(!this.held&&typeof token==='string'&&token.length>=16&&token.length<=160&&cycle===this.cycle()&&Array.isArray(resources)&&resources.length>0&&resources.length<=32&&new Set(resources).size===resources.length&&resources.every(k=>typeof k==='string'&&k.startsWith('monster:')&&k.length>8&&k.length<=240&&(!this.monster(k.slice(8))||this.monster(k.slice(8)).channel===this.peer.channel)),'settlement_read_scope');
  const h={token,cycle,resources:[...resources],lease:null};this.held=h;const keys=['maintenance:settlement',...resources];
  try{
   while(!(h.lease=this.lanes.acquire(keys,token)))await this.lanes.available(keys);
   await this.journal.drain();this.lanes.assert(h.lease);demand(this.held===h&&h.cycle===this.cycle(),'settlement_read_changed');
   return {token,cycle,resources:h.resources,channel:this.peer.channel,incarnation:this.peer.incarnation,sequence:this.writer.sequence};
  }catch(error){if(h.lease?.state==='held')this.lanes.fence(h.lease);this.onFatal(error);throw error;}
 }
 resume({token}){const h=this.held;demand(h?.token===token&&h.cycle===this.cycle(),'settlement_read_fenced');this.lanes.release(h.lease);this.held=null;return {token,cycle:h.cycle,channel:this.peer.channel,incarnation:this.peer.incarnation,resumed:true};}
}
