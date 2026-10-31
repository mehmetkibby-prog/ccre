// DRAFT ONLY: this candidate is explicitly excluded from the R82 release.
// Source-exact refresh-path fixture. These are isolated unit/port tests, not a
// complete server boot: adventure-service.mjs's exact source is unavailable.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createWorldPlayerProjector} from '../../r82-work/native510-bb3a6cc689c6/vds-server/src/world-player-projection.mjs';
import {defaultRankConfig} from '../../r82-work/native510-bb3a6cc689c6/lib/ranks.mjs';
import {EXTRA_COLUMNS} from '../../r82-work/native510-bb3a6cc689c6/lib/extra-products.mjs';
import {ACTOR_PROGRESS_FIELDS_R82,actorProgressPatchR82} from './actor-progress-refresh-r82.mjs';
import {ENCOUNTER_FIELDS} from '../../r82-work/core511-source/scripts/core511/encounter-checkpoint.mjs';

process.env.CORE511_R60_REWARD_SECTIONS='1';
process.env.CORE511_R61_COMPACT_SECTIONS='1';
const rewardSections=await import('../../r82-work/core511-source/scripts/core511/reward-sections-r60.mjs');
const {resolveCommitRowR61,compactCommitRowsR61}=await import('../../r82-work/core511-source/scripts/core511/compact-commit-rows-r61.mjs');
export {compactCommitRowsR61};
export const NOW=1793448000000;
export const baselineHash='98ccb8ab12cc60e0e37f92e3f697e73da4ba6d8d871e663c91389a37a64f4f23';
const sources=new Map();

export function readSectionSource(version='r82'){
 const path=new URL(version==='r82'?'./actor-section-reuse-r52.mjs':'../../r81-work/core511-source/scripts/core511/actor-section-reuse-r52.mjs',import.meta.url);
 const source=fs.readFileSync(path,'utf8');
 if(version==='r81')assert.equal(createHash('sha256').update(source).digest('hex'),baselineHash,'exact delivered R81 baseline');
 return {source,path};
}

export function loadSections(version='r82',overrides={}){
 const {source,path}=readSectionSource(version);
 const sandbox={
  actorSectionReuseR52:true,rewardAsyncReplyR54:true,refreshReadPipelineR56:true,
  sectionReadGroupR56:true,commitSectionsR57:true,groundLoot30s:true,
  ...rewardSections,resolveCommitRowR61,ENCOUNTER_FIELDS,
  ACTOR_PROGRESS_FIELDS_R82,actorProgressPatchR82,
  // Portal refresh is a separate unchanged protocol; no portal is injected.
  portalRefreshScopeR57:()=>false,portalRefreshTableR57:()=>false,
  preparePortalRefreshR57:()=>{throw Error('unexpected portal fixture');},
  prepareCached477:()=>{throw Error('unexpected SQL in refresh fixture');},
  Buffer,process:{env:{}},...overrides,
 };
 vm.createContext(sandbox);
 // Only module wiring changes; every production function body is preserved.
 const script=source.replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
 assert(!/^import /m.test(script),'all module wiring explicitly accounted for');
 vm.runInContext(script+'\nglobalThis.api={applyActorSectionsR52,refreshActorSectionsR52,actorSectionMetricsR52};',sandbox,{filename:fileURLToPath(path)});
 return sandbox.api;
}

export function productionApplyCommit(version='r82'){
 if(sources.has(version))return sources.get(version);
 const source=fs.readFileSync(new URL(`../../${version}-work/core511-source/scripts/core511/resident-channel.mjs`,import.meta.url),'utf8');
 const start=source.indexOf(' async applyCommit(result,context){'),end=source.indexOf('\n action(context){',start);
 assert(start>=0&&end>start,'exact production ResidentChannel.applyCommit boundary');
 const body=source.slice(start,end);
 if(version==='r82'){
  const before=fs.readFileSync(new URL('../../r81-work/core511-source/scripts/core511/resident-channel.mjs',import.meta.url),'utf8');
  assert.equal(body,before.slice(before.indexOf(' async applyCommit(result,context){'),before.indexOf('\n action(context){',before.indexOf(' async applyCommit(result,context){'))),'unchanged commit dispatch');
 }
 const sandbox={ipcSafeStream:false,demand:(ok,code)=>assert(ok,code)};
 vm.createContext(sandbox);vm.runInContext('globalThis.applyCommit=({'+body+'}).applyCommit',sandbox);
 sources.set(version,sandbox.applyCommit);return sandbox.applyCommit;
}

export function player(id='actor-1',changes={}){
 return {
  ...Object.fromEntries(EXTRA_COLUMNS.map(key=>[key,0])),id,name:id,role:'muhafiz',
  hp:950,max_hp:1000,hp_revision:1,level:65,area:'forest',channel:1,arena_match_id:'',
  x:100,y:100,xp:1000,essence:100,gems:1,potions:1,pearls:1,stone_dust:1,
  last_seen:Math.floor(NOW/1000),specialization:'',skill_four:1,attack_four_at:0,
  special_guard_until_ms:0,rune_attack_level:0,rune_defense_level:0,rune_hp_level:0,
  rank_tier:1,rank_xp:100,rank_forest:50,rank_frozen:50,rank_black:50,rank_ancient:50,
  rank_started_at:1,rank_cosmetics:'{}',rank_unlocked:'[]',
  battle_pass_season:'season-1',battle_pass_xp:100,...changes,
 };
}

// Same native base projection inputs, with representative computed equipment
// columns. No rank or battle-pass raw columns are in ACTIVE_PLAYERS_SQL.
export function baseProjection(row){
 const keys=['id','name','role','hp','max_hp','hp_revision','level','area','channel','arena_match_id',
  'x','y','xp','essence','gems','potions','pearls','stone_dust','last_seen','specialization','skill_four'];
 return {...Object.fromEntries(keys.map(key=>[key,row[key]])),equipped_armor_power:12,strong_players:4};
}

export function nativeProjection(row,{config=defaultRankConfig(),at=NOW,ownerId=row.id}={}){
 const read=(sql,params)=>{
  if(sql==='SELECT config_json FROM rank_settings WHERE id=1')return [{config_json:JSON.stringify(config)}];
  if(sql.includes(' FROM players WHERE id IN ')){
   assert.deepEqual(params,[row.id]);
   const columns=sql.slice('SELECT '.length,sql.indexOf(' FROM players')).split(',');
   return [Object.fromEntries(columns.map(key=>[key,row[key]]))];
  }
  if(sql.includes(' FROM guild_members ')||sql.includes(' FROM player_items '))return [];
  throw Error('unexpected native projector SQL: '+sql);
 };
 return createWorldPlayerProjector(read)([baseProjection(row)],ownerId,at)[0];
}

export function fixture(changes={},options={}){
 const specs=options.actors??[{id:'actor-1',before:options.before,changes}];
 const before=new Map(),after=new Map(),owners=new Map(),actors=new Map(),subscribers=new Map(),frames=new Map(),engagements=new Map();
 for(const spec of specs){
  const previous=player(spec.id,spec.before),row={...previous,...spec.changes};
  const owner={epoch:1,channel:1,incarnation:'channel-1'};
  const ownerRow=nativeProjection(previous,options);
  before.set(spec.id,previous);after.set(spec.id,row);owners.set(spec.id,owner);
  actors.set(spec.id,{epoch:1,barrier:Promise.resolve(),suspended:false,externalHold:false});
  frames.set(spec.id,{valid:true});engagements.set(spec.id,null);
  subscribers.set(spec.id,{id:spec.id,ownerRow,data:{area:previous.area,channel:previous.channel,
   world:{cycle:1},players:[ownerRow],drops:[]},revision:1,cache:{old:true},privateOwnerCache:{old:true}});
 }
 const current=new Map(before),writes=[],forgotten=[],loaded=[],bundles=[],asserted=[];
 const api=options.api??loadSections(options.version??'r82');
 const runtime={clock:()=>NOW,
  channel:{world:{cycle:1},owners,
   view:{player:id=>current.get(id),setPlayer:row=>{writes.push(row.id);current.set(row.id,row);},
    engagements,setEngagement:(id,row)=>engagements.set(id,row)},
   kernel:{players:actors},frames:{entries:frames},lanes:{busy:()=>true},
   state:{assertOwner:(id,epoch)=>{asserted.push([id,epoch]);assert.equal(owners.get(id).epoch,epoch);}},
   presence:{merge:row=>row},setMonster:()=>{},
  },world:{subscribers},dungeon:{locked:()=>false},slimReload:{forget:id=>forgotten.push(id)},
 };
 const first=specs[0].id;
 const result={players:[...after.values()],monsters:[],engagement:null,
  sharedRefresh:{version:1,all:false,tables:['players'],actors:[...after.keys()]},
  actorSectionsR52:{version:1,cycle:1,actor:first,actors:specs.map(spec=>({id:spec.id,owner:owners.get(spec.id),engagement:null}))},
 };
 Object.assign(runtime.channel,{completedClaimHintsR56:{record:()=>{}},
  ports:{actorSectionRefreshR52:r=>api.refreshActorSectionsR52(runtime,r,options.readDrops)},
  loadActor:async id=>{loaded.push(id);return {id};},applyBundle:bundle=>bundles.push(bundle),revision:0});
 return {api,runtime,result,before,after,owners,actors,subscribers,frames,current,writes,forgotten,loaded,bundles,asserted,
  sub:subscribers.get(first),row:after.get(first),previous:before.get(first),
  apply:()=>api.applyActorSectionsR52(runtime,result),
  refresh:readDrops=>api.refreshActorSectionsR52(runtime,result,readDrops),
  commit:()=>productionApplyCommit(options.version??'r82').call(runtime.channel,result),
 };
}

export function readProof(f){
 f.result.actorSectionsR52.readSections=true;f.result.actorSectionsR52.readDrops=true;
 f.result.sharedRefresh.tables.push('world_drops');
 for(const part of f.result.actorSectionsR52.actors){
  delete part.engagement;
  part.engagementRef={kind:part.id===f.result.actorSectionsR52.actor?'ack-attack':'resident'};
 }
 return f;
}

export function sectionReply(f,ids=[...f.after.keys()]){
 return {version:1,complete:true,cycle:1,readAtMs:NOW,actors:ids.map(id=>({id,
  owner:{...f.owners.get(id)},player:{...f.after.get(id)},engagement:null,
  drops:[{id:'drop-'+id,owner_id:id,expires_at:Math.floor(NOW/1000)+20}],
 }))};
}

export const plain=value=>JSON.parse(JSON.stringify(value));
