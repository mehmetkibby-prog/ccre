import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setupPvp,put,update} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {ChannelOwnership} from '../../working/core511-source/scripts/core511/ownership.mjs';
import {ReadWorker} from '../../working/core511-source/scripts/core511/read-worker.mjs';
import {readAdventureBundle,publicAdventure} from '../../working/core511-source/scripts/core511/adventure-service.mjs';
import {actorProgressPatchR85,ACTOR_PROGRESS_FIELDS_R85} from '../../working/core511-source/scripts/core511/actor-progress-refresh-r85.mjs';
import {defaultRankConfig,rankThreshold} from '../../working/native510-bb3a6cc689c6/lib/ranks.mjs';
const plain=value=>JSON.parse(JSON.stringify(value));
const diff=(a,b,path='')=>Object.is(a,b)?[]:a&&b&&typeof a==='object'&&typeof b==='object'?[...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>diff(a[k],b[k],path+'.'+k)):[{path,before:b,after:a}];

test('complete native SQLite reader preserves every cold/adventure field for same-tier, same-season progress',async t=>{
 const f=await setupPvp(t),{sql,id,nowMs}=f;f.reset({area:'forest'});
 update(sql,'players',id,{level:65,rank_tier:1,rank_xp:100,rank_forest:50,rank_frozen:50,rank_black:50,rank_ancient:50,battle_pass_season:'r85-fixture-season',battle_pass_xp:100});
 put(sql,'dungeon_materials',{player_id:id,kind:'weathered_iron',amount:7});
 put(sql,'adventure_portals',{id:'r85-progress-portal',run_id:'r85-progress-run',channel:1,area:'forest',x:100,y:100,opens_ms:0,closes_ms:Date.now()+600000,gold:1,capacity:10,entered:0,source_key:'r85-progress-source'});
 const authority=new ChannelOwnership(f.f.database,{realmId:'r85-progress-native'});await authority.initialize();
 const peer={channel:1,incarnation:'r85-progress-channel'};await authority.registerProcess(peer.channel,peer.incarnation);
 const owner=await authority.admit(id,peer,{sessionId:'r85-progress-session',guard:()=>true});
 const reader=new ReadWorker(f.f.file,new Map(),{actorBundles:true});t.after(()=>reader.close());
 const access={account:sql.prepare('SELECT account_id FROM players WHERE id=?').get(id).account_id,chatAfterId:0,starterReward:{claimed:true}};
 const params=[id,peer.channel,peer.incarnation,owner.epoch,1,nowMs,access];
 const read=async()=>plain((await reader.query('kernel511_actor_world',params)).rows);
 const timings=[],readTimed=async()=>{const at=performance.now(),value=await read();timings.push(performance.now()-at);return value;};
 let before=await readTimed();
 assert.equal(before.adventure.towerInfo.inventory.weathered_iron,7);
 assert(before.adventure.portals.some(p=>p.id==='r85-progress-portal'));
 for(const key of ACTOR_PROGRESS_FIELDS_R85){
  const previous=before.player,oldOwner=before.projection.data.players.find(p=>p.id===id);
  update(sql,'players',id,{[key]:previous[key]+1});
  const after=await readTimed(),row=after.player,patch=actorProgressPatchR85(previous,row,oldOwner);
  assert(patch,key+' must support monotonic progress');
  assert.equal(row.rank_tier,previous.rank_tier,'native trigger retained tier');
  const expected=plain(before);
  expected.player=row;
  expected.dungeon.players=expected.dungeon.players.map(p=>p.id===id?row:p);
  const projected={...oldOwner,...patch};
  for(const field of ACTOR_PROGRESS_FIELDS_R85)if(Object.hasOwn(projected,field))projected[field]=row[field];
  expected.projection.data.players=expected.projection.data.players.map(p=>p.id===id?projected:p);
  // Combat templates carry raw player columns. Resident CombatFrames.frame
  // overlays those same fields from the authoritative c.view player image.
  for(const part of ['actorFrame','targetFrame','retaliationPlayer'])for(const field of ACTOR_PROGRESS_FIELDS_R85)if(Object.hasOwn(expected.combat[part],field))expected.combat[part][field]=row[field];
  delete expected.slim;delete after.slim;
  assert.deepEqual(diff(after,expected),[],key+' changes no unhandled cold bundle field');
  assert.deepEqual(after.adventure,before.adventure,key+' retains full adventure bundle');
  assert.deepEqual(after.projection.data.adventure511,before.projection.data.adventure511,key+' retains public adventure projection');
  before=after;
 }
 // Evaluate the exact recovered adventure functions against a player proxy
 // so a future added progress dependency fails even if fixture output is empty.
 const allowed=new Set(['id','channel','area']),raw=sql.prepare('SELECT * FROM players WHERE id=?').get(id);
 const guarded=new Proxy(raw,{get(target,key){if(typeof key==='string')assert(allowed.has(key),'adventure player dependency: '+key);return Reflect.get(target,key);}});
 assert.deepEqual(plain(publicAdventure(readAdventureBundle(sql,guarded))),before.projection.data.adventure511);
 const old=before.player,oldOwner=before.projection.data.players.find(p=>p.id===id);
 update(sql,'players',id,{rank_xp:rankThreshold(2,defaultRankConfig())});
 const promoted=await read();assert(promoted.player.rank_tier>old.rank_tier);assert.equal(actorProgressPatchR85(old,promoted.player,oldOwner),false,'native tier/stat/unlock trigger retains full reload');
 fs.writeFileSync(new URL('../../evidence/progress-native-differential-r85.json',import.meta.url),JSON.stringify({passed:true,scope:'complete native readonly SQLite actor-world bundle, real schema and rank triggers',progressFields:ACTOR_PROGRESS_FIELDS_R85,nonemptyAdventure:['towerInfo.inventory','portals'],fullColdReadMs:timings,liveTouched:false,fullBrowser:false},null,2)+'\n');
});
