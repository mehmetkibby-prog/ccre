import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {GameWriter} from '../working/core511-source/scripts/core511/writer-runtime.mjs';
import {ChannelOwnership} from '../working/core511-source/scripts/core511/ownership.mjs';
import {WriterPresence} from '../working/core511-source/scripts/core511/presence.mjs';

test('reward mirror uses indexed presence keys and rereads admission/epoch on every command',async()=>{
 const sql=new DatabaseSync(':memory:'),database={sqlite:sql,atomic:async fn=>{sql.exec('BEGIN IMMEDIATE');try{const r=fn(sql);sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 try{
  const authority=new ChannelOwnership(database,{realmId:'reward-owner-test'});await authority.initialize();
  sql.exec("CREATE TABLE players(id TEXT PRIMARY KEY,last_seen INTEGER); INSERT INTO players VALUES('active',1),('stale',1),('offline',1);");
  const peer={channel:1,incarnation:'process'};await authority.registerProcess(1,peer.incarnation);
  for(const id of ['active','stale','offline'])await authority.admit(id,peer,{sessionId:'session-'+id,guard:()=>true});
  sql.prepare('DELETE FROM kernel511_admissions WHERE player_id=?').run('offline');
  const writer={database,owners:new Map()},refresh=rows=>GameWriter.prototype.refreshOwners.call(writer,rows);
  const rows=['active','stale','offline','missing','active'].map(actor=>({actor,epoch:1,channel:1,incarnation:'process',at:100000,version:1}));
  refresh(rows);assert.equal(writer.owners.size,3);assert.equal(writer.owners.get('offline').admitted,false);
  const prior=writer.owners;
  sql.prepare('UPDATE kernel511_channel_owners SET epoch=2 WHERE player_id=?').run('stale');
  refresh(rows);assert.notEqual(writer.owners,prior);assert.equal(writer.owners.get('stale').admitted,false);
  authority.presenceOwner=id=>writer.owners.get(id);const presence=new WriterPresence(authority,{clock:()=>100000});presence.rows=new Map(rows.map(r=>[r.actor,r]));
  sql.exec('BEGIN IMMEDIATE');const written=presence.materialize(sql);sql.exec('COMMIT');
  assert.deepEqual(written.map(r=>r.actor),['active']);
  assert.deepEqual(sql.prepare('SELECT id,last_seen FROM players ORDER BY id').all().map(r=>({...r})),[{id:'active',last_seen:100},{id:'offline',last_seen:1},{id:'stale',last_seen:1}]);
  refresh([]);assert.equal(writer.owners.size,0,'an empty envelope cannot keep a previous admitted mirror');
  refresh([{actor:'missing'}]);assert.equal(writer.owners.size,0);
  refresh();assert.equal(writer.owners.size,3,'main-process complete mirror still includes offline and retiring owners');
  assert.equal(writer.owners.get('stale').epoch,2);
  const plan=sql.prepare('EXPLAIN QUERY PLAN SELECT o.*,CASE WHEN a.player_id IS NULL THEN 0 ELSE 1 END AS admitted FROM kernel511_channel_owners o LEFT JOIN kernel511_admissions a ON a.player_id=o.player_id AND a.channel=o.channel AND a.epoch=o.epoch WHERE o.player_id IN (SELECT value FROM json_each(?))').all('["active"]');
  assert(plan.some(r=>/SEARCH o USING INDEX .*\(player_id=\?\)/.test(r.detail)),JSON.stringify(plan));
  assert(!plan.some(r=>/^SCAN o\b/.test(r.detail)),JSON.stringify(plan));
 }finally{sql.close();}
});
