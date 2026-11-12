import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {DatabaseHost} from '../database-host.mjs';
import {temporary,native} from './helpers.mjs';
const {bindRealmDatabaseIdentity}=await native('vds-server/src/realm-database-identity.mjs');
function fixture(t){const file=path.join(temporary(t),'current.sqlite'),expected={file,realmId:'host-test511',dbIdentity:randomUUID()},sql=new DatabaseSync(file);sql.exec('PRAGMA synchronous=FULL;CREATE TABLE preserved(id INTEGER PRIMARY KEY,amount INTEGER);INSERT INTO preserved VALUES(1,717)');bindRealmDatabaseIdentity(sql,expected);sql.close();return expected;}
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('wrong native realm identity is rejected before writable pragmas and missing DB never creates an empty world',async t=>{
 const expected=fixture(t),before=hash(expected.file);await assert.rejects(DatabaseHost.open({...expected,realmId:'other-realm'}),/Wrong realm database/);assert.equal(hash(expected.file),before);assert(!fs.existsSync(expected.file+'-wal'));await assert.rejects(DatabaseHost.open({...expected,dbIdentity:randomUUID()}),/Wrong realm database/);assert.equal(hash(expected.file),before);
 const missing=path.join(path.dirname(expected.file),'missing.sqlite');await assert.rejects(DatabaseHost.open({...expected,file:missing}),{code:'ENOENT'});assert(!fs.existsSync(missing));const host=await DatabaseHost.open(expected);assert.equal(host.database.sqlite.prepare('SELECT amount FROM preserved').get().amount,717);await host.close();
});

test('same-inode symlink startup stays exclusive and hardlink WAL aliases fail before opening a writer',async t=>{
 const expected=fixture(t),host=await DatabaseHost.open(expected),alias=path.join(path.dirname(expected.file),'alias.sqlite');t.after(async()=>{if(!host.closed)await host.close();});fs.symlinkSync(expected.file,alias);
 await assert.rejects(DatabaseHost.open({...expected,file:alias}),{code:'host_database_in_use'});const link=path.join(path.dirname(expected.file),'hardlink.sqlite');fs.linkSync(expected.file,link);await assert.rejects(DatabaseHost.open({...expected,file:link}),{code:'host_database_hardlink'});fs.unlinkSync(link);await host.database.atomic(sql=>sql.prepare('UPDATE preserved SET amount=718').run());await host.close();const next=await DatabaseHost.open({...expected,file:alias});assert.equal(next.database.sqlite.prepare('SELECT amount FROM preserved').get().amount,718);await next.close();
});

test('replacement of the startup DB pathname fences further owner boots without rebinding or modifying the replacement',async t=>{
 const expected=fixture(t),host=await DatabaseHost.open(expected),retired=expected.file+'.retired';fs.renameSync(expected.file,retired);fs.writeFileSync(expected.file,'replacement-must-not-be-opened');const before=hash(expected.file);assert.throws(()=>host.assertOpen(),{code:'host_database_fenced'});assert.throws(()=>host.childStdio(),{code:'host_database_fenced'});assert.equal(hash(expected.file),before);
 fs.unlinkSync(expected.file);fs.renameSync(retired,expected.file);await host.close();
});

test('old online records without an inherited-host proof are never declared exited or adopted at startup',async t=>{
 const expected=fixture(t),sql=new DatabaseSync(expected.file);sql.exec("CREATE TABLE kernel511_system_owners(service TEXT PRIMARY KEY,incarnation TEXT,epoch INTEGER,sequence INTEGER,online INTEGER);INSERT INTO kernel511_system_owners VALUES('world','unproven-live-world',7,22,1)");sql.close();const before=hash(expected.file);await assert.rejects(DatabaseHost.open(expected),{code:'host_existing_owners_unproven'});assert.equal(hash(expected.file),before);assert(!fs.existsSync(expected.file+'-wal'));
});
