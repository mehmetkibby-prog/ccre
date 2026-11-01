import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SharedRefreshScope} from '../shared-refresh-scope.mjs';

test('native party invitation insert, replacement and expiry only invalidate their participants',t=>{
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 // Exact V510 invitation keys; an unrelated resident must not be refreshed.
 sql.exec("CREATE TABLE players(id TEXT PRIMARY KEY);CREATE TABLE party_invites(recipient_id TEXT PRIMARY KEY,sender_id TEXT NOT NULL,created_at INTEGER NOT NULL);INSERT INTO players VALUES('alice'),('bob'),('charlie'),('unrelated');");
 const scope=new SharedRefreshScope();scope.initialize(sql);
 const run=work=>{sql.exec('BEGIN');try{const result=scope.run(sql,{sharedLease:'held'},{actor:'alice'},()=>{work();return {};});sql.exec('COMMIT');return result.sharedRefresh;}catch(error){sql.exec('ROLLBACK');throw error;}};
 const inserted=run(()=>sql.prepare('INSERT INTO party_invites VALUES(?,?,?)').run('bob','alice',1));
 assert.equal(inserted.all,false,'a native invitation must not refresh every resident');assert.deepEqual(inserted.actors,['alice','bob']);
 const replaced=run(()=>sql.prepare('UPDATE party_invites SET sender_id=?,created_at=? WHERE recipient_id=?').run('charlie',2,'bob'));
 assert.equal(replaced.all,false);assert.deepEqual(replaced.actors,['alice','bob','charlie']);
 const expired=run(()=>sql.prepare('DELETE FROM party_invites WHERE recipient_id=?').run('bob'));
 assert.equal(expired.all,false);assert.deepEqual(expired.actors,['bob','charlie']);
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM main.sqlite_schema WHERE name LIKE 'kernel511_refresh_%'").get().n,0);
});
