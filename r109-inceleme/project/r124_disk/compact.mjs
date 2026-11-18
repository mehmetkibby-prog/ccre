import {DatabaseSync,backup} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const GiB=1024**3;
const quote=name=>'"'+name.replaceAll('"','""')+'"';
const need=(ok,message)=>{if(!ok)throw Error(message);};
const rows=(db,sql,args=[])=>{const s=db.prepare(sql);s.setReadBigInts(true);s.setReturnArrays(true);return s.iterate(...args);};
const scalar=(db,name)=>Number(Object.values(db.prepare('PRAGMA '+name).get())[0]);
const keptNotification=`(n.created_ms>=? OR EXISTS(SELECT 1 FROM kernel511_notification_audience a WHERE a.event_id=n.event_id AND a.acknowledged=0))`;
export function retained(table,cutoff){
 if(['kernel511_channel_receipts','kernel511_system_receipts','kernel511_committed_images_r113'].includes(table))return {where:' WHERE created_ms>=?',args:[cutoff]};
 if(table==='kernel511_receipt_overflow')return {where:' WHERE EXISTS(SELECT 1 FROM kernel511_channel_receipts r WHERE r.operation_id=kernel511_receipt_overflow.operation_id AND r.created_ms>=?)',args:[cutoff]};
 if(table==='kernel511_notifications')return {where:' WHERE event_id IN (SELECT n.event_id FROM kernel511_notifications n WHERE '+keptNotification+')',args:[cutoff]};
 if(table==='kernel511_notification_audience')return {where:' WHERE EXISTS(SELECT 1 FROM kernel511_notifications n WHERE n.event_id=kernel511_notification_audience.event_id AND '+keptNotification+')',args:[cutoff]};
 return {where:'',args:[]};
}
function digestRow(hash,row){
 const encoded=JSON.stringify(row.map(v=>typeof v==='bigint'?['integer',v.toString()]:v instanceof Uint8Array?['blob',Buffer.from(v).toString('base64')]:[typeof v,v]));
 hash.update(String(Buffer.byteLength(encoded)));hash.update(':');hash.update(encoded);
}
function available(directory){const s=fs.statfsSync(directory);return s.bavail*s.bsize;}
function sync(file){const fd=fs.openSync(file,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function metadata(db){
 const hash=createHash('sha256');
 for(const name of ['application_id','user_version','encoding'])digestRow(hash,[name,Object.values(db.prepare('PRAGMA '+name).get())[0]]);
 if(db.prepare("SELECT 1 FROM sqlite_schema WHERE name='sqlite_sequence'").get())for(const row of rows(db,'SELECT name,seq FROM sqlite_sequence ORDER BY name'))digestRow(hash,row);
 return hash.digest('hex');
}
export function schemaPlan(db){
 const schema=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE sql IS NOT NULL ORDER BY type,name").all();
 const tables=schema.filter(r=>r.type==='table'&&!r.name.startsWith('sqlite_')).map(r=>{
  need(!/CREATE\s+VIRTUAL\s+TABLE/i.test(r.sql),'unsupported_virtual_table');
  const info=db.prepare('PRAGMA table_xinfo('+quote(r.name)+')').all();
  need(info.length&&info.every(c=>!c.hidden),'unsupported_generated_columns');
  const without=/\bWITHOUT\s+ROWID\b/i.test(r.sql),names=info.map(c=>c.name);
  const alias=['_rowid_','rowid','oid'].find(n=>!names.map(x=>x.toLowerCase()).includes(n));
  need(without||alias,'rowid_alias_shadowed');
  const order=without?info.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>quote(c.name)).join(','):alias;
  need(order,'missing_table_order');
  const keys=(without?[]:[alias]).concat(names);
  return {...r,names,columns:keys.map(quote).join(','),columnCount:keys.length,order};
 });
 return {schema,tables};
}
export function prepareCompact(source,destination,{cutoff,minimumFree=2*GiB,maxBytes=Infinity,onProgress=()=>{}}={}){
 need(Number.isSafeInteger(cutoff)&&cutoff>0&&cutoff<=Date.now()-15*60000,'invalid_retention_cutoff');
 need(!fs.existsSync(destination),'destination_already_exists');
 const sourceInfo=fs.statSync(source),fd=fs.openSync(destination,'wx',0o600);fs.closeSync(fd);
 const read=new DatabaseSync(source,{readOnly:true}),write=new DatabaseSync(destination);
 let completed=false;
 try{
  read.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=1000; PRAGMA cache_size=-8192; BEGIN');
  const {schema,tables}=schemaPlan(read),pageSize=scalar(read,'page_size');
  const encoding=read.prepare('PRAGMA encoding').get().encoding;
  need(['UTF-8','UTF-16le','UTF-16be'].includes(encoding),'unsupported_encoding');
  // New, private output only. Original database and WAL are read-only.
  write.exec('PRAGMA page_size='+pageSize+'; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA foreign_keys=OFF; PRAGMA cache_size=-8192; PRAGMA temp_store=FILE');
  write.exec("PRAGMA encoding='"+encoding+"'");
  if(Number.isFinite(maxBytes))write.exec('PRAGMA max_page_count='+Math.floor(maxBytes/pageSize));
  const checkSpace=()=>{need(available(path.dirname(destination))>=minimumFree,'insufficient_space');need(fs.statSync(destination).size<=maxBytes,'compact_size_limit');};
  const hashes={},counts={};let lastProgress=0;
  for(const table of tables)write.exec(table.sql);
  for(const table of tables){
   checkSpace();if(table.name.startsWith('kernel511_'))onProgress({table:table.name,phase:'read'});const keep=retained(table.name,cutoff),select='SELECT '+table.columns+' FROM '+quote(table.name)+keep.where+' ORDER BY '+table.order;
   const insert=write.prepare('INSERT INTO '+quote(table.name)+'('+table.columns+') VALUES('+Array(table.columnCount).fill('?').join(',')+')');
   const hash=createHash('sha256');let count=0;
   write.exec('BEGIN');
   for(const row of rows(read,select,keep.args)){
    insert.run(...row);digestRow(hash,row);count++;
    if(count%256===0){write.exec('COMMIT');checkSpace();if(Date.now()-lastProgress>2000){onProgress({table:table.name,rows:count,phase:'copy'});lastProgress=Date.now();}write.exec('BEGIN');}
   }
   write.exec('COMMIT');hashes[table.name]=hash.digest('hex');counts[table.name]=count;
  }
  if(schema.some(r=>r.name==='sqlite_sequence')){
   write.exec('DELETE FROM sqlite_sequence');const insert=write.prepare('INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)');
   for(const row of rows(read,'SELECT name,seq FROM sqlite_sequence ORDER BY name'))insert.run(...row);
  }
  for(const row of schema.filter(r=>r.type==='index'&&!r.name.startsWith('sqlite_'))){checkSpace();write.exec(row.sql);checkSpace();}
  for(const row of schema.filter(r=>['view','trigger'].includes(r.type)))write.exec(row.sql);
  for(const name of ['application_id','user_version'])write.exec('PRAGMA '+name+'='+scalar(read,name));
  need(write.prepare('PRAGMA quick_check').all().every(r=>r.quick_check==='ok'),'compact_integrity_failed');
  need(!write.prepare('PRAGMA foreign_key_check').get(),'compact_foreign_keys_failed');
  for(const table of tables){
   const hash=createHash('sha256');let count=0;
   for(const row of rows(write,'SELECT '+table.columns+' FROM '+quote(table.name)+' ORDER BY '+table.order)){digestRow(hash,row);count++;}
   need(count===counts[table.name]&&hash.digest('hex')===hashes[table.name],'compact_rows_changed');
  }
  const actual=write.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
  need(JSON.stringify(actual)===JSON.stringify(schema.filter(r=>!r.name.startsWith('sqlite_'))),'compact_schema_changed');
  const metadataHash=metadata(read);need(metadata(write)===metadataHash,'metadata_changed');
  checkSpace();read.exec('COMMIT');write.close();read.close();sync(destination);sync(path.dirname(destination));
  need(fs.statSync(source).ino===sourceInfo.ino&&fs.statSync(source).dev===sourceInfo.dev,'source_identity_changed');
  completed=true;return {version:'R122_COMPACT1',source,sourceDevice:sourceInfo.dev,sourceInode:sourceInfo.ino,sourceSize:sourceInfo.size,sourceMtimeMs:sourceInfo.mtimeMs,destination,cutoff,bytes:fs.statSync(destination).size,counts,hashes,metadataHash,schemaHash:createHash('sha256').update(JSON.stringify(schema.filter(r=>!r.name.startsWith('sqlite_')))).digest('hex'),verified:true};
 }finally{
  if(!completed){try{write.close();}catch{}try{read.close();}catch{}}
 }
}

export async function restoreCompact(verified,{minimumFree=2*GiB,onProgress=()=>{},resume=false}={}){
 need(verified?.verified===true,'verified_copy_required');
 const info=fs.statSync(verified.source);
 need(info.dev===verified.sourceDevice&&info.ino===verified.sourceInode,'source_identity_changed');
 if(!resume)need(info.size===verified.sourceSize&&info.mtimeMs===verified.sourceMtimeMs,'source_changed_after_copy');
 need(available(path.dirname(verified.source))>=minimumFree+3*verified.bytes,'insufficient_restore_space');
 const source=new DatabaseSync(verified.destination,{readOnly:true});
 try{
  need(source.prepare('PRAGMA quick_check').all().every(r=>r.quick_check==='ok'),'backup_integrity_failed');
  need(metadata(source)===verified.metadataHash,'backup_metadata_changed');
  const {tables,schema}=schemaPlan(source);
  if(resume){
   const current=new DatabaseSync(verified.source,{readOnly:true});
   try{const before=source.prepare('SELECT incarnation FROM kernel511_host_boot WHERE id=1').get(),now=current.prepare('SELECT incarnation FROM kernel511_host_boot WHERE id=1').get();need(before?.incarnation&&before.incarnation===now?.incarnation,'game_started_since_snapshot');}finally{current.close();}
  }
  need(createHash('sha256').update(JSON.stringify(schema.filter(r=>!r.name.startsWith('sqlite_')))).digest('hex')===verified.schemaHash,'backup_schema_changed');
  for(const table of tables){
   const hash=createHash('sha256');let count=0;
   for(const row of rows(source,'SELECT '+table.columns+' FROM '+quote(table.name)+' ORDER BY '+table.order)){digestRow(hash,row);count++;}
   need(count===verified.counts[table.name]&&hash.digest('hex')===verified.hashes[table.name],'backup_content_changed');
  }
  // SQLite backup API rewrites pages transactionally; never rename/unlink the
  // active database or WAL. Production inode bindings must remain identical.
  onProgress({phase:'install',bytes:verified.bytes});
  await backup(source,verified.source,{rate:-1});
 }finally{source.close();}
 const installed=new DatabaseSync(verified.source);
 try{
  const result=installed.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();
  need(Number(result.busy)===0,'checkpoint_busy');
  need(installed.prepare('PRAGMA quick_check').all().every(r=>r.quick_check==='ok'),'installed_integrity_failed');
  need(!installed.prepare('PRAGMA foreign_key_check').get(),'installed_foreign_keys_failed');
  need(metadata(installed)===verified.metadataHash,'installed_metadata_changed');
  for(const table of schemaPlan(installed).tables){const hash=createHash('sha256');let count=0;for(const row of rows(installed,'SELECT '+table.columns+' FROM '+quote(table.name)+' ORDER BY '+table.order)){digestRow(hash,row);count++;}need(count===verified.counts[table.name]&&hash.digest('hex')===verified.hashes[table.name],'installed_rows_changed');}
 }finally{installed.close();}
 sync(verified.source);sync(path.dirname(verified.source));
 const after=fs.statSync(verified.source);need(after.dev===info.dev&&after.ino===info.ino,'database_inode_changed');
 return {bytesBefore:info.size,bytesAfter:after.size,reclaimedBytes:info.size-after.size};
}
