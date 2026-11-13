// R113 additive derived-state migration. Never copy/restore the player's DB.
// Both services must be stopped by the installer. The snapshot contains only
// these two derived tables, is transactionally consistent, and is independently
// checked with the SAME Node SQLite engine used by the game.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,statSync,lstatSync,realpathSync,openSync,closeSync,fsyncSync,renameSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const VERSION='R113_DERIVED1';
export const SCHEMA_R113=[
 {name:'kernel511_actor_revision_r113',order:'actor',sql:'CREATE TABLE kernel511_actor_revision_r113(actor TEXT PRIMARY KEY,revision INTEGER NOT NULL CHECK(revision>=0)) WITHOUT ROWID'},
 {name:'kernel511_committed_images_r113',order:'operation_id,actor',sql:`CREATE TABLE kernel511_committed_images_r113(
  operation_id TEXT NOT NULL,actor TEXT NOT NULL,epoch INTEGER NOT NULL,
  channel INTEGER NOT NULL,incarnation TEXT NOT NULL,created_ms INTEGER NOT NULL,
  image TEXT NOT NULL,PRIMARY KEY(operation_id,actor)) WITHOUT ROWID`}
];
const INDEX='CREATE INDEX kernel511_committed_images_age_r113 ON kernel511_committed_images_r113(created_ms,operation_id,actor)';
const check=(ok,why)=>{if(!ok)throw Error(why);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=s=>s.replace(/\bIF\s+NOT\s+EXISTS\s+/gi,'').replace(/\s+/g,'').toLowerCase();
const syncFile=path=>{const fd=openSync(path,'r');try{fsyncSync(fd);}finally{closeSync(fd);}};
function fileIdentity(path){
 check(resolve(path)===path&&realpathSync(path)===path&&!lstatSync(path).isSymbolicLink(),'database_path_changed');
 const s=statSync(path);check(s.isFile()&&s.nlink===1,'database_file_identity');
 return {path,device:s.dev,inode:s.ino};
}
function sameIdentity(actual,expected){check(actual.path===expected?.path&&String(actual.device)===String(expected.device)&&String(actual.inode)===String(expected.inode),'database_identity_changed');}
function existingSchema(db){
 const tables={};
 for(const t of SCHEMA_R113){
  const row=db.prepare('SELECT type,sql FROM sqlite_schema WHERE name=?').get(t.name);
  check(!row||row.type==='table'&&canonical(row.sql)===canonical(t.sql),'derived_schema_incompatible:'+t.name);
  check(!db.prepare("SELECT 1 FROM sqlite_schema WHERE tbl_name=? AND type='trigger'").get(t.name),'derived_trigger_unexpected');
  if(row){const result=db.prepare(`PRAGMA quick_check('${t.name}')`).all();check(result.length===1&&Object.values(result[0])[0]==='ok','derived_source_integrity');}
  tables[t.name]=Boolean(row);
 }
 const index=db.prepare("SELECT type,sql FROM sqlite_schema WHERE name='kernel511_committed_images_age_r113'").get();
 check(!index||index.type==='index'&&canonical(index.sql)===canonical(INDEX),'derived_index_incompatible');
 return {tables,index:Boolean(index)};
}
function tableDigest(db,t,present=true){
 const hash=createHash('sha256');let count=0;
 if(present)for(const row of db.prepare(`SELECT * FROM ${t.name} ORDER BY ${t.order}`).iterate()){hash.update(JSON.stringify(row)+'\n');count++;}
 return {count,sha256:hash.digest('hex')};
}
function checkedBackup(path,expectedSha){
 check(realpathSync(path)===path&&!lstatSync(path).isSymbolicLink()&&statSync(path).isFile()&&statSync(path).nlink===1,'backup_path_changed');
 check(!expectedSha||sha(readFileSync(path))===expectedSha,'backup_checksum_changed');
 const db=new DatabaseSync(path,{readOnly:true});
 try{
  const rows=db.prepare('PRAGMA quick_check').all();check(rows.length===1&&Object.values(rows[0])[0]==='ok','backup_integrity');
  const meta=JSON.parse(db.prepare('SELECT value FROM migration_meta WHERE id=1').get().value);check(meta.version===VERSION,'backup_version');
  for(const t of SCHEMA_R113){const value=tableDigest(db,t);check(JSON.stringify(value)===JSON.stringify(meta.data[t.name]),'backup_rows_changed');}
  return meta;
 }finally{db.close();}
}
function prepare(config,hook){
 const {database,backup}=config;const identity=fileIdentity(database);sameIdentity(identity,config.identity);
 check(resolve(backup)===backup&&realpathSync(dirname(backup))===dirname(backup)&&!lstatSync(dirname(backup)).isSymbolicLink(),'backup_parent_changed');
 // Existing valid backup is an idempotent resume, never overwritten.
 if(existsSync(backup)){const meta=checkedBackup(backup);sameIdentity(identity,meta.identity);return {version:VERSION,path:backup,sha256:sha(readFileSync(backup)),data:meta.data,resumed:true};}
 const tmp=backup+'.preparing';check(!existsSync(tmp),'backup_preparation_incomplete');
 const fd=openSync(tmp,'wx',0o600);closeSync(fd);
 const source=new DatabaseSync(database,{readOnly:true}),target=new DatabaseSync(tmp);
 try{
  source.exec('BEGIN');const schema=existingSchema(source),data={};
  target.exec('PRAGMA journal_mode=DELETE;PRAGMA synchronous=FULL;BEGIN IMMEDIATE');
  target.exec('CREATE TABLE migration_meta(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL)');
  for(const t of SCHEMA_R113){
   target.exec(t.sql);
   if(schema.tables[t.name]){
    let insert;
    for(const row of source.prepare(`SELECT * FROM ${t.name} ORDER BY ${t.order}`).iterate()){
     insert??=target.prepare(`INSERT INTO ${t.name} VALUES(${Object.keys(row).map(()=>'?').join(',')})`);
     insert.run(...Object.values(row));
    }
   }
   data[t.name]=tableDigest(source,t,schema.tables[t.name]);
   check(JSON.stringify(tableDigest(target,t))===JSON.stringify(data[t.name]),'backup_copy_mismatch');
  }
  const meta={version:VERSION,identity,schema,data};
  target.prepare('INSERT INTO migration_meta VALUES(1,?)').run(JSON.stringify(meta));target.exec('COMMIT');source.exec('COMMIT');
  hook('backup_copied');
 }finally{try{if(target.isTransaction)target.exec('ROLLBACK');target.close();}finally{if(source.isTransaction)source.exec('ROLLBACK');source.close();}}
 checkedBackup(tmp);sameIdentity(fileIdentity(database),identity);syncFile(tmp);
 renameSync(tmp,backup);syncFile(dirname(backup));hook('backup_durable');
 const meta=checkedBackup(backup);return {version:VERSION,path:backup,sha256:sha(readFileSync(backup)),data:meta.data,resumed:false};
}
function apply(config,hook){
 const {database,backup}=config,meta=checkedBackup(backup,config.sha256);sameIdentity(fileIdentity(database),config.identity);sameIdentity(config.identity,meta.identity);
 const db=new DatabaseSync(database);
 try{
  db.exec('PRAGMA synchronous=FULL;BEGIN IMMEDIATE');const current=existingSchema(db);
  // If a crash followed COMMIT, tables that were absent in the backup may
  // now exist. The installer has not started the game: they must be empty.
  for(const t of SCHEMA_R113){
   const digest=tableDigest(db,t,current.tables[t.name]);
   check(JSON.stringify(digest)===JSON.stringify(meta.data[t.name]),'derived_data_changed_after_backup');
   check(!meta.schema.tables[t.name]||current.tables[t.name],'derived_table_disappeared');
   if(!current.tables[t.name])db.exec(t.sql);
  }
  if(!current.index)db.exec(INDEX);
  hook('before_commit');db.exec('COMMIT');hook('after_commit');
  existingSchema(db);sameIdentity(fileIdentity(database),config.identity);
  return {version:VERSION,applied:true,scope:'two-derived-tables',playerDataChanged:false,rollback:'retain-compatible-derived-tables'};
 }finally{if(db.isTransaction)db.exec('ROLLBACK');db.close();}
}
export function migrateDerivedR113(config,{hook=()=>{}}={}){
 check(config&&['prepare','apply','verify'].includes(config.action),'migration_action');
 if(config.action!=='prepare')check(typeof config.sha256==='string'&&/^[a-f0-9]{64}$/.test(config.sha256),'backup_checksum_required');
 if(config.action==='verify'){checkedBackup(config.backup,config.sha256);return {version:VERSION,verified:true};}
 return config.action==='prepare'?prepare(config,hook):apply(config,hook);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{process.stdout.write(JSON.stringify(migrateDerivedR113(JSON.parse(readFileSync(0,'utf8'))))+'\n');}
 catch(e){process.stderr.write('R113 migration: '+e.message+'\n');process.exitCode=1;}
}
