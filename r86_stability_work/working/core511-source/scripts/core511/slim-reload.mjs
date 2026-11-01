import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {r44Options} from './r44-options.mjs';
import {r35Options} from './r35-options.mjs';
import {coldRowCopyR51} from './r51-options.mjs';
import {flatSqlRowsR51,copyFlatSqlRowsR51} from './cold-row-copy-r51.mjs';
const mode=r35Options.slimReload;
const clone=value=>structuredClone(value);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scope=b=>JSON.stringify([b.actor,b.owner.channel,b.owner.incarnation,b.owner.epoch,b.player.area,b.player.arena_match_id??'',b.world.cycle]);
const entityDelta=r44Options.slimEntityDelta;
const parts=b=>[['settings',b.settings],['profiles',b.profiles],
 ...(entityDelta?[['dungeon.settings',b.dungeon?.settings],['adventure.towerInfo.config',b.adventure?.towerInfo?.config]]:[]),
 ...Object.entries(b.projection?.data??{}).flatMap(([key,value])=>entityDelta&&key==='players'&&Array.isArray(value)
  ?value.flatMap((row,i)=>row==null?[]:[['projection.data.players.'+i,row]])
  :[['projection.data.'+key,value]])].filter(([,value])=>value!==undefined);
function container(b){
 const out={...b,projection:b.projection?{...b.projection,data:{...b.projection.data}}:undefined};
 if(!b.projection)delete out.projection;
 if(entityDelta){
  if(Array.isArray(b.projection?.data?.players))out.projection.data.players=[...b.projection.data.players];
  if(b.dungeon)out.dungeon={...b.dungeon};
  if(b.adventure?.towerInfo)out.adventure={...b.adventure,towerInfo:{...b.adventure.towerInfo}};
 }
 return out;
}
function set(b,key,value){
 if(entityDelta&&key.startsWith('projection.data.players.'))b.projection.data.players[Number(key.slice(24))]=value;
 else if(entityDelta&&key==='dungeon.settings')b.dungeon.settings=value;
 else if(entityDelta&&key==='adventure.towerInfo.config')b.adventure.towerInfo.config=value;
 else if(key.startsWith('projection.data.'))b.projection.data[key.slice(16)]=value;else b[key]=value;
}
function remove(b,key){
 if(entityDelta&&key.startsWith('projection.data.players.'))b.projection.data.players[Number(key.slice(24))]=null;
 else if(entityDelta&&key==='dungeon.settings')delete b.dungeon.settings;
 else if(entityDelta&&key==='adventure.towerInfo.config')delete b.adventure.towerInfo.config;
 else if(key.startsWith('projection.data.'))delete b.projection.data[key.slice(16)];else delete b[key];
}
export function encodeSlimBundle(bundle,hint){
 if(mode==='0')return bundle;
 const revisions=Object.fromEntries(parts(bundle).map(([key,value])=>[key,digest(value)]));
 const meta={version:1,scope:scope(bundle),revision:bundle.revision,revisions,omitted:[]};
 const full={...bundle,slim:meta};
 if(!hint||hint.version!==1||hint.scope!==meta.scope||!Number.isSafeInteger(hint.revision)||hint.revision>bundle.revision)return full;
 const delta={...container(full),slim:{...meta,omitted:[]}};
 if(!bundle.projection)delete delta.projection;
 for(const key of Object.keys(revisions))if(hint.revisions?.[key]===revisions[key]){remove(delta,key);delta.slim.omitted.push(key);}
 return mode==='shadow'?{...full,slimShadow:delta}:delta;
}
export class SlimBundleClient {
 constructor({diagnose=detail=>console.warn(JSON.stringify({type:'core511_slim_reload',...detail}))}={}){this.rows=new Map();this.diagnose=diagnose;this.metrics={full:0,delta:0,shadow:0,differences:0,fallbacks:0,omitted:0};}
 hint(id){return mode==='0'?null:this.rows.get(id)?.meta??null;}
 capture(bundle){
  if(mode==='0'||!bundle.slim||bundle.slim.omitted.length)return;
  const values=Object.fromEntries(parts(bundle).map(([key,value])=>[key,clone(value)]));
  this.rows.set(bundle.actor,{meta:clone(bundle.slim),values});
 }
 expand(bundle){
  if(!bundle.slim)return bundle;
  const meta=bundle.slim,old=this.rows.get(bundle.actor);
  if(meta.version!==1||meta.scope!==scope(bundle)||!Number.isSafeInteger(meta.revision)||!meta.revisions||!Array.isArray(meta.omitted))return null;
  const supplied=new Map(parts(bundle));
  if(Object.keys(meta.revisions).some(key=>!meta.omitted.includes(key)&&!supplied.has(key)))return null;
  if(!meta.omitted.length)return bundle;
  if(!old||meta.version!==1||old.meta.scope!==meta.scope||meta.revision<old.meta.revision)return null;
  const full={...container(bundle),slim:{...meta,omitted:[]}};
  for(const key of meta.omitted){
   if(old.meta.revisions[key]!==meta.revisions[key]||!Object.hasOwn(old.values,key)||key.startsWith('projection.data.')&&!full.projection)return null;
   if(entityDelta&&(key==='dungeon.settings'&&!full.dungeon||key==='adventure.towerInfo.config'&&!full.adventure?.towerInfo||key.startsWith('projection.data.players.')&&(!Array.isArray(full.projection?.data?.players)||!Number.isSafeInteger(Number(key.slice(24)))||Number(key.slice(24))<0||Number(key.slice(24))>=full.projection.data.players.length)))return null;
   const value=clone(old.values[key]);if(digest(value)!==meta.revisions[key])return null;set(full,key,value);
  }
  return full;
 }
 async load(id,fetch){
  if(mode==='0')return fetch(null);
  let bundle=await fetch(this.hint(id));
  if(bundle.slimShadow){
   const {slimShadow,...full}=bundle,expanded=this.expand({...slimShadow,...(Object.hasOwn(bundle,'afkCheck')?{afkCheck:bundle.afkCheck}:{})});this.metrics.shadow++;
   // Compare the actual JSON wire value, not SQLite's null row prototypes.
   const clean=b=>{if(!b)return b;const {slim,...rest}=b;return JSON.parse(JSON.stringify(rest));};
   const left=clean(expanded),right=clean(full);
   if(!expanded||!isDeepStrictEqual(left,right)){this.metrics.differences++;this.diagnose({actor:id,reason:'shadow_difference',fields:Object.keys(right).filter(key=>!isDeepStrictEqual(left?.[key],right[key])),count:this.metrics.differences});}
   bundle=full;
  }else if(bundle.slim){
   const expanded=this.expand(bundle);
   if(!expanded){this.metrics.fallbacks++;this.diagnose({actor:id,reason:'missing_revision_full_fallback'});bundle=await fetch(null);}
   else {this.metrics.delta++;this.metrics.omitted+=bundle.slim.omitted.length;bundle=expanded;}
  }else this.metrics.full++;
  // A full fallback is always requested without hints. Never pass missing
  // pieces to hydration, even if a future incompatible sender repeats a delta.
  if(bundle.slim&&(bundle.slim.omitted.length||!this.expand(bundle)))throw Object.assign(Error('slim_full_read_missing'),{code:'slim_full_read_missing'});
  return bundle;
 }
 forget(id){this.rows.delete(id);}
}

// A WAL data_version changes on other-connection commits; total_changes covers
// same-connection fixture/admin writes. Cache only a whole consistent snapshot,
// never infer table stability from elapsed time. SQL with its own wall-clock
// predicate is deliberately reread. A schema/revision change drops everything.
export class ColdReadCache {
 constructor(sql){this.sql=sql;this.rows=new Map();this.flatRowsR51=coldRowCopyR51?new WeakSet():null;this.token=null;this.metrics={hits:0,misses:0,resets:0};}
 begin(){
  const token=JSON.stringify([this.sql.prepare('PRAGMA data_version').get().data_version,this.sql.prepare('PRAGMA schema_version').get().schema_version,this.sql.prepare('SELECT total_changes() AS n').get().n]);
  if(token!==this.token){this.rows.clear();this.token=token;this.metrics.resets++;}return token;
 }
 read(query,params,read){
  if(mode==='0'||/\b(?:unixepoch|julianday|strftime|CURRENT_TIMESTAMP|CURRENT_DATE|CURRENT_TIME)\b/i.test(query))return read();
  const key=JSON.stringify([query,params]),old=this.rows.get(key);
  if(old){this.metrics.hits++;return this.flatRowsR51?.has(old)?copyFlatSqlRowsR51(old):clone(old);}
  const value=read();this.metrics.misses++;if(this.rows.size>=512)this.rows.delete(this.rows.keys().next().value);const stored=clone(value);if(this.flatRowsR51&&flatSqlRowsR51(stored))this.flatRowsR51.add(stored);this.rows.set(key,stored);return value;
 }
}
