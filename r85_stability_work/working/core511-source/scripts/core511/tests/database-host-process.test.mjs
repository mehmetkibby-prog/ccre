import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fork} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {DatabaseHost} from '../database-host.mjs';
import {setupEntry} from './entry-fixture.mjs';
import {temporary,native,until} from './helpers.mjs';
import {PROTOCOL} from '../contract.mjs';
const {bindRealmDatabaseIdentity}=await native('vds-server/src/realm-database-identity.mjs');

async function source(t){const f=await setupEntry(t,{realTime:true}),expected={file:path.join(temporary(t),'current.sqlite'),realmId:'host-test511',dbIdentity:randomUUID()};f.sql.exec('PRAGMA synchronous=FULL');bindRealmDatabaseIdentity(f.sql,expected);f.sql.prepare('UPDATE world_state SET layout_version=24 WHERE id=1').run();f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(f.f.file,expected.file);const r=f.request({path:'/api/realtime/core511-ticket',body:{protocol:PROTOCOL}}),request={url:r.url,method:r.method,headers:Object.fromEntries(r.headers),body:await r.text()};return {expected,actor:f.id,request};}
function runner(t,expected){const child=fork(path.join(import.meta.dirname,'database-host-process-fixture.mjs'),[],{stdio:['ignore','ignore','pipe','ipc']}),messages=[];let stderr='',exit;child.stderr.on('data',b=>stderr=(stderr+b).slice(-12000));child.on('message',m=>messages.push(m));child.once('exit',(code,signal)=>exit={code,signal});t.after(async()=>{if(!exit){child.kill('SIGKILL');await until(()=>exit,10000);}});child.send({type:'open',expected});return {child,messages,get exit(){return exit;},async wait(type){await until(()=>messages.some(m=>m.type===type||m.type==='error')||exit,15000);const result=messages.find(m=>m.type===type);assert(result,JSON.stringify({messages,exit,stderr}));return result;}};}
function read(file,sql,args=[]){const db=new DatabaseSync(file,{readOnly:true});try{return db.prepare(sql).all(...args);}finally{db.close();}}

test('second actual main cannot register owners and graceful restart retains current native data and completed C4 seed',{timeout:40000},async t=>{
 const {expected,actor}=await source(t),first=runner(t,expected),ready=await first.wait('ready');assert.equal(ready.children,5);assert.equal(ready.owners.length,5);assert(ready.content.applied);const owners=read(expected.file,'SELECT channel,incarnation,online FROM kernel511_channel_processes ORDER BY channel');const duplicate=runner(t,expected);await until(()=>duplicate.exit,15000);assert.equal(duplicate.exit.code,73);assert.equal(duplicate.messages.find(m=>m.type==='error')?.code,'host_database_in_use');assert.deepEqual(read(expected.file,'SELECT channel,incarnation,online FROM kernel511_channel_processes ORDER BY channel'),owners);
 first.child.send({type:'set-marker',actor,value:733});await first.wait('marker');first.child.send({type:'close'});await first.wait('closed');await until(()=>first.exit);assert.equal(first.exit.code,0);const second=runner(t,expected),next=await second.wait('ready');assert.equal(next.content.applied,false);assert.equal(read(expected.file,'SELECT gems FROM players WHERE id=?',[actor])[0].gems,733);assert(next.owners.every(owner=>!ready.owners.some(old=>old.incarnation===owner.incarnation)));second.child.send({type:'close'});await second.wait('closed');
});

test('main SIGKILL cannot release the inherited host lock while an actual old channel is stopped',{timeout:40000},async t=>{
 const {expected,actor,request}=await source(t),first=runner(t,expected);await first.wait('ready');first.child.send({type:'ticket',request});const admitted=(await first.wait('ticket')).result;assert.equal(admitted.status,200,JSON.stringify(admitted));const owner=read(expected.file,'SELECT * FROM kernel511_channel_owners WHERE player_id=?',[actor])[0];first.child.send({type:'set-marker',actor,value:739});await first.wait('marker');first.child.send({type:'stop-owner',channel:4});const stopped=await first.wait('stopped');let ownedStoppedPid=stopped.pid;
 try{
  first.child.kill('SIGKILL');await until(()=>first.exit,10000);assert.equal(first.exit.signal,'SIGKILL');await assert.rejects(DatabaseHost.open(expected),{code:'host_database_in_use'});assert.equal(read(expected.file,'SELECT gems FROM players WHERE id=?',[actor])[0].gems,739);
  process.kill(ownedStoppedPid,'SIGCONT');ownedStoppedPid=null;let recovered;const deadline=Date.now()+10000;while(!recovered){try{recovered=await DatabaseHost.open(expected);}catch(error){assert.equal(error.code,'host_database_in_use');assert(Date.now()<deadline,'old inherited descriptor never closed');await new Promise(resolve=>setTimeout(resolve,10));}}assert.equal(recovered.database.sqlite.prepare('SELECT gems FROM players WHERE id=?').get(actor).gems,739);await recovered.close();
  const second=runner(t,expected);await second.wait('ready');assert.equal(read(expected.file,'SELECT gems FROM players WHERE id=?',[actor])[0].gems,739);assert.equal(read(expected.file,'SELECT * FROM kernel511_admissions WHERE player_id=?',[actor]).length,1);const current=read(expected.file,'SELECT * FROM kernel511_channel_owners WHERE player_id=?',[actor])[0];assert(current.epoch>owner.epoch);assert.notEqual(current.incarnation,owner.incarnation);second.child.send({type:'ticket',request});const resumed=(await second.wait('ticket')).result;assert.equal(resumed.status,200,JSON.stringify(resumed));assert.equal(resumed.channel,admitted.channel);second.child.send({type:'close'});await second.wait('closed');
 }finally{if(ownedStoppedPid!==null)process.kill(ownedStoppedPid,'SIGCONT');}
});
