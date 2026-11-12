import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {demand} from '../core511/contract.mjs';

export async function canaryIsolation({scratch=false}={}){
 const root=process.env.CORE511_CANARY_ROOT;
 demand(path.isAbsolute(root??'')&&fs.realpathSync(root)===root&&(fs.statSync(root).mode&0o777)===0o700,'canary_private_root');
 const netns=fs.readlinkSync('/proc/self/ns/net'),parent=process.env.CORE511_PARENT_NETNS;
 const interfaces=fs.readdirSync('/sys/class/net');
 if(!scratch){
  // The optional legacy load generator must be absent, not permission-denied.
  const mounts=fs.readFileSync('/proc/self/mountinfo','utf8').trim().split('\n').map(line=>line.split(' '));
  for(const dir of ['/etc/col-loadlab-live','/var/lib/col-loadlab-live']){
   demand(fs.readdirSync(dir).length===0,'canary_legacy_loadlab_not_empty');
   demand(mounts.some(row=>row[4]===dir&&row[5].split(',').includes('ro')&&row[row.indexOf('-')+1]==='tmpfs'),'canary_legacy_loadlab_not_masked');
  }
  demand(/^net:\[\d+\]$/.test(parent??'')&&parent!==netns&&interfaces.length===1&&interfaces[0]==='lo','canary_private_network_required');
  demand(/^[a-f0-9]{32}$/.test(process.env.INVOCATION_ID??''),'canary_systemd_scope_required');
  for(const file of ['/var/lib/coreoflife-realms-417/manifest.json','/var/lib/coreoflife-realms-417/r1/game.sqlite']){let accessible=false;try{const fd=fs.openSync(file,'r');fs.closeSync(fd);accessible=true;}catch(e){demand(['EACCES','ENOENT','EPERM'].includes(e.code),'canary_production_path_error');}demand(!accessible,'canary_production_state_visible');}
 }
 const denied=await new Promise(resolve=>{const socket=net.connect({host:'192.0.2.1',port:443});const timer=setTimeout(()=>{socket.destroy();resolve('timeout');},1000);socket.once('connect',()=>{clearTimeout(timer);socket.destroy();resolve('connected');});socket.once('error',e=>{clearTimeout(timer);resolve(e.code);});});
 if(!scratch)demand(['ENETUNREACH','EHOSTUNREACH','EACCES','EPERM'].includes(denied),'canary_egress_not_denied');
 const tmp=path.join(root,'tmp');fs.mkdirSync(tmp,{mode:0o700});process.env.TMPDIR=tmp;
 return {productionDatabaseOpened:false,privateDataRoot:true,externalServicesReachable:scratch?true:false,temporaryAccountsOnly:true,mechanism:scratch?'scratch driver verification only; NOT installation acceptance':'systemd private network and masked production state; unprivileged service user; disposable0700 root',networkProof:{netns,parent,interfaces,externalConnect:denied},legacyLoadlabMasked:!scratch,scratchDriverOnly:scratch};
}
