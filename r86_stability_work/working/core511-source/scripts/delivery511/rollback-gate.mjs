import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {nativeHttpServerFixture} from '../core511/tests/native-http-server-fixture.mjs';
import {NativeWorldStartup} from '../core511/native-world-startup.mjs';
import {NativeRealmStartup} from '../core511/native-realm-startup.mjs';
import {DatabaseHost} from '../core511/database-host.mjs';
import {sourceIdentity} from '../core511/source-identity.mjs';
import {native,BASE,SHA,temporary,until,hash} from '../core511/tests/helpers.mjs';
import {PROTOCOL} from '../core511/contract.mjs';
import {reconcileFourthChannelRollback} from './rollback-current-db.mjs';
const {RealmServiceVerifier}=await native('vds-server/src/realm-service-auth.mjs');
const proof={sourceSha256:sourceIdentity().sha256,baselineManifestSha256:SHA,passed:false,liveVdsTouched:false},out=path.resolve('scripts/core511/evidence/terminal-rollback-gate.json'),cleanup=[],t={after:fn=>cleanup.push(fn)};
let s,cold,legacy,accounts,read;const root=temporary(t);let legacyLog='';
const economy=(db,id)=>({player:db.prepare('SELECT id,gems,essence,potions,xp,level FROM players WHERE id=?').get(id),items:db.prepare('SELECT * FROM player_items WHERE player_id=? ORDER BY id').all(id),receipts:db.prepare('SELECT * FROM kernel511_channel_receipts ORDER BY rowid').all(),transfers:db.prepare('SELECT * FROM kernel511_transfers ORDER BY transfer_id').all()});
try{
 s=await nativeHttpServerFixture(t);s.core.start();await s.host.database.atomic(()=>s.f.sql.prepare('UPDATE players SET hp=1,potions=4,essence=1000 WHERE id=?').run(s.f.id));
 const ticket=await s.call('/api/realtime/core511-ticket',{method:'POST',body:{protocol:PROTOCOL}});assert.equal(ticket.status,200,ticket.text);await s.networkConnect(ticket.body);
 const transfer=await s.call('/api/realtime/core511-transfer',{method:'POST',body:{protocol:PROTOCOL,channel:4}});assert.equal(transfer.status,200,transfer.text);const live=await s.networkConnect(transfer.body);
 const before=economy(s.f.sql,s.f.id);live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1)),7000);assert.equal(s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions,3);
 const now=Date.now(),frame={revision:2,phase:'maintenance',startedAt:now,deadlineMs:now,adminAccountId:'',maintenanceText:'Core511 rollback validation'};s.realm.setPolicy(frame);s.core.realm.maintenance.apply(frame);await s.core.realm.maintenanceFanout438(frame);
 assert.equal(s.core.authority.admission(s.f.id),null);const committed=economy(s.f.sql,s.f.id);assert.notEqual(hash(JSON.stringify(before)),hash(JSON.stringify(committed)));proof.currentBefore={channel:s.f.sql.prepare('SELECT channel FROM players WHERE id=?').get(s.f.id).channel,potions:committed.player.potions,economySha256:hash(JSON.stringify(committed))};assert.equal(proof.currentBefore.channel,4);
 const file=s.host.file,expected={file,realmId:s.host.expected.realmId,dbIdentity:s.host.expected.dbIdentity},inode=fs.statSync(file).ino;await assert.rejects(DatabaseHost.open(expected),{code:'host_database_in_use'});proof.liveOwnerLockRejected=true;await s.host.close();assert([...s.host.children.values()].every(c=>c.exited));
 cold=await DatabaseHost.open(expected);await NativeWorldStartup.prepare(cold);await NativeRealmStartup.prepare(cold,s.realm.config);proof.reconciliation=await reconcileFourthChannelRollback(cold);assert.deepEqual(economy(cold.database.sqlite,s.f.id),committed);
 proof.idempotent=await reconcileFourthChannelRollback(cold);assert.equal(proof.idempotent.players,0);assert.deepEqual(economy(cold.database.sqlite,s.f.id),committed);await cold.close();cold=null;assert.equal(fs.statSync(file).ino,inode);
 // Boot the UNMODIFIED pinned V510 application against this exact database.
 const manifest=JSON.parse(fs.readFileSync(s.realm.config.realm.manifestFile)),realm=manifest.realms[0];realm.channels=3;delete realm.coreProtocol;delete realm.ports.channels;realm.initialChannelCapacity=25;
 const key=Buffer.from(fs.readFileSync(s.realm.config.realm.keyFile,'utf8'),'hex'),verify=new RealmServiceVerifier(new Map([[realm.id,key]]));read=new DatabaseSync(file,{readOnly:true});
 accounts=http.createServer(async(req,res)=>{try{const chunks=[];for await(const b of req)chunks.push(b);const body=Buffer.concat(chunks).toString(),route=req.headers['x-col-service-path'];verify.verify({method:req.method,pathname:route,headers:req.headers,body});const payload=JSON.parse(body),answer=route==='/internal/maintenance/status'?frame:route==='/internal/launch/status'?{phase:frame.phase,canPlay:false,showLanding:true,registrationOpen:false,serverTime:Date.now(),maintenanceDeadlineMs:frame.deadlineMs,revision:frame.revision}:route==='/internal/security/check'?{securityVersion:read.prepare('SELECT security_version FROM accounts WHERE id=?').get(payload.accountId).security_version,blocked:false,canPlay:false,realmStatus:'open',registrationOpen:false,launch:{phase:'maintenance'},maintenanceControl438:frame}:null;assert(answer);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(answer));}catch{res.writeHead(403);res.end();}});await new Promise(r=>accounts.listen(0,'127.0.0.1',r));manifest.authPort=accounts.address().port;
 const manifestFile=path.join(root,'legacy-realms.json');fs.writeFileSync(manifestFile,JSON.stringify(manifest));
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),environment={CORE_CHANNEL_PROCESSES:'1',CORE_APP_PORT:String(s.server.port),CORE_DATA_ROOT:root,CORE_APP_STARTUP_ID:randomUUID(),REALTIME_PUBLIC_KEY_SPKI:publicKey.export({type:'spki',format:'der'}).toString('base64'),REALTIME_PRIVATE_KEY_PKCS8:privateKey.export({type:'pkcs8',format:'der'}).toString('base64')};
 const config={database:file,hosts:['game.invalid'],environment,realm:{...s.realm.config.realm,dbIdentity:expected.dbIdentity,manifestFile}},configFile=path.join(root,'legacy-config.json');fs.writeFileSync(configFile,JSON.stringify(config),{mode:0o600});
 // All runtime sources remain baseline-verified; secrets stay in the disposable root.
 await native('vds-server/src/realm-manifest.mjs');const entry=path.join(BASE,'vds-server/src/app.mjs');const nativeManifest=JSON.parse(fs.readFileSync(path.join(BASE,'realm-package-manifest.json')));assert.equal(hash(fs.readFileSync(entry)),nativeManifest.files.find(r=>r.path==='vds-server/src/app.mjs').sha256);
 legacy=spawn(process.execPath,[entry],{cwd:BASE,env:{...process.env,...environment,CORE_CONFIG_FILE:configFile},stdio:['ignore','pipe','pipe','ipc']});for(const stream of [legacy.stdout,legacy.stderr])stream.on('data',b=>legacyLog=(legacyLog+b).slice(-24000));
 const call=route=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:s.server.port,path:route,headers:{Host:'game.invalid'}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>{let body;try{body=JSON.parse(text);}catch{}resolve({status:res.statusCode,body,text});});});req.on('error',reject);req.end();});
 let health;for(let i=0;i<200;i++){if(legacy.exitCode!==null)throw Error('legacy_start_failed:'+legacyLog.slice(-3500));try{const r=await call('/api/vds-health');if(r.status===200&&r.body?.durability?.ready){health=r.body;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert(health,'legacy_health_timeout:'+legacyLog.slice(-3500));assert.equal(health.realm.dbIdentity,expected.dbIdentity);assert.equal(read.prepare('SELECT channel FROM players WHERE id=?').get(s.f.id).channel,1);assert.deepEqual(economy(read,s.f.id),committed);assert.equal(read.prepare('SELECT channel_capacity FROM game_settings WHERE id=1').get().channel_capacity,25);assert.equal(fs.statSync(file).ino,inode);
 const launch=await call('/api/launch');assert.equal(launch.body?.phase,'maintenance',launch.text);proof.legacy={healthy:true,dbIdentityMatches:true,sameDatabaseInode:true,channel:1,potions:3,economySha256:hash(JSON.stringify(economy(read,s.f.id))),maintenance:true,channelCapacity:25,channels:health.realm.channels};proof.databaseRestored=false;proof.passed=true;
}catch(e){proof.error={message:e.message,code:e.code,stack:e.stack};process.exitCode=1;}
finally{
 if(legacy&&legacy.exitCode===null){legacy.kill('SIGTERM');const killer=setTimeout(()=>legacy.kill('SIGKILL'),15000);await once(legacy,'exit').catch(()=>{});clearTimeout(killer);}read?.close();if(accounts)await new Promise(r=>accounts.close(r));await cold?.close().catch(()=>{});
 for(const fn of cleanup.toReversed())try{await fn();}catch(e){proof.cleanupErrors??=[];proof.cleanupErrors.push(e.message);proof.passed=false;process.exitCode=1;}
 proof.sourceUnchanged=sourceIdentity().sha256===proof.sourceSha256;proof.passed&&=proof.sourceUnchanged;fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\n');fs.writeFileSync(out.replace('.json','-legacy.log'),legacyLog);console.log(JSON.stringify({passed:proof.passed,error:proof.error?.message,legacy:proof.legacy}));
}
