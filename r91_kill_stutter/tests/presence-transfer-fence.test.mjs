import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {native,temporary,until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';
import {ChannelOwnership} from '../working/core511-source/scripts/core511/ownership.mjs';
import {WriterPresence} from '../working/core511-source/scripts/core511/presence.mjs';
import {installGroupCommit} from '../working/core511-source/scripts/core511/group-commit.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');

test('a committed transfer with held fsync cannot make an unrelated game transaction write stale presence or fail',async t=>{
 const db=new LocalDatabase(path.join(temporary(t),'presence.sqlite'),{create:true,groupWrites:true,asyncDurable:true});t.after(async()=>{db.close();await db.walSync.closing;});installGroupCommit(db);
 const a=new ChannelOwnership(db,{realmId:'presence-transfer'});await a.initialize();
 await db.atomic(sql=>sql.exec("CREATE TABLE players(id TEXT PRIMARY KEY,last_seen INTEGER,channel INTEGER DEFAULT 1,area TEXT DEFAULT 'forest'); CREATE TABLE castle_entries_r59(player_id TEXT PRIMARY KEY); INSERT INTO players(id,last_seen) VALUES('moving',1),('playing',1); CREATE TABLE unrelated_game_events(id INTEGER PRIMARY KEY);"));
 const old={channel:1,incarnation:'old-process'},target={channel:4,incarnation:'target-process'};await a.registerProcess(1,old.incarnation);await a.registerProcess(4,target.incarnation);
 const moving=await a.admit('moving',old,{sessionId:'moving-session',guard:()=>true}),playing=await a.admit('playing',old,{sessionId:'playing-session',guard:()=>true});
 // Exactly the production window: COMMIT is SQL-visible, but the supervisor
 // mirror cannot advance before the corresponding WAL durability ACK.
 const mirror=new Map([['moving',{...moving,admitted:true}],['playing',{...playing,admitted:true}]]);a.presenceOwner=id=>mirror.get(id);
 const presence=new WriterPresence(a,{clock:()=>100000}),stamp={actor:'moving',epoch:moving.epoch,at:100000};presence.receive(old,[stamp,{actor:'playing',epoch:playing.epoch,at:100000}]);
 const flush=db.walSync.flush.bind(db.walSync);let release,ack=false;
 db.walSync.flush=async()=>{await new Promise(r=>release=r);return flush();};
 const request={epoch:moving.epoch,targetChannel:4,transferId:'presence-transfer-id'};
 const transfer=a.beginOwnedTransfer('moving',old,request).then(x=>{ack=true;return x;});await until(()=>release);
 let written,error;const other=db.atomic(sql=>{try{written=presence.materialize(sql);sql.prepare('INSERT INTO unrelated_game_events VALUES(1)').run();}catch(e){error=e;throw e;}}).catch(e=>{error=e;});
 await until(()=>error||db.sqlite.prepare('SELECT COUNT(*) n FROM unrelated_game_events').get().n===1);
 assert.equal(ack,false);db.walSync.flush=flush;release();await transfer;await other;
 assert.equal(error,undefined,'unrelated transaction must not fail on a retiring presence stamp');assert.deepEqual(written.map(x=>x.actor),['playing']);
 assert.equal(db.sqlite.prepare('SELECT last_seen FROM players WHERE id=?').get('moving').last_seen,1);assert.equal(db.sqlite.prepare('SELECT last_seen FROM players WHERE id=?').get('playing').last_seen,100);
 // No ownership rule is relaxed: commands against released/old epochs and
 // stale heartbeats still reject. A transfer ACK remains after its own fsync.
 await a.release('moving',old,{...request,finalSequence:0});
 await assert.rejects(a.resume('moving',old,{epoch:moving.epoch,sessionId:'moving-session'}),/owner_epoch_fenced/);
 const next=await a.acceptOwnedTransfer('moving',target,request,()=>true);assert.equal(next.epoch,moving.epoch+1);
 await db.atomic(sql=>{const rows=presence.materialize(sql);assert(!rows.some(x=>x.actor==='moving'));});
 assert.equal(db.sqlite.prepare('SELECT last_seen FROM players WHERE id=?').get('moving').last_seen,1);
 mirror.set('moving',{...next,admitted:true});assert.throws(()=>presence.receive(old,[stamp]),/presence_owner_fenced/);
 await assert.rejects(a.resume('moving',old,{epoch:moving.epoch,sessionId:'moving-session'}),/owner_epoch_fenced/);
 presence.receive(target,[{actor:'moving',epoch:next.epoch,at:100000}]);await a.disconnectProcess(4,target.incarnation);
 await db.atomic(sql=>{const rows=presence.materialize(sql);assert(!rows.some(x=>x.actor==='moving'));});
 await assert.rejects(a.resume('moving',target,{epoch:next.epoch,sessionId:'moving-session'}),/channel_process_fenced/);
});
