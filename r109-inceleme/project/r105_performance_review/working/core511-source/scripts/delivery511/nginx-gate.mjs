import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {deliveryHttpFixture} from './delivery-http-fixture.mjs';
import {sourceIdentity} from '../core511/source-identity.mjs';
import {until} from '../core511/tests/helpers.mjs';
import {PROTOCOL} from '../core511/contract.mjs';
import {childMemory} from './process-resources.mjs';
import {nginxConfig} from './nginx-config.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const source=sourceIdentity(),out=path.resolve('scripts/core511/evidence/terminal-nginx-gate.json'),cleanup=[],t={after:fn=>cleanup.push(fn)},sockets=[],proof={sourceSha256:source.sha256,passed:false,checks:[],liveVdsTouched:false};
let child,s;
const root=fs.mkdtempSync(path.join(os.tmpdir(),'core511-nginx-'));
const nginx='/tmp/core511-delivery-deps/nginx/usr/sbin/nginx';
try{
 s=await deliveryHttpFixture(t);s.core.start();
 await s.host.database.atomic(()=>s.f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(s.f.id));
 const cert=path.join(root,'cert.pem'),key=path.join(root,'key.pem');execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=game.invalid','-addext','subjectAltName=DNS:game.invalid'],{stdio:'ignore'});
 for(const name of ['body','proxy','fastcgi','uwsgi','scgi'])fs.mkdirSync(path.join(root,name));const config=nginxConfig({root,origin:s.f.origin,port:8443,appPort:s.server.port,channels:[1,2,3,4].map(ch=>s.listeners[ch].port),certificate:cert,key});const file=path.join(root,'nginx.conf');fs.writeFileSync(file,config);
 execFileSync(nginx,['-t','-p',root,'-c',file,'-g','user root;'],{stdio:'pipe'});proof.checks.push('nginx_config_test');
 child=spawn(nginx,['-p',root,'-c',file,'-g','user root; daemon off; master_process off;'],{stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',b=>error=(error+b).slice(-4000));
 const call=(route,{body,headers={},host='game.invalid:8443'}={})=>new Promise((resolve,reject)=>{const req=https.request({host:'127.0.0.1',port:8443,servername:'game.invalid',rejectUnauthorized:false,path:route,method:body===undefined?'GET':'POST',agent:false,headers:{...Object.fromEntries(s.f.request().headers),host,...headers}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>{let value;try{value=JSON.parse(text);}catch{}resolve({status:res.statusCode,text,body:value,headers:res.headers});});});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));});
 let ready=false;for(let i=0;i<50&&!ready;i++){try{ready=(await call('/api/vds-health')).status===200;}catch{}if(!ready)await new Promise(r=>setTimeout(r,50));}assert(ready,error);proof.checks.push('tls_native_health');
 for(const route of ['/api/realm/maintenance','/api/realm/internal','/api/loadtest/session','/internal/maintenance'])assert.equal((await call(route,{body:{},headers:{'x-forwarded-for':'127.0.0.1','x-real-ip':'127.0.0.1'}})).status,404,route);
 proof.checks.push('private_routes_denied_even_with_forged_forwarding');assert.equal((await call('/api/vds-health',{host:'wrong.invalid'})).status,421);proof.checks.push('host_rejected');
 assert.equal((await call('/api/realtime/core511-ticket',{body:{protocol:PROTOCOL},headers:{origin:'https://evil.invalid'}})).status,403);assert.equal((await call('/api/realtime/core511-ticket',{body:{protocol:PROTOCOL},headers:{'x-csrf-token':''}})).status,403);proof.checks.push('origin_csrf_rejected');
 async function connect(ticket){const ws=new WebSocket('wss://127.0.0.1:8443'+ticket.url,{origin:s.f.origin,rejectUnauthorized:false,servername:'game.invalid',headers:{Host:'game.invalid:8443','X-Real-IP':'203.0.113.77','X-Forwarded-For':'203.0.113.77'}}),packets=[];sockets.push(ws);ws.on('message',b=>packets.push(JSON.parse(b)));await once(ws,'open');ws.send(JSON.stringify({type:'auth',ticket:ticket.ticket}));await until(()=>packets.some(p=>p.type==='ready'),5000);return {ws,packets};}
 let r=await call('/api/realtime/core511-ticket',{body:{protocol:PROTOCOL}});assert.equal(r.status,200,r.text);let live=await connect(r.body);const seen=new Set([r.body.channel]);
 assert([...s.core.budget.leases.values()].every(v=>v.ip==='127.0.0.1'));proof.checks.push('real_ip_overwrites_spoof');
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1)),7000);assert.equal(s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions,1);proof.checks.push('tls_ws_durable_potion');
 for(const ch of [1,2,3,4]){if(s.writer.authority.owner(s.f.id).channel===ch)continue;r=await call('/api/realtime/core511-transfer',{body:{protocol:PROTOCOL,channel:ch}});assert.equal(r.status,200,r.text);live=await connect(r.body);seen.add(r.body.channel);assert.equal(s.writer.authority.owner(s.f.id).channel,ch);}
 assert.equal(seen.size,4);proof.checks.push('four_real_tls_ws_channels_and_transfer');
 const bad=await new Promise((resolve,reject)=>{const ws=new WebSocket('wss://127.0.0.1:8443/game/channel/4',{origin:'https://evil.invalid',rejectUnauthorized:false,headers:{Host:'game.invalid:8443'}});ws.on('unexpected-response',(_,res)=>{res.resume();resolve(res.statusCode);});ws.on('error',()=>{});ws.on('open',()=>{ws.terminate();reject(Error('bad_origin_upgraded'));});});assert.equal(bad,403);proof.checks.push('ws_origin_rejected');
 assert.equal((await call('/game/channel/5')).status,404);proof.checks.push('unknown_channel_rejected');assert.equal(s.faults.length,0,JSON.stringify(s.faults));
 proof.nginxVersion='1.26.3';proof.checks.push('zero_native_faults');proof.nginxPid=child.pid;proof.nginxMemory=childMemory(child.pid);proof.mode='real local TLS/HTTP/WS with nginx single process; production worker privilege/systemd deployment remains installer gate';proof.passed=true;
}catch(e){proof.error={message:e.message,code:e.code,stack:e.stack};process.exitCode=1;}
finally{
 for(const ws of sockets)ws.terminate();if(child&&child.exitCode===null){child.kill('SIGTERM');await once(child,'exit').catch(()=>{});}
 for(const fn of cleanup.toReversed())try{await fn();}catch(e){proof.cleanupErrors??=[];proof.cleanupErrors.push(e.message);proof.passed=false;process.exitCode=1;}
 proof.sourceUnchanged=sourceIdentity().sha256===source.sha256;proof.passed&&=proof.sourceUnchanged;fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({passed:proof.passed,checks:proof.checks,error:proof.error?.message}));fs.rmSync(root,{recursive:true,force:true});
}
