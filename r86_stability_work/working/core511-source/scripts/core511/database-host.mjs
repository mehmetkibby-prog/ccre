import path from 'node:path';
import {constants,fstatSync,statSync,realpathSync} from 'node:fs';
import {open} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {LocalDatabase} from '../../../native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {assertRealmDatabaseIdentity} from '../../../native510-bb3a6cc689c6/vds-server/src/realm-database-identity.mjs';
import {bootstrapFourthChannel} from './channel-content.mjs';
import {demand} from './contract.mjs';
import {HOST_LOCK_PROTOCOL,hostFileIdentity as identity,sameHostFile as same} from './host-lock-protocol.mjs';
import {CheckpointRuntimeR79} from './checkpoint-runtime-r79.mjs';

const exists=(sql,table)=>Boolean(sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(table));
function priorHost(sql,expected){
 const row=exists(sql,'kernel511_host_boot')?sql.prepare('SELECT * FROM kernel511_host_boot WHERE id=1').get():null;
 if(row)demand(row.protocol===HOST_LOCK_PROTOCOL&&row.realm_id===expected.realmId&&row.database_id===expected.dbIdentity,'host_previous_binding');
 const live=['kernel511_channel_processes','kernel511_system_owners'].some(table=>exists(sql,table)&&sql.prepare('SELECT 1 FROM '+table+' WHERE online=1 LIMIT 1').get());
 demand(!live||row,'host_existing_owners_unproven');return row;
}
async function lock(fd){
 const child=spawn('/usr/bin/flock',['--exclusive','--nonblock','--conflict-exit-code','73','3'],{stdio:['ignore','ignore','ignore',fd]});
 const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');},5000);child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});});
 demand(result.code===0&&!result.signal,result.code===73?'host_database_in_use':'host_lock_failed');
}

// Locks the existing DB inode, so symlink aliases cannot start a
// second writer. The flock helper inherits the SAME open-file description;
// its exit does not release the parent's lock. No PID file or stale-lock reset.
// Hardlinks are rejected because their different WAL path could lose committed
// frames after a crash. No startup path binds a realm or opens an empty DB.
export class DatabaseHost {
 static async open({file,realmId,dbIdentity}){
  demand(process.platform==='linux'&&typeof file==='string'&&path.isAbsolute(file),'host_database_path');
  const canonical=realpathSync(file),handle=await open(canonical,constants.O_RDWR|constants.O_NOFOLLOW);let database,checkpoint;
  try{
   const stat=await handle.stat({bigint:true});demand(stat.isFile(),'host_database_file');demand(stat.nlink===1n,'host_database_hardlink');const fileIdentity=identity(stat);await lock(handle.fd);
   demand(same(fileIdentity,identity(statSync(canonical,{bigint:true}))),'host_database_replaced');
   // Native identity validation precedes writable SQLite PRAGMAs, migration,
   // additive channel seeding, service construction and owner registration.
   const read=new DatabaseSync(canonical,{readOnly:true});let expected;
   try{expected=assertRealmDatabaseIdentity(read,{realmId,dbIdentity});priorHost(read,expected);}finally{read.close();}
   database=new LocalDatabase(canonical,{create:false,groupWrites:true,asyncDurable:true});assertRealmDatabaseIdentity(database.sqlite,expected);
   checkpoint=new CheckpointRuntimeR79(database,canonical);await checkpoint.ready;
   const host=new DatabaseHost({canonical,handle,fileIdentity,database,expected,checkpoint});host.assertOpen();return host;
  }catch(error){await checkpoint?.close();database?.close();await database?.walSync?.closing;await handle.close();throw error;}
 }
 constructor({canonical,handle,fileIdentity,database,expected,checkpoint}){Object.assign(this,{file:canonical,handle,fileIdentity,database,expected,checkpoint});this.pid=process.pid;this.children=new Map();this.core=null;this.closed=false;this.closing=null;}
 assertOpen(){demand(!this.closed&&this.pid===process.pid&&!this.database.closed&&same(this.fileIdentity,identity(fstatSync(this.handle.fd,{bigint:true})))&&same(this.fileIdentity,identity(statSync(this.file,{bigint:true}))),'host_database_fenced');return true;}
 stopped(){return this.assertOpen()&&!this.core&&!this.children.size;}
 bootstrap(options={}){return bootstrapFourthChannel(this.database,{...options,assertStopped:()=>this.stopped()});}
 async prepareWriter(writer){
  demand(this.stopped()&&!this.writer&&(!this.nativeWorldStartup||this.nativeWorldStartup.ready)&&(!this.nativeRealmStartup||this.nativeRealmStartup.ready)&&(!this.nativeHttp||this.nativeHttp.initialized)&&writer.database===this.database&&writer.authority.realmId===this.expected.realmId,'host_writer_binding');await writer.initialize();
  const boot=randomUUID();await this.database.atomic(sql=>{
   demand(this.stopped(),'host_startup_changed');priorHost(sql,this.expected);
   sql.exec('CREATE TABLE IF NOT EXISTS kernel511_host_boot(id INTEGER PRIMARY KEY CHECK(id=1),protocol TEXT NOT NULL,realm_id TEXT NOT NULL,database_id TEXT NOT NULL,incarnation TEXT NOT NULL,started_at_ms INTEGER NOT NULL)');
   // The previous host wrote this marker before any child registration. Its
   // inherited flock could be reacquired only after EVERY old holder exited.
   // Keep owner epochs, admissions, simulations and receipts for the existing
   // fresh-incarnation recovery; retire only the two process online flags.
   sql.prepare('UPDATE kernel511_channel_processes SET online=0 WHERE online=1').run();sql.prepare('UPDATE kernel511_system_owners SET online=0 WHERE online=1').run();
   sql.prepare('INSERT INTO kernel511_host_boot VALUES(1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET incarnation=excluded.incarnation,started_at_ms=excluded.started_at_ms').run(HOST_LOCK_PROTOCOL,this.expected.realmId,this.expected.dbIdentity,boot,Date.now());
  });writer.refreshOwners();this.writer=writer;this.boot=boot;return {boot};
 }
 attach(core){this.assertOpen();demand(this.writer===core.writer&&this.boot&&!this.core&&!core.host&&core.database===this.database&&core.realmId===this.expected.realmId,'host_core_binding');this.core=core;core.host=this;}
 childStdio(){this.assertOpen();return ['ignore','ignore','pipe','ipc',this.handle.fd];}
 childDescriptor(){this.assertOpen();return {protocol:HOST_LOCK_PROTOCOL,fd:4,...this.fileIdentity};}
 track(child){demand(child&&!this.children.has(child),'host_child_duplicate');const row={exited:false};this.children.set(child,row);child.once('exit',()=>{row.exited=true;});child.once('error',()=>{if(!child.pid)row.exited=true;});}
 close(){
  if(this.closing)return this.closing;
  this.closing=(async()=>{
   const errors=[],c=this.core;await this.nativeHttpServer?.stop();await this.nativeHttp?.stop();c?.nativeMaintenance?.close();await this.nativeRealmStartup?.stop();
   if(c){for(const owner of [c.channelSupervisor,c.sharedWorld])if(owner)try{await owner.close();}catch(error){errors.push(error);}c.close();await c.reader.close();}
   // An unknown child exit must retain both the DB handle and the host lock.
   demand([...this.children.values()].every(row=>row.exited),'host_children_still_live');
   await this.writer?.rewardWorkerR533?.close();
   demand(!this.database.sqlite.isTransaction&&this.database.writeQueue.length===0,'host_database_writes_pending');await this.database.durableAfterCommit();await this.checkpoint?.close();this.database.close();await this.database.walSync?.closing;await this.handle.close();this.closed=true;this.nativeHttp?.close();this.nativeRealmStartup?.close();this.nativeWorldStartup?.close();
   if(errors.length)throw new AggregateError(errors,'host_shutdown_failed');return {closed:true};
  })().catch(error=>{if(!this.closed)this.closing=null;throw error;});return this.closing;
 }
}

