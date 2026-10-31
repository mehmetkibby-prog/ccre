// Real shipped LocalDatabase, checkpoint handlers, process ownership, system
// writer/client, actor receipt authority and joined-death/barrier modules.
// The terminal handler below is a deliberately small SQL fixture, not the
// unavailable full native attack/loot/XP handler; these tests make no such claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {native} from '../r82-work/core511-source/scripts/core511/tests/helpers.mjs';
import {ChannelAuthority} from '../r82-work/core511-source/scripts/core511/receipt-authority.mjs';
import {SystemWriter,OrderedSystemClient} from '../r82-work/core511-source/scripts/core511/system-writer.mjs';
import {createCombatCheckpointHandler} from '../r82-work/core511-source/scripts/core511/combat-checkpoint.mjs';
import {createActorCheckpointHandler} from '../r82-work/core511-source/scripts/core511/actor-checkpoint.mjs';
import {joinedFixture,deferred,until,turn,monster,unpackCheckpointR54,assertReleased,assertFenced} from './checkpoint-fixture.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
const peer={realm:'r82-checkpoint-fixture',channel:1,incarnation:'r82-checkpoint-boot'};

async function fixture(t,{systemHold=deferred()}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r82-checkpoint-')),file=path.join(dir,'game.sqlite');
 const db=new LocalDatabase(file,{create:true,groupWrites:true,asyncDurable:true});
 t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});
 const requests=[],handler=createCombatCheckpointHandler({assertResources:(sql,p,c)=>p.monsters.every(r=>sql.prepare('SELECT channel FROM monsters WHERE id=?').get(r.current.id)?.channel===c.peer.channel)});
 let authority;
 const f=joinedFixture({deathSubmit:async event=>{const request={playerId:event.actor,epoch:1,sequence:1,operationId:event.key,operation:'fixture_death',payload:event.payload};requests.push(request);return authority.command(peer,request);}});
 const row=f.state.read('players','actor-1');
 db.sqlite.exec('CREATE TABLE players('+Object.entries(row).map(([name,value])=>'"'+name+'" '+(typeof value==='string'?'TEXT':'REAL')+(name==='id'?' PRIMARY KEY':'')).join(',')+');');
 db.sqlite.prepare('INSERT INTO players VALUES('+Object.keys(row).map(()=>'?').join(',')+')').run(...Object.values(row));
 db.sqlite.exec(`CREATE TABLE monsters(id TEXT PRIMARY KEY,area TEXT,channel INTEGER,spawn_round INTEGER,is_boss INTEGER,is_stone INTEGER,max_hp INTEGER,hp INTEGER,last_damaged_at_ms INTEGER,last_regen_at_ms INTEGER,root_until_ms INTEGER,stun_until_ms INTEGER,control_x REAL,control_y REAL,wave_stage INTEGER);
 CREATE TABLE monster_participants(monster_id TEXT,spawn_round INTEGER,player_id TEXT,created_at INTEGER,stone_damage476 INTEGER,stone_first_hit_at_ms476 INTEGER);
 CREATE TABLE boss_participants(boss_round INTEGER,player_id TEXT,hit_count INTEGER,total_damage INTEGER,created_at INTEGER);
 CREATE TABLE combat_events(player_id TEXT,target_id TEXT,role TEXT,ability INTEGER,created_at INTEGER);
 CREATE TABLE fixture_rewards(target_id TEXT PRIMARY KEY,awards INTEGER NOT NULL);`);
 for(const id of ['dying','other'])db.sqlite.prepare('INSERT INTO monsters VALUES('+Object.keys(monster(id)).map(()=>'?').join(',')+')').run(...Object.values(monster(id)));
 const actorHandler=createActorCheckpointHandler(),observations=[];
 authority=new ChannelAuthority(db,{realmId:peer.realm,operations:{fixture_death:{execute:(sql,{payload,operationId})=>{
  const checkpoint=unpackCheckpointR54(payload.checkpointR53);assert(checkpoint);
  observations.push({targetHp:sql.prepare('SELECT hp FROM monsters WHERE id=?').get('dying').hp,otherHp:sql.prepare('SELECT hp FROM monsters WHERE id=?').get('other').hp});
  const actorAcks=checkpoint.actors.map(a=>({id:a.actor,...actorHandler(sql,a.payload,{actor:a.actor})}));
  handler(sql,checkpoint.combat,{peer});
  assert.equal(sql.prepare('UPDATE monsters SET hp=0 WHERE id=? AND hp>0').run('dying').changes,1);
  sql.prepare('INSERT INTO fixture_rewards VALUES(?,1)').run('dying');
  return {key:operationId,result:{players:[{...sql.prepare('SELECT * FROM players WHERE id=?').get('actor-1')}],monsters:[{...sql.prepare('SELECT * FROM monsters WHERE id=?').get('dying')}],participants:[],bossParticipants:[],events:[[1,1,'forest',{type:'fixture-death'}]],checkpointR53:actorAcks,result:{status:200,body:{ok:true}}}};
 }}}});
 await authority.initialize();await authority.registerProcess(1,peer.incarnation);await authority.claim('actor-1',1,peer.incarnation);
 const writer=new SystemWriter(db,{realmId:peer.realm,authority});await writer.initialize();writer.add('combat_checkpoint',handler);
 const owner=await writer.register(peer),systemReady=deferred(),sent=[];
 const client=new OrderedSystemClient({owner,request:async request=>{sent.push(request);const ack=await writer.command(peer,request);systemReady.resolve();await systemHold.promise;return ack;}});
 f.journal.submit=event=>client.submit(event);f.journal.submitBatch=events=>client.submitBatch(events);
 return {...f,db,authority,writer,client,systemHold,systemReady,requests,sent,observations};
}

test('real SQLite disjoint death commits before an unrelated transported ACK, waits for its own WAL ACK, and replays once',async t=>{
 const f=await fixture(t);f.journal.changed({monsters:[monster('other',80)]});const checkpoint=f.journal.flush();
 await f.systemReady.promise;assert.equal(f.db.sqlite.prepare('SELECT hp FROM monsters WHERE id=?').get('other').hp,80);assert.equal(f.client.sequence,0);
 const ownDurable=deferred(),durable=f.db.durableAfterCommit.bind(f.db);f.db.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>ownDurable.promise);
 const {barrier}=f.start();await until(()=>f.db.sqlite.prepare('SELECT COUNT(*) n FROM fixture_rewards').get().n===1);
 assert.equal(f.writes.length,1);assert.equal(f.published.length,0);assert(f.kernel.players.get('actor-1').barrier);assert.equal(f.client.sequence,0);
 ownDurable.resolve();await barrier;await turn();assertReleased(f);assert.equal(f.published.length,1);assert(f.journal.pending);assert.deepEqual(f.observations,[{targetHp:100,otherHp:80}]);
 assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,1);
 const replay=await f.authority.command(peer,f.requests[0]);assert.equal(replay.key,'death-fixture');assert.equal(f.db.sqlite.prepare('SELECT awards FROM fixture_rewards').get().awards,1);assert.equal(f.observations.length,1);
 f.systemHold.resolve();await checkpoint;assert.equal(f.client.sequence,1);assert.equal(f.db.sqlite.prepare('SELECT hp FROM monsters WHERE id=?').get('dying').hp,0);
 // An old checkpoint cannot resurrect the newly durable death.
 const bad={...f.sent[0],sequence:2,key:'stale-dying-checkpoint',payload:{monsters:[{base:monster('dying'),current:monster('dying',80)}],participants:[],bossParticipants:[],combatEvents:[]}};
 await assert.rejects(f.writer.command(peer,bad),/combat_checkpoint_conflict/);assert.equal(f.writer.owner('channel:1').sequence,1);assert.equal(f.db.sqlite.prepare('SELECT hp FROM monsters WHERE id=?').get('dying').hp,0);
});

test('real SQLite same-target checkpoint ACK precedes joined capture, death and its unique receipt',async t=>{
 const f=await fixture(t);f.journal.changed({monsters:[monster('dying',80)]});const checkpoint=f.journal.flush();await f.systemReady.promise;
 const {barrier}=f.start();await turn();assert.equal(f.writes.length,0);assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM fixture_rewards').get().n,0);
 f.systemHold.resolve();await checkpoint;await barrier;await turn();assertReleased(f);assert.deepEqual(f.observations,[{targetHp:80,otherHp:100}]);assert.equal(f.db.sqlite.prepare('SELECT awards FROM fixture_rewards').get().awards,1);
 await f.authority.command(peer,f.requests[0]);assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,1);assert.equal(f.observations.length,1);
});

test('real durable death plus lost unrelated ACK retains global failure fences without duplicate replay effects',async t=>{
 const f=await fixture(t);f.journal.changed({monsters:[monster('other',80)]});const checkpoint=f.journal.flush();checkpoint.catch(()=>{});await f.systemReady.promise;
 const ownDurable=deferred(),durable=f.db.durableAfterCommit.bind(f.db);f.db.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>ownDurable.promise);
 const {barrier}=f.start();await until(()=>f.db.sqlite.prepare('SELECT COUNT(*) n FROM fixture_rewards').get().n===1);
 const failure=Error('transported-system-ACK-lost');f.systemHold.reject(failure);await assert.rejects(checkpoint,e=>e===failure);
 ownDurable.resolve();await assert.rejects(barrier,/combat_checkpoint_fenced/);await turn();assertFenced(f);assert.equal(f.published.length,0);
 assert.equal(f.db.sqlite.prepare('SELECT awards FROM fixture_rewards').get().awards,1);await f.authority.command(peer,f.requests[0]);assert.equal(f.db.sqlite.prepare('SELECT awards FROM fixture_rewards').get().awards,1);assert.equal(f.observations.length,1);
});
