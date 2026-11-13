import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {setupEntry} from '../working/core511-source/scripts/core511/tests/entry-fixture.mjs';
import {ChannelOwnership} from '../working/core511-source/scripts/core511/ownership.mjs';
import {DungeonLobbyReaderR113} from '../working/core511-source/scripts/core511/dungeon-lobby-read-r113.mjs';
import {DungeonLobbyChannelR113} from '../working/core511-source/scripts/core511/dungeon-lobby-channel-r113.mjs';
import {ResourceLanes} from '../working/core511-source/scripts/core511/resource-lanes.mjs';
import {createTowerSchema} from '../working/core511-source/scripts/core511/tower-config.mjs';
import {soloDay} from '../working/native510-bb3a6cc689c6/lib/solo-dungeon.mjs';
const json=value=>JSON.parse(JSON.stringify(value));

test('query-only lobby matches native snapshot, current settings, inventory and day rollover without writes',async t=>{
 const f=await setupEntry(t);createTowerSchema(f.sql);
 const authority=new ChannelOwnership(f.f.database,{realmId:'lobby-test',now:f.clock});await authority.initialize();
 const peer={realm:'lobby-test',channel:1,incarnation:'lobby-reader'};await authority.registerProcess(1,peer.incarnation);
 const owner=await authority.admit(f.id,peer,{sessionId:f.tokenHash,guard:()=>true});
 const sql=new DatabaseSync(f.f.file,{readOnly:true});sql.exec('PRAGMA query_only=ON');t.after(()=>sql.close());
 const reader=new DungeonLobbyReaderR113(sql),params=()=>({actor:f.id,...peer,epoch:owner.epoch,nowMs:f.clock()});
 const native=()=>json(f.services.globals.__colDungeon.command(f.id,{action:'sync'}));
 const check=()=>{const before=f.sql.prepare('SELECT total_changes() n').get().n;assert.deepEqual(json(reader.read(params()).body),native());assert.equal(f.sql.prepare('SELECT total_changes() n').get().n,before);assert.equal(sql.prepare('SELECT total_changes() n').get().n,0);assert.equal(sql.isTransaction,false);};
 check();
 f.sql.prepare('INSERT OR REPLACE INTO solo_daily_entries(player_id,day,used) VALUES(?,?,?)').run(f.id,soloDay(f.clock()),2);
 f.sql.prepare("INSERT OR REPLACE INTO dungeon_materials(player_id,kind,amount) VALUES(?,'solo_key',7)").run(f.id);
 f.sql.prepare('INSERT OR REPLACE INTO dungeon_rewards(run_id,player_id,rewards,created_at) VALUES(?,?,?,?)').run('lobby-old-reward',f.id,'[{"kind":"gems","amount":10}]',f.clock());
 check();assert.equal(reader.read(params()).body.solo.used,2);
 const progression=f.sql.prepare('SELECT * FROM progression_settings WHERE id=1').get(),solo={...JSON.parse(progression.solo_json),daily_limit:7};
 f.sql.prepare('UPDATE progression_settings SET solo_json=?,revision=revision+1 WHERE id=1').run(JSON.stringify(solo));f.services.globals.__colProgression.refresh();check();
 assert.equal(reader.read(params()).body.solo.remaining,5);
 f.setTime(f.clock()+86400000);check();assert.equal(reader.read(params()).body.solo.used,0);
 for(const change of [{epoch:owner.epoch+1},{channel:2},{incarnation:'old-process'},{actor:'unknown'}])assert.throws(()=>reader.read({...params(),...change}),/dungeon_lobby_owner_fenced/);
 f.sql.prepare('INSERT INTO dungeon_members(player_id,run_id) VALUES(?,?)').run(f.id,'now-in-a-room');
 assert.throws(()=>reader.read(params()),/dungeon_lobby_has_room/);assert.equal(sql.isTransaction,false);
 assert.throws(()=>new DungeonLobbyReaderR113(f.sql).read(params()),/dungeon_lobby_read_only/);
});

function channelFixture(read,{timeoutMs=100}={}){
 const owner={channel:1,incarnation:'channel',epoch:7},lanes=new ResourceLanes();let completion;
 const c={peer:{channel:1,incarnation:'channel'},owners:new Map([['actor',owner]]),lanes,kernel:{durableGroup:(_ids,submit)=>completion=Promise.resolve(submit())}};
 const d={channel:c,incarnation:'dungeon',pending:new Map(),ready:()=>!d.pending.size,resident:{memberships:new Map(),notices:new Map([['actor',{message:'Önceki zindan tamamlandı.'}]])}};
 const lobby=new DungeonLobbyChannelR113(d,read,{timeoutMs}),action=()=>lobby.action({id:'actor',input:{command:{action:'sync'}}});
 return {owner,c,d,lobby,action,completion:()=>completion};
}
const answer={version:1,actor:'actor',channel:1,incarnation:'channel',epoch:7,body:{run:null,materials:{solo_key:1}}};
test('late or failed menu reads release input ordering without a write, replay, stale result or retained actor lease',async()=>{
 let release,reads=0;const held=new Promise(r=>release=r),s=channelFixture(()=>{reads++;return held;},{timeoutMs:15});
 s.action();assert(s.c.lanes.busy(['player:actor']));const result=await s.completion();
 assert.equal(result.code,'dungeon_read_unavailable_r113');assert.equal(s.c.lanes.busy(['player:actor']),false);assert.equal(s.d.pending.size,0);
 assert.equal(s.action().code,'dungeon_read_unavailable_r113');assert.equal(reads,1,'timeout must not multiply outstanding reads');
 release(answer);await held;await new Promise(r=>setImmediate(r));assert.equal(s.lobby.inflight.size,0);assert.equal(s.d.pending.size,0);
 s.lobby.read=async()=>answer;s.action();assert.deepEqual(await s.completion(),{...answer.body,notice:'Önceki zindan tamamlandı.'});
 s.lobby.read=async()=>{throw Object.assign(Error('worker failed'),{code:'read_worker_closed'});};s.action();assert.equal((await s.completion()).code,'dungeon_read_unavailable_r113');assert.equal(s.c.lanes.busy(['player:actor']),false);
 s.lobby.read=async()=>({...answer,actor:'another'});s.action();assert.equal((await s.completion()).code,'dungeon_read_unavailable_r113');
 assert.equal(s.lobby.action({id:'actor',input:{command:{action:'sync',attack:{skill:1}}}}),null);
 assert.equal(s.lobby.action({id:'actor',input:{command:{action:'create_solo'}}}),null);
 s.d.resident.memberships.set('actor','room');assert.equal(s.action(),null,'active rooms retain the native simulation and durable pipeline');
});
