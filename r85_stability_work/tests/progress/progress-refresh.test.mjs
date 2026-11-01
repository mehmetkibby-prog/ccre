// Focused R85 unit/port coverage; complete native cold/adventure differential is separate.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {actorProgressPatchR85,ACTOR_PROGRESS_FIELDS_R85} from '../../working/core511-source/scripts/core511/actor-progress-refresh-r85.mjs';
import {RANK_AREAS,defaultRankConfig,rankThreshold} from '../../working/native510-bb3a6cc689c6/lib/ranks.mjs';
import {publicWorldPlayer} from '../../working/native510-bb3a6cc689c6/vds-server/src/world-push-player.mjs';
import {fixture,player,nativeProjection,loadSections,readProof,sectionReply,plain,compactCommitRowsR61,NOW} from './progress-fixtures.mjs';

test('real native owner projection matches rank XP and all four counters, including 0 -> 1',()=>{
 const config=defaultRankConfig();config.tiers[0].hp=91;config.tiers[0].defense=7;
 const variants=[
  [{rank_xp:0},{rank_xp:1}],
  [{},{rank_xp:101}],
  [{rank_tier:0,rank_forest:0},{rank_forest:1}],
  [{rank_tier:0,rank_frozen:0},{rank_frozen:1}],
  [{rank_tier:0,rank_black:0},{rank_black:1}],
  [{rank_tier:0,rank_ancient:0},{rank_ancient:1}],
  [{level:64,rank_tier:0,rank_xp:0},{rank_xp:1}],
  [{rank_tier:18,rank_unlocked:'["sovereign_wings"]',rank_cosmetics:'{"wings":"sovereign_wings"}'},
   {rank_xp:9000000000000,rank_forest:100000,rank_frozen:100000,rank_black:100000,rank_ancient:100000}],
  [{rank_tier:18,rank_unlocked:'["sovereign_wings"]',rank_cosmetics:'{"wings":"sovereign_wings"}',
    arena_wings_owned:1,arena_wings_equipped:1,arena_wings_expires_at_ms:NOW+10000},{rank_xp:101}],
 ];
 for(const [before,changes] of variants){
  const previous=player('actor-1',before),row={...previous,...changes},owner=nativeProjection(previous,{config});
  const original=structuredClone(owner),patch=actorProgressPatchR85(previous,row,owner);
  assert.notEqual(patch,false,JSON.stringify([before,changes]));
  assert.deepEqual({...owner,...patch},nativeProjection(row,{config}),'same native world-player projection');
  assert.deepEqual(owner,original,'old projection is immutable');
  assert.equal(patch.rank.bonuses,owner.rank.bonuses,'native bonuses retained');
  assert.equal(patch.rank.cosmetics,owner.rank.cosmetics,'native cosmetics retained');
 }
});

test('native progress field contract is bounded and same-season battle pass has no cold projection',()=>{
 assert.deepEqual(ACTOR_PROGRESS_FIELDS_R85,['rank_xp',...RANK_AREAS.map(([area])=>'rank_'+area),'battle_pass_xp']);
 const previous=player(),row={...previous,battle_pass_xp:101},owner=nativeProjection(previous);
 assert.deepEqual(actorProgressPatchR85(previous,row,owner),{});
 assert.deepEqual(nativeProjection(row),owner);
 assert(!Object.hasOwn(owner,'battle_pass_xp'));assert(!Object.hasOwn(owner,'battle_pass_season'));
 const cold=fs.readFileSync(new URL('../../working/core511-source/scripts/core511/generated/cold-world-rules.mjs',import.meta.url),'utf8');
 assert(!/battle_pass|battlePass|BattlePass/.test(cold),'no cold battle-pass section or dependency');
});

test('exact R84 applyCommit performs full reads for the supported progress changes; R85 does not',async()=>{
 const cases=[{rank_xp:101},{rank_forest:51},{rank_frozen:51},{rank_black:51},{rank_ancient:51},{battle_pass_xp:101},
  {xp:1001,rank_xp:101,battle_pass_xp:101,quest_kills438:1}];
 for(const changes of cases){
  const old=fixture(changes,{version:'r84'});await old.commit();
  assert.deepEqual(old.loaded,['actor-1'],'R84 confirmed full reload '+JSON.stringify(changes));
  const next=fixture(changes);await next.commit();
  assert.deepEqual(next.loaded,[],'R85 removes only proven reload '+JSON.stringify(changes));
  assert.equal(next.api.actorSectionMetricsR52.applied,1);
  assert.deepEqual(plain(next.sub.ownerRow),plain(nativeProjection(next.row)));
  assert.equal(next.current.get('actor-1'),next.row,'authoritative committed row resident');
 }
});

test('unchanged normal XP fast path and disabled feature retain their original dispatch',async()=>{
 for(const version of ['r84','r85']){
  const f=fixture({xp:1001},{version});await f.commit();assert.equal(f.loaded.length,0);
 }
 const f=fixture({rank_xp:101},{api:loadSections('r85',{actorSectionReuseR52:false})});
 await f.commit();assert.deepEqual(f.loaded,['actor-1']);assert.deepEqual(f.writes,[]);
});

test('raw compatibility columns and nested rank progress update together without leaking private fields',()=>{
 const f=fixture({rank_xp:101,rank_forest:51,battle_pass_xp:101});
 const owner=f.sub.ownerRow,oldPublic=publicWorldPlayer(owner);
 for(const key of ACTOR_PROGRESS_FIELDS_R85)owner[key]=f.previous[key];
 owner.battle_pass_season=f.previous.battle_pass_season;
 assert.equal(f.apply(),true);
 assert.equal(f.sub.ownerRow.rank_xp,101);assert.equal(f.sub.ownerRow.rank.xp,101);
 assert.equal(f.sub.ownerRow.rank_forest,51);assert.equal(f.sub.ownerRow.rank.kills.forest,51);
 assert.equal(f.sub.ownerRow.battle_pass_xp,101);
 assert.equal(f.dungeonPlayers.get('actor-1'),f.current.get('actor-1'),'dungeon raw player mirror uses the same committed image');
 assert.deepEqual(publicWorldPlayer(f.sub.ownerRow),oldPublic);
 assert.equal(f.sub.data.players[0],f.sub.ownerRow);assert.notEqual(owner,f.sub.ownerRow);
 assert.equal(owner.rank.xp,100);assert.equal(owner.rank.kills.forest,50);
 assert.equal(f.sub.revision,2);assert.equal(f.sub.cache,null);assert.equal(f.sub.privateOwnerCache,null);
 assert.deepEqual(f.forgotten,['actor-1']);
});

test('progress cannot bypass the dungeon raw mirror refresh or partially update it',()=>{
 const absent=fixture({rank_xp:101});delete absent.runtime.dungeon.refreshActor;
 assert.equal(absent.apply(),false);assert.deepEqual(absent.writes,[]);
 const group=fixture({},{actors:[{id:'a',changes:{rank_xp:101}},{id:'b',changes:{rank_forest:51}}]});
 group.subscribers.get('b').ownerRow.rank.kills.forest=49;
 assert.equal(group.apply(),false);
 for(const [id,before] of group.before)assert.equal(group.dungeonPlayers.get(id),before);
});

test('rank threshold, quest completion, level, stats, gear and unlock changes retain full reload',async()=>{
 const threshold=rankThreshold(2,defaultRankConfig());
 const cases=[
  [{rank_xp:threshold-1},{rank_xp:threshold,rank_tier:2}],
  [{rank_tier:0,rank_xp:0,rank_forest:49},{rank_forest:50,rank_tier:1}],
  [{level:64},{level:65,rank_xp:101}],
  [{},{level:66,rank_xp:101}],
  [{},{max_hp:1200,rank_xp:101}],
  [{},{rank_unlocked:'["hunter_weapon"]',rank_xp:101}],
  [{},{rank_cosmetics:'{"weapon":"hunter_weapon"}',rank_xp:101}],
  [{},{rank_started_at:2,rank_forest:51}],
  [{},{stat_attack:5,rank_xp:101}],
  [{},{rune_attack_level:1,rank_xp:101}],
  [{},{skill_four:2,rank_xp:101}],
  [{},{weapon_skin_enabled:1,rank_xp:101}],
 ];
 for(const [before,changes] of cases){
  const f=fixture(changes,{before});await f.commit();
  assert.deepEqual(f.loaded,['actor-1'],JSON.stringify(changes));assert.deepEqual(f.writes,[]);
 }
 const gear=fixture({rank_xp:101});gear.result.sharedRefresh.tables.push('player_items');
 await gear.commit();assert.deepEqual(gear.loaded,['actor-1']);assert.deepEqual(gear.writes,[]);
});

test('season transitions, empty season and XP regression retain full reload',async()=>{
 for(const [before,changes] of [
  [{},{battle_pass_season:'season-2',battle_pass_xp:1}],
  [{},{battle_pass_season:'season-2'}],
  [{battle_pass_season:''},{battle_pass_xp:101}],
  [{},{battle_pass_xp:0}],
  [{},{rank_xp:0}],
  [{},{rank_forest:0}],
 ]){
  const f=fixture(changes,{before});await f.commit();
  assert.deepEqual(f.loaded,['actor-1'],JSON.stringify([before,changes]));assert.deepEqual(f.writes,[]);
 }
});

test('missing, invalid, negative, noninteger and oversized progress data fail closed',()=>{
 const edits=[
  f=>{delete f.row.rank_xp;},f=>{delete f.row.rank_ancient;},
  f=>{delete f.previous.rank_frozen;},f=>{delete f.row.rank_unlocked;},
  f=>{f.row.rank_xp='101';},f=>{f.row.rank_xp=NaN;},f=>{f.row.rank_xp=Infinity;},
  f=>{f.row.rank_xp=100.5;},f=>{f.row.rank_xp=9000000000001;},f=>{f.row.rank_black=-1;},
  f=>{f.row.rank_black=100001;},f=>{f.previous.rank_forest=null;},
  f=>{f.row.rank_cosmetics=null;},f=>{f.row.rank_tier=19;},
 ];
 for(const edit of edits){const f=fixture({rank_xp:101});edit(f);assert.equal(f.apply(),false,edit.toString());assert.deepEqual(f.writes,[]);}
 for(const value of [null,undefined,'101',-1,100.1,Infinity,9000000000001]){
  const f=fixture({battle_pass_xp:value});assert.equal(f.apply(),false,String(value));assert.deepEqual(f.writes,[]);
 }
 const missing=fixture({battle_pass_xp:101});delete missing.previous.battle_pass_season;
 assert.equal(missing.apply(),false);assert.deepEqual(missing.writes,[]);
});

test('stale or incomplete nested rank cannot be repaired by an unchecked scalar allowlist',()=>{
 const edits=[
  f=>{delete f.sub.ownerRow.rank;},f=>{f.sub.ownerRow.rank=null;},f=>{f.sub.ownerRow.rank=[];},
  f=>{delete f.sub.ownerRow.rank.kills;},f=>{delete f.sub.ownerRow.rank.kills.black;},
  f=>{f.sub.ownerRow.rank.xp=99;},f=>{f.sub.ownerRow.rank.kills.forest=49;},
  f=>{f.sub.ownerRow.rank.tier=2;},f=>{delete f.sub.ownerRow.rank.unlocked;},
  f=>{delete f.sub.ownerRow.rank.bonuses;},f=>{delete f.sub.ownerRow.rank.cosmetics;},
  f=>{delete f.sub.ownerRow.rank.arenaWings;},f=>{f.sub.ownerRow.id='other';},
  f=>{f.sub.ownerRow.rank_xp=99;},
 ];
 for(const edit of edits){const f=fixture({rank_xp:101});edit(f);assert.equal(f.apply(),false,edit.toString());assert.deepEqual(f.writes,[]);}
 const stale=fixture({battle_pass_xp:101});stale.sub.ownerRow.battle_pass_season='season-0';
 assert.equal(stale.apply(),false);
});

test('world scope, owner epoch, resource lane and actor barrier guards are unchanged',()=>{
 const edits=[
  f=>{f.result.actorSectionsR52.cycle=2;},
  f=>{f.result.sharedRefresh.all=true;},
  f=>{f.result.sharedRefresh.tables.push('rank_settings');},
  f=>{f.result.sharedRefresh.tables.push('battle_pass_settings');},
  f=>{f.row.area='frozen';},f=>{f.row.channel=2;},f=>{f.row.arena_match_id='arena-1';},
  f=>{f.row.hp=0;},f=>{f.frames.get('actor-1').valid=false;},
  f=>{f.runtime.dungeon.locked=()=>true;},
  f=>{f.result.actorSectionsR52.actors[0].owner={...f.owners.get('actor-1'),epoch:2};},
  f=>{f.result.actorSectionsR52.actors[0].owner={...f.owners.get('actor-1'),incarnation:'old'};},
  f=>{f.result.actorSectionsR52.actors[0].owner={...f.owners.get('actor-1'),channel:2};},
  f=>{f.actors.get('actor-1').epoch=2;},f=>{f.actors.get('actor-1').barrier=null;},
  f=>{f.actors.get('actor-1').suspended=true;},f=>{f.actors.get('actor-1').externalHold=true;},
  f=>{f.runtime.channel.lanes.busy=()=>false;},
 ];
 for(const edit of edits){const f=fixture({rank_xp:101});edit(f);assert.equal(f.apply(),false,edit.toString());assert.deepEqual(f.writes,[]);assert.equal(f.sub.revision,1);}
});

test('all recipients validate before any projection or resident mutation',()=>{
 const options={actors:[{id:'a',changes:{rank_xp:101}},{id:'b',changes:{rank_forest:51,battle_pass_xp:101}}]};
 const invalid=fixture({},options);invalid.subscribers.get('b').ownerRow.rank.kills.forest=49;
 assert.equal(invalid.apply(),false);assert.deepEqual(invalid.writes,[]);assert.deepEqual(invalid.forgotten,[]);
 assert.equal(invalid.subscribers.get('a').ownerRow.rank.xp,100);assert.equal(invalid.current.get('a').rank_xp,100);
 const valid=fixture({},options);assert.equal(valid.apply(),true);assert.deepEqual(valid.writes,['a','b']);
 for(const id of ['a','b'])assert.deepEqual(plain(valid.subscribers.get(id).ownerRow),plain(nativeProjection(valid.after.get(id))));
});

test('same-cycle COMMIT snapshot uses no reader round trip and projects exact rank progress',()=>{
 const f=readProof(fixture({rank_xp:101,battle_pass_xp:101}));
 const snapshot=sectionReply(f);snapshot.actors[0].drops.push({id:'expired',owner_id:'actor-1',expires_at:Math.floor(NOW/1000)});
 f.result.actorCommitSectionsR57=compactCommitRowsR61(snapshot,f.result.players);
 assert(Object.hasOwn(f.result.actorCommitSectionsR57.actors[0],'playerRefR61'),'actual compact R61 protocol');
 let reads=0;assert.equal(f.refresh(()=>{reads++;throw Error('must not read');}),true);
 assert.equal(reads,0);assert.equal(f.api.actorSectionMetricsR52.commitAppliedR57,1);
 assert.deepEqual(plain(f.sub.ownerRow),plain(nativeProjection(f.row)));
 assert.deepEqual(plain(f.sub.data.drops),[{id:'drop-actor-1',owner_id:'actor-1',expires_at:Math.floor(NOW/1000)+20}]);
});

test('stale or forged COMMIT snapshots cannot bypass the authoritative read or progress checks',async()=>{
 const edits=[
  s=>{s.readAtMs=NOW-1001;},s=>{s.cycle=2;},s=>{s.actors[0].owner.epoch=2;},
  s=>{s.actors[0].player.rank_xp=102;},s=>{s.actors[0].drops[0].owner_id='other';},
 ];
 for(const edit of edits){
  const f=readProof(fixture({rank_xp:101})),snapshot=sectionReply(f);edit(snapshot);f.result.actorCommitSectionsR57=snapshot;
  assert.equal(f.refresh(),false);assert.deepEqual(f.writes,[],edit.toString());
 }
 const forged=readProof(fixture({rank_xp:101}));
 forged.result.actorCommitSectionsR57=compactCommitRowsR61(sectionReply(forged),forged.result.players);
 forged.result.actorCommitSectionsR57.actors[0].playerRefR61.sha256='0'.repeat(64);
 assert.equal(forged.refresh(),false);assert.deepEqual(forged.writes,[]);
});

test('authoritative section reader can update all progress while preserving after-await fences',async()=>{
 const f=readProof(fixture({rank_xp:101,battle_pass_xp:101}));let reads=0;
 assert.equal(await f.refresh(async requests=>{reads++;assert.deepEqual(plain(requests),[{actor:'actor-1',epoch:1,area:'forest'}]);return sectionReply(f);}),true);
 assert.equal(reads,1);assert.deepEqual(plain(f.sub.ownerRow),plain(nativeProjection(f.row)));
 for(const mutate of [
  g=>{g.sub.revision++;},g=>{g.actors.get('actor-1').barrier=Promise.resolve();},
  g=>{g.current.set('actor-1',{...g.previous,rank_xp:102});},
  g=>{g.owners.set('actor-1',{...g.owners.get('actor-1'),epoch:2});},
 ]){
  const g=readProof(fixture({rank_xp:101}));
  assert.equal(await g.refresh(async()=>{const reply=sectionReply(g);mutate(g);return reply;}),false,mutate.toString());
  assert.deepEqual(g.writes,[]);assert.equal(g.sub.ownerRow.rank.xp,100);
 }
});

test('25-actor grouped read is atomic if the final recipient is invalidated during the read',async()=>{
 const specs=Array.from({length:25},(_,i)=>({id:'actor-'+i,changes:{rank_xp:101}}));
 const f=readProof(fixture({},{actors:specs}));let reads=0;
 assert.equal(await f.refresh(async requests=>{reads++;assert.equal(requests.length,25);return sectionReply(f);}),true);
 assert.equal(reads,1);assert.equal(f.writes.length,25);
 const g=readProof(fixture({},{actors:specs}));
 assert.equal(await g.refresh(async()=>{const reply=sectionReply(g);g.subscribers.get('actor-24').ownerRow.rank.xp=99;return reply;}),false);
 assert.deepEqual(g.writes,[]);assert.equal(g.subscribers.get('actor-0').ownerRow.rank.xp,100);
});

test('material proof still requires the exact committed material section',()=>{
 const f=readProof(fixture({rank_xp:101}));
 f.result.sharedRefresh.tables.push('dungeon_materials');f.result.actorSectionsR52.readMaterialsR60=true;
 f.result.actorCommitSectionsR57=sectionReply(f);
 assert.equal(f.refresh(),false);assert.deepEqual(f.writes,[]);
 f.result.actorCommitSectionsR57.actors[0].dungeonMaterialsR60=[{kind:'gem',amount:5}];
 assert.equal(f.refresh(),true);assert.deepEqual(plain(f.sub.data.dungeonMaterials),[{kind:'gem',amount:5}]);
 assert.equal(f.sub.data.adventure511.towerInfo.inventory.gem,5);assert.equal(f.runtime.adventure.bundles.get(f.row.id).towerInfo.inventory.gem,5);assert.equal(f.dungeonMaterials.get(f.row.id).gem,5);
 assert.equal(f.sub.ownerRow.rank.xp,101);
});

test('missing later material mirror rejects the whole recipient group before any changes',()=>{
 const f=readProof(fixture({},{actors:[{id:'actor-1',changes:{rank_xp:101}},{id:'actor-2',changes:{rank_xp:101}}]}));
 f.result.sharedRefresh.tables.push('dungeon_materials');f.result.actorSectionsR52.readMaterialsR60=true;f.result.actorCommitSectionsR57=sectionReply(f);
 for(const part of f.result.actorCommitSectionsR57.actors)part.dungeonMaterialsR60=[{kind:'weathered_iron',amount:10}];
 f.runtime.adventure.bundles.delete('actor-2');assert.equal(f.refresh(),false);assert.deepEqual(f.writes,[]);assert.equal(f.sub.ownerRow.rank.xp,100);assert.deepEqual(f.sub.data.dungeonMaterials,[]);assert.deepEqual(f.dungeonMaterials.get('actor-1'),{});
});
