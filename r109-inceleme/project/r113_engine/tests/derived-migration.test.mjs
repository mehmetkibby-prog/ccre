import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,statSync,readFileSync,writeFileSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {migrateDerivedR113,SCHEMA_R113} from '../deployment/modules/derived-migration.mjs';
import {initializeCommittedResultsR113} from '../../r109_latency_completion/working/core511-source/scripts/core511/committed-result-r113.mjs';
function fixture(t,{existing=false}={}){
 const dir=mkdtempSync(join(tmpdir(),'r113-derived-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const database=join(dir,'game.sqlite'),backup=join(dir,'derived.sqlite'),db=new DatabaseSync(database);
 db.exec('PRAGMA journal_mode=WAL;CREATE TABLE players(id TEXT PRIMARY KEY,xp INTEGER);INSERT INTO players VALUES(\'person\',37)');
 if(existing){initializeCommittedResultsR113(db);db.prepare('INSERT INTO kernel511_actor_revision_r113 VALUES(?,?)').run('person',8);db.prepare('INSERT INTO kernel511_committed_images_r113 VALUES(?,?,?,?,?,?,?)').run('op','person',2,1,'owner',100,'{"private":true}');}
 db.close();const st=statSync(database),config={database,backup,identity:{path:database,device:st.dev,inode:st.ino}};
 const prepare=()=>migrateDerivedR113({...config,action:'prepare'}),apply=record=>migrateDerivedR113({...config,action:'apply',sha256:record.sha256});
 return {dir,config,prepare,apply};
}
function inspect(config,fn){const db=new DatabaseSync(config.database);try{return fn(db);}finally{db.close();}}
test('new migration backs up only affected derived state and never copies or restores players',t=>{
 const s=fixture(t),backup=s.prepare();assert(Object.values(backup.data).every(r=>r.count===0));
 const saved=new DatabaseSync(backup.path,{readOnly:true});try{assert.equal(saved.prepare("SELECT name FROM sqlite_schema WHERE name='players'").get(),undefined);assert.equal(Object.values(saved.prepare('PRAGMA quick_check').get())[0],'ok');}finally{saved.close();}
 inspect(s.config,db=>db.exec("UPDATE players SET xp=103 WHERE id='person'"));
 assert.equal(s.apply(backup).playerDataChanged,false);
 inspect(s.config,db=>{initializeCommittedResultsR113(db);assert.equal(db.prepare('SELECT xp FROM players').get().xp,103);for(const t of SCHEMA_R113)assert.equal(db.prepare(`SELECT COUNT(*) n FROM ${t.name}`).get().n,0);});
 assert.equal(s.apply(backup).applied,true,'a restart before services start is idempotent');
});
test('existing compatible rows are backed up consistently and retained exactly',t=>{
 const s=fixture(t,{existing:true}),backup=s.prepare();assert.equal(backup.data.kernel511_actor_revision_r113.count,1);assert.equal(backup.data.kernel511_committed_images_r113.count,1);
 assert.equal(s.prepare().sha256,backup.sha256);s.apply(backup);
 inspect(s.config,db=>{assert.equal(db.prepare('SELECT revision FROM kernel511_actor_revision_r113').get().revision,8);assert.equal(db.prepare('SELECT image FROM kernel511_committed_images_r113').get().image,'{"private":true}');});
});
test('changed derived rows and corrupt backups are rejected before any schema mutation',t=>{
 const s=fixture(t,{existing:true}),backup=s.prepare();inspect(s.config,db=>db.exec('UPDATE kernel511_actor_revision_r113 SET revision=9'));
 assert.throws(()=>s.apply(backup),/derived_data_changed_after_backup/);inspect(s.config,db=>assert.equal(db.prepare('SELECT revision FROM kernel511_actor_revision_r113').get().revision,9));
 const bytes=readFileSync(backup.path);bytes[20]^=1;writeFileSync(backup.path,bytes);assert.throws(()=>s.apply(backup),/backup_checksum_changed/);
});
test('incompatible schemas, symlinks and changed database identities fail closed',t=>{
 const s=fixture(t);inspect(s.config,db=>db.exec('CREATE TABLE kernel511_actor_revision_r113(actor TEXT PRIMARY KEY,revision TEXT)'));
 assert.throws(()=>s.prepare(),/derived_schema_incompatible/);
 const q=fixture(t),link=join(q.dir,'link.sqlite');symlinkSync(q.config.database,link);
 assert.throws(()=>migrateDerivedR113({...q.config,database:link,action:'prepare'}),/database_path_changed/);
 assert.throws(()=>migrateDerivedR113({...q.config,identity:{...q.config.identity,inode:0},action:'prepare'}),/database_identity_changed/);
});
for(const phase of ['before_commit','after_commit'])test('real process exit '+phase+' preserves source data and supports safe retry',t=>{
 const s=fixture(t),backup=s.prepare(),moduleUrl=new URL('../deployment/modules/derived-migration.mjs',import.meta.url).href;
 const code=`import {readFileSync} from 'node:fs';import {migrateDerivedR113} from ${JSON.stringify(moduleUrl)};migrateDerivedR113(JSON.parse(readFileSync(0,'utf8')),{hook:phase=>{if(phase===${JSON.stringify(phase)})process.exit(98);}});`;
 const result=spawnSync(process.execPath,['--no-warnings','--input-type=module','-e',code],{input:JSON.stringify({...s.config,action:'apply',sha256:backup.sha256}),encoding:'utf8'});
 assert.equal(result.status,98,result.stderr);
 inspect(s.config,db=>{assert.equal(db.prepare('SELECT xp FROM players').get().xp,37);for(const t of SCHEMA_R113)assert.equal(Boolean(db.prepare('SELECT 1 FROM sqlite_schema WHERE name=?').get(t.name)),phase==='after_commit');});
 assert.equal(s.apply(backup).applied,true);
});
