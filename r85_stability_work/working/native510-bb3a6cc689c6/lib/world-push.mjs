import {diffWorldRowsLinear} from './world-diff-linear.mjs';
import {createWorldFrameAssembler} from './world-push-frame.mjs';
// Browser and native server share the delta application contract. No gameplay
// decisions live here: records have already passed the authoritative projection.
export const WORLD_PUSH_PROTOCOL='world-delta-v1';
export const WORLD_PUSH_REPAIR_MS=45000;
export const WORLD_PUSH_SILENCE_MS=2500;
export const WORLD_ROW_KEYS={inventory:'id',storageItems:'id',shops:'id',listings:'id',chat:'id',regionalMessages:'id',directMessages:'id',stones:'kind',pets:'kind',dungeonMaterials:'kind'};
export const WORLD_ENTITY_KEYS=['players','monsters','drops','combatEvents'];
export function worldPushRoom(data){return JSON.stringify([data.world?.cycle??data.cycle,data.channel,data.area,data.area==='arena'?(data.arenaMatch?.id??''):'']);}
const equal=(a,b)=>a===b||(a!==null&&b!==null&&typeof a==='object'&&typeof b==='object'&&JSON.stringify(a)===JSON.stringify(b));
const rowDiffCache=new WeakMap();
export function diffWorld(previous,next,{rows=false,skipSharedEntities=false,linearDiff=false}={}){
 const keys=rows?[...WORLD_ENTITY_KEYS,...Object.keys(WORLD_ROW_KEYS)]:WORLD_ENTITY_KEYS;
 const entities={};
 for(const key of keys){
  // These three entities may already have a shared room delta. Keep them in
  // keys so they cannot become ordinary fields, without cloning two snapshots
  // and substituting six empty arrays just to exclude their comparisons.
  if(skipSharedEntities&&(key==='players'||key==='monsters'||key==='combatEvents'))continue;
  if(previous[key]===next[key])continue;
  if(Array.isArray(previous[key])&&Array.isArray(next[key])&&previous[key].length===0&&next[key].length===0)continue;
  const idKey=WORLD_ROW_KEYS[key]??'id';
  // Immutable shared room/list arrays have the same before/after identity for
  // many recipients. Compare once; WeakMaps retain neither historical array.
  let cache;
  if(Array.isArray(previous[key])&&Array.isArray(next[key])){
   let after=rowDiffCache.get(previous[key]);if(!after)rowDiffCache.set(previous[key],after=new WeakMap());
   cache=after.get(next[key]);if(!cache)after.set(next[key],cache=new Map());
   if(cache.has(idKey)){const change=cache.get(idKey);if(change)entities[key]=change;continue;}
  }
  if(linearDiff){const change=diffWorldRowsLinear(previous[key],next[key],idKey,equal);if(change!==undefined){if(change)entities[key]=change;cache?.set(idKey,change);continue;}}
  const before=new Map((previous[key]??[]).map(row=>[String(row[idKey]),row]));const upsert=[],remove=[];
  for(const row of next[key]??[]){const old=before.get(String(row[idKey]));before.delete(String(row[idKey]));if(old===row)continue;if(!old){upsert.push(row);continue;}const patch={[idKey]:row[idKey]};let changed=false;
   for(const field of Object.keys(row))if(!equal(old[field],row[field])){patch[field]=row[field];changed=true;}
   if(changed)upsert.push(patch);
  }
  for(const row of before.values())remove.push(row[idKey]);
  const expected=(next[key]??[]).map(row=>row[idKey]);
  const removed=new Set(remove.map(String)),existing=new Set((previous[key]??[]).map(row=>String(row[idKey])));
  const applied=(previous[key]??[]).filter(row=>!removed.has(String(row[idKey]))).map(row=>row[idKey]);
  for(const row of upsert)if(!existing.has(String(row[idKey])))applied.push(row[idKey]);
  const reordered=expected.length!==applied.length||expected.some((id,index)=>id!==applied[index]);
  const change=upsert.length||remove.length||reordered?{upsert,remove,...(reordered?{order:expected}:{})}:null;
  if(change)entities[key]=change;cache?.set(idKey,change);
 }
 const fields={};
 if(linearDiff){for(const key of Object.keys(next)){const value=next[key];if(!keys.includes(key)&&key!=='worldPush'&&key!=='snapshotAtMs'&&key!=='serverTime'&&!equal(previous[key],value))fields[key]=value;}}
 else for(const [key,value]of Object.entries(next))if(!keys.includes(key)&&!['worldPush','snapshotAtMs','serverTime'].includes(key)&&!equal(previous[key],value))fields[key]=value;
 return {entities,fields};
}
export function applyWorldDelta(previous,delta){
 const next={...previous,...delta.fields,serverTime:delta.serverTime,snapshotAtMs:delta.snapshotAtMs};
 for(const [key,change]of Object.entries(delta.entities??{})){
  if(!WORLD_ENTITY_KEYS.includes(key)&&!Object.hasOwn(WORLD_ROW_KEYS,key))throw Error('Unknown world entity');
  const idKey=WORLD_ROW_KEYS[key]??'id';
  const rows=new Map((previous[key]??[]).map(row=>[String(row[idKey]),row]));
  for(const id of change.remove??[])rows.delete(String(id));
  for(const patch of change.upsert??[])rows.set(String(patch[idKey]),{...rows.get(String(patch[idKey])),...patch});
  next[key]=change.order?change.order.map(id=>rows.get(String(id))).filter(Boolean):[...rows.values()];
 }
 return next;
}
export function createWorldPushClient({now=()=>performance.now(),onGap=()=>{}}={}){
 let cursor=null,lastAt=-Infinity,repairing=false,supported=false,buffer=[],state=null;
 const frames=createWorldFrameAssembler();
 const gap=()=>{frames.clear();if(!repairing){repairing=true;onGap();}};
 return {
  welcome(protocol){supported=protocol===WORLD_PUSH_PROTOCOL;cursor=null;lastAt=-Infinity;repairing=false;buffer=[];state=null;frames.clear();},
  disconnected(){supported=false;cursor=null;lastAt=-Infinity;repairing=false;buffer=[];state=null;frames.clear();},
  supported(){return supported;},
  active(){return supported&&!!cursor&&!repairing&&now()-lastAt<WORLD_PUSH_SILENCE_MS;},
  snapshot(data){
   const p=data?.worldPush;if(!supported||p?.protocol!==WORLD_PUSH_PROTOCOL||!p.enabled){cursor=null;repairing=false;buffer=[];state=null;frames.clear();return data;}
   frames.clear();cursor={epoch:p.epoch,room:p.room,seq:p.seq};lastAt=now();repairing=false;
   for(const message of buffer.sort((a,b)=>a.seq-b.seq)){
    if(message.epoch!==cursor.epoch||message.room!==cursor.room||message.seq<=cursor.seq)continue;
    if(message.seq!==cursor.seq+1){gap();break;}
    try{const complete=frames.accept(message);if(complete)data=applyWorldDelta(data,complete);}catch{gap();break;}cursor.seq=message.seq;
   }buffer=[];state=data;return data;
  },
  receive(message,current){
   if(!supported||!['world_delta','world_reset'].includes(message?.type)||message.protocol!==WORLD_PUSH_PROTOCOL)return null;
   if(message.type==='world_reset'){gap();return null;}
   if(cursor&&message.epoch===cursor.epoch&&message.room===cursor.room&&message.seq<=cursor.seq)return null;
   if(repairing||!cursor||message.epoch!==cursor.epoch||message.room!==cursor.room||message.seq!==cursor.seq+1){
    if(buffer.length<64)buffer.push(message);else buffer=[];gap();return null;
   }
   cursor.seq=message.seq;lastAt=now();try{const complete=frames.accept(message);if(!complete)return null;state=applyWorldDelta(state??current,complete);return state;}catch{gap();return null;}
  },
  needsSnapshot(){if(!repairing){repairing=true;return true;}return false;},
  failed(){repairing=false;cursor=null;buffer=[];state=null;frames.clear();},
 };
}
