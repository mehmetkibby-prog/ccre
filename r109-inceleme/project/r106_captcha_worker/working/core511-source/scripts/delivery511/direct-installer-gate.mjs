import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID,randomBytes,generateKeyPairSync,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {setupEntry} from '../core511/tests/entry-fixture.mjs';
import {BASE,native} from '../core511/tests/helpers.mjs';
import {sourceIdentity} from '../core511/source-identity.mjs';
import {maintenanceClient} from './maintenance-client.mjs';
import {healthAt,assertEmptyDatabase} from './install-operations.mjs';
import {installTransaction} from './install-controller.mjs';
import {validateLocalCanary} from './local-canary-acceptance.mjs';
import {canaryUnit,validateCanaryUnit} from './service-units.mjs';
const {WebSocket}=await import('../../../native510-bb3a6cc689c6/node_modules/ws/wrapper.mjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'core511-installer-direct-')),releaseRoot=path.resolve(import.meta.dirname,'../../..'),cleanups=[],children=new Set(),log=[];
const proof={schemaVersion:1,scope:'direct-process-installer-integration',systemdRuntime:'deferred-to-VDS',sourceSha256:sourceIdentity().sha256,passed:false,liveVdsTouched:false,steps:[]};
const output=path.resolve(process.argv[2]??'scripts/core511/evidence/terminal-installer-direct-r1.json');
const pause=ms=>new Promise(r=>setTimeout(r,ms));let accountChild,gameChild,client,newGame,oldGame,prior,oldAccountsFile,newAccountsFile;
function step(s){proof.steps.push(s);console.log(s);}
function write(name,value){const f=path.join(root,name);fs.writeFileSync(f,JSON.stringify(value),{mode:0o600});return f;}
function start(file,configFile){const c=spawn(process.execPath,[file],{cwd:BASE,env:{...process.env,CORE_CONFIG_FILE:configFile,CORE_APP_PORT:String(oldGame.delivery511.appPort),CORE_CHANNEL_PROCESSES:'1'},stdio:['ignore','pipe','pipe','ipc']});children.add(c);for(const s of [c.stdout,c.stderr])s.on('data',b=>log.push(b.toString()));c.on('error',e=>log.push(e.message));return c;}
async function stop(c){if(!c||c.exitCode!==null||c.signalCode!==null)return;const done=new Promise(resolve=>c.once('exit',resolve));c.kill('SIGTERM');const timer=setTimeout(()=>c.kill('SIGKILL'),20000);await done;clearTimeout(timer);}
async function waitFor(predicate){let e;for(let i=0;i<240;i++){try{const v=await predicate();if(v)return v;}catch(error){e=error;}await pause(100);}throw Error('direct_wait:'+e?.message+':'+log.join('').slice(-3500));}
async function accountsReady(){return waitFor(async()=>{try{return await client.policy();}catch(e){if(accountChild.exitCode!==null)throw Error(log.join('').slice(-3000));throw e;}});}
async function startOld(){gameChild=start(path.join(BASE,'vds-server/src/app.mjs'),prior.gameConfigFile);return waitFor(async()=>{const h=await healthAt(oldGame.delivery511.appPort);return h.realm?.channels?.length===3&&h.durability?.ready&&h;});}
async function request(port,url,headers={}){return new Promise((resolve,reject)=>{const req=http.get({host:'127.0.0.1',port,path:url,headers},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>{let body;try{body=JSON.parse(text);}catch{}resolve({status:res.statusCode,body});});});req.setTimeout(3000,()=>req.destroy(Error('request_timeout')));req.on('error',reject);});}
try{
 step('prepare_disposable_databases');const seed=await setupEntry({after:fn=>cleanups.push(fn)},{realTime:true}),dbFile=path.join(root,'game.sqlite'),accountFile=path.join(root,'accounts.sqlite'),realmId='r1',dbIdentity=randomUUID();
 seed.sql.exec('UPDATE players SET last_seen=0;DELETE FROM game_presence;PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(seed.f.file,dbFile);fs.copyFileSync(seed.f.file,accountFile);
 const gameDb=new DatabaseSync(dbFile);(await native('vds-server/src/realm-database-identity.mjs')).bindRealmDatabaseIdentity(gameDb,{realmId,dbIdentity});gameDb.exec('UPDATE world_state SET layout_version=24 WHERE id=1; UPDATE game_settings SET channel_capacity=25 WHERE id=1;');gameDb.close();
 const acct=new DatabaseSync(accountFile);acct.exec("CREATE TABLE IF NOT EXISTS accounts_schema(id INTEGER PRIMARY KEY,origin TEXT);INSERT OR REPLACE INTO accounts_schema(id,origin) VALUES(1,'empty-416a');DELETE FROM game_presence;");acct.close();
 const reserved=[];for(let i=0;i<10;i++){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));reserved.push(s);}const ports=reserved.map(s=>s.address().port);for(const s of reserved)await new Promise(r=>s.close(r));
 const key=randomBytes(32).toString('hex'),keyFile=path.join(root,'realm-key');fs.writeFileSync(keyFile,key,{mode:0o600});const keysFile=write('keys.json',{r1:key});
 const realm={id:realmId,name:'Direct installer',status:'open',registrationOpen:true,channels:3,initialChannelCapacity:25,origin:'https://game.invalid',realtimeOrigin:'https://realtime.invalid',dataRoot:root,database:dbFile,dbIdentity,ports:{proxy:ports[1],app:ports[2],realtime:ports[3],dungeon:ports[4],voice:ports[5]}};
 // Accounts must be outside the game data root; both are still disposable.
 const gameRoot=path.join(root,'r1');fs.mkdirSync(gameRoot);fs.renameSync(dbFile,path.join(gameRoot,'game.sqlite'));realm.dataRoot=gameRoot;realm.database=path.join(gameRoot,'game.sqlite');
 const manifest={version:1,phase:'416b',primaryRealmId:realmId,accountsDatabase:accountFile,authOrigin:'https://accounts.invalid',authPort:ports[0],realms:[realm]},manifestFile=write('manifest3.json',manifest),newManifest={...manifest,realms:[{...realm,channels:4,coreProtocol:'coreoflife-kernel-v1',ports:{...realm.ports,channels:ports.slice(6)}}]},newManifestFile=write('manifest4.json',newManifest);
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),environment={ADMIN_USER_ID:seed.account.id,CORE_CHANNEL_PROCESSES:'1',CORE_APP_PORT:String(ports[2]),CORE_DATA_ROOT:gameRoot,REALTIME_PUBLIC_KEY_SPKI:publicKey.export({type:'spki',format:'der'}).toString('base64'),REALTIME_SIGNING_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'der'}).toString('base64')};
 oldGame={database:realm.database,hosts:['game.invalid'],environment,realm:{id:realmId,role:'game',dbIdentity,manifestFile,keyFile},proxyToken:randomBytes(32).toString('hex'),delivery511:{releaseRoot,appPort:ports[2],proxyPort:ports[1],channelPorts:ports.slice(6)}};
 newGame={...oldGame,realm:{...oldGame.realm,manifestFile:newManifestFile}};
 const ac={database:accountFile,hosts:['accounts.invalid'],environment:{ADMIN_USER_ID:seed.account.id},realm:{role:'accounts',manifestFile,keysFile}};
 oldAccountsFile=write('accounts3.json',ac);newAccountsFile=write('accounts4.json',{...ac,realm:{...ac.realm,manifestFile:newManifestFile}});
 prior={gameConfigFile:write('game3.json',oldGame),newGameConfigFile:write('game4.json',newGame),database:realm.database,appPort:ports[2]};
 client=maintenanceClient({gameConfig:oldGame,accountsConfig:ac,manifest});
 accountChild=start(path.join(BASE,'vds-server/src/accounts-app.mjs'),oldAccountsFile);await accountsReady();await startOld();step('old_native_services_ready');
 const dbInode=fs.statSync(prior.database).ino,readEconomy=()=>{const d=new DatabaseSync(prior.database,{readOnly:true});try{return d.prepare('SELECT id,gems,essence,potions FROM players ORDER BY id').all();}finally{d.close();}},economy=readEconomy();
 const raw=JSON.parse(fs.readFileSync(new URL('../core511/evidence/terminal-canary-driver-r1.json',import.meta.url))),local=validateLocalCanary(raw,proof.sourceSha256);assert(local.passed);
 const policy=()=>client.assert(prior.maintenanceRevision);
 async function rollback(_p,{activated=false}={}){
  await policy();await stop(gameChild);
  if(activated){
   const r=spawn(process.execPath,[path.join(import.meta.dirname,'rollback-entry.mjs'),prior.newGameConfigFile],{cwd:BASE,env:{...process.env},stdio:['ignore','pipe','pipe']});children.add(r);for(const s of [r.stdout,r.stderr])s.on('data',b=>log.push(b.toString()));const code=await new Promise(resolve=>r.once('exit',resolve));assert.equal(code,0,log.join('').slice(-3500));
   await stop(accountChild);accountChild=start(path.join(BASE,'vds-server/src/accounts-app.mjs'),oldAccountsFile);await accountsReady();
  }
  await startOld();await policy();assert.equal(fs.statSync(prior.database).ino,dbInode);assert.deepEqual(readEconomy(),economy);return {oldCode:true,currentDatabase:true,sameInode:true,databaseRestored:false,maintenance:true};
 }
 const o={preflight:async()=>prior,journal:async result=>write('journal.json',result),maintenance:async()=>client.enter(),assertMaintenance:policy,assertEmpty:async()=>{await policy();assertEmptyDatabase(prior.database);},isolation:async()=>{assert(validateCanaryUnit(canaryUnit({releaseRoot,root,parentNetns:fs.readlinkSync('/proc/self/ns/net')})));},stage:async()=>{},canary:async()=>{await stop(gameChild);return local;},activate:async()=>{await stop(accountChild);accountChild=start(path.join(import.meta.dirname,'generated/accounts-entry.mjs'),newAccountsFile);await accountsReady();gameChild=start(path.join(import.meta.dirname,'runtime-entry.mjs'),prior.newGameConfigFile);},health:async()=>waitFor(async()=>{const h=await healthAt(ports[2]);return h.kernel511?.ready&&h.channelProcesses.channels.length===4&&h.channelProcesses.channels.every(c=>c.capacity===25)&&h;}),rollback};
 step('install_transaction');const installed=await installTransaction(o);assert.equal(installed.installed,true,JSON.stringify(installed));await policy();proof.success={maintenance:true,opened:false,channels:4,capacity:25};
 const catalog=await client.admin({resource:'realms',method:'GET'});proof.catalog=catalog;
 const headers={'x-col-proxy-token':newGame.proxyToken,'x-col-public-host':'game.invalid','x-col-client-ip':'198.51.100.10'};
 assert.equal((await request(ports[1],'/_game/api/vds-health',headers)).status,200);assert.equal((await request(ports[1],'/_game/api/vds-health')).status,403);assert.equal((await request(ports[1],'/_game/api/realm/maintenance',headers)).status,403);
 for(let channel=1;channel<=4;channel++)await new Promise((resolve,reject)=>{const ws=new WebSocket('ws://127.0.0.1:'+ports[1]+'/_game/game/channel/'+channel,{headers,origin:'https://game.invalid'});ws.once('error',reject);ws.once('open',()=>{ws.terminate();resolve();});});proof.ingress={fourRealWsUpgradeRoutes:true,missingTokenRejected:true,privateMaintenanceRejected:true};
 step('explicit_open_and_revision_guard');await assert.rejects(client.open(prior.maintenanceRevision-1),/cas/);const opened=await client.open(prior.maintenanceRevision);assert.equal(opened.phase,'open');const maintained=await client.enter();prior.maintenanceRevision=maintained.revision;await o.assertEmpty();proof.explicitOpen={worked:true,staleRevisionRejected:true};
 step('manual_current_database_rollback');proof.manualRollback=await rollback(prior,{activated:true});
 step('automatic_rollback_on_failed_canary');const failure=await installTransaction({...o,canary:async()=>{await stop(gameChild);return {passed:false,failures:['injected_vds_gate_failure']};}});assert.equal(failure.installed,false);assert.equal(failure.rollback.currentDatabase,true);assert.equal(failure.maintenance,true);proof.automaticFailure={stage:failure.stage,rollback:failure.rollback};
 proof.passed=true;
}catch(e){proof.error={message:e.message,stack:e.stack};process.exitCode=1;}
finally{
 for(const c of children)await stop(c);for(const fn of cleanups.toReversed())try{await fn();}catch(e){proof.cleanupError=e.message;proof.passed=false;}
 proof.sourceUnchanged=sourceIdentity().sha256===proof.sourceSha256;proof.passed&&=proof.sourceUnchanged;fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');fs.writeFileSync(output.replace('.json','.log'),log.join(''));fs.rmSync(root,{recursive:true,force:true});console.log(JSON.stringify({passed:proof.passed,error:proof.error?.message}));
}
