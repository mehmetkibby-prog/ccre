import {reconcileEntry477Rollback} from '../src/entry477-rollback.mjs';
import {reconcileStoneBossRollback476} from '../src/stone-boss-rollback476.mjs';
import {createEquipmentSetRecoveryGate473,reconcileEquipmentSetsRollback473} from '../src/equipment-set-rollback473.mjs';
import {restoreRealmServiceState} from '../src/realm-install-preflight.mjs';
import {ensureChannelCapacitySchema} from '../src/channel-capacity.mjs';
import {channelModeHealthy,channelRealtimeHealthy} from '../src/channel-install-health.mjs';
import {readFile,writeFile,mkdir,cp,chmod,symlink,rename,realpath,stat,readdir,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';
import {prepareRealmInstallation} from '../src/realm-provision.mjs';
import {renderRealmDeployment} from '../src/realm-deployment-files.mjs';
import {verifyRealmPackage} from '../src/realm-package-integrity.mjs';import {verifyNativeBuild} from '../src/native-build-integrity.mjs';
import {activateChannelReset,writeDurableJson} from '../src/channel-reset.mjs';
import {cleanupRealmReleases} from '../src/realm-release-cleanup.mjs';
import {recoverRealmPackage} from '../src/realm-recovery.mjs';import {validateRealmManifest} from '../src/realm-manifest.mjs';
const args=process.argv.slice(2),action=args.shift(),options=Object.fromEntries(args.map(s=>{const i=s.indexOf('=');if(!s.startsWith('--')||i<3)throw Error('Use --name=value');return [s.slice(2,i),s.slice(i+1)];}));
const root='/var/lib/coreoflife-realms-417',oldRoot='/var/lib/coreoflife-realms',code='/opt/coreoflife-realms',source=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const json=async f=>JSON.parse(await readFile(f,'utf8')),run=(name,...args)=>execFileSync(name,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(),system=(...a)=>run('systemctl',...a);
const write=async(f,data,mode=0o600)=>{await writeFile(f,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{mode});await chmod(f,mode);};
const exists=async f=>{try{await stat(f);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const services=['coreoflife-accounts.service','coreoflife-r1.service','coreoflife-r2.service','coreoflife-rt-r1.service','coreoflife-rt-r2.service'];
const timers=['coreoflife-accounts-backup.timer','coreoflife-r1-backup.timer','coreoflife-r2-backup.timer'];
const backupServices=timers.map(s=>s.replace('.timer','.service'));
const active=s=>{try{return system('is-active',s)==='active';}catch{return false;}};
const enabled=s=>{try{return system('is-enabled',s);}catch(error){return String(error.stdout??'').trim();}};
const start=()=>{system('start','coreoflife-rt-r1.service');system('start','coreoflife-accounts.service');system('start','coreoflife-r1.service');};
const stop=()=>system('stop',...timers,...backupServices,...services);
async function probe(url,predicate){for(let n=0;n<100;n++){try{const r=await fetch(url,{signal:AbortSignal.timeout(1200)});if(r.ok&&predicate(await r.json()))return true;}catch{}await new Promise(r=>setTimeout(r,500));}return false;}
if(process.getuid?.()!==0)throw Error('Run as root');
if(!['prepare','stage','activate','update','channels','verify','rollback','bind-owner'].includes(action))throw Error('Use prepare, stage, activate, update, channels, verify, rollback, bind-owner');
if(process.env.CORE_417_LOCK!=='1'){
 await mkdir(code,{recursive:true,mode:0o755});try{execFileSync('/usr/bin/flock',['--nonblock',code+'/installer.lock',process.execPath,fileURLToPath(import.meta.url),...process.argv.slice(2)],{env:{...process.env,CORE_417_LOCK:'1'},stdio:'inherit'});}catch(e){process.exit(e.status??1);}process.exit(0);
}
async function select(release){const next=code+'/current-'+process.pid;await symlink(release,next);await rename(next,code+'/current');}
async function stage(){
 await cleanupRealmReleases(code);
 await verifyNativeBuild(source+'/dist-vds');const inventory=await verifyRealmPackage(source),manifest=await json(source+'/realm-package-manifest.json');if(manifest.version!=='417')throw Error('v417 package required');
 const release=code+'/releases/417-'+inventory.revision;
 if(await exists(release+'/installation-complete.json')){await verifyRealmPackage(release);await verifyNativeBuild(release+'/dist-vds');return release;}
 if(await exists(release))throw Error('Interrupted staging directory exists; inspect it before retrying');
 await mkdir(release,{recursive:true,mode:0o755});
 for(const f of [...inventory.files,{path:'realm-package-manifest.json'}]){await mkdir(path.dirname(release+'/'+f.path),{recursive:true,mode:0o755});await cp(source+'/'+f.path,release+'/'+f.path);await chmod(release+'/'+f.path,0o644);}
 execFileSync('npm',['ci'],{cwd:release,stdio:'inherit'});execFileSync('npm',['ci','--omit=dev'],{cwd:release+'/realtime-server',stdio:'inherit'});
 await write(release+'/realm-release.json',{version:'417',schemaVersion:1,revision:inventory.revision},0o644);
 await verifyRealmPackage(release);await verifyNativeBuild(release+'/dist-vds');await write(release+'/installation-complete.json',{version:'417',revision:inventory.revision,completedAtMs:Date.now()},0o644);return release;
}
async function plan(){return json(root+'/installer/plan.json');}
async function writeDeployment(manifest){
 const configs=new Map(await Promise.all(manifest.realms.map(async r=>[r.id,await json(r.dataRoot+'/jobs/realm/config.json')])));
 const files=renderRealmDeployment(manifest,configs,{dataRoot:root});
 for(const [name,body]of Object.entries(files.units)){const text=/^coreoflife-r[12]\.service$/.test(name)?body.replace('MemoryMax=1152M','MemoryMax=2304M').replace('KillMode=control-group','KillMode=mixed').replace('TimeoutStopSec=45','TimeoutStopSec=65'):body;await write(root+'/installer/'+name,text,0o644);}
 await write(root+'/installer/realms.caddy',files.caddy+'\ncoreoflife.net, www.coreoflife.net {\n redir '+manifest.authOrigin+'{uri} 302\n}\n');
 for(const id of ['accounts','r1','r2']){try{run('id','col-'+id);}catch{throw Error('Existing v416 realm service user missing: '+id);}run('chown','-R','col-'+id+':col-'+id,root+'/'+id);}
}
function removeHosts(routes,hosts){return routes.flatMap(route=>{const n=structuredClone(route);if(n.match){n.match=n.match.flatMap(m=>{if(!m.host)return [m];const host=m.host.filter(h=>!hosts.has(h));return host.length?[{...m,host}]:[];});if(!n.match.length)return [];}for(const h of n.handle??[])if(h.routes)h.routes=removeHosts(h.routes,hosts);return [n];});}
async function health(manifest,{requireEmpty=false,channelProcesses=null}={}){
 const accounts=await probe(`http://127.0.0.1:${manifest.authPort}/api/vds-health`,h=>h.role==='accounts');
 const r1=await probe(`http://127.0.0.1:${manifest.realms[0].ports.app}/api/vds-health`,h=>h.realm?.dbIdentity===manifest.realms[0].dbIdentity&&h.durability?.ready===true&&h.performanceRevision===417&&channelModeHealthy(h,channelProcesses));
 const r2Closed=!active('coreoflife-r2.service')&&!active('coreoflife-rt-r2.service');let empty=true;
 if(requireEmpty)for(const [id,file]of [['accounts',manifest.accountsDatabase],...manifest.realms.map(r=>[r.id,r.database])]){const db=new DatabaseSync(file,{readOnly:true});try{for(const table of id==='accounts'?['accounts']:['accounts','players','player_items','auth_sessions'])if(db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n!==0)empty=false;}finally{db.close();}}
 return {accounts,r1,r2Closed,empty};
}
if(action==='prepare'){
 if(await exists(root))throw Error('v417 root already exists; no existing data was replaced');
 const old=validateRealmManifest(await json(oldRoot+'/manifest.json'));if(old.realms.length!==2||old.primaryRealmId!=='r1'||old.realms[1].status!=='closed')throw Error('Expected r1 open and r2 closed');
 const accountConfig=await json(oldRoot+'/accounts/config.json');
 const manifest=structuredClone(await prepareRealmInstallation({root,authOrigin:old.authOrigin,realmOrigins:old.realms.map(r=>r.origin),realtimeOrigins:old.realms.map(r=>r.realtimeOrigin),portBase:old.authPort,environment:accountConfig.environment}));
 manifest.phase='417';await write(root+'/manifest.json',manifest,0o644);await mkdir(root+'/installer',{mode:0o700});await mkdir(root+'/retained',{mode:0o700});
 for(const r of manifest.realms){const cfg=await json(r.dataRoot+'/jobs/realm/config.json');delete cfg.environment.CORE_CHANNEL_PROCESSES;cfg.environment.CORE_RELEASE_VERSION='417';await write(r.dataRoot+'/jobs/realm/config.json',cfg);await write(r.dataRoot+'/runtime.env','CORE_CHANNEL_PROCESSES=0\n');const rtFile=r.dataRoot+'/realtime.env';await write(rtFile,(await readFile(rtFile,'utf8')).replace(/^REALTIME_RELEASE_ID=.*$/m,'REALTIME_RELEASE_ID=417'));}
 await writeDeployment(manifest);await write(root+'/installer/plan.json',{old,previousRelease:await realpath(code+'/current'),newRoot:root});
 console.log('PREPARED_417: empty accounts/r1/r2; r1 open, r2 closed; channels OFF, capacity 15. Current installation unchanged.');
}else if(action==='stage'){
 const release=await stage();await write(root+'/installer/staged.json',{release});console.log('STAGED_417 '+release);
}else if(action==='activate'){
 if(options.confirm!=='RESET-ALL-417')throw Error('Explicit --confirm=RESET-ALL-417 required');
 const p=await plan(),manifest=validateRealmManifest(await json(root+'/manifest.json')),release=(await json(root+'/installer/staged.json')).release;
 const dropin='/etc/systemd/system/caddy.service.d/417.conf',newCaddy=root+'/installer/caddy-active.json',saved=root+'/installer/saved-units';
 let serviceState,oldDropin;
 const restoreOld=async()=>{
  await select(p.previousRelease);for(const name of await readdir(saved))await cp(saved+'/'+name,'/etc/systemd/system/'+name);
  if(oldDropin!==null)await write(dropin,oldDropin,0o644);else if(await exists(dropin))await unlink(dropin);
  system('daemon-reload');run('caddy','reload','--config',root+'/installer/caddy-before.json');
  for(const [name,state]of Object.entries(serviceState))restoreRealmServiceState(system,name,state);
 };
 const result=await activateChannelReset({confirmation:options.confirm,sources:[{id:'accounts',database:p.old.accountsDatabase},...p.old.realms.map(r=>({id:r.id,database:r.database}))],archiveRoot:root+'/retained',receiptFile:root+'/installer/cutover.json',operations:{
  async preflight(){
   await verifyRealmPackage(release);await verifyNativeBuild(release+'/dist-vds');await mkdir(saved,{mode:0o700});
   serviceState=Object.fromEntries([...services,...timers,...backupServices].map(n=>[n,{active:active(n),enabled:enabled(n)}]));await write(root+'/installer/service-before.json',serviceState);
   for(const name of [...services,...timers,...backupServices])await cp('/etc/systemd/system/'+name,saved+'/'+name);
   oldDropin=await exists(dropin)?await readFile(dropin,'utf8'):null;await write(root+'/installer/dropin-before.json',{oldDropin});
   const response=await fetch('http://127.0.0.1:2019/config/',{headers:{Origin:'http://127.0.0.1:2019'},signal:AbortSignal.timeout(3000)});if(!response.ok)throw Error('Caddy configuration unavailable');
   const old=await response.json();await write(root+'/installer/caddy-before.json',old);
   const next=structuredClone(old),extra=JSON.parse(run('caddy','adapt','--config',root+'/installer/realms.caddy','--adapter','caddyfile'));
   const target=Object.values(next.apps?.http?.servers??{}).find(s=>s.listen?.includes(':443')),added=Object.values(extra.apps?.http?.servers??{});if(!target||added.length!==1)throw Error('Unsupported Caddy layout');
   const hosts=new Set(['coreoflife.net','www.coreoflife.net',new URL(manifest.authOrigin).host,...manifest.realms.flatMap(r=>[new URL(r.origin).host,new URL(r.realtimeOrigin).host])]);
   for(const s of Object.values(next.apps.http.servers))s.routes=removeHosts(s.routes??[],hosts);target.routes=[...added[0].routes,...target.routes];
   await write(newCaddy,next,0o640);run('chown','root:caddy',newCaddy);run('caddy','validate','--config',newCaddy);
  },async stopOld(){stop();},
  async startNew(){
   await select(release);
   for(const r of manifest.realms)execFileSync(process.execPath,['vds-server/src/app.mjs'],{cwd:release,env:{...process.env,CORE_CONFIG_FILE:r.dataRoot+'/jobs/realm/config.json',CORE_DATA_ROOT:r.dataRoot,CORE_CHANNEL_PROCESSES:'0',CORE_REALM_PREPARE_SCHEMA:'1'},stdio:'inherit'});
   await writeDeployment(manifest);for(const name of await readdir(root+'/installer'))if(/^coreoflife-.*\.(service|timer)$/.test(name))await cp(root+'/installer/'+name,'/etc/systemd/system/'+name);
   system('daemon-reload');start();
  },health:()=>health(manifest,{requireEmpty:true}),
  async activateIngress(){
   // Caddy may read this file as an unprivileged user. Installer state itself stays private.
   const installed='/etc/caddy/coreoflife-realms-417.json';await cp(newCaddy,installed);await chmod(installed,0o640);run('chown','root:caddy',installed);
   await mkdir(path.dirname(dropin),{recursive:true});await write(dropin,`[Service]\nExecStart=\nExecStart=/usr/bin/caddy run --environ --config ${installed}\nExecReload=\nExecReload=/usr/bin/caddy reload --config ${installed} --force\n`,0o644);
   system('daemon-reload');run('caddy','reload','--config',installed);
   if(!await probe(manifest.authOrigin+'/api/vds-health',h=>h.role==='accounts')||!await probe(manifest.realms[0].origin+'/api/vds-health',h=>h.realm?.dbIdentity===manifest.realms[0].dbIdentity&&h.durability?.ready===true)||!await probe(manifest.realms[0].realtimeOrigin+'/readyz',h=>h.ok===true))throw Error('Public ingress health failed');
   system('enable','coreoflife-accounts.service','coreoflife-r1.service','coreoflife-rt-r1.service');system('enable','--now',...timers);
  },async stopNew(){stop();},restoreOld}});
 await write(code+'/previous-release.json',{release:p.previousRelease,savedAtMs:Date.now()});
 await cleanupRealmReleases(code).catch(e=>console.warn('Cleanup retained files: '+e.message));
 console.log('ACTIVE_417: accounts reset; R1 OPEN, R2 CLOSED, 3 x 15; backups verified. '+JSON.stringify(result.backups.map(b=>({id:b.id,directory:b.directory}))));
}else if(action==='update'){
 // Compatible code replacement; no reset, flag edits or manifest edits.
 // Exact older set/HP and V476 -> V475 stone-boss reconciliation run only with services stopped.
 if(!await exists(root+'/installer/cutover.json'))throw Error('Active v417 installation required');
 const manifest=validateRealmManifest(await json(root+'/manifest.json'));
 if(manifest.phase!=='417'||manifest.realms[1]?.status!=='closed'||active('coreoflife-r2.service')||active('coreoflife-rt-r2.service'))throw Error('Expected v417 with R2 closed');
 const target=await realpath(options.release??(await json(root+'/installer/staged.json')).release);
 if(path.dirname(target)!==code+'/releases')throw Error('Verified release path required');
 const meta=await json(target+'/realm-release.json');
 if(meta.version!=='417'||meta.schemaVersion!==1)throw Error('Compatible v417 code required');
 const flags=await readFile(manifest.realms[0].dataRoot+'/runtime.env','utf8');
 const mode=/^CORE_CHANNEL_PROCESSES=1$/m.test(flags);
 const states=Object.fromEntries([...services,...timers,...backupServices].map(n=>[n,{active:active(n),enabled:enabled(n)}]));
 const setRecovery473=createEquipmentSetRecoveryGate473({
  stop:async()=>stop(),prepare:async release=>{await reconcileEquipmentSetsRollback473(release,manifest.realms);await reconcileStoneBossRollback476(release,manifest.realms);await reconcileEntry477Rollback(release,manifest.realms);},select,
  start:async()=>{for(const [name,state]of Object.entries(states))restoreRealmServiceState(system,name,state);}
 });
 const previousForStoneBoss476=await realpath(code+'/current');
 let result;
 try{result=await recoverRealmPackage({target,operations:{
  verify:async t=>{await verifyRealmPackage(t);await verifyNativeBuild(t+'/dist-vds');},
  current:()=>realpath(code+'/current'),stop:setRecovery473.stop,select:setRecovery473.select,
  start:setRecovery473.start,
  healthy:async()=>{
   const h=await health(manifest,{channelProcesses:mode});
   return h.accounts&&h.r1&&h.r2Closed
    &&await probe(manifest.realms[0].realtimeOrigin+'/readyz',h=>channelRealtimeHealthy(h,mode));
  },
  remember:async previous=>{
   await writeDurableJson(root+'/installer/previous-update.json',{release:previous});
   await write(code+'/previous-release.json',{release:previous,savedAtMs:Date.now()});
  }
 }});}catch(error){
  // A direct pending-reward error means recoverRealmPackage completed its
  // stop/select(previous)/start restoration. An AggregateError does not.
  if(error?.code!=='STONE_BOSS_REWARD_PENDING476')throw error;
  let restored476=false;
  try{
   if(await realpath(code+'/current')===previousForStoneBoss476){
    const h=await health(manifest,{channelProcesses:mode});
    restored476=h.accounts&&h.r1&&h.r2Closed
     &&await probe('http://127.0.0.1:'+manifest.realms[0].ports.app+'/api/vds-health',h=>h.entryRevision===476&&h.durability?.ready===true)
     &&await probe(manifest.realms[0].realtimeOrigin+'/readyz',h=>channelRealtimeHealthy(h,mode));
   }
  }catch{}
  const message476=restored476
   ?'Boss ödül teslimi bekliyor. V476 çalışır durumda kaldı; teslimden sonra geri dönüşü yeniden çalıştırın.'
   :'Boss ödül teslimi bekliyor. Geri dönüş durduruldu; V476 sağlık kontrolü doğrulanamadı. Sunucu durumunu kontrol edin.';
  throw Object.assign(Error(message476,{cause:error}),{code:'STONE_BOSS_REWARD_PENDING476'});
 }
 await cleanupRealmReleases(code).catch(e=>console.warn('Cleanup retained files: '+e.message));
 console.log('UPDATED_417: accounts/items/channel mode preserved; R2 CLOSED. '+JSON.stringify(result));
}else if(action==='channels'){
 if(!['0','1'].includes(options.enabled))throw Error('Use --enabled=0 or --enabled=1');
 if(!await exists(root+'/installer/cutover.json'))throw Error('Activate the new world first');
 const manifest=await json(root+'/manifest.json');
 const previousFlags=[];
 for(const r of manifest.realms){const f=r.dataRoot+'/runtime.env',text=await readFile(f,'utf8');previousFlags.push({r,f,text});await write(f,text.split('\n').filter(l=>!l.startsWith('CORE_CHANNEL_PROCESSES=')).join('\n').trim()+'\nCORE_CHANNEL_PROCESSES='+options.enabled+'\n');run('chown','col-'+r.id+':col-'+r.id,f);}
 try{
  system('restart','coreoflife-r1.service');if(!(await health(manifest,{channelProcesses:options.enabled==='1'})).r1)throw Error('Channel toggle health failed');
  if(!await probe(manifest.realms[0].realtimeOrigin+'/readyz',h=>channelRealtimeHealthy(h,options.enabled==='1')))throw Error('Channel realtime bridges not ready');
 }catch(error){
  for(const {r,f,text}of previousFlags){await write(f,text);run('chown','col-'+r.id+':col-'+r.id,f);}
  system('restart','coreoflife-r1.service');
  if(!(await health(manifest)).r1)throw new AggregateError([error], 'Previous channel mode could not recover; inspect service logs');
  throw Error(error.message+'; previous mode restored');
 }
 console.log('CHANNEL_PROCESSES='+options.enabled+'; first-use capacity '+(options.enabled==='1'?30:15)+', previous admin overrides retained.');
}else if(action==='verify'){
 const manifest=await json(root+'/manifest.json'),enabled=/^CORE_CHANNEL_PROCESSES=1$/m.test(await readFile(manifest.realms[0].dataRoot+'/runtime.env','utf8')),h=await health(manifest,{channelProcesses:enabled});console.log(JSON.stringify(h));
 if(!h.accounts||!h.r1||!h.r2Closed)throw Error('Realm health failed');
 const game=await(await fetch(manifest.realms[0].origin+'/api/vds-health')).json(),rt=await(await fetch(manifest.realms[0].realtimeOrigin+'/readyz')).json();
 console.log(JSON.stringify({realm:game.realm,channelProcesses:game.channelProcesses,durability:game.durability,clients:rt.clients,movement:rt.movement,combat:rt.combatTransport}));
 if(!channelRealtimeHealthy(rt,enabled))throw Error('Realtime movement/combat bridge not ready');
 if(!(rt.clients>0))console.log('NO_CONNECTED_CLIENT: sign into the game then repeat verify; clients must be >0.');
}else if(action==='bind-owner'){
 if(!options.username)throw Error('Use --username=registered-name');const manifest=await json(root+'/manifest.json'),db=new DatabaseSync(manifest.accountsDatabase,{readOnly:true});let account;
 try{account=db.prepare('SELECT id FROM accounts WHERE username=?').get(options.username);}finally{db.close();}if(!account)throw Error('Register the new account first');
 for(const file of [root+'/accounts/config.json',...manifest.realms.map(r=>r.dataRoot+'/jobs/realm/config.json')]){const c=await json(file);c.environment.ADMIN_USER_ID=account.id;c.environment.ADMIN_EMAIL='';await write(file,c);}
 system('restart','coreoflife-accounts.service','coreoflife-r1.service');console.log('OWNER_BOUND_417');
}else if(action==='rollback'){
 const p=await plan(),target=options.release?await realpath(options.release):p.previousRelease;if(!target.startsWith(code+'/releases/'))throw Error('Verified release path required');const meta=await json(target+'/realm-release.json');if(!['416a','417'].includes(meta.version))throw Error('Incompatible recovery package');
 await verifyRealmPackage(target);await verifyNativeBuild(target+'/dist-vds');
 if(target===await realpath(code+'/current')){console.log('UNCHANGED: requested recovery code is already active; configuration was not changed.');process.exit(0);}
 const manifest=await json(root+'/manifest.json');
 // v416 code does not understand phase 417. A compatible data-preserving
 // manifest view (416b) retains the same realm IDs, keys, DBs and closed R2.
 const prior=await readFile(root+'/manifest.json','utf8'),previousRelease=await realpath(code+'/current'),previousFlags=[];
 const restoreMode=async()=>{await write(root+'/manifest.json',prior,0o644);for(const {r,f,text}of previousFlags){await write(f,text);run('chown','col-'+r.id+':col-'+r.id,f);}};
 for(const r of manifest.realms){const f=r.dataRoot+'/runtime.env',text=await readFile(f,'utf8');previousFlags.push({r,f,text});await write(f,text.replace(/^CORE_CHANNEL_PROCESSES=.*$/m,'CORE_CHANNEL_PROCESSES=0'));run('chown','col-'+r.id+':col-'+r.id,f);}
 if(meta.version==='416a'){manifest.phase='416b';await write(root+'/manifest.json',manifest,0o644);}
 try{await recoverRealmPackage({target,operations:{verify:async t=>{await verifyRealmPackage(t);await verifyNativeBuild(t+'/dist-vds');},current:()=>realpath(code+'/current'),stop:async()=>{
  stop();
  // v416 does not know the per-mode limit table. Restore the OFF mode while
  // services are stopped, before its old code can admit a 30-player channel.
  for(const r of manifest.realms){const db=new DatabaseSync(r.database);try{db.exec('PRAGMA synchronous=FULL');ensureChannelCapacitySchema(db,{processes:false});}finally{db.close();}}
 },select:async release=>{if(release===previousRelease)await restoreMode();await select(release);},start:async()=>start(),healthy:()=>probe(`http://127.0.0.1:${manifest.realms[0].ports.app}/api/vds-health`,h=>h.realm?.dbIdentity===manifest.realms[0].dbIdentity&&h.durability?.ready===true),remember:previous=>writeDurableJson(root+'/installer/previous-release.json',{release:previous})}});}catch(e){await restoreMode();throw e;}
 system('enable','--now',...timers);console.log('RECOVERED: current accounts/items retained; channel processes OFF. Old pre-reset world was not restored.');
}
