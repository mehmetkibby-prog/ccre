import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SharedRefreshScope} from '../shared-refresh-scope.mjs';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';

test('native material UPSERT remains valid under shared refresh tracking',t=>{
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec("CREATE TABLE players(id TEXT PRIMARY KEY);INSERT INTO players VALUES('p');CREATE TABLE dungeon_materials(player_id TEXT,kind TEXT,amount INTEGER,PRIMARY KEY(player_id,kind));INSERT INTO dungeon_materials VALUES('p','weathered_iron',7);");
 const scope=new SharedRefreshScope();scope.initialize(sql);sql.exec('BEGIN');
 try{const result=scope.run(sql,{sharedLease:'held'},{actor:'p'},()=>{
  const upsert=sql.prepare("INSERT INTO dungeon_materials(player_id,kind,amount) VALUES('p','weathered_iron',?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount RETURNING amount");
  assert.equal(upsert.get(3).amount,10);assert.equal(upsert.get(2).amount,12);return {};
 });assert.equal(result.sharedRefresh.all,false);assert.deepEqual(result.sharedRefresh.actors,['p']);sql.exec('COMMIT');}catch(error){sql.exec('ROLLBACK');throw error;}
 assert.equal(sql.prepare("SELECT amount FROM dungeon_materials WHERE player_id='p' AND kind='weathered_iron'").get().amount,12);
});

test('real native collect stacks an existing material once and replay cannot duplicate it',{timeout:60000},async t=>{
 const s=await httpActionFixture(t),{f,core,writer}=s,dropId='r21-existing-material-drop';
 await core.permanentPlayers([f.id],()=>{
  f.sql.prepare("UPDATE players SET area='forest',x=1000,y=1000,hp=max_hp,combat_lock_until_ms=0 WHERE id=?").run(f.id);
  put(f.sql,'dungeon_materials',{player_id:f.id,kind:'weathered_iron',amount:7});
  put(f.sql,'world_drops',{id:dropId,owner_id:f.id,monster_id:'golge-r21-material',kind:'weathered_iron',item_name:'Native material',rarity:'white',power:0,amount:3,role:null,enchantments:'[]',x:1000,y:1000,expires_at:Math.floor(f.clock()/1000)+600,collectible_at:Math.floor(f.clock()/1000)});
 });
 const original=writer.command.bind(writer);let captured;
 writer.command=async(peer,request)=>{if(request.operation==='native_action'&&request.payload.input.action==='collect'&&!captured)captured={peer,request};return original(peer,request);};
 const amount=()=>f.sql.prepare('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(f.id,'weathered_iron').amount;
 async function send(sequence){s.live.ws.send(JSON.stringify({type:'input',sequence,payload:{action:'collect',targetId:dropId}}));await until(()=>s.live.packets.some(p=>p.results?.some(r=>r.sequence===sequence))||s.faults.length,8000);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));return s.live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);}
 const collected=await send(1);assert.equal(collected.status,200,JSON.stringify(collected));assert.equal(amount(),10);assert.equal(f.sql.prepare('SELECT id FROM world_drops WHERE id=?').get(dropId),undefined);
 assert(captured);const replay=await original(captured.peer,captured.request);assert.equal(replay.result.result.status,200);assert.equal(amount(),10);
 assert.equal((await send(2)).status,404);assert.equal(amount(),10);assert.equal(s.faults.length,0);
});
