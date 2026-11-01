import {r40Options,BAG_EQUIPMENT_LIMIT} from './r40-options.mjs';
import {BAG_EQUIPMENT_KINDS,bagFullBody} from './bag-limit.mjs';
import {groundLootExpired,groundLootDeadlineMs} from './ground-loot-expiry.mjs';

export const bagCollectGuardEnabled=r40Options.bagLimit&&process.env.CORE511_BAG_COLLECT_GUARD!=='0';
const kinds=new Set(BAG_EQUIPMENT_KINDS),MAX_ACTORS=128,MAX_ROWS=512,MAX_REJECTIONS=64,BACKOFF_MS=10000;
const sameRow=(a,b)=>a==null&&b==null||!!a&&!!b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>Object.is(a[key],b[key]));

// The projection already owns these rows. Cache only their identities and a
// bounded index; a changed inventory or scope immediately retires rejections.
// Unknown/truncated images retain the authoritative writer fallback.
export class BagCollectGuard {
 constructor(runtime){this.runtime=runtime;this.actors=new Map();this.metrics={rejected:0,backoff:0,rollbackRefreshes:0,inventoryRows:0,dropRows:0};}
 forget(id){this.actors.delete(id);}
 snapshot(id){
  const r=this.runtime,c=r.channel,owner=c.owners.get(id),player=c.view.player(id),data=r.world?.subscribers.get(id)?.data;
  if(!owner||!player||!data||data.area!==player.area||data.channel!==player.channel||!Array.isArray(data.inventory)||!Array.isArray(data.drops))return null;
  let entry=this.actors.get(id);
  if(entry&&entry.epoch===owner.epoch&&entry.scope===player.realtime_scope_version&&entry.area===player.area&&entry.channel===player.channel&&entry.inventory===data.inventory&&entry.drops===data.drops)return entry;
  let count=0;
  for(let i=0;i<Math.min(MAX_ROWS,data.inventory.length);i++){this.metrics.inventoryRows++;const item=data.inventory[i];if(item?.equipped===0&&kinds.has(item.kind)&&++count>=BAG_EQUIPMENT_LIMIT)break;}
  const drops=new Map();for(let i=0;i<Math.min(MAX_ROWS,data.drops.length);i++){this.metrics.dropRows++;const drop=data.drops[i];if(drop?.owner_id===id&&typeof drop.id==='string')drops.set(drop.id,drop);}
  entry={epoch:owner.epoch,scope:player.realtime_scope_version,area:player.area,channel:player.channel,inventory:data.inventory,drops:data.drops,full:count>=BAG_EQUIPMENT_LIMIT,index:drops,rejections:new Map()};
  this.actors.delete(id);this.actors.set(id,entry);if(this.actors.size>MAX_ACTORS)this.actors.delete(this.actors.keys().next().value);return entry;
 }
 remember(entry,drop,now){
  entry.rejections.delete(drop.id);entry.rejections.set(drop.id,{drop,until:Math.min(now+BACKOFF_MS,groundLootDeadlineMs(drop.expires_at))});
  if(entry.rejections.size>MAX_REJECTIONS)entry.rejections.delete(entry.rejections.keys().next().value);
 }
 response(entry,retryAfterMs){return {type:'action',status:409,body:{...bagFullBody(),...(entry.full?{bagCount:BAG_EQUIPMENT_LIMIT}:{}),retryAfterMs}};}
 check({id,input,now}){
  if(!bagCollectGuardEnabled||input?.action!=='collect'||typeof input.targetId!=='string')return null;
  const entry=this.snapshot(id);if(!entry)return null;
  const prior=entry.rejections.get(input.targetId);
  if(prior){if(now<prior.until&&!groundLootExpired(prior.drop.expires_at,Math.floor(now/1000))){this.metrics.rejected++;this.metrics.backoff++;return this.response(entry,prior.until-now);}entry.rejections.delete(input.targetId);}
  const drop=entry.index.get(input.targetId);
  if(!entry.full||!drop||!kinds.has(drop.kind)||groundLootExpired(drop.expires_at,Math.floor(now/1000)))return null;
  this.remember(entry,drop,now);this.metrics.rejected++;return this.response(entry,Math.min(BACKOFF_MS,groundLootDeadlineMs(drop.expires_at)-now));
 }
 committed(result,context){
  if(!bagCollectGuardEnabled||context?.input?.action!=='collect'||result.result?.status!==409||result.result.body?.code!=='bag_full')return false;
  // CommandFailureScope publishes this shape only after rolling back the
  // complete owned command. Do not generalize this to other negative results.
  const id=context.id,refresh=result.sharedRefresh,row=result.players?.[0],c=this.runtime.channel,live=c.view.player(id);
  if(refresh?.version!==1||refresh.all!==false||refresh.actors?.length!==0||refresh.tables?.length!==0||result.players?.length!==1||row?.id!==id||result.player?.id!==id||!live||!['events','monsters','community','participants','bossParticipants'].every(key=>Array.isArray(result[key])&&result[key].length===0)||result.mistLoot!==undefined||result.encounters?.length!==1||result.encounters[0][0]!==id)return false;
  if(!sameRow(result.player,row)||!sameRow(result.encounters[0][1],c.view.engagements.get(id))||!sameRow(result.fishing,c.fishing.get(id)))return false;
  if(Object.keys(row).some(key=>key!=='last_seen'&&!Object.is(row[key],live[key])))return false;
  const entry=this.snapshot(id),drop=result.drop,now=this.runtime.clock();
  if(entry&&drop?.id===context.input.targetId&&drop.owner_id===id&&kinds.has(drop.kind)&&!groundLootExpired(drop.expires_at,Math.floor(now/1000)))this.remember(entry,drop,now);
  this.metrics.rollbackRefreshes++;return true;
 }
}
