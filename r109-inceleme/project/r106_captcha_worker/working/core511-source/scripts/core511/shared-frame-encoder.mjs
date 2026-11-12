import {eventWireCacheR531} from './r531-options.mjs';
// Reuse only authoritative PUBLIC projection nodes within ONE synchronous
// tick. Private owner rows, results and other envelopes always serialize fresh.
// No audience selection, payload omission or protocol change happens here.
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value))&&!Object.hasOwn(value,'toJSON');
export class SharedFrameEncoder {
 constructor(){this.shared=new WeakSet();this.cache=new Map();this.token=null;this.metrics={prepared:0,reused:0};}
 begin(token){if(this.token===token)return;this.token=token;this.cache.clear();}
 prepare(common,delta){
  for(const node of [common.monsters,common.combatEvents,...Object.values(delta?.entities??{})])if(node&&typeof node==='object')this.shared.add(node);
  for(const row of common.players??[])this.shared.add(row);
  for(const row of delta?.entities?.players?.upsert??[])this.shared.add(row);
 }
 // Motion events are validated, frozen public values. Recipient arrays are
 // never cached: native room/visibility selection still runs for each viewer.
 prepareEvents(rows){if(eventWireCacheR531)for(const row of rows)if(row&&Object.isFrozen(row))this.shared.add(row);}
 prepareMotions(rows){for(const row of rows)this.shared.add(row);}
 value(value){
  if(value&&typeof value==='object'&&this.shared.has(value)){
   if(this.cache.has(value)){this.metrics.reused++;return this.cache.get(value);}
   const text=JSON.stringify(value);this.cache.set(value,text);this.metrics.prepared++;return text;
  }return JSON.stringify(value);
 }
 object(value,encode=(key,item)=>this.value(item)){
  if(!plain(value))return this.value(value);
  const parts=[];for(const key of Object.keys(value)){const text=encode(key,value[key]);if(text!==undefined)parts.push(JSON.stringify(key)+':'+text);}return '{'+parts.join(',')+'}';
 }
 rows(rows){
  if(!Array.isArray(rows)||!rows.some(row=>row&&typeof row==='object'&&this.shared.has(row)))return this.value(rows);
  // Native JSON array handling: undefined/function/symbol entries are null.
  const parts=[];for(const row of rows)parts.push(this.value(row)??'null');return '['+parts.join(',')+']';
 }
 change(change){if(change&&this.shared.has(change))return this.value(change);return this.object(change,(key,value)=>key==='upsert'?this.rows(value):this.value(value));}
 world(world){
  return this.object(world,(key,value)=>{
   if(key==='data'&&world.type==='world_snapshot')return this.object(value,(field,item)=>field==='players'?this.rows(item):this.value(item));
   if(key==='entities'&&world.type==='world_delta')return this.object(value,(_entity,change)=>this.change(change));
   return this.value(value);
  });
 }
 encode(packet){if(!plain(packet)||packet.type!=='frame'||!['world_snapshot','world_delta'].includes(packet.world?.type)&&!Array.isArray(packet.motions)&&!(eventWireCacheR531&&Array.isArray(packet.events)))return JSON.stringify(packet);return this.object(packet,(key,value)=>key==='world'?this.world(value):key==='motions'||eventWireCacheR531&&key==='events'?this.rows(value):this.value(value));}
}
