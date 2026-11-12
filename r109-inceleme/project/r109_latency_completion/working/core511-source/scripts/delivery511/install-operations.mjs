import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawnSync,spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {maintenanceClient} from './maintenance-client.mjs';
import {canaryUnit,validateCanaryUnit,runtimeOverride} from './service-units.mjs';
import {validateLoad} from './vds-policy/acceptance.mjs';
import {validateRealmManifest} from '../core511/generated/native-realm-manifest.mjs';
import {sourceIdentity} from '../core511/source-identity.mjs';
import {installedSigningKey} from './installed-key.mjs';
export const CANDIDATE='696fb91cbe38f2683913415cb1df41ea82f83c789d9032d0e8030a185bce2cd6';
export const BASELINE='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
const digest=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
export async function waitForMaintenance(check,{now=Date.now,sleep=pause,timeoutMs=60000}={}){
 const until=now()+timeoutMs;
 for(;;){try{return await check();}catch(error){
  const transient=['ECONNREFUSED','ECONNRESET','ETIMEDOUT','EPIPE'].includes(error.code)||error.message==='central_timeout';
  if(!transient||now()>=until)throw error;
  await sleep(Math.min(250,Math.max(0,until-now())));
 }}
}
export function atomicJson(file,value){
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});const temp=file+'.'+randomUUID()+'.tmp';
 const fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,file);const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
}
function command(program,args,{timeout=70000}={}){
 const p=spawnSync(program,args,{encoding:'utf8',timeout,maxBuffer:1024*1024});
 if(p.status!==0)throw Error(path.basename(program)+'_failed:'+String(p.stderr||p.error?.code||p.status).slice(-1000));return p.stdout.trim();
}
const systemctl=(...args)=>command('/usr/bin/systemctl',args);
export async function healthAt(port){return new Promise((resolve,reject)=>{
 const req=http.get({host:'127.0.0.1',port,path:'/api/vds-health'},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>{try{if(res.statusCode!==200)throw Error('health_status_'+res.statusCode);resolve(JSON.parse(text));}catch(e){reject(e);}});});req.setTimeout(2000,()=>req.destroy(Error('health_timeout')));req.on('error',reject);
});}
async function waitHealth(port,predicate){let error;for(let i=0;i<240;i++){try{const value=await healthAt(port);if(predicate(value))return value;}catch(e){error=e;}await pause(250);}throw Error('health_not_ready:'+String(error?.message??''));}
export function assertEmptyDatabase(file){
 const db=new DatabaseSync(file,{readOnly:true});try{
  const exists=name=>Boolean(db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(name));
  const counts={presence:exists('game_presence')?db.prepare('SELECT COUNT(*) n FROM game_presence WHERE expires_at_ms>?').get(Date.now()).n:0,recentPlayers:db.prepare('SELECT COUNT(*) n FROM players WHERE last_seen>?').get(Math.floor(Date.now()/1000)-40).n,admissions:exists('kernel511_admissions')?db.prepare('SELECT COUNT(*) n FROM kernel511_admissions').get().n:0};
  if(Object.values(counts).some(n=>n!==0))throw Error('server_not_empty_including_GM:'+JSON.stringify(counts));return counts;
 }finally{db.close();}
}
export function verifyFiles(root,manifest){
 for(const row of manifest.files){if(path.isAbsolute(row.path)||row.path.split('/').includes('..'))throw Error('release_member_path');const file=path.join(root,row.path),s=fs.lstatSync(file);if(!s.isFile()||s.size!==row.bytes||digest(fs.readFileSync(file))!==row.sha256)throw Error('release_file_mismatch:'+row.path);}
}
export function verifyPackage(root){
 const m=read(path.join(root,'release-manifest.json'));if(m.runtimeSha256!==CANDIDATE||m.baselineSha256!==BASELINE||sourceIdentity().sha256!==CANDIDATE)throw Error('release_identity');verifyFiles(root,m);
 for(const row of m.symlinks??[]){
  if(path.isAbsolute(row.path)||row.path.split('/').includes('..')||path.isAbsolute(row.target))throw Error('release_symlink_path');
  const file=path.join(root,row.path),target=fs.realpathSync(file);
  if(!fs.lstatSync(file).isSymbolicLink()||fs.readlinkSync(file)!==row.target||!target.startsWith(root+'/'))throw Error('release_symlink_changed');
 }
 return m;
}
function inode(file){const s=fs.statSync(file);if(!s.isFile()||s.nlink!==1)throw Error('database_file_identity');return {dev:s.dev,ino:s.ino};}
function sameInode(file,witness){const now=inode(file);if(now.dev!==witness.dev||now.ino!==witness.ino)throw Error('current_database_replaced');}
function writePrivate(file,bytes,uid,gid){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o750});fs.writeFileSync(file,bytes,{mode:0o600});if(uid!==undefined)fs.chownSync(file,uid,gid);}
function identity(user){const uid=Number(command('/usr/bin/id',['-u',user])),gid=Number(command('/usr/bin/id',['-g',user]));if(!Number.isSafeInteger(uid)||uid===0||!Number.isSafeInteger(gid))throw Error('service_user');return {uid,gid};}
function show(unit,property){return systemctl('show',unit,'--property='+property,'--value');}
function memorySnapshot(){const values=Object.fromEntries(fs.readFileSync('/proc/meminfo','utf8').split('\n').filter(Boolean).map(line=>{const [key,n]=line.split(/:\s*/);return [key,Number(n.split(/\s+/)[0])*1024];}));return {totalBytes:values.MemTotal,usedBytes:values.MemTotal-values.MemAvailable,availableBytes:values.MemAvailable};}

function assertCanaryStorage(){
 for(const [directory,minimum,disk] of [['/var/lib',2*1024**3,true],['/run/systemd',32*1024**2,false]]){
  const s=fs.statfsSync(directory),available=s.bavail*s.bsize;
  if(disk&&[0x01021994,0x858458f6].includes(Number(s.type)))throw Error('canary_disk_backed_storage_required');
  if(!Number.isFinite(available)||available<minimum)throw Error('canary_storage_required:'+directory+':free='+available+':required='+minimum);
 }
}

export function productionOperations(releaseRoot,{stateFile='/var/lib/core511/state.json'}={}){
 let state={},client,game,accounts,manifest,packageManifest,serial=0;
 const transactionDir='/var/lib/core511/transactions/'+randomUUID();
 function bind(p){game=read(p.gameConfigFile);accounts=read(p.accountsConfigFile);manifest=read(p.originalManifestFile);client=maintenanceClient({gameConfig:game,accountsConfig:accounts,manifest});}
 const journal=async next=>{state={...state,...next,updatedAt:new Date().toISOString(),releaseRoot,candidate:CANDIDATE};atomicJson(stateFile,state);};
 async function unchanged(p){sameInode(p.database,p.databaseIdentity);if(fs.realpathSync('/opt/coreoflife-realms/current')!==p.originalRelease)throw Error('installed_release_changed');await waitForMaintenance(()=>client.assert(p.maintenanceRevision));}
 async function isolated(p,probe){
  assertCanaryStorage();
  const user='col-'+p.realmId,{uid,gid}=identity(user),root='/var/lib/core511-canary-'+randomUUID();fs.mkdirSync(root,{mode:0o700});fs.chownSync(root,uid,gid);
  const unit='core511-'+(probe?'isolation':'canary')+'-'+randomUUID()+'.service',unitFile='/run/systemd/system/'+unit;
  const cpus=command('/usr/bin/python3',['-c','import os; print(" ".join(map(str,sorted(os.sched_getaffinity(0))[:4])))']);
  const body=canaryUnit({releaseRoot,root,user,parentNetns:fs.readlinkSync('/proc/self/ns/net'),probe,cpus});validateCanaryUnit(body);fs.writeFileSync(unitFile,body,{mode:0o644});
  let maxUsed=0,minAvailable=Infinity,elapsed=0;const servicePeak={};
  const sample=()=>{const m=memorySnapshot();maxUsed=Math.max(maxUsed,m.usedBytes);minAvailable=Math.min(minAvailable,m.availableBytes);for(const unitName of ['coreoflife-accounts.service','coreoflife-rt-'+p.realmId+'.service','caddy.service','nginx.service']){try{const cg=show(unitName,'ControlGroup');if(cg){const n=Number(fs.readFileSync('/sys/fs/cgroup'+cg+'/memory.current','utf8'));if(Number.isFinite(n))servicePeak[unitName]=Math.max(servicePeak[unitName]??0,n);}}catch{}}};
  let report,reportedExit;
  try{
   command('/usr/bin/systemd-analyze',['verify',unitFile]);systemctl('daemon-reload');systemctl('start',unit);
   // Inspect the manager's effective settings, not just the rendered text.
   for(const [property,want]of [['PrivateNetwork','yes'],['PrivateTmp','yes'],['NoNewPrivileges','yes'],['ProtectSystem','strict'],['KillMode','control-group'],['User',user]])if(show(unit,property)!==want)throw Error('effective_unit_property:'+property);
   const at=Date.now();while(Date.now()-at<(probe?45000:350000)){
    sample();const active=show(unit,'ActiveState');if(['inactive','failed'].includes(active)){reportedExit={result:show(unit,'Result'),status:show(unit,'ExecMainStatus')};break;}await pause(1000);
   }elapsed=Date.now()-at;
   if(!reportedExit)throw Error('isolated_unit_timeout');
   const resultFile=path.join(root,probe?'isolation.json':'report.json');report=read(resultFile);
   const evidenceDir=path.join(transactionDir,'evidence');fs.mkdirSync(evidenceDir,{recursive:true,mode:0o700});const saved=path.join(evidenceDir,(probe?'isolation':'canary')+'.json');
   report.systemd={effectiveVerified:true,...reportedExit,elapsedMs:elapsed};
   report.wholeVdsMemory={peakUsedBytes:maxUsed,minimumAvailableBytes:minAvailable,servicePeakBytes:servicePeak,nginxInstalledMeasured:Object.hasOwn(servicePeak,'nginx.service'),includesOsAndOtherProcesses:true,method:'MemTotal minus MemAvailable; cgroup service memory includes descendants and cache',samplesIntervalMs:1000};
   atomicJson(saved,report);
   if(reportedExit.result!=='success'||reportedExit.status!=='0')throw Object.assign(Error('isolated_unit_failed'),{failures:report.acceptance?.failures??[report.error??reportedExit.result]});
   return {report,file:saved,sha256:digest(fs.readFileSync(saved))};
  }finally{
   systemctl('stop',unit);const active=show(unit,'ActiveState');if(!['inactive','failed'].includes(active))throw Error('canary_unit_still_active');
   // Free the stopped scope's disposable files BEFORE requesting manager reload.
   fs.rmSync(root,{recursive:true,force:true});
   fs.rmSync(unitFile,{force:true});systemctl('daemon-reload');
  }
 }
 const o={
  journal,
  async preflight(){
   if(process.getuid()!==0)throw Error('root_required');assertCanaryStorage();packageManifest=verifyPackage(releaseRoot);
   const originalManifestFile='/var/lib/coreoflife-realms-417/manifest.json';manifest=read(originalManifestFile);const realmId=manifest.primaryRealmId,realm=manifest.realms.find(r=>r.id===realmId);
   if(!realm||realm.channels!==3||!Number.isInteger(realm.initialChannelCapacity)||realm.initialChannelCapacity<1||realm.initialChannelCapacity>30)throw Error('installed_three_channels_required');
   const originalRelease=fs.realpathSync('/opt/coreoflife-realms/current'),raw=fs.readFileSync(path.join(originalRelease,'realm-package-manifest.json'));
   if(!originalRelease.startsWith('/opt/coreoflife-realms/releases/')||digest(raw)!==BASELINE)throw Error('exact_installed_V510_required');verifyFiles(originalRelease,JSON.parse(raw));
   const activeState=read(path.join(realm.dataRoot,'state.json'));if(activeState.status!=='active'||typeof activeState.job!=='string'||!/^[a-zA-Z0-9_-]+$/.test(activeState.job))throw Error('active_realm_state_required');
   const gameConfigFile=path.join(realm.dataRoot,'jobs',activeState.job,'config.json'),accountsConfigFile=path.join(path.dirname(originalManifestFile),'accounts/config.json');
   const p={realmId,database:realm.database,databaseIdentity:inode(realm.database),originalManifestFile,originalManifestSha256:digest(fs.readFileSync(originalManifestFile)),gameConfigFile,accountsConfigFile,originalRelease,gameUnit:'coreoflife-'+realmId+'.service',accountsUnit:'coreoflife-accounts.service',transactionDir,changedUnits:[],oldStopped:false};bind(p);installedSigningKey(game);
   if(game.database!==realm.database||game.realm.dbIdentity!==realm.dbIdentity||accounts.database!==manifest.accountsDatabase)throw Error('configured_database_binding');
   for(const unit of [p.gameUnit,p.accountsUnit])if(show(unit,'ActiveState')!=='active')throw Error('prior_service_not_active:'+unit);
   const h=await healthAt(realm.ports.app);if(h.realm?.dbIdentity!==realm.dbIdentity||h.realm?.channels?.length!==3)throw Error('prior_runtime_identity');
   if(h.realm?.channelCapacity!==25)throw Error('installed_live_channel_capacity_25_required:'+String(h.realm?.channelCapacity??'missing'));
   for(const unit of [p.gameUnit,p.accountsUnit])if(fs.existsSync('/etc/systemd/system/'+unit+'.d/90-core511.conf'))throw Error('existing_core511_override');return p;
  },
  async maintenance(p){bind(p);return client.enter();},
  async assertMaintenance(p){return client.assert(p.maintenanceRevision);},
  async assertEmpty(p){await unchanged(p);return assertEmptyDatabase(p.database);},
  async isolation(p){await unchanged(p);const result=await isolated(p,true);if(result.report.passed!==true)throw Error('strict_isolation_not_verified');p.isolation=result;},
  async stage(p){
   await unchanged(p);fs.mkdirSync(transactionDir,{recursive:true,mode:0o755});
   // Service users traverse directories; journals and per-user secrets stay 0600.
   for(const dir of ['/var/lib/core511','/var/lib/core511/transactions',transactionDir])fs.chmodSync(dir,0o755);
   const selected=manifest.realms.find(r=>r.id===p.realmId),used=new Set([manifest.authPort,...manifest.realms.flatMap(r=>Object.values(r.ports).flat())]);
   const ports=[];for(let port=41000;ports.length<4&&port<42000;port++)if(!used.has(port))ports.push(port);
   // Reserve checks below are read-only bind probes, then closed before activation.
   const net=await import('node:net');for(const port of ports){const s=net.createServer();await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(port,'127.0.0.1',resolve);});await new Promise(r=>s.close(r));}
   const next={...manifest,realms:manifest.realms.map(r=>r.id===p.realmId?{...r,channels:4,coreProtocol:'coreoflife-kernel-v1',initialChannelCapacity:25,ports:{...r.ports,channels:ports}}:r)};validateRealmManifest(next);
   const {uid,gid}=identity('col-'+p.realmId),aid=identity('col-accounts');
   // Manifest carries no secrets; both existing service users need read access.
   const manifestFile=path.join(transactionDir,'manifest511.json');fs.writeFileSync(manifestFile,JSON.stringify(next,null,2)+'\n',{mode:0o644});
   const gameFile=path.join(transactionDir,'game.json'),accountsFile=path.join(transactionDir,'accounts.json');
   const nextGame={...game,realm:{...game.realm,manifestFile},delivery511:{releaseRoot,channelPorts:ports,appPort:selected.ports.app,proxyPort:selected.ports.proxy}};
   writePrivate(gameFile,JSON.stringify(nextGame,null,2)+'\n',uid,gid);writePrivate(accountsFile,JSON.stringify({...accounts,realm:{...accounts.realm,manifestFile}},null,2)+'\n',aid.uid,aid.gid);
   p.newGameConfigFile=gameFile;p.newAccountsConfigFile=accountsFile;p.channelPorts=ports;p.appPort=selected.ports.app;
  },
  async canary(p){
   await o.assertEmpty(p);p.oldStopped=true;await journal({stage:'canary_stopping_prior',prior:p});systemctl('stop',p.gameUnit);
   if(show(p.gameUnit,'ActiveState')!=='inactive')throw Error('prior_game_stop_failed');sameInode(p.database,p.databaseIdentity);
   const result=await isolated(p,false),r=result.report,acceptance=validateLoad(r,{transport:'websocket',durationMs:180000,manifestSha256:CANDIDATE,requireCompleteGame:false});
   if(r.cleanupComplete!==true||r.sourceUnchanged!==true||r.generator?.nice!==10||r.systemd?.effectiveVerified!==true)acceptance.failures.push('canary_integrity_or_cleanup');
   if(!Number.isFinite(r.wholeVdsMemory?.peakUsedBytes)||r.wholeVdsMemory.peakUsedBytes>4*1024**3)acceptance.failures.push('whole_vds_ram');
   acceptance.passed=acceptance.failures.length===0;return {...acceptance,reportFile:result.file,reportSha256:result.sha256,scope:'VDS-20261015-300-200'};
  },
  async activate(p){
   await o.assertEmpty(p);systemctl('stop',p.accountsUnit);
   for(const [unit,role,configFile,dataRoot]of [[p.accountsUnit,'accounts',p.newAccountsConfigFile,path.dirname(accounts.database)],[p.gameUnit,'game',p.newGameConfigFile,path.dirname(p.database)]]){
    const file='/etc/systemd/system/'+unit+'.d/90-core511.conf',body=runtimeOverride({releaseRoot,configFile,role,dataRoot});
    fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file))throw Error('override_race');p.changedUnits.push({unit,file,sha256:digest(body)});await journal({stage:'activate_override',prior:p});fs.writeFileSync(file,body,{mode:0o644});
   }
   systemctl('daemon-reload');systemctl('start',p.accountsUnit);await waitForMaintenance(()=>client.assert(p.maintenanceRevision));systemctl('start',p.gameUnit);
  },
  async health(p){
   sameInode(p.database,p.databaseIdentity);const h=await waitHealth(p.appPort,h=>h.kernel511?.ready===true&&h.realm.dbIdentity===game.realm.dbIdentity&&h.channelProcesses?.channels?.length===4&&h.channelProcesses.channels.every(c=>c.ready&&c.capacity===25));
   const catalog=await client.admin({resource:'realms',method:'GET'}),listed=catalog.realms?.find(r=>r.id===p.realmId);
   if(!listed||listed.channels?.length!==4||listed.channelCapacity!==25||listed.capacity!==100||listed.online!==listed.channels.reduce((a,b)=>a+b,0))throw Error('accounts_catalog_four_channels_required');
   p.health={channels:h.channelProcesses.channels.map(c=>({channel:c.channel,ready:c.ready,capacity:c.capacity})),sameCurrentDb:true};return h;
  },
  async rollback(p,{activated=false}={}){
   bind(p);await unchanged(p);
   if(activated||p.changedUnits?.length){
    systemctl('stop',p.gameUnit);if(show(p.gameUnit,'ActiveState')!=='inactive')throw Error('new_game_stop_failed');sameInode(p.database,p.databaseIdentity);
    // Reconcile only when the new core has actually bootstrapped this DB.
    const db=new DatabaseSync(p.database,{readOnly:true});let hasCore;try{hasCore=Boolean(db.prepare("SELECT 1 FROM sqlite_schema WHERE name='kernel511_host_boot'").get());}finally{db.close();}
    if(hasCore&&p.newGameConfigFile)command(path.join(releaseRoot,'bin/node'),[path.join(releaseRoot,'core511-source/scripts/delivery511/rollback-entry.mjs'),p.newGameConfigFile],{timeout:60000});
    systemctl('stop',p.accountsUnit);
    for(const row of p.changedUnits??[]){if(!fs.existsSync(row.file))continue;if(digest(fs.readFileSync(row.file))!==row.sha256)throw Error('override_modified_during_installation');fs.unlinkSync(row.file);}
    systemctl('daemon-reload');systemctl('start',p.accountsUnit);await waitForMaintenance(()=>client.assert(p.maintenanceRevision));
   }
   if(p.oldStopped||activated)systemctl('start',p.gameUnit);
   const realm=manifest.realms.find(r=>r.id===p.realmId);await waitHealth(realm.ports.app,h=>h.realm?.dbIdentity===realm.dbIdentity&&h.realm?.channels?.length===3);sameInode(p.database,p.databaseIdentity);await waitForMaintenance(()=>client.assert(p.maintenanceRevision));
   return {oldCode:true,currentDatabase:true,sameInode:true,databaseRestored:false,maintenance:true};
  },
  async resume(p){bind(p);return p;},
  async open(p){bind(p);await unchanged(p);await o.health(p);return client.open(p.maintenanceRevision);}
 };
 return o;
}
