import {randomUUID} from 'node:crypto';
import {OperationRandom} from './operation-random.mjs';
import {NATIVE_SERVICE_ACTIONS} from './mode-writer.mjs';
import {DEFER_INPUT} from './fixed-loop.mjs';
import {demand} from './contract.mjs';

// Infrequent native mode/economy commands share the very same drain/lease
// boundary as attacks, dungeon entry and the legacy HTTP coordinator.
export class ModeChannel {
 constructor(channel,{footprint}){demand(channel?.kernel&&typeof footprint==='function','mode_channel_dependencies');Object.assign(this,{channel,footprint});this.incarnation=randomUUID();this.serial=0;}
 action({id,input,now,kernel=this.channel.kernel}){
  demand(input.action==='mode'&&Object.hasOwn(NATIVE_SERVICE_ACTIONS,input.kind)&&input.command&&typeof input.command==='object','mode_protocol');
  if(input.kind==='guild_village'&&input.command.action==='revoke'&&this.channel.sharedCombat)return this.channel.sharedCombat.guildRevoke({id,input,now,kernel});
  const footprint=this.footprint(id,input),ids=[...new Set([id,...footprint.players])],channel=this.channel;
  if(ids.some(actor=>{const p=kernel.players.get(actor);return !p||p.barrier||p.suspended||channel.lanes.busy(['player:'+actor]);}))return DEFER_INPUT;
  const lease=channel.lanes.acquire([...ids.map(id=>'player:'+id),...footprint.resources],this.incarnation);if(!lease)return DEFER_INPUT;
  const key='mode:'+this.incarnation+':'+(++this.serial),seed=OperationRandom.seed();
  try{kernel.durableGroup(ids,async()=>{
   try{
    await Promise.all(ids.map(actor=>channel.checkpoints.drain(actor)));await channel.combatCheckpoints.drain();channel.lanes.assert(lease);
    const ack=await channel.writer.submit({actor:id,key,kind:'mode_action',payload:{kind:input.kind,input:input.command,nowMs:now,seed,resources:lease.keys}});
    demand(ack.key===key&&ack.result,'mode_ack_mismatch');await channel.applyCommit(ack.result);
    for(const player of ack.result.players)if(channel.owners.has(player.id))channel.checkpoints.hydrateCommitted(player);
    channel.lanes.release(lease);return ack;
   }catch(error){if(lease.state==='held')channel.lanes.reject(lease,error);throw error;}
  },{replyTo:id,emitReceipt:false,ackResult:ack=>({type:'mode',body:ack.result.result,status:ack.result.status??(ack.result.result.ok===false?409:200),...(ack.result.headers?{headers:ack.result.headers}:{})})});}
  catch(error){if(lease.state==='held')channel.lanes.reject(lease,error);throw error;}
  return {type:'mode'};
 }
}
