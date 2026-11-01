import {createFaultReporter} from './fence-diagnostics.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateRealmManifest} from './generated/native-realm-manifest.mjs';
import {PROTOCOL,demand} from './contract.mjs';

// Validate all identities/listeners before opening CURRENT DB. This entry never
// imports the legacy application, migrations, writer or simulation bootstrap.
export async function applicationConfiguration(config){
 demand(config?.realm?.role==='game'&&config.kernel511?.protocol===PROTOCOL&&path.isAbsolute(config.database??'')&&path.isAbsolute(config.realm.manifestFile??'')&&path.isAbsolute(config.realm.keyFile??'')&&path.isAbsolute(config.kernel511.outDir??''),'application_configuration');
 const manifest=validateRealmManifest(JSON.parse(await fs.readFile(config.realm.manifestFile,'utf8'))),realm=manifest.realms.find(r=>r.id===config.realm.id);
 demand(realm?.coreProtocol===PROTOCOL&&realm.channels===4&&realm.initialChannelCapacity===25&&realm.database===config.database,'application_realm_identity');
 demand(Array.isArray(config.hosts)&&config.hosts.includes(new URL(realm.origin).host)&&config.hosts.every(h=>typeof h==='string'&&/^[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/.test(h)),'application_hosts');
 demand(!config.environment||Object.values(config.environment).every(v=>typeof v==='string'),'application_environment');
 const voiceUpstream=Number(config.environment?.CORE_VOICE_UPSTREAM_PORT??7880);demand(Number.isInteger(voiceUpstream)&&voiceUpstream>=1024&&voiceUpstream<=65535,'application_voice_upstream');return {manifest,realm};
}
export async function startApplication(config,{onFault=()=>{}}={}){
 const {manifest,realm}=await applicationConfiguration(config),values={...config.environment,NODE_ENV:'production',CORE_DATABASE_PATH:config.database,CORE_RELEASE_VERSION:'511',VINEXT_TRUST_PROXY:'1',VINEXT_TRUSTED_HOSTS:config.hosts.join(',')},before=new Map(Object.keys(values).map(k=>[k,process.env[k]]));
 Object.assign(process.env,values);const restore=()=>{for(const[k,v]of before)if(v===undefined)delete process.env[k];else process.env[k]=v;};
 try{const {openApplicationRuntime}=await import('./application-runtime.mjs'),runtime=await openApplicationRuntime({config,manifest,realm,onFault});let closing;
  return {...runtime,close:()=>closing??=runtime.close().finally(restore)};
 }catch(error){restore();throw error;}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{
  demand(path.isAbsolute(process.env.CORE_CONFIG_FILE??''),'application_config_file');const config=JSON.parse(await fs.readFile(process.env.CORE_CONFIG_FILE,'utf8'));
  const runtime=await startApplication(config,{onFault:createFaultReporter(text=>process.stderr.write(text))});
  let stopping=false;const stop=async()=>{if(stopping)return;stopping=true;try{await runtime.close();process.exitCode=0;}catch{process.stderr.write('core511_shutdown_failed\n');process.exitCode=1;}};process.once('SIGTERM',stop);process.once('SIGINT',stop);process.stdout.write('core511_ready\n');
 }catch(error){process.stderr.write(JSON.stringify({event:'core511_startup_failed',code:/^[a-z0-9_]{1,80}$/.test(error.code)?error.code:'startup_failed'})+'\n');process.exitCode=1;}
}
