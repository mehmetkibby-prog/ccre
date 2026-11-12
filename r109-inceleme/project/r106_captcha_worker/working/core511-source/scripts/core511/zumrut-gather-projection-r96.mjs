import {zumrutNode} from './zumrut-map-r93.mjs';
import {isZumrutActionR93} from './zumrut-actions-r93.mjs';

// Cosmetic projection of the existing writer's committed result. No SQL,
// timer, endpoint, reward or second operation lifecycle lives here. Entries
// are bounded by the channel's subscribed players and discarded on departure.
const worlds=new WeakMap();
const BINDING_FIELDS=Object.freeze(['channel','world_cycle','realtime_scope_version','position_revision','motion_stream_id','motion_sequence','x','y','hp','hp_revision']);
const scalar=row=>Object.fromEntries(BINDING_FIELDS.map(key=>[key,row[key]??null]));
const same=(a,b)=>BINDING_FIELDS.every(key=>a[key]===(b[key]??null));
const interrupted=(player,now)=>player.hp<=0||player.rod_equipped||player.arena_match_id||player.combat_lock_until_ms>now||player.root_until_ms>now||player.stun_until_ms>now;

export function publicZumrutGatherR96(active,player,tool,now){
 if(!active||!player||player.area!=='zumrut'||interrupted(player,now)||!Number.isSafeInteger(player.channel)||player.channel<1||player.channel>4||!Number.isSafeInteger(now))return null;
 const {operationId,kind,nodeId,startedAtMs,finishAtMs}=active,node=zumrutNode(nodeId);
 if(typeof operationId!=='string'||!operationId||operationId.length>80||!['wood','stone'].includes(kind)||!node||node.kind!==(kind==='wood'?'tree':'rock')||tool!==(kind==='wood'?'axe':'pickaxe'))return null;
 if(![startedAtMs,finishAtMs].every(Number.isSafeInteger)||startedAtMs<0||startedAtMs>now||finishAtMs<=now||finishAtMs-startedAtMs<1500||finishAtMs-startedAtMs>10000||!Number.isFinite(player.x)||!Number.isFinite(player.y)||Math.hypot(player.x-node.x,player.y-node.y)>150)return null;
 return Object.freeze({operationId,kind,nodeId,startedAtMs,finishAtMs});
}
function changed(world,id){const sub=world.subscribers.get(id);if(sub){sub.room.revision++;sub.cache=null;sub.privateOwnerCache=null;}}
export function forgetZumrutGatherR96(world,id){
 const rows=worlds.get(world);if(!rows?.delete(id))return false;changed(world,id);return true;
}
export function zumrutGatherForR96(world,id,now){
 const entry=worlds.get(world)?.get(id);if(!entry)return null;
 const player=world.view.player(id),sub=world.subscribers.get(id),tool=sub?.data.zumrutR93?.equippedTool;
 if(!player||!sub||sub.closed||sub.data.area!=='zumrut'||sub.data.channel!==world.state.channel||player.area!=='zumrut'||player.channel!==world.state.channel||interrupted(player,now)||!same(entry.binding,player)||tool!==entry.tool||now<entry.value.startedAtMs||now>=entry.value.finishAtMs){forgetZumrutGatherR96(world,id);return null;}
 return entry.value;
}
export function acceptZumrutGatherCommitR96(world,command,ack,now,connection){
 if(!world||command?.operation!=='native_action'||!isZumrutActionR93(command.payload?.input?.action)||ack?.result?.result?.status!==200)return false;
 const result=ack.result.result.body;
 // A successful competing gather makes any old swing on this node obsolete,
 // even if its owner disconnected before the writer acknowledgement returned.
 const depleted=result?.nodeDepletion,rows=worlds.get(world);
 if(depleted?.channel===world.state.channel&&zumrutNode(depleted.nodeId)&&Number.isSafeInteger(depleted.availableAtMs)&&depleted.availableAtMs>now&&rows){for(const [id,entry]of rows)if(entry.value.nodeId===depleted.nodeId)forgetZumrutGatherR96(world,id);}
 const id=command.playerId;
 if(!world.subscribers.has(id)||connection?.actor!==id||connection.epoch!==command.epoch||!connection.token||connection.token!==command.payload.lootConnection||!result?.zumrut||!Object.hasOwn(result.zumrut,'active'))return false;
 const player=ack.result.players?.find(row=>row.id===id),tool=result.zumrut.equippedTool,value=publicZumrutGatherR96(result.zumrut.active,player,tool,now);
 if(!value||player.channel!==world.state.channel)return forgetZumrutGatherR96(world,id);
 const previous=rows?.get(id),binding=scalar(player);
 if(previous&&JSON.stringify(previous.value)===JSON.stringify(value)&&same(previous.binding,player)&&previous.tool===tool)return false;
 const entries=rows??new Map();if(!rows)worlds.set(world,entries);
 entries.set(id,{value,binding,tool});changed(world,id);return true;
}
