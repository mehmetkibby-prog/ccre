import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {BASE,hash,native} from './helpers.mjs';
import {setupEntry} from './entry-fixture.mjs';
import {put,json} from './pvp-fixture.mjs';
import {RealmAdmission as Candidate} from '../generated/native-realm-admission.mjs';
import {patchNativeRealmAdmission} from '../patch-native-realm-admission.mjs';
import {realmGrant} from './native-realm-admission-fixture.mjs';
const {RealmAdmission:Original}=await native('vds-server/src/realm-admission.mjs');
const tokens={sessionToken:'c'.repeat(43),csrfToken:'e'.repeat(43)};

test('realm admission changes only two native batch execution calls and preserves every other module byte',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/native-realm-admission-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.source),'utf8'),generated=fs.readFileSync(new URL('../generated/native-realm-admission.mjs',import.meta.url),'utf8');assert.equal(hash(source),proof.sourceSha256);assert.equal(hash(generated),proof.patchedSha256);assert.equal(proof.edits.length,2);let restored=generated;for(const e of proof.edits)restored=restored.replace(e.replacement,e.original);assert.equal(restored,source);assert.throws(()=>patchNativeRealmAdmission(generated),/native_realm_admission_source_changed/);
});

test('native local grant preserves exact account, session, receipt, ban, replay and30-day lifetime semantics',async t=>{
 const f=await setupEntry(t),db=f.f.database,options={realmId:'realm-grant511',now:f.clock},original=new Original(db,options),candidate=new Candidate(db,options),tables=['accounts','auth_sessions','game_presence','realm_admissions'],read=()=>json(Object.fromEntries(tables.map(name=>[name,f.sql.prepare('SELECT * FROM '+name+' ORDER BY 1').all()]))),before=read();let calls=0;
 db.core511RealmAdmission={acceptBatch:statements=>{calls++;return db.batch(statements);}};
 const restore=()=>{f.sql.exec('DELETE FROM realm_admissions;DELETE FROM auth_sessions;DELETE FROM game_presence');f.sql.prepare('DELETE FROM accounts WHERE id=?').run('realm-new-fixture');for(const row of before.accounts){const keys=Object.keys(row).filter(k=>k!=='id');f.sql.prepare('UPDATE accounts SET '+keys.map(k=>k+'=?').join(',')+' WHERE id=?').run(...keys.map(k=>row[k]),row.id);}for(const name of ['auth_sessions','game_presence'])for(const row of before[name])put(f.sql,name,row);};
 for(const scenario of ['live','expired','missing_presence','banned','suspended','stale_grant','newer_grant','new_account','replay','different_token']){
  const run=async service=>{restore();let grant=realmGrant(f,options.realmId);if(scenario!=='live')f.sql.prepare('UPDATE game_presence SET expires_at_ms=1 WHERE account_id=?').run(f.account.id);if(scenario==='missing_presence')f.sql.prepare('DELETE FROM game_presence WHERE account_id=?').run(f.account.id);if(scenario==='banned')f.sql.prepare('UPDATE accounts SET permanently_banned=1 WHERE id=?').run(f.account.id);if(scenario==='suspended')f.sql.prepare('UPDATE accounts SET suspended_until_ms=? WHERE id=?').run(f.clock()+60000,f.account.id);if(scenario==='stale_grant')grant.account.securityVersion--;if(scenario==='newer_grant')grant.account.securityVersion++;if(scenario==='new_account')grant=realmGrant(f,options.realmId,{account:{id:'realm-new-fixture',username:'YeniRealm511',email:'new-realm511@fixture.invalid'}});
   const answers=[];for(const input of ['replay','different_token'].includes(scenario)?[tokens,scenario==='replay'?tokens:{...tokens,sessionToken:'f'.repeat(43)}]:[tokens]){try{answers.push({result:await service.accept(grant,input)});}catch(error){answers.push({error:{name:error.name,message:error.message,status:error.status??null}});}}return {answers:json(answers),rows:read()};};
  const expected=await run(original),count=calls,actual=await run(candidate);assert.deepEqual(actual,expected,scenario);assert.equal(calls-count,['replay','different_token'].includes(scenario)?2:1);if(['expired','missing_presence','new_account','replay'].includes(scenario))assert.equal(actual.answers[0].result.expiresAt,Math.floor(f.clock()/1000)+30*86400);
 }
});

test('native invalid realm, grant, account, token and expiry denials occur before the ownership adapter',async t=>{
 const f=await setupEntry(t),db=f.f.database,options={realmId:'realm-grant511',now:f.clock},original=new Original(db,options),candidate=new Candidate(db,options);let calls=0;db.core511RealmAdmission={acceptBatch:()=>{calls++;throw Error('invalid grant reached ownership');}};
 for(const [grant,input]of [[{...realmGrant(f,options.realmId),realmId:'other'},tokens],[{...realmGrant(f,options.realmId),grantId:'bad'},tokens],[realmGrant(f,options.realmId,{account:{id:''}}),tokens],[realmGrant(f,options.realmId,{account:{securityVersion:1.5}}),tokens],[realmGrant(f,options.realmId,{expiresAt:f.clock()}),tokens],[realmGrant(f,options.realmId),{...tokens,sessionToken:'bad'}],[realmGrant(f,options.realmId),{...tokens,csrfToken:'bad'}]]){
  await assert.rejects(original.accept(grant,input),/invalid_realm_grant/);await assert.rejects(candidate.accept(grant,input),/invalid_realm_grant/);assert.equal(calls,0);
 }
});
