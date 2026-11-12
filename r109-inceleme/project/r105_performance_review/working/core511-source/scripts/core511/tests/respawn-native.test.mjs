import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {BASE,native,hash,temporary,until} from './helpers.mjs';
import {setupPvp,put,update,json} from './pvp-fixture.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter,OrderedSystemClient} from '../system-writer.mjs';
import {createRespawnHandler,respawnBase,MonsterLifecycle} from '../monster-lifecycle.mjs';
import {createRespawnRules} from '../generated/respawn-rules.mjs';
import {nativeAtomicStatements} from '../retaliation-writer.mjs';
import {actionRandom} from '../action-writer.mjs';
import {SharedWorldMemory} from '../shared-world.mjs';
import {WorldClock} from '../world-clock.mjs';
import {CombatCheckpoints} from '../combat-checkpoint.mjs';
import {ResourceLanes} from '../resource-lanes.mjs';
const source=fs.readFileSync(path.join(BASE,'dist-vds/server/channel-runtime/index.mjs'),'utf8'),proof=JSON.parse(fs.readFileSync(new URL('../generated/respawn-proof.json',import.meta.url))),rune=await native('lib/rune-v2.mjs'),lab=await native('vds-server/src/loadlab-gameplay.mjs');
function originalPlan(globals,seed){
 const declarations=proof.dependencies.map(r=>{const text=source.slice(r.start,r.end);return /^(?:async )?function\b|^class\b/.test(text)?text:'var '+text+';';}).join('\n');
 return Function('globalThis','Math','RUNE_V2_BOSS_SPAWN','isRuneV2Boss','colLabIsMonster','colLabMonsterActive',declarations+'\nreturn function(database,settings,monsters,now){const due={results:monsters};'+source.slice(proof.plan.start,proof.plan.end)+'return respawns;}')(globals,Object.assign(Object.create(Math),{random:actionRandom(seed).random}),rune.RUNE_V2_BOSS_SPAWN,rune.isRuneV2Boss,lab.colLabIsMonster,lab.colLabMonsterActive);
}
const recipes=[['golge-respawn-native','forest'],['curuk-respawn-native','frozen'],['yutan-black-c1-1','black'],['custom-native','forest'],['summoned-native','sinsi',{summoned:1}],['sinsi-stone-c1-1','sinsi',{is_stone:1}],['boss-native511','sanctum',{channel:0,is_boss:1}],['stone-boss-black-c1','black'],['frozen-boss-1','frozen'],['ancient-boss-1','ancient'],['frozen-water-c1-1','frozen'],['rune-tide-c1-1','rune'],['rune-v2-boss-c1-1','rune_v2'],['rune-v2-warden-c1-1','rune_v2'],['golge-ancient-c1-1','ancient'],['golge-afk-c1-1','afk']];
async function fixture(t){
 const f=await setupPvp(t),authority=new ChannelOwnership(f.f.database,{realmId:'respawn-native'});await authority.initialize();const writer=new SystemWriter(f.f.database,{realmId:'respawn-native',authority}),services=new NativeGameServices(f.sql,{clock:()=>f.nowMs});await writer.initialize();writer.add('monster_respawn',createRespawnHandler({services,clock:()=>f.nowMs}));
 const peers=[0,1,4].map(channel=>({realm:'respawn-native',channel,incarnation:'respawn'+channel,...(channel===0?{role:'world'}:{})}));for(const peer of peers){if(peer.channel)await authority.registerProcess(peer.channel,peer.incarnation);await writer.register(peer);}
 const rows=[];for(const [id,area,extra]of recipes){const patch={name:id,area,channel:1,x:1000,y:1000,hp:0,max_hp:13,respawn_at:Math.floor(f.nowMs/1000)-1,spawn_round:17,is_boss:0,is_stone:0,summoned:0,variant:'normal',...extra};if(f.sql.prepare('SELECT 1 FROM monsters WHERE id=?').get(id))update(f.sql,'monsters',id,patch);else put(f.sql,'monsters',{id,...patch});rows.push({...f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(id)});}
 return {...f,authority,writer,services,peers,rows};
}
const capture=(f,rows=f.rows)=>rows.map(r=>({...f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(r.id)}));
test('native respawn planner and every helper stay bound to pinned V510 source',()=>{
 assert.equal(hash(source),proof.sourceSha256);assert.equal(hash(source.slice(proof.plan.start,proof.plan.end)),proof.plan.sha256);assert.equal(hash(fs.readFileSync(new URL('../generated/respawn-rules.mjs',import.meta.url))),proof.generatedSha256);
 const plan=createRespawnRules({globals:{}}).plan.toString();assert(plan.includes(source.slice(proof.plan.start,proof.plan.end)),'original SQL planner body is unchanged');
});
test('sixteen respawn families match original SQL rows with seeded variants, native profiles and enabled/disabled bosses',async t=>{
 const f=await fixture(t),db=nativeAtomicStatements(f.sql),rules=createRespawnRules({globals:f.services.globals});let cases=0;
 for(const enabled of [0,1])for(const seed of ['1','5','e'].map(c=>c.repeat(64))){
  f.sql.prepare('UPDATE combat_settings SET black_stone_boss_enabled=?,frozen_zone_enabled=?,frozen_boss_enabled=?,ancient_boss_enabled=?,frozen_water_enabled=? WHERE id=1').run(...Array(5).fill(enabled));
  for(const row of f.rows){const {id,...values}=row;update(f.sql,'monsters',id,values);}
  const settings={...rules.defaults,...f.sql.prepare('SELECT * FROM game_settings').get(),...f.sql.prepare('SELECT * FROM economy_settings').get(),...f.sql.prepare('SELECT * FROM combat_settings').get()};
  const original=originalPlan(f.services.globals,seed);await f.f.database.atomic(()=>f.services.run({nowMs:f.nowMs,seed},()=>db.batch(original(db,settings,f.rows,Math.floor(f.nowMs/1000)))));const expected=capture(f);
  for(const row of f.rows){const {id,...values}=row;update(f.sql,'monsters',id,values);}
  for(const peer of f.peers.filter(p=>p.channel!==4)){const rows=f.rows.filter(r=>r.channel===peer.channel),owner=f.writer.owner(peer.channel?'channel:'+peer.channel:'world');await f.writer.command(peer,{epoch:owner.epoch,sequence:owner.sequence+1,key:'parity-'+enabled+'-'+seed[0]+'-'+peer.channel,kind:'monster_respawn',payload:{nowMs:f.nowMs,seed,monsters:rows.map(respawnBase)}});}
  assert.deepEqual(capture(f),expected);cases+=f.rows.length;
 }
 assert.equal(cases,96);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_admissions').get().n,0);
});
test('fourth-channel rune boss, black stone and black-slot profiles use the native channel family',async t=>{
 const f=await fixture(t),peer=f.peers.find(p=>p.channel===4),rows=[];
 for(const id of ['rune-v2-boss-c1-1','stone-boss-black-c1','yutan-black-c1-1','rune-tide-c1-1']){const row={...f.rows.find(m=>m.id===id),id:id.replace('-c1','-c4'),channel:4};if(f.sql.prepare('SELECT 1 FROM monsters WHERE id=?').get(row.id)){const {id,...patch}=row;update(f.sql,'monsters',id,patch);}else put(f.sql,'monsters',row);rows.push(row);}
 f.sql.prepare('UPDATE combat_settings SET black_stone_boss_enabled=1 WHERE id=1').run();const owner=f.writer.owner('channel:4');
 await f.writer.command(peer,{epoch:owner.epoch,sequence:1,key:'fourth-respawn',kind:'monster_respawn',payload:{nowMs:f.nowMs,seed:'4'.repeat(64),monsters:rows.map(respawnBase)}});
 for(const m of capture(f,rows)){assert(m.hp>13,m.id);assert.equal(m.hp,m.max_hp);assert.equal(m.spawn_round,18);assert.equal(m.respawn_at,0);}
 const boss=f.sql.prepare("SELECT * FROM monsters WHERE id='rune-v2-boss-c4-1'").get();assert.equal(boss.variant,'rune_v2_boss');assert.equal(boss.x,rune.RUNE_V2_BOSS_SPAWN.x);assert.equal(boss.y,rune.RUNE_V2_BOSS_SPAWN.y);
});
test('respawn rejects a changed death/spawn or foreign channel without advancing its process receipt',async t=>{
 const f=await fixture(t),peer=f.peers[1],owner=f.writer.owner('channel:1'),payload={nowMs:f.nowMs,seed:'8'.repeat(64),monsters:[respawnBase(f.rows[0])]},request={epoch:owner.epoch,sequence:1,key:'stale-respawn',kind:'monster_respawn',payload};
 update(f.sql,'monsters',f.rows[0].id,{spawn_round:18});await assert.rejects(f.writer.command(peer,request),/respawn_snapshot_conflict/);assert.equal(f.writer.owner('channel:1').sequence,0);
 await assert.rejects(f.writer.command(f.peers[2],request),/respawn_scope/);assert.equal(f.writer.owner('channel:4').sequence,0);
});
test('respawn target stays leased through fsync and refresh; a delayed ACK cannot schedule a second spawn',async t=>{
 const f=await fixture(t),peer=f.peers[0],row=f.rows.find(m=>m.channel===0),view=new SharedWorldMemory(),lanes=new ResourceLanes();view.setMonster(row);
 const client=new OrderedSystemClient({owner:f.writer.owner('world'),request:r=>f.writer.command(peer,r)}),journal=new CombatCheckpoints({submit:e=>client.submit(e)});journal.hydrate('monsters',[row]);
 const clock=new WorldClock({view,owns:m=>m.channel===0,blocked:id=>lanes.busy(['monster:'+id]),changed:c=>journal.changed(c)}),faults=[],lifecycle=new MonsterLifecycle({clock,settings:()=>f.settings,view,lanes,journal,submit:e=>client.submit(e),committed:r=>r.monsters.forEach(m=>view.setMonster(m)),onFatal:e=>faults.push(e)});
 const durable=f.f.database.durableAfterCommit.bind(f.f.database);let release;const hold=new Promise(r=>release=r);f.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>hold);
 try{lifecycle.tick(f.nowMs);const pending=lifecycle.pending;assert(pending);await until(()=>f.sql.prepare('SELECT spawn_round FROM monsters WHERE id=?').get(row.id).spawn_round===18);assert.equal(view.monster(row.id).spawn_round,17);assert(lanes.busy(['monster:'+row.id]));
  lifecycle.tick(f.nowMs+2000);assert.equal(lifecycle.pending,pending);assert.equal(client.sequence,0);release();await pending;assert.equal(view.monster(row.id).spawn_round,18);assert.equal(view.monster(row.id).hp,view.monster(row.id).max_hp);assert(!lanes.busy(['monster:'+row.id]));assert.equal(client.sequence,1);assert.equal(faults.length,0);
 }finally{release();f.f.database.durableAfterCommit=durable;await lifecycle.drain();}
});
test('actual SIGKILL on either side of respawn COMMIT changes native HP, variant and spawn only once',async t=>{
 const f=await fixture(t),dir=temporary(t),peer=f.peers[1],owner=f.writer.owner('channel:1'),rows=f.rows.filter(r=>r.channel===1),request={epoch:owner.epoch,sequence:1,key:'respawn-crash',kind:'monster_respawn',payload:{nowMs:f.nowMs,seed:'a'.repeat(64),monsters:rows.map(respawnBase)}},input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify({peer,request}));f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(f.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'respawn-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null,stderr);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_respawn':'durable_respawn_before_ack');
  const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const saved=()=>rows.map(r=>({...db.sqlite.prepare('SELECT * FROM monsters WHERE id=?').get(r.id)})),before=saved();assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,phase==='before'?0:1);if(phase==='before')assert.deepEqual(before,rows);else assert.notDeepEqual(before,rows);
   const authority=new ChannelOwnership(db,{realmId:peer.realm}),writer=new SystemWriter(db,{realmId:peer.realm,authority}),services=new NativeGameServices(db.sqlite,{clock:()=>f.nowMs});writer.add('monster_respawn',createRespawnHandler({services,clock:()=>f.nowMs}));const first=await writer.command(peer,request),onceState=saved();assert.deepEqual(json(await writer.command(peer,request)),json(first));assert.deepEqual(saved(),onceState);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,1);
  }finally{db.close();}
 }
});
