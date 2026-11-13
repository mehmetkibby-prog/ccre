import {DEFER_INPUT} from './fixed-loop.mjs';
import {demand,kernelError} from './contract.mjs';

const unavailable=()=>({ok:false,code:'dungeon_read_unavailable_r113',error:'Zindan bilgisi alınamadı. Tekrar dene.'});
// Preserve input order with the existing actor lease, but a menu read can never
// hold combat waiting for writer recovery. Late read replies are discarded.
// At most one outstanding read per actor survives its short UI deadline.
export class DungeonLobbyChannelR113 {
 constructor(dungeon,read,{timeoutMs=250}={}){Object.assign(this,{dungeon,read,timeoutMs});this.inflight=new Map();this.metrics={reads:0,failed:0,timeouts:0};}
 action({id,input}){
  const d=this.dungeon,c=d.channel,command=input.command;
  if(command?.action!=='sync'||Object.keys(command).some(k=>k!=='action')||d.resident.memberships.get(id))return null;
  if(!d.ready([id]))return DEFER_INPUT;
  if(this.inflight.has(id))return {type:'dungeon',...unavailable()};
  const owner=c.owners.get(id),epoch=owner?.epoch;
  demand(owner?.incarnation===c.peer.incarnation&&owner.channel===c.peer.channel,'dungeon_lobby_owner_fenced');
  const lease=c.lanes.acquire(['player:'+id,'dungeon:entry:'+id],d.incarnation);if(!lease)return DEFER_INPUT;
  const token={lease,promise:null};d.pending.set(id,token);this.metrics.reads++;
  let timer;
  const pending=Promise.resolve().then(()=>this.read({actor:id,epoch}));this.inflight.set(id,pending);
  const clear=()=>{if(this.inflight.get(id)===pending)this.inflight.delete(id);};pending.then(clear,clear);
  const read=Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>reject(kernelError('dungeon_lobby_timeout')),this.timeoutMs);})]);
  const complete=async()=>{
   try{
    let answer;
    try{
     answer=await read;
     demand(answer?.version===1&&answer.actor===id&&answer.epoch===epoch&&answer.channel===c.peer.channel&&answer.incarnation===c.peer.incarnation&&answer.body?.run===null,'dungeon_lobby_reply_scope');
    }catch(error){this.metrics.failed++;if(error.code==='dungeon_lobby_timeout')this.metrics.timeouts++;return unavailable();}
    c.lanes.assert(lease);
    demand(c.owners.get(id)===owner&&!d.resident.memberships.get(id),'dungeon_lobby_scope_changed');
    return {...answer.body,notice:d.resident.notices.get(id)?.message};
   }finally{
    clearTimeout(timer);c.lanes.assert(lease);demand(d.pending.get(id)===token,'dungeon_lobby_lease_changed');d.pending.delete(id);c.lanes.release(lease);
   }
  };
  token.promise=c.kernel.durableGroup([id],complete,{replyTo:id,emitReceipt:false,ackResult:value=>({type:'dungeon',...value})});
  return {type:'dungeon'};
 }
}
