/** R118 bounded, coherent schema migration. No live player snapshot or downgrade. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const VERSION='R118_ROYAL1';
export const FEATURE_TABLES=Object.freeze(['royal_settings_r118','royal_receipts_r118','royal_transforms_r118','royal_salvage_r118','royal_admin_audit_r118','champions_settings_r118','r118_install_state']);
export const REPLACED_TRIGGERS=Object.freeze(['equipment_set_insert','equipment_set_delete','equipment_set_update','content_stocking_drop_r102']);
const ACTIVITY_TABLES=['royal_receipts_r118','royal_transforms_r118','royal_salvage_r118','royal_admin_audit_r118'];
const json=value=>JSON.stringify(value);
const hash=value=>crypto.createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:json(value)).digest('hex');
const fail=message=>{throw new Error(message);};
const requireThat=(ok,message)=>{if(!ok)fail(message);};
const quote=name=>'"'+name.replaceAll('"','""')+'"';
const idOf=file=>{const value=fs.statSync(file);return {device:value.dev,inode:value.ino};};
const same=(a,b)=>json(a)===json(b);
function open(file,readonly=false){const db=new DatabaseSync(file,{readOnly:readonly});db.exec('PRAGMA busy_timeout=15000; PRAGMA foreign_keys=ON;');if(!readonly)db.exec('PRAGMA synchronous=FULL;');return db;}
function schema(db){return db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();}
function exists(db,name){return !!db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(name);}
function tableCount(db,name){return exists(db,name)?db.prepare('SELECT count(*) AS n FROM '+quote(name)).get().n:0;}
function mobs(db){return db.prepare("SELECT * FROM monsters WHERE area='champions' OR id GLOB 'champions-*' ORDER BY id").all();}
function currentSource(db){return {
 runeV2:db.prepare('SELECT id,revision,config_json FROM rune_v2_settings WHERE id=1').get(),
 triggers:db.prepare("SELECT name,sql FROM sqlite_schema WHERE type='trigger' AND name IN ('equipment_set_insert','equipment_set_delete','equipment_set_update','content_stocking_drop_r102') ORDER BY name").all(),
 schema:schema(db)
};}
function assertSource(db){
 for(const name of FEATURE_TABLES)requireThat(!exists(db,name),'R118 öncesi tablolar beklenmedik biçimde mevcut: '+name);
 requireThat(!schema(db).some(row=>/^royal_[a-z0-9_]+_r118$/.test(row.name)||/^champions_[a-z0-9_]+_r118$/.test(row.name)),'R118 öncesi şema nesnesi beklenmedik biçimde mevcut.');
 requireThat(mobs(db).length===0,'R118 öncesinde Şampiyonlar Diyarı canavarları mevcut.');
 requireThat(!db.prepare("SELECT 1 FROM player_items WHERE rarity='royal' LIMIT 1").get(),'R118 öncesinde Kraliyet eşyası mevcut.');
 requireThat(!db.prepare("SELECT 1 FROM dungeon_materials WHERE kind IN ('emerald_dust','royal_crown') LIMIT 1").get(),'R118 öncesinde Kraliyet malzemesi mevcut.');
 requireThat(!db.prepare("SELECT 1 FROM players WHERE area='champions' LIMIT 1").get(),'R118 öncesinde yeni haritada oyuncu mevcut.');
 const source=currentSource(db);requireThat(source.runeV2&&source.triggers.length===REPLACED_TRIGGERS.length,'R117 rün ayarları veya set tetikleyicileri eksik.');return source;
}
function readSnapshot(file){
 requireThat(fs.statSync(file).size<=8*1024*1024,'R118 kapsam yedeği boyutu beklenenden büyük.');
 const db=open(file,true);try{
  requireThat(db.prepare('PRAGMA quick_check(3)').all().every(row=>Object.values(row)[0]==='ok'),'R118 kapsam yedeği SQLite kontrolünü geçemedi.');
  const rows=db.prepare('SELECT document,sha256 FROM r118_snapshot WHERE id=1').all();requireThat(rows.length===1&&hash(rows[0].document)===rows[0].sha256,'R118 kapsam yedeği özeti farklı.');
  const value=JSON.parse(rows[0].document);requireThat(value.version===VERSION,'R118 kapsam yedeği sürümü farklı.');return {value,sha256:rows[0].sha256};
 }finally{db.close();}
}
export function precheck(database){const db=open(database,true);try{db.exec('BEGIN');const source=assertSource(db);db.exec('COMMIT');return {sourceReady:true,replacedTriggers:source.triggers.length};}finally{db.close();}}
export function prepare(database,snapshot){
 requireThat(!fs.existsSync(snapshot),'R118 yedek dosyası zaten var.');
 const source=open(database,true);let value;
 try{source.exec('BEGIN');value={version:VERSION,database:path.resolve(database),identity:idOf(database),source:assertSource(source)};source.exec('COMMIT');}catch(error){try{source.exec('ROLLBACK');}catch{}throw error;}finally{source.close();}
 const temp=snapshot+'.tmp';requireThat(!fs.existsSync(temp),'Yarım R118 yedek dosyası mevcut.');
 const db=open(temp);try{db.exec('CREATE TABLE r118_snapshot(id INTEGER PRIMARY KEY CHECK(id=1),document TEXT NOT NULL,sha256 TEXT NOT NULL);');const document=json(value);db.prepare('INSERT INTO r118_snapshot VALUES(1,?,?)').run(document,hash(document));requireThat(db.prepare('PRAGMA quick_check(3)').all().every(row=>Object.values(row)[0]==='ok'),'Yeni R118 yedeği doğrulanamadı.');}finally{db.close();}
 fs.chmodSync(temp,0o600);const fd=fs.openSync(temp,'r');fs.fsyncSync(fd);fs.closeSync(fd);fs.renameSync(temp,snapshot);const dir=fs.openSync(path.dirname(snapshot),'r');fs.fsyncSync(dir);fs.closeSync(dir);
 const verified=readSnapshot(snapshot);requireThat(same(verified.value,value),'R118 yedek geri okuması farklı.');return {snapshot:path.resolve(snapshot),sha256:hash(fs.readFileSync(snapshot)),documentSHA256:verified.sha256,scope:'new-r118-tables-and-four-reviewed-triggers',bytes:fs.statSync(snapshot).size};
}
function identity(snapshot,database){requireThat(snapshot.database===path.resolve(database)&&same(snapshot.identity,idOf(database)),'R118 veritabanı dosya kimliği farklı.');}
function ownedAdded(row){return FEATURE_TABLES.includes(row.tbl_name)||(row.type==='trigger'&&/^royal_[a-z0-9_]+_r118$/.test(row.name));}
function installRecord(db){if(!exists(db,'r118_install_state'))return null;const row=db.prepare('SELECT document FROM r118_install_state WHERE id=1').get();return row?JSON.parse(row.document):null;}
export async function apply(database,snapshot,initialize){
 const saved=readSnapshot(snapshot);identity(saved.value,database);const db=open(database);
 try{
  db.exec('BEGIN IMMEDIATE');const previous=installRecord(db);
  if(previous){requireThat(previous.snapshotSHA256===saved.sha256,'R118 kurulumu başka yedeğe bağlı.');db.exec('COMMIT');return {alreadyApplied:true};}
  const source=assertSource(db);requireThat(same(source,saved.value.source),'R118 yedeğinden sonra ilgili şema veya rün ayarı değişmiş.');
  await initialize(db);
  db.exec('CREATE TABLE r118_install_state(id INTEGER PRIMARY KEY CHECK(id=1),document TEXT NOT NULL);');
  const after=schema(db),before=new Map(source.schema.map(row=>[row.type+':'+row.name,row]));
  for(const row of after){const old=before.get(row.type+':'+row.name);if(old)requireThat(same(row,old)||row.type==='trigger'&&REPLACED_TRIGGERS.includes(row.name),'R118 kapsam dışı şema değişimi: '+row.name);else requireThat(ownedAdded(row),'R118 kapsam dışı yeni şema: '+row.name);}
  for(const row of source.schema)requireThat(after.some(next=>next.type===row.type&&next.name===row.name),'R118 eski şema nesnesini kaldırdı: '+row.name);
  for(const name of FEATURE_TABLES)requireThat(exists(db,name),'R118 gerekli tablo eksik: '+name);
  const seeded=mobs(db);requireThat(seeded.length===192&&seeded.every(row=>row.area==='champions'&&/^champions-(?:ivory-guard|golden-lion|crescent-hunter|royal-colossus)-c[1-4]-(?:0[1-9]|1[0-2])$/.test(row.id)),'R118 dört kanallı canavar başlangıcı farklı.');
  const record={version:VERSION,snapshotSHA256:saved.sha256,schema:after,seededMonstersSHA256:hash(seeded),seededMonsters:seeded.length};db.prepare('INSERT INTO r118_install_state VALUES(1,?)').run(json(record));
  db.exec('COMMIT');return {applied:true,monsters:seeded.length};
 }catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}finally{db.close();}
}
function verifyRecord(db,saved){const record=installRecord(db);requireThat(record&&record.version===VERSION&&record.snapshotSHA256===saved.sha256,'R118 veritabanı kurulum kaydı farklı.');requireThat(same(schema(db),record.schema),'R118 kurulmuş şeması dışarıdan değişmiş.');return record;}
export function verify(database,snapshot){const saved=readSnapshot(snapshot);identity(saved.value,database);const db=open(database,true);try{const record=verifyRecord(db,saved);return {version:record.version,schemaReady:true,seededMonsters:record.seededMonsters};}finally{db.close();}}
function unused(db,record){
 const requireUnused=(ok,message)=>requireThat(ok,'[R118_FORWARD_REQUIRED] '+message);
 requireUnused(ACTIVITY_TABLES.every(name=>tableCount(db,name)===0),'Kraliyet işlemleri kullanılmış; oyuncu ilerlemesini korumak için ileri onarım gerekir.');
 requireUnused(!db.prepare("SELECT 1 FROM player_items WHERE rarity='royal' LIMIT 1").get(),'Kraliyet eşyası mevcut; geri dönüş yerine ileri onarım gerekir.');
 requireUnused(!db.prepare("SELECT 1 FROM dungeon_materials WHERE kind IN ('emerald_dust','royal_crown') LIMIT 1").get(),'Kraliyet malzemesi mevcut; geri dönüş yerine ileri onarım gerekir.');
 requireUnused(!db.prepare("SELECT 1 FROM players WHERE area='champions' LIMIT 1").get(),'Şampiyonlar Diyarı oyuncu ilerlemesi mevcut; ileri onarım gerekir.');
 requireUnused(hash(mobs(db))===record.seededMonstersSHA256,'Şampiyonlar Diyarı kullanılmış; ileri onarım gerekir.');
 for(const name of ['royal_settings_r118','champions_settings_r118'])requireUnused(db.prepare('SELECT revision FROM '+quote(name)+' WHERE id=1').get()?.revision===1,'R118 ayarları kullanılmış; ileri onarım gerekir.');
}
export function rollbackCheck(database,snapshot){const saved=readSnapshot(snapshot);identity(saved.value,database);const db=open(database,true);try{const record=installRecord(db);if(!record){assertSource(db);return {migrated:false};}unused(db,verifyRecord(db,saved));return {migrated:true,rollbackAllowed:true};}finally{db.close();}}
export function rollback(database,snapshot){
 const saved=readSnapshot(snapshot);identity(saved.value,database);const db=open(database);
 try{
  db.exec('BEGIN IMMEDIATE');const record=installRecord(db);if(!record){assertSource(db);db.exec('COMMIT');return {alreadyReverted:true};}
  unused(db,verifyRecord(db,saved));
  const original=new Set(saved.value.source.schema.map(row=>row.type+':'+row.name));
  for(const row of record.schema)if(row.type==='trigger'&&!original.has('trigger:'+row.name))db.exec('DROP TRIGGER '+quote(row.name));
  for(const name of REPLACED_TRIGGERS)db.exec('DROP TRIGGER IF EXISTS '+quote(name));
  for(const row of saved.value.source.triggers)db.exec(row.sql);
  db.prepare("DELETE FROM monsters WHERE area='champions' AND id GLOB 'champions-*'").run();
  for(const name of [...FEATURE_TABLES].reverse())db.exec('DROP TABLE '+quote(name));
  requireThat(same(schema(db),saved.value.source.schema),'R118 geri dönüş şeması/rün ayarları doğrulanamadı.');
  db.exec('COMMIT');return {rolledBack:true};
 }catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}finally{db.close();}
}
async function initialize(root,db){
 const core=path.join(root,'core511-source/scripts/core511');
 const royal=await import(pathToFileURL(path.join(core,'royal-config-r118.mjs')));
 const champions=await import(pathToFileURL(path.join(core,'champions-service-r118.mjs')));
 const equipment=await import(pathToFileURL(path.join(root,'native510-bb3a6cc689c6/vds-server/src/equipment-sets-schema.mjs')));
 royal.createRoyalSchemaR118(db);champions.ensureChampionsSchemaR118(db,{fourChannels:true});equipment.installRoyalEquipmentTriggersR118(db);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{const [action,root,database,snapshot]=process.argv.slice(2);requireThat(root&&database&&snapshot,'R118 geçiş parametreleri eksik.');const result=action==='precheck'?precheck(database):action==='prepare'?prepare(database,snapshot):action==='apply'?await apply(database,snapshot,db=>initialize(root,db)):action==='verify'?verify(database,snapshot):action==='rollback-check'?rollbackCheck(database,snapshot):action==='rollback'?rollback(database,snapshot):fail('Bilinmeyen R118 geçiş işlemi.');process.stdout.write(json(result)+'\n');}catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
}
