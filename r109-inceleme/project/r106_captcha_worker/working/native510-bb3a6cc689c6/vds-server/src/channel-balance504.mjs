import {feature510} from "./features510.mjs";
import {channelCapacity510} from "./channel-capacity510.mjs";
import {feature504} from './features504.mjs';

// Selection is an advisory read. The existing canonical UPDATE/INSERT and
// ownership transfer remain the only admission operation and capacity guard.
export const CHANNEL_COUNTS_SQL504='SELECT channel, COUNT(*) AS count FROM players WHERE channel BETWEEN 1 AND ? AND last_seen >= ? GROUP BY channel';
const channels=[1,2,3];
export function channelOccupancy504(count,capacity=25){return count===0?'empty':count>=capacity?'full':count>=Math.ceil(capacity*2/3)?'crowded':'normal';}
export function leastChannel504(rows){
 const counts=new Map();
 for(const row of rows??[]){const id=Number(row.channel),count=Number(row.count);if(!channels.includes(id)||!Number.isSafeInteger(count)||count<0||counts.has(id))return null;counts.set(id,count);}
 // Missing GROUP BY rows are empty channels, not missing telemetry. This
 // function is only fed a successful direct admission-view query, never IPC.
 let selected=null,best=Infinity;
 for(const channel of feature510("channelBalance")?[2,3,1]:channels){const count=counts.get(channel)??0;if(count<channelCapacity510(channel)&&count<best){best=count;selected=channel;}}
 return selected;
}
export function autoEligible504(player,nowMs,isLab=false){
 if(isLab)return false;
 if(!player)return true;
 // Reconnects, living sessions, death/respawn, instanced/arena and combat
 // locks keep their current channel. No presence/owner/epoch state is altered.
 return (feature510("channelBalance")||Number.isFinite(player.last_seen)&&player.last_seen<Math.floor(nowMs/1000)-30)&&player.hp>0&&
  Number.isFinite(player.respawn_at_ms)&&player.respawn_at_ms<=nowMs&&
  Number.isFinite(player.combat_lock_until_ms)&&player.combat_lock_until_ms<=nowMs&&
  !player.arena_match_id&&['bazaar','forest','frozen','black','ancient','rune','rune_v2','event'].includes(player.area);
}
export async function selectEntry504({database,player,nowMs,requestedChannel,automatic,isLab=false}){
 if(!feature510('channelBalance')&&!feature504('channelBalance')||!automatic||isLab)return requestedChannel;
 // A stale page must not turn a reconnect into a transfer. Return the fresh
 // current channel, not the recommendation that the browser saw earlier.
 if(player&&!autoEligible504(player,nowMs,isLab))return player.channel;
 const rows=await database.prepare(CHANNEL_COUNTS_SQL504).bind(3,Math.floor(nowMs/1000)-30).all();
 return leastChannel504(rows.results)??requestedChannel;
}
export function channelBalanceView504(rows,player,nowMs,isLab=false){
 if(!feature510('channelBalance')&&!feature504('channelBalance'))return {};
 return {balance504:{enabled:true,recommendedChannel:leastChannel504(rows),autoEligible:autoEligible504(player,nowMs,isLab),existingChannel:player?.channel??null}};
}
export function channelOnline504(database,channel,now=Date.now()){
 if(!feature504('channelCounts'))return undefined;
 // One cached, indexed read per existing process health collection, not per
 // admin browser. The same live-player view incorporates pending presence.
 try{
  const count=Number(database.compiled('SELECT COUNT(*) AS count FROM players WHERE channel=? AND last_seen>=?').get(channel,Math.floor(now/1000)-30)?.count);
  if(!Number.isSafeInteger(count)||count<0)return {count:null,capacity:channelCapacity510(channel),sampledAtMs:now,status:'unavailable'};
  return {count,capacity:channelCapacity510(channel),sampledAtMs:now,status:'live'};
 }catch{return {count:null,capacity:channelCapacity510(channel),sampledAtMs:now,status:'unavailable'};}
}
