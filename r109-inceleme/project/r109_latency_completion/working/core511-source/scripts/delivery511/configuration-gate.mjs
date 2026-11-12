import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {generateKeyPairSync} from 'node:crypto';
import {canaryUnit,validateCanaryUnit,runtimeOverride} from './service-units.mjs';
import {installedSigningKey} from './installed-key.mjs';
import {sourceIdentity} from '../core511/source-identity.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'core511-unit-static-')),proof={scope:'static-unit-and-installed-configuration',systemdRuntime:false,passed:false,units:[]};
try{
 fs.mkdirSync(path.join(root,'bin'));fs.symlinkSync(process.execPath,path.join(root,'bin/node'));
 for(const probe of [true,false]){
  const unit=canaryUnit({releaseRoot:root,root:root+'/private',parentNetns:fs.readlinkSync('/proc/self/ns/net'),probe});assert(validateCanaryUnit(unit));
  const file=path.join(root,probe?'probe.service':'canary.service');fs.writeFileSync(file,unit);proof.units.push({name:path.basename(file),text:unit.replaceAll(root,'/opt/core511/releases/RELEASE')});
 }
 for(const role of ['game','accounts']){
  const override=runtimeOverride({releaseRoot:root,configFile:root+'/config.json',dataRoot:root+'/data',role});
  assert(override.includes('KillMode=mixed'));assert(override.includes('NoNewPrivileges=yes'));assert(override.includes('ProtectSystem=strict'));
  const unit='[Unit]\nDescription=Core511 static '+role+'\n[Service]\nUser=col-'+(role==='game'?'r1':'accounts')+'\nExecStart=/usr/bin/true\n'+override;
  const file=path.join(root,role+'.service');fs.writeFileSync(file,unit);proof.units.push({name:path.basename(file),text:unit.replaceAll(root,'/opt/core511/releases/RELEASE')});
 }
 const r=spawnSync('/usr/bin/systemd-analyze',['verify',...proof.units.map(u=>path.join(root,u.name))],{encoding:'utf8',timeout:15000});
 proof.systemdAnalyze={status:r.status,stdout:r.stdout,stderr:r.stderr};assert.equal(r.status,0,r.stderr);
 const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),der=privateKey.export({type:'pkcs8',format:'der'});
 assert.deepEqual(installedSigningKey({environment:{REALTIME_SIGNING_PRIVATE_KEY:der.toString('base64')}}).export({type:'pkcs8',format:'der'}),der);
 assert.throws(()=>installedSigningKey({environment:{REALTIME_PRIVATE_KEY_PKCS8:der.toString('base64')}}));
 const catalog=JSON.parse(fs.readFileSync(new URL('../core511/evidence/terminal-installer-direct-r2.json',import.meta.url))).catalog;
 const listed=catalog.realms.find(r=>r.id==='r1');assert.equal(listed.channels.length,4);assert.equal(listed.channelCapacity,25);assert.equal(listed.capacity,100);assert.equal(catalog.launch.phase,'maintenance');
 proof.installedNativeKeyNameAndEncoding=true;proof.catalogShape=true;proof.sourceSha256=sourceIdentity().sha256;assert.equal(proof.sourceSha256,'ee1f1e5c0085f63de8df52fd892dd27cf9a65029176c2c0fc3db69f0d07680f4');proof.passed=true;
}catch(e){proof.error=e.message;process.exitCode=1;}finally{fs.rmSync(root,{recursive:true,force:true});fs.writeFileSync(new URL('../core511/evidence/terminal-installer-static-r1.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({passed:proof.passed,error:proof.error,systemdAnalyze:proof.systemdAnalyze}));}
