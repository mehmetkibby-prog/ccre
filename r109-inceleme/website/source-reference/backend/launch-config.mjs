#!/usr/bin/env node
/** Configure the EXISTING authoritative accounts launch policy, through its signed
 * loopback admin API. Never writes SQL, patches game files, or opens game sockets. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';

export const OPENING_ISO='2026-10-30T20:00:00+03:00';
export const OPENING_MS=Date.parse(OPENING_ISO);
const SETTINGS_KEYS=['id','enabled','registration_at','opens_at','ends_at','mode','revision','maintenance_text','maintenance_started_at','maintenance_deadline_ms','public_opens_at'];
const fail=code=>{throw Object.assign(new Error(code),{code});};
const require=(ok,code)=>{if(!ok)fail(code);};
const clone=value=>JSON.parse(JSON.stringify(value));
export const same=(a,b)=>JSON.stringify(Object.fromEntries(Object.entries(a).sort()))===JSON.stringify(Object.fromEntries(Object.entries(b).sort()));
export function validateOpening(value){
 const ms=typeof value==='number'?value:Date.parse(value);
 require(Number.isSafeInteger(ms)&&ms>0&&ms<4102444800000,'launch_invalid_opening');return ms;
}
export function validateSettings(input){
 require(input&&typeof input==='object','launch_settings_missing');
 const s=Object.fromEntries(SETTINGS_KEYS.map(k=>[k,input[k]]));
 require(SETTINGS_KEYS.every(k=>s[k]!==undefined),'launch_settings_version_unsupported');
 require(s.id===1&&[0,1].includes(s.enabled)&&['scheduled','open','closed','maintenance'].includes(s.mode),'launch_settings_invalid');
 require(Number.isSafeInteger(s.revision)&&s.revision>0,'launch_revision_invalid');
 require(['registration_at','opens_at','ends_at','maintenance_started_at','maintenance_deadline_ms','public_opens_at'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0&&s[k]<4102444800000),'launch_dates_invalid');
 require(s.registration_at>0&&s.registration_at<s.opens_at&&s.opens_at<s.ends_at&&typeof s.maintenance_text==='string','launch_historical_dates_invalid');
 return s;
}
export function planSettings(before,opening){
 const s=validateSettings(before),at=validateOpening(opening);
 return {...s,enabled:1,mode:'scheduled',public_opens_at:at,maintenance_started_at:0,maintenance_deadline_ms:0,revision:s.revision+1,maintenance_text:s.maintenance_text.trim().slice(0,2000)};
}
export function publicStatus(value,opening){
 require(value&&Number.isFinite(value.serverTime),'launch_status_unavailable');
 require(value.enabled===true&&value.mode==='scheduled'&&value.publicOpeningAt===opening&&value.opensAt===opening&&value.automaticOpening===true,'launch_public_schedule_mismatch');
 const open=value.serverTime>=opening;
 require(value.phase===(open?'open':'waiting')&&value.canPlay===open&&value.registrationOpen===true,'launch_public_gate_mismatch');
 return {phase:value.phase,canPlay:value.canPlay,registrationOpen:value.registrationOpen,serverTime:value.serverTime,opensAt:value.opensAt,automaticOpening:value.automaticOpening,revision:value.revision};
}
async function read(client){return validateSettings((await client.admin({resource:'launch',method:'GET'})).settings);}
async function save(client,settings){await client.admin({resource:'launch',method:'POST',body:{action:'save',settings}});}
async function verified(client,opening){
 const result={accounts:publicStatus(await client.accountsStatus(),opening)};
 if(client.gameStatus)result.game=publicStatus(await client.gameStatus(),opening);
 if(client.panelStatus){
  const panel=await client.panelStatus();
  require(panel.version==='panel511-r27'&&panel.revision===result.accounts.revision&&panel.approvedRevision===panel.revision&&panel.jobsEnabled===true&&panel.playGate?.allowed===true,'launch_game_not_ready');
  result.gameReady={version:panel.version,revision:panel.revision,jobsEnabled:true,playGateAllowed:true};
 }
 return result;
}
export async function checkLaunch({client,opening=OPENING_MS}){
 const before=await read(client),at=validateOpening(opening),after=planSettings(before,at);
 if(client.preflight)await client.preflight(before);
 return {openingAt:at,openingIso:new Date(at).toISOString(),before,planned:after,willChange:!(before.enabled===1&&before.mode==='scheduled'&&before.public_opens_at===at)};
}
export async function applyLaunch({client,opening=OPENING_MS,store}){
 require(store&&typeof store.write==='function'&&typeof store.read==='function','launch_receipt_required');
 const at=validateOpening(opening),current=await read(client);let receipt=await store.read();
 if(receipt){
  require(receipt.version===1&&receipt.openingAt===at,'launch_receipt_mismatch');
  if(receipt.status==='unchanged'){
   require(same(current,receipt.before),'launch_settings_changed');return {...receipt,verification:await verified(client,at)};
  }
  require(['prepared','applied'].includes(receipt.status),'launch_receipt_not_reusable');
  if(same(current,receipt.after)){
   receipt={...receipt,status:'applied'};await store.write(receipt);
   return {...receipt,verification:await verified(client,at)};
  }
  require(receipt.status==='prepared'&&same(current,receipt.before),'launch_settings_changed');
 }else{
  const plan=await checkLaunch({client,opening:at});
  // No asynchronous operation may silently adopt a newer administrator edit.
  require(same(plan.before,current),'launch_settings_changed');
  receipt={version:1,openingAt:at,status:plan.willChange?'prepared':'unchanged',before:plan.before,after:plan.willChange?plan.planned:plan.before};
  await store.write(receipt);
  if(!plan.willChange)return {...receipt,verification:await verified(client,at)};
 }
 let failure;
 try{await save(client,{...receipt.after,revision:receipt.before.revision});}catch(error){failure=error;}
 let actual;
 try{actual=await read(client);}catch{fail('launch_apply_result_unknown_keep_receipt');}
 if(!same(actual,receipt.after)){
  if(same(actual,receipt.before)){
   await store.write({...receipt,status:'not_applied'});throw failure||Object.assign(new Error('launch_save_not_applied'),{code:'launch_save_not_applied'});
  }
  fail('launch_apply_conflict_keep_receipt');
 }
 receipt={...receipt,status:'applied'};await store.write(receipt);
 return {...receipt,verification:await verified(client,at)};
}
export async function rollbackLaunch({client,store}){
 const receipt=await store.read();require(receipt?.version===1,'launch_receipt_missing');
 if(['unchanged','rolled_back','not_applied'].includes(receipt.status))return {status:receipt.status,changed:false};
 require(['prepared','applied','rollback_prepared'].includes(receipt.status),'launch_rollback_receipt_invalid');
 const current=await read(client);
 if(same(current,receipt.before)){
  const done={...receipt,status:'rolled_back'};await store.write(done);return {status:'rolled_back',changed:false};
 }
 // A prior rollback may have committed despite a lost HTTP response. Comparing
 // its exact native result prevents a retry from overwriting a later admin edit.
 const restoredFields=['enabled','registration_at','opens_at','ends_at','mode','maintenance_text','public_opens_at'];
 const rollbackCommitted=receipt.status==='rollback_prepared'&&current.revision===receipt.after.revision+1&&restoredFields.every(k=>current[k]===receipt.before[k]);
 if(rollbackCommitted||receipt.rollbackAfter&&same(current,receipt.rollbackAfter)){
  await store.write({...receipt,status:'rolled_back'});return {status:'rolled_back',changed:false};
 }
 require(same(current,receipt.after),'launch_rollback_refused_later_admin_change');
 const target={...receipt.before,revision:current.revision};
 const pending={...receipt,status:'rollback_prepared'};await store.write(pending);
 let failure;try{await save(client,target);}catch(error){failure=error;}
 let actual;try{actual=await read(client);}catch{fail('launch_rollback_result_unknown_keep_receipt');}
 require(actual.revision===current.revision+1&&restoredFields.every(k=>actual[k]===receipt.before[k]),'launch_rollback_not_verified');
 // Native maintenance restoration deliberately starts its 10-second grace period
 // again; historical account dates, rewards and all account rows are untouched.
 await store.write({...pending,status:'rolled_back',rollbackAfter:actual});
 return {status:'rolled_back',changed:true,restoredMode:actual.mode};
}
function atomicJson(file,value){
 const dir=path.dirname(file);fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const temp=file+'.tmp-'+process.pid;let fd;
 try{fd=fs.openSync(temp,'wx',0o600);fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temp,file);const d=fs.openSync(dir,'r');try{fs.fsyncSync(d);}finally{fs.closeSync(d);}}
 finally{if(fd!==undefined)fs.closeSync(fd);try{fs.unlinkSync(temp);}catch{}}
}
export function fileStore(file){
 require(path.isAbsolute(file),'launch_receipt_absolute_path_required');
 return {async read(){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}},async write(value){atomicJson(file,value);}};
}
function jsonGet({port,host,pathname='/api/launch'}){
 return new Promise((resolve,reject)=>{
  const req=http.get({host:'127.0.0.1',port,path:pathname,headers:{host,accept:'application/json'}},res=>{
   let body='';res.on('data',part=>{body+=part;if(body.length>1048576)req.destroy(Error('launch_response_too_large'));});
   res.on('end',()=>{try{require(res.statusCode===200,'launch_http_'+res.statusCode);resolve(JSON.parse(body));}catch(error){reject(error);}});
  });req.setTimeout(8000,()=>req.destroy(Error('launch_status_timeout')));req.on('error',reject);
 });
}
export async function nativeClient(stateFile='/var/lib/core511/state.json'){
 const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const state=json(stateFile);require(state.installed===true,'launch_core_installation_required');
 const root=fs.realpathSync(state.releaseRoot);require(root.startsWith('/opt/core511/releases/'),'launch_unrecognized_release');
 const prior=state.prior||{},gameFile=prior.newGameConfigFile,accountsFile=prior.newAccountsConfigFile||prior.accountsConfigFile;
 require(typeof gameFile==='string'&&path.isAbsolute(gameFile)&&typeof accountsFile==='string'&&path.isAbsolute(accountsFile),'launch_configuration_missing');
 const game=json(gameFile),accounts=json(accountsFile);
 require(fs.realpathSync(game.delivery511?.releaseRoot)===root&&accounts.realm?.role==='accounts','launch_configuration_identity_mismatch');
 const manifest=json(game.realm.manifestFile);
 require(manifest.authOrigin==='https://accounts.coreoflife.net'&&Number.isInteger(manifest.authPort)&&manifest.authPort>1024&&manifest.authPort<65536,'launch_accounts_manifest_invalid');
 require(accounts.hosts.includes('accounts.coreoflife.net')&&Number.isInteger(game.delivery511.appPort)&&game.delivery511.appPort>1024&&game.delivery511.appPort<65536,'launch_hosts_invalid');
 const realm=manifest.realms.find(row=>row.id===game.realm.id);require(realm?.origin==='https://r1.coreoflife.net','launch_primary_realm_invalid');
 // Same native signed protocol as maintenance-client.mjs. Its 5-second timeout
 // is shorter than the existing panel's 6-second readiness/auto-rollback window;
 // this one-shot installer gives that authoritative operation 20 seconds.
 const native=path.join(root,'native510-bb3a6cc689c6/vds-server/src/realm-service-auth.mjs');
 const {signRealmServiceRequest}=await import(pathToFileURL(native));
 const key=Buffer.from(fs.readFileSync(game.realm.keyFile,'utf8').trim(),'hex'),realmId=game.realm.id;
 const actorId=accounts.environment?.ADMIN_USER_ID;require(typeof actorId==='string'&&actorId.length>0,'launch_configured_owner_required');
 const call=(pathname,data)=>new Promise((resolve,reject)=>{
  const body=JSON.stringify(data),signed=signRealmServiceRequest({key,realmId,pathname,body});
  const req=http.request({host:'127.0.0.1',port:manifest.authPort,path:'/api/realm/internal',method:'POST',headers:{...signed,'content-type':'application/json','x-col-service-path':pathname}},res=>{
   let text='';res.on('data',b=>{text+=b;if(text.length>1048576)req.destroy(Error('launch_response_too_large'));});res.on('error',reject);
   res.on('end',()=>{try{const result=JSON.parse(text);require(res.statusCode===200,'launch_admin_'+res.statusCode+(result.error?':'+String(result.error).slice(0,500):''));resolve(result);}catch(error){reject(error);}});
  });req.setTimeout(20000,()=>req.destroy(Error('launch_admin_timeout')));req.on('error',reject);req.end(body);
 });
 const admin=async input=>{
  const security=await call('/internal/security/check',{accountId:actorId});
  require(!security.blocked&&Number.isSafeInteger(security.securityVersion),'launch_owner_security_rejected');
  return call('/internal/admin',{...input,actorId,securityVersion:security.securityVersion});
 };
 const gameGet=pathname=>jsonGet({port:game.delivery511.appPort,host:'r1.coreoflife.net',pathname});
 return {admin,accountsStatus:()=>jsonGet({port:manifest.authPort,host:'accounts.coreoflife.net'}),gameStatus:()=>gameGet('/api/launch'),panelStatus:()=>gameGet('/api/realm/maintenance/panel511'),
  async preflight(settings){
   const [health,panel]=await Promise.all([gameGet('/api/vds-health'),gameGet('/api/realm/maintenance/panel511')]);
   const rows=health?.channelProcesses?.channels;
   require(health?.kernel511?.ready===true&&health?.durable===true&&health?.realm?.dbIdentity===realm.dbIdentity&&Array.isArray(rows)&&rows.length===4&&rows.every((r,i)=>r.channel===i+1&&r.ready===true&&r.capacity===25),'launch_core_health_not_ready');
   require(panel?.version==='panel511-r27'&&panel.canOpen===true&&panel.revision===settings.revision,'launch_core_preflight_rejected'+(panel?.reason?':'+String(panel.reason).slice(0,500):''));
  }};
}
async function main(argv){
 const flags=new Map();for(let i=0;i<argv.length;i++){const key=argv[i];require(key.startsWith('--'),'launch_cli_invalid');if(['--check','--status','--apply','--rollback'].includes(key))flags.set(key,true);else{require(['--state','--receipt','--opens-at'].includes(key)&&argv[i+1]&&!argv[i+1].startsWith('--'),'launch_cli_invalid');flags.set(key,argv[++i]);}}
 const actions=['--check','--status','--apply','--rollback'].filter(k=>flags.has(k));require(actions.length===1,'launch_one_action_required');
 const action=actions[0],client=await nativeClient(flags.get('--state')),opening=validateOpening(flags.get('--opens-at')||OPENING_ISO);
 let result;if(action==='--check')result=await checkLaunch({client,opening});
 else if(action==='--status'){const settings=await read(client);result={settings,accounts:await client.accountsStatus(),game:await client.gameStatus()};}
 else{require(process.getuid?.()===0,'launch_root_required');require(flags.get('--receipt'),'launch_receipt_required');const store=fileStore(flags.get('--receipt'));result=action==='--apply'?await applyLaunch({client,opening,store}):await rollbackLaunch({client,store});}
 process.stdout.write(JSON.stringify(result)+'\n');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 main(process.argv.slice(2)).catch(error=>{console.error(JSON.stringify({error:error.code||'launch_operation_failed',message:error.message}));process.exitCode=1;});
}
