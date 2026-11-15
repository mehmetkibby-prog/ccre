import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareCompact,restoreCompact} from './compact.mjs';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const CUTOFF=Date.now()-3600000;
function fixture(t,{large=false}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r122-test-')),source=dir+'/game.sqlite',target=dir+'/compact.sqlite';t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const db=new DatabaseSync(source);db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE players(id TEXT PRIMARY KEY,gold INTEGER,payload BLOB);INSERT INTO players(rowid,id,gold,payload) VALUES(9,'p',9007199254740993,X'00FF');
 CREATE TABLE equipment(id INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT REFERENCES players(id),plus INTEGER);INSERT INTO equipment(id,owner,plus) VALUES(100,'p',9);DELETE FROM equipment;INSERT INTO equipment(owner,plus) VALUES('p',15);
 CREATE TABLE inventory(owner TEXT,slot INTEGER,item TEXT,PRIMARY KEY(owner,slot)) WITHOUT ROWID;INSERT INTO inventory VALUES('p',2,'valuable');
 CREATE TABLE kernel511_channel_owners(player_id PRIMARY KEY,sequence);INSERT INTO kernel511_channel_owners VALUES('p',900);
 CREATE TABLE kernel511_system_owners(service PRIMARY KEY,sequence);INSERT INTO kernel511_system_owners VALUES('world',1200);
 CREATE TABLE kernel511_host_boot(id INTEGER PRIMARY KEY,incarnation TEXT);INSERT INTO kernel511_host_boot VALUES(1,'boot-original');
 CREATE TABLE kernel511_channel_receipts(operation_id TEXT PRIMARY KEY,created_ms INTEGER,response TEXT);
 CREATE TABLE kernel511_system_receipts(operation_id TEXT PRIMARY KEY,created_ms INTEGER,response TEXT);
 CREATE TABLE kernel511_receipt_overflow(operation_id PRIMARY KEY REFERENCES kernel511_channel_receipts(operation_id),payload TEXT);
 CREATE TABLE kernel511_committed_images_r113(operation_id TEXT,actor TEXT,created_ms INTEGER,image TEXT,PRIMARY KEY(operation_id,actor)) WITHOUT ROWID;
 CREATE TABLE kernel511_notifications(event_id TEXT PRIMARY KEY,created_ms INTEGER,payload TEXT);
 CREATE TABLE kernel511_notification_audience(actor TEXT,event_id TEXT REFERENCES kernel511_notifications(event_id),acknowledged INTEGER,PRIMARY KEY(actor,event_id)) WITHOUT ROWID;
 CREATE INDEX age_idx ON kernel511_channel_receipts(created_ms);
 CREATE TABLE game_audit(event TEXT);CREATE TRIGGER keep_trigger AFTER INSERT ON inventory BEGIN INSERT INTO game_audit VALUES(new.item);END;
 CREATE VIEW player_view AS SELECT id,gold FROM players;PRAGMA user_version=123;PRAGMA application_id=511;
 `);
 for(const table of ['kernel511_channel_receipts','kernel511_system_receipts']){
  const insert=db.prepare('INSERT INTO '+table+' VALUES(?,?,?)');insert.run('old',CUTOFF-1,'old');insert.run('boundary',CUTOFF,'keep');insert.run('new',CUTOFF+1,'new');
 }
 db.prepare('INSERT INTO kernel511_receipt_overflow VALUES(?,?)').run('old','old-overflow');db.prepare('INSERT INTO kernel511_receipt_overflow VALUES(?,?)').run('new','required-overflow');
 db.prepare('INSERT INTO kernel511_committed_images_r113 VALUES(?,?,?,?)').run('old','p',CUTOFF-1,'old-image');
 db.prepare('INSERT INTO kernel511_committed_images_r113 VALUES(?,?,?,?)').run('new','p',CUTOFF+1,'new-image');
 for(const [id,at,ack] of [['old_ack',CUTOFF-1,1],['old_unack',CUTOFF-1,0],['old_empty',CUTOFF-1,null],['new',CUTOFF+1,1]]){
  db.prepare('INSERT INTO kernel511_notifications VALUES(?,?,?)').run(id,at,'event');if(ack!==null)db.prepare('INSERT INTO kernel511_notification_audience VALUES(?,?,?)').run('p',id,ack);
 }
 if(large){db.exec('BEGIN');const ins=db.prepare('INSERT INTO kernel511_channel_receipts VALUES(?,?,zeroblob(1048576))');for(let n=0;n<160;n++)ins.run('big'+n,CUTOFF-1);db.exec('COMMIT');}
 db.exec('PRAGMA wal_checkpoint(TRUNCATE)');db.close();
 return {dir,source,target};
}
test('copy retains exact player state, rowids, large integers, blobs, sequences, schema and pending notifications',t=>{
 const f=fixture(t),before=hash(f.source),meta=prepareCompact(f.source,f.target,{cutoff:CUTOFF,minimumFree:0});
 assert.equal(hash(f.source),before);const d=new DatabaseSync(f.target,{readOnly:true});t.after(()=>d.close());
 const s=d.prepare('SELECT rowid,id,gold,hex(payload) AS payload FROM players');s.setReadBigInts(true);assert.deepEqual({...s.get()},{rowid:9n,id:'p',gold:9007199254740993n,payload:'00FF'});
 assert.equal(d.prepare('SELECT id FROM equipment').get().id,101);assert.equal(d.prepare("SELECT seq FROM sqlite_sequence WHERE name='equipment'").get().seq,101);
 assert.deepEqual(d.prepare('SELECT operation_id FROM kernel511_channel_receipts ORDER BY operation_id').all().map(r=>r.operation_id),['boundary','new']);
 assert.deepEqual(d.prepare('SELECT event_id FROM kernel511_notifications ORDER BY event_id').all().map(r=>r.event_id),['new','old_unack']);
 assert.equal(d.prepare('SELECT count(*) n FROM game_audit').get().n,0);
 assert.equal(d.prepare('SELECT sequence FROM kernel511_channel_owners').get().sequence,900);
 assert.equal(d.prepare('PRAGMA user_version').get().user_version,123);assert.equal(meta.verified,true);
});
test('low disk space stops without modifying original database',t=>{
 const f=fixture(t),before=hash(f.source);
 assert.throws(()=>prepareCompact(f.source,f.target,{cutoff:CUTOFF,minimumFree:Number.MAX_SAFE_INTEGER}),/insufficient_space/);
 assert.equal(hash(f.source),before);
});
test('schema variants are rejected before original is changed',t=>{
 const f=fixture(t),d=new DatabaseSync(f.source);d.exec('CREATE TABLE generated(a INTEGER,b INTEGER GENERATED ALWAYS AS(a+1))');d.close();const before=hash(f.source);
 assert.throws(()=>prepareCompact(f.source,f.target,{cutoff:CUTOFF,minimumFree:0}),/unsupported_generated/);assert.equal(hash(f.source),before);
});
test('compact installation preserves live inode and frees the old file with WAL recovery',async t=>{
 const f=fixture(t,{large:true}),before=fs.statSync(f.source),meta=prepareCompact(f.source,f.target,{cutoff:CUTOFF,minimumFree:0});
 assert(before.size>160*1024**2);const result=await restoreCompact(meta,{minimumFree:0});
 assert.equal(fs.statSync(f.source).ino,before.ino);assert(result.reclaimedBytes>150*1024**2);assert(fs.statSync(f.source).size<1024**2);
 const db=new DatabaseSync(f.source);assert.equal(db.prepare('SELECT sequence FROM kernel511_system_owners').get().sequence,1200);assert.equal(db.prepare('PRAGMA journal_mode').get().journal_mode,'wal');db.close();
 console.log(JSON.stringify({test:'inplace_compact',...result}));
});
test('changed backup contents stop before original installation',async t=>{
 const f=fixture(t),meta=prepareCompact(f.source,f.target,{cutoff:CUTOFF,minimumFree:0}),before=hash(f.source),d=new DatabaseSync(f.target);d.exec('UPDATE players SET gold=0');d.close();
 await assert.rejects(restoreCompact(meta,{minimumFree:0}),/backup_content_changed/);assert.equal(hash(f.source),before);
});
test('metadata tampering cannot reset the next equipment identifier',async t=>{
 const f=fixture(t),meta=prepareCompact(f.source,f.target,{cutoff:CUTOFF,minimumFree:0}),before=hash(f.source),d=new DatabaseSync(f.target);d.exec('UPDATE sqlite_sequence SET seq=0');d.close();
 await assert.rejects(restoreCompact(meta,{minimumFree:0}),/backup_metadata_changed/);assert.equal(hash(f.source),before);
});
test('interrupted post-commit install can complete without changing player state or inode',async t=>{
 const f=fixture(t,{large:true}),meta=prepareCompact(f.source,f.target,{cutoff:CUTOFF,minimumFree:0}),ino=fs.statSync(f.source).ino;
 await restoreCompact(meta,{minimumFree:0});await restoreCompact(meta,{minimumFree:0,resume:true});assert.equal(fs.statSync(f.source).ino,ino);
 const d=new DatabaseSync(f.source);assert.equal(d.prepare('SELECT sequence FROM kernel511_channel_owners').get().sequence,900);d.close();
});
test('recovery refuses a stale snapshot after a newer game boot',async t=>{
 const f=fixture(t),meta=prepareCompact(f.source,f.target,{cutoff:CUTOFF,minimumFree:0}),d=new DatabaseSync(f.source);d.exec("UPDATE kernel511_host_boot SET incarnation='next-boot';UPDATE players SET gold=12345");d.close();const before=hash(f.source);
 await assert.rejects(restoreCompact(meta,{minimumFree:0,resume:true}),/game_started_since_snapshot/);assert.equal(hash(f.source),before);
});
test('output cap stops a large permanent table without touching original',t=>{
 const f=fixture(t),d=new DatabaseSync(f.source);d.exec('INSERT INTO players VALUES(\'large\',1,zeroblob(2097152))');d.close();const before=hash(f.source);
 assert.throws(()=>prepareCompact(f.source,f.target,{cutoff:CUTOFF,minimumFree:0,maxBytes:1048576}),/full|limit/i);assert.equal(hash(f.source),before);
});
