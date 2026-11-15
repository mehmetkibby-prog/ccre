import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {prepareCompact,restoreCompact} from './compact.mjs';
const work=path.resolve(import.meta.dirname,'../r109_latency_completion/working'),core=work+'/core511-source/scripts/core511',native=work+'/native510-bb3a6cc689c6/vds-server/src';
const {createEmptyRealmWorld}=await import(native+'/realm-world-bootstrap.mjs');
const {LocalDatabase}=await import(native+'/database.mjs');
const {prepareNewRealmSchemaR101}=await import(core+'/generated/new-realm-schema-r101.mjs');
const {createNativeWorldStartup}=await import(core+'/generated/native-world-startup.mjs');
const {DatabaseHost}=await import(core+'/database-host.mjs');
const {NativeWorldStartup}=await import(core+'/native-world-startup.mjs');
const {prepareRoyalFixtureR118}=await import(core+'/tests/royal-schema-fixture-r118.mjs');
const {GameWriter}=await import(core+'/writer-runtime.mjs');
for(const realmId of ['r1','r2'])test('actual '+realmId+' schema survives filtered copy, inode-preserving restore and native host boot',{timeout:90000},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r122-native-')),file=dir+'/game.sqlite',dbIdentity=randomUUID();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 createEmptyRealmWorld({destination:file,realmId,dbIdentity});const db=new LocalDatabase(file,{groupWrites:false,asyncDurable:false});
 try{await prepareNewRealmSchemaR101(db.sqlite,{database:file});await createNativeWorldStartup(db).ensureWorldSeed();await db.durableAfterCommit();}finally{db.close();}
 let host=await DatabaseHost.open({file,realmId,dbIdentity});
 try{await host.bootstrap();await NativeWorldStartup.prepare(host);prepareRoyalFixtureR118(host.database.sqlite);await host.prepareWriter(new GameWriter(host.database,{realmId,ports:{guard:()=>true}}));}finally{await host.close();}
 const before=fs.statSync(file),copy=prepareCompact(file,dir+'/verified.sqlite',{cutoff:Date.now()-3600000,minimumFree:0});
 await restoreCompact(copy,{minimumFree:0});assert.equal(fs.statSync(file).ino,before.ino);
 host=await DatabaseHost.open({file,realmId,dbIdentity});
 try{await host.bootstrap();await NativeWorldStartup.prepare(host);await host.prepareWriter(new GameWriter(host.database,{realmId,ports:{guard:()=>true}}));assert.equal(host.expected.realmId,realmId);assert(host.database.sqlite.prepare('SELECT 1 FROM monsters LIMIT 1').get());}finally{await host.close();}
 console.log(JSON.stringify({realm:realmId,tables:Object.keys(copy.counts).length,compactBytes:copy.bytes,booted:true}));
});
