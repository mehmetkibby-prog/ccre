import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {PlayerWriteScope} from '../player-write-scope.mjs';
import {SharedRefreshScope} from '../shared-refresh-scope.mjs';

test('player ownership tracking tolerates native UPSERT and OR REPLACE without losing the write set',t=>{
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec("CREATE TABLE players(id TEXT PRIMARY KEY,hp INTEGER);INSERT INTO players VALUES('p',10),('q',20);");
 let guarded;const authority={owner:()=>null,admission:()=>null,simulation:()=>null,commandGuard:(db,peer,r)=>{guarded=r.payload.resources;}};
 const scope=new PlayerWriteScope(authority);scope.initialize(sql);const context={actor:'p',epoch:1,peer:{channel:1,incarnation:'test'}};sql.exec('BEGIN');
 try{scope.run(sql,{},context,'native_action',()=>{
  sql.prepare("INSERT INTO players VALUES('p',2) ON CONFLICT(id) DO UPDATE SET hp=hp+excluded.hp").run();
  sql.prepare("INSERT OR REPLACE INTO players VALUES('p',13)").run();
  sql.exec("SAVEPOINT rejected;INSERT INTO players VALUES('q',2) ON CONFLICT(id) DO UPDATE SET hp=hp+excluded.hp;ROLLBACK TO rejected;RELEASE rejected;");
  assert.deepEqual(scope.ids(),['p']);assert.equal(sql.prepare('SELECT changes() n').get().n,1);return {};
 });sql.exec('COMMIT');}catch(error){sql.exec('ROLLBACK');throw error;}
 assert.deepEqual(guarded,['player:p']);assert.equal(sql.prepare("SELECT hp FROM players WHERE id='p'").get().hp,13);assert.equal(sql.prepare("SELECT hp FROM players WHERE id='q'").get().hp,20);
});

test('shared account and group tracking deduplicates overlapping native UPSERT participant sets',t=>{
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec("CREATE TABLE players(id TEXT PRIMARY KEY,account_id TEXT);CREATE TABLE accounts(id TEXT PRIMARY KEY,n INTEGER);CREATE TABLE party_members(player_id TEXT PRIMARY KEY,party_id TEXT);INSERT INTO players VALUES('p','account'),('q','account'),('unrelated','other');INSERT INTO accounts VALUES('account',0);INSERT INTO party_members VALUES('p','party'),('q','party');");
 const scope=new SharedRefreshScope();scope.initialize(sql);sql.exec('BEGIN');
 try{const result=scope.run(sql,{sharedLease:'held'},{actor:'p'},()=>{
  sql.prepare("INSERT INTO accounts VALUES('account',1) ON CONFLICT(id) DO UPDATE SET n=n+excluded.n").run();
  sql.prepare("INSERT INTO party_members VALUES('p','party') ON CONFLICT(player_id) DO UPDATE SET party_id=excluded.party_id").run();
  return {};
 });assert.deepEqual(result.sharedRefresh.actors,['p','q']);assert.equal(result.sharedRefresh.all,false);sql.exec('COMMIT');}catch(error){sql.exec('ROLLBACK');throw error;}
});

test('group observation skips legacy NULL identities and duplicate candidates',t=>{
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec("CREATE TABLE players(id TEXT PRIMARY KEY);CREATE TABLE guilds(id TEXT PRIMARY KEY,n INTEGER);CREATE TABLE guild_members(player_id TEXT,guild_id TEXT);INSERT INTO players VALUES('p'),('q');INSERT INTO guilds VALUES('guild',0);INSERT INTO guild_members VALUES('p','guild'),('p','guild'),('q','guild'),(NULL,'guild'),(NULL,'guild');");
 const scope=new SharedRefreshScope();scope.initialize(sql);sql.exec('BEGIN');
 try{const result=scope.run(sql,{sharedLease:'held'},{actor:'p'},()=>{sql.prepare("INSERT INTO guilds VALUES('guild',1) ON CONFLICT(id) DO UPDATE SET n=n+excluded.n").run();return {};});assert.equal(result.sharedRefresh.all,false);assert.deepEqual(result.sharedRefresh.actors,['p','q']);sql.exec('COMMIT');}catch(error){sql.exec('ROLLBACK');throw error;}
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM guild_members').get().n,5);
});
