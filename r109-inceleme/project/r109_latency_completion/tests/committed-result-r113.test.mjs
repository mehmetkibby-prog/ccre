import test from 'node:test';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {setupPvp,update,put} from '../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {GameWriter} from '../working/core511-source/scripts/core511/writer-runtime.mjs';
import {readActorWorldBundle} from '../working/core511-source/scripts/core511/read-worker.mjs';
import {ColdWorldReader} from '../working/core511-source/scripts/core511/cold-world.mjs';
import {createTowerSchema} from '../working/core511-source/scripts/core511/tower-config.mjs';
import {createAdventureSchema} from '../working/core511-source/scripts/core511/adventure-schema.mjs';
import {readCommitRevisionR113} from '../working/core511-source/scripts/core511/commit-revision-r113.mjs';
import {applyCommittedResultR113} from '../working/core511-source/scripts/core511/committed-apply-r113.mjs';
import {readCommittedImagesR113,pruneCommittedImagesR113} from '../working/core511-source/scripts/core511/committed-store-r113.mjs';
import {decodeCommittedActorR113,encodeCommittedActorR113,decodeCommittedImageR113} from '../working/core511-source/scripts/core511/committed-codec-r113.mjs';
import {readDungeonSettingsPointR113} from '../working/core511-source/scripts/core511/dungeon-settings-point-r113.mjs';
const wire=v=>JSON.parse(JSON.stringify(v));
async function scene(t){
 const f=await setupPvp(t);f.reset({area:'forest'});createTowerSchema(f.sql);createAdventureSchema(f.sql);
 const writer=new GameWriter(f.f.database,{realmId:'r113',ports:{guard:()=>true}});await writer.initialize();
 const peer={channel:1,incarnation:'r113-test'};await writer.register(peer);const owner=await writer.admit(f.id,peer,{sessionId:'r113-test-session',guard:()=>true});
 const context={actor:f.id,peer,epoch:owner.epoch,sequence:1,key:'r113-test-operation'};
 const capture=(tables=['players'])=>writer.committedR113.capture(f.sql,'attack',{},context,{players:[f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id)],result:{status:200,body:{ok:true}},sharedRefresh:{version:1,actors:[f.id],tables,all:false}});
 return {...f,writer,peer,owner,context,capture};
}
test('committed actor sections match the authoritative full snapshot after progression, equipment and deletion',async t=>{
 const s=await scene(t),{sql,id}=s;
 update(sql,'players',id,{level:65,xp:12345,rank_tier:3,champion_level_r102:2,champion_xp_r102:17});
 sql.prepare('DELETE FROM player_items WHERE player_id=?').run(id);
 put(sql,'player_items',{id:'r113-equipped',player_id:id,kind:'weapon',item_name:'Test sword',rarity:'red',power:17,role:'avci',enchantments:'[]',equipped:1,created_at:1});
 sql.prepare("INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,'solo_key',7) ON CONFLICT(player_id,kind) DO UPDATE SET amount=7").run(id);
 for(const deleted of [false,true]){
  if(deleted){sql.prepare('DELETE FROM player_items WHERE player_id=?').run(id);sql.prepare('DELETE FROM dungeon_materials WHERE player_id=?').run(id);}
  const result=await s.f.database.atomic(()=>s.capture(['players','player_items','dungeon_materials']));
  assert(result.committedR113);const part=decodeCommittedActorR113(result.committedR113.actors[0]);
  assert.equal(Object.hasOwn(part.bundle,'profiles'),false);assert.equal(Object.hasOwn(part.bundle,'settings'),false);
  assert.equal(Object.hasOwn(part.bundle.dungeon,'settings'),false,'shared settings must not be repeated in each actor image');
  const point=readDungeonSettingsPointR113(sql);assert.equal(result.committedR113.dungeonSettingsRefR113,point.ref);part.bundle.dungeon.settings=point.settings;
  for(const a of [part.bundle.adventure,part.sections.adventure511]){assert.equal(Object.hasOwn(a.towerInfo,'config'),false);a.towerInfo.config=point.settings.kadim_tower_settings;}
  const fresh=await readActorWorldBundle(sql,[id,1,s.peer.incarnation,s.owner.epoch,0,result.committedR113.at,{account:part.bundle.player.account_id,chatAfterId:0,starterReward:null}],new ColdWorldReader(sql));
  for(const key of ['inventory','storageItems','stones','pets','dungeonMaterials','dungeonWings','drops','adventure511'])assert.deepEqual(wire(part.sections[key]),wire(fresh.projection.data[key]),key);
  const expected=fresh.projection.data.players.find(p=>p.id===id);
  for(const key of Object.keys(expected))assert.deepEqual(wire(part.sections.owner[key]??null),wire(expected[key]??null),'owner.'+key);
  for(const key of ['player','combat','engagement','fishing','party','partyMembers','guildSkill','arena','arenaPlayers','dungeon','adventure','mounts'])assert.deepEqual(wire(part.bundle[key]??null),wire(fresh[key]??null),key);
  assert.equal(readCommitRevisionR113(sql,id),deleted?2:1);
 }
});
test('committed capture never reads the world-wide monster catalog',async t=>{
 const s=await scene(t),original=s.sql.prepare;
 s.sql.prepare=function(query){assert(!/^\s*SELECT \* FROM all_monster_combat_profiles\s*$/i.test(String(query)),'global catalog belongs to boot/configuration only');return original.call(this,query);};
 try{const result=await s.f.database.atomic(()=>s.capture());assert(result.committedR113);}finally{s.sql.prepare=original;}
});
test('shared dungeon settings retain same-transaction changes, unchanged revisions and rollback',async t=>{
 const s=await scene(t),read=()=>JSON.parse(s.sql.prepare('SELECT value FROM kadim_tower_settings WHERE id=1').get().value);
 const original=read(),capture=async name=>{s.context.key=name;return s.f.database.atomic(()=>s.capture());};
 const first=await capture('settings-before'),before=readDungeonSettingsPointR113(s.sql).settings;
 const edited={...original,minLevel:original.minLevel+1};
 s.sql.prepare('UPDATE kadim_tower_settings SET value=? WHERE id=1').run(JSON.stringify(edited));
 const second=await capture('settings-after'),after=readDungeonSettingsPointR113(s.sql).settings;assert.notEqual(first.committedR113.dungeonSettingsRefR113,second.committedR113.dungeonSettingsRefR113);
 assert.equal(after.kadim_tower_settings.revision,before.kadim_tower_settings.revision);
 assert.equal(after.kadim_tower_settings.minLevel,before.kadim_tower_settings.minLevel+1);
 s.context.key='settings-rollback';await assert.rejects(s.f.database.atomic(()=>{s.sql.prepare('UPDATE kadim_tower_settings SET value=? WHERE id=1').run(JSON.stringify({...edited,minLevel:edited.minLevel+1}));s.capture();throw Error('rollback-settings');}),/rollback-settings/);
 assert.deepEqual(read(),edited);
 const third=await capture('settings-recovered');assert.equal(third.committedR113.dungeonSettingsRefR113,second.committedR113.dungeonSettingsRefR113);assert.deepEqual(readDungeonSettingsPointR113(s.sql).settings,after);
 // Decode/validate shared settings before installing even the first actor.
 let changed=0;const owner={epoch:1,incarnation:'c',channel:1},row={id:'a',area:'forest',channel:1};
 const channel={world:{cycle:1},owners:new Map([['a',owner]]),kernel:{players:new Map([['a',{epoch:1,barrier:{}}]])},commitRevisionsR113:new Map([['a',0]]),lanes:{busy:()=>true},applyBundle:()=>changed++,revision:0};
 const runtime={channel,world:{subscribers:new Map([['a',{data:{area:'forest',channel:1}}]])}};
 for(const settings of [undefined,'{','{}'])assert.equal(applyCommittedResultR113(runtime,{players:[row],committedR113:{version:1,cycle:1,operationId:'op',dungeonSettingsR113:settings,actors:[{id:'a',base:0,next:1,bundle:{player:row,owner,world:{cycle:1},dungeon:{}},sections:{owner:row}}]}}),false);
 assert.equal(changed,0);
});
test('multiple recipients share one authoritative settings image without losing any private section',async t=>{
 const s=await scene(t);await s.writer.admit(s.targetId,s.peer,{sessionId:'second-settings-recipient',guard:()=>true});
 const ids=[s.id,s.targetId];
 const result=await s.f.database.atomic(()=>s.writer.committedR113.capture(s.sql,'attack',{},s.context,{players:ids.map(id=>s.sql.prepare('SELECT * FROM players WHERE id=?').get(id)),result:{status:200,body:{ok:true}},sharedRefresh:{version:1,actors:ids,tables:['players'],all:false}}));
 const d=result.committedR113;assert.equal(d.actors.length,2);const point=readDungeonSettingsPointR113(s.sql);assert.equal(d.dungeonSettingsRefR113,point.ref);assert(point.settings.kadim_tower_settings.floors.length>0);assert.equal(d.dungeonSettingsR113,undefined);
 for(const encoded of d.actors){const part=decodeCommittedActorR113(encoded);assert.equal(Object.hasOwn(part.bundle.dungeon,'settings'),false);assert.equal(part.sections.owner.id,part.id);assert.equal(part.bundle.dungeon.players.length,1);assert.equal(part.bundle.dungeon.players[0].id,part.id);}
});
test('rollback restores both reward rows and result revision; unknown effects cannot be certified',async t=>{
 const s=await scene(t),before=s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems;
 await assert.rejects(s.f.database.atomic(()=>{s.sql.prepare('UPDATE players SET gems=gems+99 WHERE id=?').run(s.id);s.capture();throw Error('abort-before-commit');}),/abort-before-commit/);
 assert.equal(s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems,before);assert.equal(readCommitRevisionR113(s.sql,s.id),0);
 const result=await s.f.database.atomic(()=>s.capture(['unknown_trigger_target']));assert.equal(result.committedR113,undefined);assert.equal(readCommitRevisionR113(s.sql,s.id),0);
});
test('consumer rejects a revision gap before changing any actor',()=>{
 let changed=0;const owner={epoch:1,incarnation:'c',channel:1},row={id:'a',area:'forest',channel:1};
 const c={world:{cycle:1},owners:new Map([['a',owner]]),kernel:{players:new Map([['a',{epoch:1,barrier:{}}]])},commitRevisionsR113:new Map([['a',3]]),lanes:{busy:()=>true},applyBundle:()=>changed++,revision:0};
 const r={channel:c,world:{subscribers:new Map([['a',{data:{area:'forest',channel:1}}]])}};
 assert.equal(applyCommittedResultR113(r,{players:[row],committedR113:{version:1,cycle:1,operationId:'op',actors:[{id:'a',base:1,next:2,bundle:{player:row,owner,world:{cycle:1}},sections:{owner:row}}]}}),false);assert.equal(changed,0);
});
test('large committed output uses a small receipt and an atomic, owner-fenced image; retention cannot delete rewards',async t=>{
 const s=await scene(t),read=s.writer.committedR113.rules.readCommittedSectionsR113;
 // Exercise the fan-out/size boundary independently of the native bag cap.
 s.writer.committedR113.rules.readCommittedSectionsR113=(...args)=>({...read(...args),storageItems:Array.from({length:250},(_,i)=>({id:String(i),name:randomBytes(900).toString('base64')}))});
 const result=await s.f.database.atomic(()=>s.capture()),d=result.committedR113;
 assert(d.indirect);assert(Buffer.byteLength(JSON.stringify(result))<224*1024);assert.equal(d.actors[0].bundle,undefined);
 const params={operationId:d.operationId,channel:1,incarnation:s.peer.incarnation,actors:d.actors};
 const images=readCommittedImagesR113(s.sql,params);assert.equal(images[0].sections.storageItems.length,250);
 assert.equal(readCommittedImagesR113(s.sql,{...params,incarnation:'replaced'}),null);
 assert.equal(readCommittedImagesR113(s.sql,{...params,actors:[{...d.actors[0],epoch:s.owner.epoch+1}]}),null);
 s.context.key='rollback-image';await assert.rejects(s.f.database.atomic(()=>{s.capture();throw Error('before-commit');}),/before-commit/);
 assert.equal(readCommittedImagesR113(s.sql,{...params,operationId:'rollback-image'}),null);assert.equal(readCommitRevisionR113(s.sql,s.id),1);
 const player=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id);
 await s.f.database.atomic(()=>pruneCommittedImagesR113(s.sql,d.at+1,1));
 assert.equal(readCommittedImagesR113(s.sql,params),null);assert.deepEqual(s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id),player);assert.equal(readCommitRevisionR113(s.sql,s.id),1);
});

test('packed actor images preserve exact state and reject corruption or unbounded inflation',()=>{
 const part={id:'a',base:4,next:5,bundle:{owner:{epoch:2,channel:3,incarnation:'native'},player:{id:'a',name:'Şampiyon',hp:120}},sections:{owner:{id:'a'},items:Array.from({length:150},(_,i)=>({id:String(i),name:'Kadim zümrüt',enchantments:[1,2,3],deleted:null}))}};
 const packed=encodeCommittedActorR113(part),plain=encodeCommittedActorR113(part,{compress:false});
 assert(packed.image.startsWith('z1:'));assert(packed.image.length<plain.image.length/2);
 assert.deepEqual(decodeCommittedActorR113(packed),part);assert.deepEqual(decodeCommittedActorR113(plain),part);
 const [version,size,hash,data]=packed.image.split(':');
 for(const image of [`${version}:1:${hash}:${data}`,`${version}:1048577:${hash}:${data}`,`${version}:${size}:${'0'.repeat(64)}:${data}`,`${version}:${size}:${hash}:${data.slice(1)}`,packed.image.slice(0,-4),'🙂'.repeat(300000)])assert.equal(decodeCommittedImageR113(image),null);
});

// Encoded images retain all deletes/nulls, but cannot substitute another owner.
test('committed image encoding rejects corrupt text and mismatched envelope before installation',async t=>{
 const s=await scene(t);const result=await s.f.database.atomic(()=>s.capture());
 const a=result.committedR113.actors[0];assert.equal(typeof a.image,'string');
 assert.equal(decodeCommittedActorR113(a).id,s.id);
 for(const altered of [{...a,image:'{'},{...a,id:'other'},{...a,epoch:a.epoch+1},{...a,next:a.next+1}])assert.equal(decodeCommittedActorR113(altered),null);
});

test('changed-state receipts skip full actor construction and roll back with the reward',async t=>{
 const s=await scene(t),{sql,id,writer,context}=s,before=sql.prepare('SELECT xp FROM players WHERE id=?').get(id).xp;
 writer.committedR113.rules.readCommittedSectionsR113=()=>{throw Error('full actor construction is forbidden for this audited delta');};
 const produce=()=>{
  sql.prepare('UPDATE players SET xp=xp+17 WHERE id=?').run(id);
  return writer.committedR113.capture(sql,'attack',{localScope:{kind:'kill'}},context,{players:[sql.prepare('SELECT * FROM players WHERE id=?').get(id)],engagement:null,result:{status:200,body:{hits:[{killed:true}]}},sharedRefresh:{version:1,actors:[id],tables:['players'],all:false}});
 };
 await assert.rejects(s.f.database.atomic(()=>{const r=produce();assert.equal(r.committedR113.version,2);throw Error('delta-before-commit');}),/delta-before-commit/);
 assert.equal(sql.prepare('SELECT xp FROM players WHERE id=?').get(id).xp,before);assert.equal(readCommitRevisionR113(sql,id),0);
 const result=await s.f.database.atomic(produce),d=result.committedR113;
 assert.equal(d.version,2);assert.equal(d.actors[0].base,0);assert.equal(d.actors[0].next,1);assert.equal(readCommitRevisionR113(sql,id),1);
 assert.equal(d.actors.some(p=>p.bundle||p.image),false);assert(d.sections.complete);
});

test('a changed-state receipt cannot apply to a different revision, epoch or process',()=>{
 const row={id:'a'},owner={epoch:2,channel:1,incarnation:'current'},c={world:{cycle:1},owners:new Map([['a',owner]]),commitRevisionsR113:new Map([['a',7]])};
 const runtime={channel:c},part={id:'a',base:7,next:8,...owner};
 for(const changed of [{base:6,next:7},{epoch:1},{incarnation:'retired'},{channel:2},{next:9}]){
  const result={players:[row],committedR113:{version:2,kind:'actor-sections',operationId:'op',cycle:1,actors:[{...part,...changed}],scope:{},sections:{}}};
  assert.equal(applyCommittedResultR113(runtime,result),false);assert.equal(c.commitRevisionsR113.get('a'),7);
 }
});
