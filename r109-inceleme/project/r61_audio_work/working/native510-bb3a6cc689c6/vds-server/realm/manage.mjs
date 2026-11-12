import {readFile,writeFile,mkdir,cp,chmod,chown,symlink,rename,realpath,stat,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
import {checkBackupSpace,restoreLegacyRealtime} from '../src/realm-install-preflight.mjs';
import {prepareRealmInstallation} from '../src/realm-provision.mjs';
import {preserveRealmSettings} from '../src/realm-settings-copy.mjs';
import {renderRealmDeployment} from '../src/realm-deployment-files.mjs';
import {activateFreshRealms,deleteRetainedArchive} from '../src/realm-cutover.mjs';
import {cleanupRealmReleases} from '../src/realm-release-cleanup.mjs';
import {recoverRealmPackage} from '../src/realm-recovery.mjs';
import {verifyRealmPackage} from '../src/realm-package-integrity.mjs';
import {verifyNativeBuild} from '../src/native-build-integrity.mjs';
const args=process.argv.slice(2),action=args.shift(),options=Object.fromEntries(args.map(a=>{const i=a.indexOf('=');if(i<3||!a.startsWith('--'))throw new Error('Use --name=value');return[a.slice(2,i),a.slice(i+1)];}));
const dataRoot=options.root??'/var/lib/coreoflife-realms',codeRoot='/opt/coreoflife-realms',source=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const write=async(file,value,mode=0o600)=>{await writeFile(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{mode});await chmod(file,mode);};
const run=(cmd,...argv)=>execFileSync(cmd,argv,{stdio:['ignore','pipe','pipe'],encoding:'utf8'}).trim();
const system=(...a)=>run('systemctl',...a);
const active=name=>{try{return system('is-active',name)==='active';}catch{return false;}};
const requireRoot=()=>{if(process.getuid?.()!==0)throw new Error('Root required');};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// All host mutations, including prepare/stage/bind-owner/rollback, share one lock.
if(['prepare','stage','activate','bind-owner','rollback','delete-backup'].includes(action)&&process.env.CORE_REALM_INSTALL_LOCK!=='1'){
 requireRoot();await mkdir(codeRoot,{recursive:true,mode:0o755});
 try{execFileSync('/usr/bin/flock',['--nonblock',codeRoot+'/installer.lock',process.execPath,fileURLToPath(import.meta.url),...process.argv.slice(2)],{env:{...process.env,CORE_REALM_INSTALL_LOCK:'1'},stdio:'inherit'});}catch(e){process.exit(e.status??1);}process.exit(0);
}

const currentConfig=async()=>{const legacy=options['legacy-root']??'/var/lib/coreoflife-game',state=await json(legacy+'/state.json');if(!/^[a-zA-Z0-9-]+$/.test(state.job))throw new Error('Invalid legacy job');return json(path.join(legacy,'jobs',state.job,'config.json'));};
const backupTimers=['coreoflife-accounts-backup.timer','coreoflife-r1-backup.timer','coreoflife-r2-backup.timer'];
const freshServices=['coreoflife-accounts.service','coreoflife-rt-r1.service','coreoflife-r1.service'];
const probe=async(url,predicate)=>{for(let i=0;i<120;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(1500)});if(r.ok&&predicate(await r.json()))return true;}catch{}await wait(500);}return false;};
function removeHosts(routes,hosts){return routes.flatMap(route=>{
 const next=structuredClone(route);
 if(next.match){next.match=next.match.flatMap(m=>{if(!m.host)return[m];const remaining=m.host.filter(h=>!hosts.has(h));return remaining.length?[{...m,host:remaining}]:[];});if(!next.match.length)return[];}
 for(const handler of next.handle??[])if(handler.routes)handler.routes=removeHosts(handler.routes,hosts);
 return[next];
});}
async function installCode({select=false}={}){
 await cleanupRealmReleases(codeRoot);
 await verifyNativeBuild(path.join(source,'dist-vds'));
 const inventory=await verifyRealmPackage(source),revision=inventory.revision;
 const release=codeRoot+'/releases/416a-'+revision;
 await mkdir(codeRoot+'/releases',{recursive:true,mode:0o755});
 try{await stat(release);await verifyRealmPackage(release);await verifyNativeBuild(release+'/dist-vds');await stat(release+'/installation-complete.json');}catch(error){if(error.code!=='ENOENT')throw error;
  await mkdir(release,{mode:0o755});
  for(const file of [...inventory.files,{path:'realm-package-manifest.json'}]){await mkdir(path.dirname(release+'/'+file.path),{recursive:true});await cp(source+'/'+file.path,release+'/'+file.path);}
  // Vinext is needed at runtime and is pinned in the root lockfile.
  execFileSync('npm',['ci'],{cwd:release,stdio:'inherit'});
  execFileSync('npm',['ci','--omit=dev'],{cwd:release+'/realtime-server',stdio:'inherit'});
  await write(release+'/realm-release.json',{version:'416a',schemaVersion:1,revision},0o644);
  await write(release+'/installation-complete.json',{version:'416a',revision,completedAtMs:Date.now()},0o644);
 }
 if(select){await symlink(release,codeRoot+'/current.next');await rename(codeRoot+'/current.next',codeRoot+'/current');}return release;
}
if(action==='prepare'){
 requireRoot();try{await stat(dataRoot);throw new Error('New installation root must not exist');}catch(e){if(e.code!=='ENOENT')throw e;}const legacy=await currentConfig();
 await installCode({select:true});
 const manifest=await prepareRealmInstallation({root:dataRoot,authOrigin:options['auth-origin']??'https://accounts.coreoflife.net',realmOrigins:[options['r1-origin']??'https://r1.coreoflife.net',options['r2-origin']??'https://r2.coreoflife.net'],realtimeOrigins:[options['rt1-origin']??'https://rt1.coreoflife.net',options['rt2-origin']??'https://rt2.coreoflife.net'],environment:legacy.environment??{}});
 const configs=new Map(await Promise.all(manifest.realms.map(async r=>[r.id,await json(r.dataRoot+'/jobs/realm/config.json')])));
 // Retain the existing voice service when configured; data directories remain
 // inaccessible to other realm users. Clients receive realm-scoped room tokens.
 let voice=null;try{voice=await readFile('/etc/coreoflife-voice.json','utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 if(voice)for(const realm of manifest.realms){const file=realm.dataRoot+'/voice.json';await write(file,voice);const c=configs.get(realm.id);c.environment.CORE_VOICE_CONFIG_FILE=file;await write(realm.dataRoot+'/jobs/realm/config.json',c);}

 const flagNames=['CORE_MEMORY_POSITIONS','CORE_MEMORY_COMBAT','CORE_WORLD_LOOP','CORE_MOVEMENT_DOUBLE_BUFFER','CORE_WORLD_PUSH','CORE_ASYNC_WAL_SYNC','CORE_WAL_CHECKPOINT_WORKER','CORE_PREPARED_CACHE','CORE_NATIVE_REALTIME','CORE_REALTIME_BATCH','CORE_WORLD_TICK_MS','CORE_WAL_AUTOCHECKPOINT_PAGES'];
 const flags={};for(const key of flagNames)if(legacy.environment?.[key]!==undefined)flags[key]=String(legacy.environment[key]);
 let legacyFlags='';try{legacyFlags=await readFile('/etc/coreoflife-game.env','utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const line of legacyFlags.split('\n')){const match=line.trim().match(/^([A-Z_]+)=(.*)$/);if(match&&flagNames.includes(match[1]))flags[match[1]]=match[2].trim().replace(/^['"]|['"]$/g,'');}
 for(const value of Object.values(flags))if(!/^[0-9]+$/.test(value))throw new Error('Unsupported legacy performance flag; existing services unchanged');
 for(const realm of manifest.realms){const c=configs.get(realm.id);for(const key of flagNames)delete c.environment[key];await write(realm.dataRoot+'/jobs/realm/config.json',c);await write(realm.dataRoot+'/runtime.env',Object.entries(flags).map(([k,v])=>k+'='+v).join('\n')+'\n');}
 const files=renderRealmDeployment(manifest,configs,{dataRoot});await mkdir(dataRoot+'/installer',{mode:0o700});
 await write(dataRoot+'/installer/realms.caddy',files.caddy+'\ncoreoflife.net, www.coreoflife.net {\n redir '+manifest.authOrigin+'{uri} 302\n}\n');
 for(const [name,value]of Object.entries(files.units))await write(dataRoot+'/installer/'+name,value,0o644);
 for(const [id,directory]of [['accounts',dataRoot+'/accounts'],...manifest.realms.map(r=>[r.id,r.dataRoot])]){
  const user='col-'+id;try{run('id',user);}catch{run('useradd','--system','--home-dir',directory,'--no-create-home','--shell','/usr/sbin/nologin',user);}
  run('chown','-R',user+':'+user,directory);
 }
 await mkdir(dataRoot+'/retained',{mode:0o700});
 await write(dataRoot+'/installer/legacy.json',{database:legacy.database,gameActive:active('coreoflife-game.service'),backupActive:active('coreoflife-game-backup.timer')});
 console.log('Prepared only. Legacy database/services unchanged. Sunucu 2 CLOSED.');
}else if(action==='stage'){
 requireRoot();console.log(await installCode());
}else if(action==='activate'){
 requireRoot();const manifest=await json(dataRoot+'/manifest.json'),legacy=await json(dataRoot+'/installer/legacy.json');
 const oldCaddyFile=dataRoot+'/installer/caddy-before.json',newCaddyFile='/etc/caddy/coreoflife-realms.json',dropin='/etc/systemd/system/caddy.service.d/416a.conf';
 let previousDropin=null;try{previousDropin=await readFile(dropin,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 const stopFresh=async()=>{for(const timer of backupTimers){try{system('disable','--now',timer);}catch{}}system('stop',...freshServices);};
 let legacyRealtime=null;
 const restoreLegacy=async()=>{
  if(legacyRealtime)restoreLegacyRealtime(system,legacyRealtime);
  if(previousDropin!==null)await write(dropin,previousDropin,0o644);else await write(dropin,'# v416a activation failed; original service command retained\n',0o644);
  system('daemon-reload');run('caddy','reload','--config',oldCaddyFile);
  if(legacy.gameActive)system('start','coreoflife-game.service');if(legacy.backupActive)system('start','coreoflife-game-backup.timer');
 };
 const result=await activateFreshRealms({confirmation:options.confirm,legacyDatabase:legacy.database,archiveRoot:dataRoot+'/retained',receiptFile:dataRoot+'/installer/cutover.json',operations:{
  async preflight(){
   const space=await checkBackupSpace(legacy.database,dataRoot+'/retained');
   await write(dataRoot+'/installer/disk-preflight.json',space);
   legacyRealtime={active:active('coreoflife-realtime.service'),enabled:system('show','--property=UnitFileState','--value','coreoflife-realtime.service')};
   await write(dataRoot+'/installer/legacy-realtime.json',legacyRealtime);
   await verifyNativeBuild(codeRoot+'/current/dist-vds');
   const current=await fetch('http://127.0.0.1:2019/config/',{headers:{Origin:'http://127.0.0.1:2019'},signal:AbortSignal.timeout(3000)});if(!current.ok)throw new Error('Caddy configuration unavailable');
   const previous=await current.json();await write(oldCaddyFile,previous);
   const extra=JSON.parse(run('caddy','adapt','--config',dataRoot+'/installer/realms.caddy','--adapter','caddyfile'));
   const oldServers=previous.apps?.http?.servers,newServers=Object.values(extra.apps?.http?.servers??{});
   const target=Object.values(oldServers??{}).find(s=>s.listen?.includes(':443'));
   if(!target||newServers.length!==1)throw new Error('Unsupported ingress layout: no routing changed');
   const hosts=new Set(['coreoflife.net','www.coreoflife.net',new URL(manifest.authOrigin).host,...manifest.realms.flatMap(r=>[new URL(r.origin).host,new URL(r.realtimeOrigin).host])]);
   for(const s of Object.values(oldServers))s.routes=removeHosts(s.routes??[],hosts);
   target.routes=[...newServers[0].routes,...target.routes];await write(newCaddyFile,previous,0o640);run('chown','root:caddy',newCaddyFile);
   run('caddy','validate','--config',newCaddyFile);
   for(const r of manifest.realms)if(r.id!=='r1'&&r.status!=='closed')throw new Error('Secondary realm must remain closed');
  },
  async stopLegacy(){system('stop','coreoflife-game-backup.timer','coreoflife-game-backup.service','coreoflife-game.service');},
  async startFresh(backup){
   for(const realm of manifest.realms)execFileSync(process.execPath,['vds-server/src/app.mjs'],{cwd:codeRoot+'/current',env:{...process.env,CORE_CONFIG_FILE:realm.dataRoot+'/jobs/realm/config.json',CORE_DATA_ROOT:realm.dataRoot,CORE_REALM_PREPARE_SCHEMA:'1'},stdio:'inherit'});
   const preserved=await preserveRealmSettings({backupFile:path.join(backup.directory,backup.file),manifest});
   await write(dataRoot+'/installer/preserved-settings.json',preserved);
   for(const directory of [dataRoot+'/accounts',...manifest.realms.map(r=>r.dataRoot)]){const id=path.basename(directory);run('chown','-R','col-'+id+':col-'+id,directory);}
   for(const name of (await readdir(dataRoot+'/installer')).filter(name=>/^coreoflife-[a-z0-9-]+\.(service|timer)$/.test(name)))await cp(dataRoot+'/installer/'+name,'/etc/systemd/system/'+name);
   system('daemon-reload');system('start','coreoflife-rt-r1.service');system('start','coreoflife-accounts.service');system('start','coreoflife-r1.service');
  },
  async verifyFresh(){return{accounts:await probe(`http://127.0.0.1:${manifest.authPort}/api/vds-health`,v=>v.role==='accounts'&&v.releaseVersion==='416a'),realm1:await probe(`http://127.0.0.1:${manifest.realms[0].ports.app}/api/vds-health`,v=>v.realm?.dbIdentity===manifest.realms[0].dbIdentity&&v.releaseVersion==='416a'&&v.durability?.ready===true),realm2Closed:!active('coreoflife-r2.service')&&!active('coreoflife-rt-r2.service')};},
  async switchIngress(){
   await mkdir(path.dirname(dropin),{recursive:true});await write(dropin,`[Service]\nExecStart=\nExecStart=/usr/bin/caddy run --environ --config ${newCaddyFile}\nExecReload=\nExecReload=/usr/bin/caddy reload --config ${newCaddyFile} --force\n`,0o644);
   system('daemon-reload');run('caddy','reload','--config',newCaddyFile);
   if(!await probe(manifest.authOrigin+'/api/vds-health',v=>v.role==='accounts'&&v.releaseVersion==='416a')||!await probe(manifest.realms[0].origin+'/api/vds-health',v=>v.realm?.dbIdentity===manifest.realms[0].dbIdentity&&v.durability?.ready===true)||!await probe(manifest.realms[0].realtimeOrigin+'/readyz',v=>v.ok===true))throw new Error('Public HTTPS readiness failed');
   system('enable',...freshServices);system('enable','--now',...backupTimers);system('disable','coreoflife-game.service','coreoflife-game-backup.timer');
   system('stop','coreoflife-realtime.service');system('disable','coreoflife-realtime.service');
  },stopFresh,restoreLegacy}});
 await cleanupRealmReleases(codeRoot).catch(error=>console.warn('Code cleanup skipped safely: '+error.message));
 console.log(JSON.stringify(result));
}else if(action==='delete-backup'){
 requireRoot();const receiptFile=dataRoot+'/installer/cutover.json',receipt=await json(receiptFile),manifest=await json(dataRoot+'/manifest.json');
 if(!await probe(`http://127.0.0.1:${manifest.realms[0].ports.app}/api/vds-health`,v=>v.realm?.dbIdentity===manifest.realms[0].dbIdentity&&v.durability?.ready===true))throw new Error('Current new world is not healthy; archive retained');
 console.log(await deleteRetainedArchive({confirmation:options.confirm,receiptFile,directory:receipt.backupDirectory}));
}else if(action==='bind-owner'){
 requireRoot();if(!options.username)throw new Error('Explicit owner username required');
 const manifest=await json(dataRoot+'/manifest.json'),db=new DatabaseSync(manifest.accountsDatabase,{readOnly:true});let account;
 try{account=db.prepare('SELECT id FROM accounts WHERE username=?').get(options.username);}finally{db.close();}if(!account)throw new Error('Register the new owner account first');
 for(const file of [dataRoot+'/accounts/config.json',...manifest.realms.map(r=>r.dataRoot+'/jobs/realm/config.json')]){const config=await json(file);config.environment.ADMIN_USER_ID=account.id;config.environment.ADMIN_EMAIL='';await write(file,config);}
 system('restart','coreoflife-accounts.service','coreoflife-r1.service');console.log('Owner binding saved for the new world.');
}else if(action==='rollback'){
 requireRoot();if(!options.release)throw new Error('Explicit previous v416a release required');const release=await realpath(options.release);
 if(!release.startsWith(codeRoot+'/releases/'))throw new Error('Invalid release path');const meta=await json(release+'/realm-release.json');if(meta.version!=='416a'||meta.schemaVersion!==1)throw new Error('Compatible v416a recovery only');
 const manifest=await json(dataRoot+'/manifest.json');
 await recoverRealmPackage({target:release,operations:{
  verify:async target=>{await verifyRealmPackage(target);await verifyNativeBuild(target+'/dist-vds');},
  current:()=>realpath(codeRoot+'/current'),
  stop:async()=>system('stop',...freshServices),
  select:async target=>{const temporary=codeRoot+'/current-'+process.pid;await symlink(target,temporary);await rename(temporary,codeRoot+'/current');},
  start:async()=>{system('start','coreoflife-rt-r1.service');system('start','coreoflife-accounts.service');system('start','coreoflife-r1.service');},
  healthy:()=>probe(`http://127.0.0.1:${manifest.realms[0].ports.app}/api/vds-health`,v=>v.realm?.dbIdentity===manifest.realms[0].dbIdentity&&v.ok&&v.durability?.ready===true),
  remember:previous=>write(codeRoot+'/previous-release.json',{release:previous,savedAtMs:Date.now()}),
 }});
 await cleanupRealmReleases(codeRoot).catch(error=>console.warn('Code cleanup skipped safely: '+error.message));
 console.log('Compatible package restored. Current player databases preserved.');
}else throw new Error('Use prepare, stage, activate, bind-owner, rollback or delete-backup');
