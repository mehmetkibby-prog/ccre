// Deployment control only. No SQL writes, gameplay patches, or alternate login.
import http from 'node:http';
import {attachManualReset} from './manual-reset.mjs';

export const PANEL_VERSION='panel511-r27';
export const PANEL_PATH='/api/realm/maintenance/panel511';
const openPhase=phase=>phase==='open'||phase==='normal';
// Waiting permits only the native central early-access allowlist. Simulation
// must run for those authorized testers, while public admission stays closed.
const simulationPhase=phase=>openPhase(phase)||phase==='waiting';
const fail=message=>{throw Object.assign(Error(message),{status:409});};

export function worldOpeningCheck(row,nowMs=Date.now()){
 if(!row||!['health','updated_at','reset_at','health_decay_per_second'].every(k=>Number.isFinite(row[k])))return {allowed:false,reason:'Dünya durumu okunamadı; oyun bakımda kalmalı.'};
 if(row.reset_at!==0)return {allowed:false,reason:'Dünya sıfırlama sayacı etkin. Dünya canını admin panelinden düzenlemeden oyun açılamaz.'};
 const remaining=row.health-Math.max(0,Math.floor(nowMs/1000)-row.updated_at)*Math.max(0,row.health_decay_per_second);
 if(remaining<=0)return {allowed:false,code:'world_clock_expired',reason:'Oyun açılmadı: dünya zamanının geride kalması açılışta karakterleri sıfırlayabilir. Ana panelde Dünya Canı ayarını kaydedin, ardından buradan yeniden açın. Dünya döngüsünü sıfırlama düğmesini kullanmayın.'};
 return {allowed:true,reason:null};
}

export function attachPanelRuntime({host,core,world,clock=Date.now}){
 const runtime=core.realm,policy=()=>runtime.maintenance.policy;
 const start=world.startJobs.bind(world),stop=world.stopJobs.bind(world);
 let closed=false,tail=Promise.resolve(),enabledIncarnation=null,lastError=null,approvedRevision=null;
 let configurationPauses=0,explicitPause=null,manualRunning=false;
 const configurationResumes=new Set();
 let manual;
 const configuration=core.nativeConfiguration,originalPause=configuration?.pauseAndRun;
 const incarnation=()=>world.row?.peer.incarnation??null;
 const enabled=()=>enabledIncarnation!==null&&enabledIncarnation===incarnation();
 const configurationResuming=()=>[...configurationResumes].some(token=>token.incarnation===incarnation());
 const check=()=>{
  if(closed||core.stopping||core.closed||world.closing||core.channelSupervisor?.closing)return {allowed:false,reason:'Çekirdek kapanıyor; oyun açılamaz.'};
  if(manual?.pending||configurationPauses||core.globalWorld?.held||core.globalWorld?.recovery||core.recoveringWorld)return {allowed:false,reason:'Çekirdek bir ayarı kaydediyor veya toparlanıyor. İşlem bitince tekrar deneyin; oyun bakımda kalır.'};
  try{
   if(host.nativeHttp.health().status!==200)return {allowed:false,reason:'Yeni çekirdeğin dört kanalı, dünya veya okuma süreci hazır değil; oyun açılamadı.'};
   return worldOpeningCheck(host.database.sqlite.prepare('SELECT w.health,w.updated_at,w.reset_at,g.health_decay_per_second FROM world_state w JOIN game_settings g ON g.id=w.id WHERE w.id=1').get(),clock());
  }catch{return {allowed:false,reason:'Çekirdeğin sağlık ve dünya durumu doğrulanamadı; oyun açılamadı.'};}
 };
 async function disable(){const result=await stop();enabledIncarnation=null;return result;}
 async function enable(){
  const row=world.row,owner=row?.peer.incarnation;
  await start();
  if(!owner||world.row!==row||row.exited||row.state!=='running'||row.peer.incarnation!==owner)throw Error('panel_world_changed');
  enabledIncarnation=owner;
 }
 async function reconcile(){
  if(closed||core.stopping||core.closed||world.closing||core.channelSupervisor?.closing)return {disabled:true};
  // A native configuration transaction owns its pause until its full refresh
  // and resume have finished. The polling loop cannot resume jobs inside it.
  if(manualRunning||configurationPauses||explicitPause!==null&&explicitPause===incarnation())return {enabled:enabled(),paused:true};
  if(core.globalWorld?.held||core.globalWorld?.recovery||core.recoveringWorld)return {enabled:enabled(),paused:true};
  const frame=policy();
  if(!simulationPhase(frame?.phase)){
   // Preserve the native ten-second grace and durable player drain. Never
   // terminate processes or sockets from the deployment control layer.
   if(frame?.phase==='maintenance'&&frame.deadlineMs>clock()&&enabled())return {draining:true};
   await disable();approvedRevision=null;lastError=null;return {disabled:true};
  }
  // Once an opening was accepted, natural world decay/reset and recovery
  // retain their original gameplay behavior until the next maintenance.
  if(approvedRevision!==null){if(!enabled())await enable();approvedRevision=frame.revision;lastError=null;return {enabled:true};}
  const gate=check();
  if(!gate.allowed){await disable();lastError=gate.reason;return {disabled:true,reason:gate.reason};}
  if(!enabled())await enable();
  approvedRevision=frame.revision;lastError=null;return {enabled:true};
 }
 const enqueue=(operation=reconcile)=>{
  const next=tail.then(operation);tail=next.catch(error=>{lastError='Çekirdek kontrolü tamamlanamadı: '+String(error.code??error.message);enabledIncarnation=null;});
  return next;
 };
 // Supervisor startup and crash recovery both use this existing lifecycle
 // method, so a restarted world cannot accidentally run a restored clock.
 world.startJobs=()=>{explicitPause=null;return enqueue();};
 world.stopJobs=()=>{if(!configurationPauses)explicitPause=incarnation();return enqueue(disable);};
 if(configuration)configuration.pauseAndRun=async function(...args){
  const token={incarnation:incarnation()};let completed=false;
  configurationPauses++;
  try{const result=await originalPause.apply(this,args);completed=true;return result;}
  finally{
   // Native refresh/resume has already completed durably. Keep the accepted
   // same-world opening during only the final enable_jobs acknowledgement;
   // otherwise ingress incorrectly rejects requests between these two awaits.
   // This token cannot approve first startup, a replacement world or failure.
   if(completed&&approvedRevision!==null&&token.incarnation===incarnation())configurationResumes.add(token);
   configurationPauses--;
   try{await enqueue();}finally{configurationResumes.delete(token);}
  }
 };
 async function runOnce(expected){
  // Keep all background work paused until the explicitly requested native
  // countdown is due. No stale on-disk countdown is adopted on startup.
  return enqueue(async()=>{
   const current=host.database.sqlite.prepare('SELECT cycle,health,reset_at,updated_at FROM world_state WHERE id=1').get();
   if(current.cycle===expected.cycle+1)return;
   if(simulationPhase(policy()?.phase)&&enabled()){
    const end=clock()+15000;
    while(clock()<end){const r=host.database.sqlite.prepare('SELECT cycle,reset_at FROM world_state WHERE id=1').get();if(r.cycle===expected.cycle+1&&!core.globalWorld?.held&&!core.globalWorld?.preparing)return;await new Promise(resolve=>setTimeout(resolve,100));}
    throw Error('manual_reset_open_timeout');
   }
   if(current.cycle!==expected.cycle||current.health!==0||current.reset_at!==expected.reset_at||current.updated_at!==expected.updated_at||current.reset_at*1000>clock())throw Error('manual_reset_changed');
   if(configurationPauses||core.globalWorld.held||core.globalWorld.recovery||core.recoveringWorld)throw Error('manual_reset_busy');
   manualRunning=true;
   const global=core.globalWorld,prepare=global.prepare,row=world.row;
   let finish,reject,stopping=false,timeout;
   const stopped=new Promise((yes,no)=>{finish=yes;reject=no;});void stopped.catch(()=>{});
   global.prepare=function(peer,scope){
    if(scope.mode!=='reset'||scope.cycle!==expected.cycle||row!==world.row||peer.incarnation!==row.peer.incarnation)throw Error('manual_reset_scope');
    const result=prepare.call(this,peer,scope);
    // Do not await drain inside prepare: the native job itself is awaiting
    // prepare. Sending disable now prevents a second tick after this reset.
    if(!stopping){stopping=true;void stop().then(finish,reject);}
    return result;
   };
   try{
    await start();
    await Promise.race([stopped,new Promise((_,no)=>{timeout=setTimeout(()=>no(Error('manual_reset_timeout')),15000);})]);
    if(row!==world.row||row.exited)throw Error('manual_reset_owner_changed');
   }finally{
    clearTimeout(timeout);global.prepare=prepare;enabledIncarnation=null;manualRunning=false;
    if(!stopping)void stop().catch(()=>{});
   }
  });
 }
 manual=attachManualReset({host,core,world,runOnce,isBusy:()=>Boolean(core.globalWorld?.held||core.globalWorld?.preparing||core.globalWorld?.recovery||core.recoveringWorld)});
 const unsubscribe=runtime.maintenance.subscribe(()=>{void enqueue().catch(()=>{});});
 const timer=setInterval(()=>{void enqueue().catch(()=>{});},1000);timer.unref();
 function playGateStatus(){
  // Native policy still owns maintenance/admin access and its durable grace.
  if(!simulationPhase(policy()?.phase))return {allowed:true,reason:null,retryable:false};
  if(closed||core.stopping||core.closed||world.closing||core.channelSupervisor?.closing)return {allowed:false,reason:'closing',retryable:false};
  if(lastError)return {allowed:false,reason:'control_error',retryable:false};
  if(approvedRevision===null)return {allowed:false,reason:'opening_pending',retryable:true};
  if(core.recoveringWorld)return {allowed:false,reason:'world_recovery',retryable:false};
  if(world.row?.state!=='running'||world.row.exited)return {allowed:false,reason:'world_unavailable',retryable:false};
  if(enabled()||configurationPauses>0||configurationResuming())return {allowed:true,reason:null,retryable:false};
  return {allowed:false,reason:explicitPause===incarnation()?'jobs_paused':'jobs_starting',retryable:explicitPause!==incarnation()};
 }
 function status(){const gate=check();return {version:PANEL_VERSION,phase:policy()?.phase??null,revision:policy()?.revision??null,jobsEnabled:enabled(),manualReset:manual.status(),configurationPaused:configurationPauses>0,configurationResuming:configurationResuming(),approvedRevision,canOpen:gate.allowed&&!lastError,reason:lastError??gate.reason,playGate:playGateStatus()};}
 return {
  status,playGateStatus,
  acceptsPlay:()=>playGateStatus().allowed,
  attachHttp(server){
   const handlers=server.listeners('request');server.removeAllListeners('request');
   server.on('request',(req,res)=>{
    let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);res.end();return;}
    if(pathname!==PANEL_PATH){for(const handler of handlers)handler.call(server,req,res);return;}
    if(req.method!=='GET'||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||['forwarded','x-forwarded-for','x-real-ip','cf-connecting-ip','x-forwarded-host','x-forwarded-proto'].some(k=>req.headers[k]!==undefined)){
     res.writeHead(403,{'cache-control':'no-store'});res.end();return;
    }
    res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(status()));
   });
  },
  async close(){closed=true;manual.close();clearInterval(timer);unsubscribe();if(configuration)configuration.pauseAndRun=originalPause;await tail;await disable();}
 };
}

export function readLocalJson(port,pathname,{timeoutMs=900}={}){
 return new Promise((resolve,reject)=>{
  const req=http.get({host:'127.0.0.1',port,path:pathname,agent:false},res=>{
   let body='';res.on('data',chunk=>{body+=chunk;if(body.length>131072)req.destroy(Error('control_reply_size'));});
   res.on('error',reject);res.on('end',()=>{try{if(res.statusCode!==200)throw Error('control_status_'+res.statusCode);resolve(JSON.parse(body));}catch(e){reject(e);}});
  });
  const timer=setTimeout(()=>req.destroy(Error('control_timeout')),timeoutMs);
  req.on('error',reject);req.on('close',()=>clearTimeout(timer));
 });
}

export function guardPanelAdmin(runtime,{probe=readLocalJson,clock=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),confirmationMs=6000}={}){
 if(runtime.role!=='accounts'||runtime.panel511)throw Error('panel_accounts_binding');
 const original=runtime.admin;
 const realm=runtime.manifest.realms.find(r=>r.id===runtime.manifest.primaryRealmId);
 const control=()=>probe(realm.ports.app,PANEL_PATH);
 const snapshot=async result=>{
  let game;try{game=await control();}catch{game={canOpen:false,reason:'Oyun sürecine ulaşılamıyor. Durumu yenileyin.'};}
  const status=result?.status,confirmed=Boolean(status&&openPhase(status.phase)&&game.version===PANEL_VERSION&&game.revision===status.revision&&game.approvedRevision===status.revision&&game.jobsEnabled===true&&game.playGate?.allowed===true);
  const confirmedReady=Boolean(status&&simulationPhase(status.phase)&&game.phase===status.phase&&game.version===PANEL_VERSION&&game.revision===status.revision&&game.approvedRevision===status.revision&&game.jobsEnabled===true&&game.playGate?.allowed===true);
  return {...result,panel511:{...game,confirmedOpen:confirmed,confirmedReady}};
 };

 runtime.admin=async(actorId,input)=>{
  const save=input?.resource==='launch'&&input.method==='POST'&&input.body?.action==='save';
  if(save&&!['maintenance','open','scheduled','closed'].includes(input.body.settings?.mode))fail('Geçerli bir oyun durumu seçin.');
  const playableSave=save&&input.body.settings.mode!=='maintenance';
  const realmOpen=input?.resource==='realms'&&input.method==='POST'&&input.body?.action==='realm'&&input.body.realmId===runtime.manifest.primaryRealmId&&input.body.status==='open';
  if(playableSave||realmOpen){
   const realm=runtime.manifest.realms.find(r=>r.id===runtime.manifest.primaryRealmId);
   let health,control;
   try{[health,control]=await Promise.all([probe(realm.ports.app,'/api/vds-health'),probe(realm.ports.app,PANEL_PATH)]);}catch{fail('Yeni çekirdeğe ulaşılamıyor veya çekirdek sağlıklı değil. Bakım kapatılmadı.');}
   const rows=health?.channelProcesses?.channels;
   if(health?.kernel511?.ready!==true||health?.durable!==true||health.realm?.dbIdentity!==realm.dbIdentity||!Array.isArray(rows)||rows.length!==4||!rows.every((r,i)=>r.channel===i+1&&r.ready===true&&r.capacity===realm.initialChannelCapacity))fail('Yeni çekirdeğin dört kanalı ve kalıcı kayıt sistemi hazır değil. Bakım kapatılmadı.');
   if(control?.version!==PANEL_VERSION||control.canOpen!==true)fail(control?.reason||'Panel ile çekirdek bağlantısı hazır değil. Bakım kapatılmadı.');
   if(save&&control.revision!==input.body.settings.revision)fail('Panelin bakım kararı henüz çekirdeğe ulaşmadı. Sayfayı yenileyip tekrar deneyin; bakım kapatılmadı.');
  }
  // Original owner authorization, revision CAS, signed policy fanout and
  // native flush-before-retire maintenance remain the authority.
  const result=await original(actorId,input);
  if(input?.resource!=='launch'||input.view==='registrations')return result;
  if(playableSave){
   const revision=result.settings.revision,until=clock()+confirmationMs;
   // The central authority is already durably saved. Republish that exact
   // signed decision; never invent a second open command or new revision.
   runtime.maintenancePublisher438?.publish((runtime.launch??globalThis.__colLaunch).controlState());
   do{
    const actual=await snapshot(result);
    if(actual.panel511.confirmedReady)return actual;
    if(actual.panel511.revision>revision)break;
    await sleep(200);
   }while(clock()<until);
   // Re-read through the original authorized API. Do not overwrite a newer
   // panel decision. A failed opening returns to maintenance through native CAS.
   const current=await original(actorId,{resource:'launch',method:'GET'});
   if(current.settings.revision===revision&&current.settings.mode===input.body.settings.mode){
    await original(actorId,{resource:'launch',method:'POST',body:{action:'save',settings:{...current.settings,mode:'maintenance'}}});
    fail('Çekirdek açılışı doğrulayamadı; bakım kararı geri alındı. Durumu yenileyin ve gösterilen nedeni kontrol edin.');
   }
   fail('Oyun durumu başka bir işlemle değişti. Güncel durumu yenileyin.');
  }
  return snapshot(result);
 };
 runtime.panel511={version:PANEL_VERSION};
 return ()=>{runtime.admin=original;delete runtime.panel511;};
}
