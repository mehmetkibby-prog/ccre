import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawn,execFileSync} from 'node:child_process';import {once} from 'node:events';import readline from 'node:readline';import assert from 'node:assert/strict';
import {deliveryHttpFixture} from './delivery-http-fixture.mjs';import {nginxConfig} from './nginx-config.mjs';import {sourceIdentity} from '../core511/source-identity.mjs';import {native,until} from '../core511/tests/helpers.mjs';
import {CLIENT_ASSET_NAMESPACE} from '../core511/client-assets.mjs';
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs');const {RealmServiceVerifier}=await native('vds-server/src/realm-service-auth.mjs');
const cleanup=[],t={after:fn=>cleanup.push(fn)},root=fs.mkdtempSync(path.join(os.tmpdir(),'core511-browser-')),out=path.resolve('scripts/core511/evidence/terminal-browser-gate.json'),proof={sourceSha256:sourceIdentity().sha256,passed:false,liveVdsTouched:false,pageErrors:[],consoleErrors:[],blockedExternal:[],checks:[]};let browser,child,s,page;
try{
 s=await deliveryHttpFixture(t,{origin:"https://localhost:8443"});s.core.start();
 await s.host.database.atomic(()=>{s.f.sql.prepare('UPDATE players SET hp=1,potions=4,essence=1000 WHERE id=?').run(s.f.id);s.f.sql.prepare('UPDATE game_presence SET expires_at_ms=0 WHERE account_id=(SELECT account_id FROM players WHERE id=?)').run(s.f.id);});
 const prior=globalThis.fetch,key=Buffer.from(fs.readFileSync(s.realm.config.realm.keyFile,'utf8'),'hex'),verifier=new RealmServiceVerifier(new Map([[s.host.expected.realmId,key]]));
 globalThis.fetch=async(url,options)=>{if(options?.headers?.['x-col-service-path']==='/internal/launch/status'){verifier.verify({method:'POST',pathname:'/internal/launch/status',headers:options.headers,body:options.body});return Response.json({phase:'normal',canPlay:true,showLanding:false,registrationOpen:true,serverTime:Date.now()});}return prior(url,options);};t.after(()=>{globalThis.fetch=prior;});
 const cert=path.join(root,'cert.pem'),keyFile=path.join(root,'key.pem');execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyFile,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{stdio:'ignore'});
 for(const name of ['body','proxy','fastcgi','uwsgi','scgi'])fs.mkdirSync(path.join(root,name));const file=path.join(root,'nginx.conf');fs.writeFileSync(file,nginxConfig({root,origin:s.f.origin,port:8443,appPort:s.server.port,channels:[1,2,3,4].map(ch=>s.listeners[ch].port),certificate:cert,key:keyFile}));
 child=spawn('/tmp/core511-delivery-deps/nginx/usr/sbin/nginx',['-p',root,'-c',file,'-g','user root; daemon off; master_process off;'],{stdio:['ignore','ignore','pipe']});await new Promise(r=>setTimeout(r,300));assert.equal(child.exitCode,null);
 browser=await chromium.launch({headless:true,executablePath:'/tmp/core511-delivery-deps/browser/chrome-headless-shell-linux64/chrome-headless-shell'});proof.browserVersion=browser.version();
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='localhost')return route.continue();proof.blockedExternal.push(u.origin+u.pathname);return route.abort();});
 await context.addCookies([{name:'__Host-yasam-session',value:s.f.token,url:s.f.origin+'/',secure:true,httpOnly:true,sameSite:'Lax'},{name:'__Host-yasam-csrf',value:s.f.csrf,url:s.f.origin+'/',secure:true,httpOnly:false,sameSite:'Lax'}]);
 await context.addInitScript(()=>{window.__core511ClosedSends=[];const send=WebSocket.prototype.send;WebSocket.prototype.send=function(data){if(this.readyState!==WebSocket.OPEN)window.__core511ClosedSends.push({state:this.readyState,type:typeof data==='string'?JSON.parse(data).type:null,stack:new Error().stack});return send.call(this,data);};});
 page=await context.newPage();page.on('pageerror',e=>proof.pageErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')proof.consoleErrors.push(m.text());});const requests=[];page.on('request',r=>{if(r.url().includes('/api/realtime/core511-ticket')){const instance=r.headers()['x-game-instance'];if(instance)proof.instance=instance;}});
 await page.goto(s.f.origin,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(4500);
 const snapshot=async()=>({url:page.url(),text:(await page.locator('body').innerText()).slice(0,4500),buttons:await page.getByRole('button').allTextContents(),pageErrors:proof.pageErrors,consoleErrors:proof.consoleErrors.slice(-8),owner:s.writer.authority.owner(s.f.id),pendingFaults:s.faults.map(f=>f.error?.code)});
 if(process.env.CORE511_BROWSER_AUTO==='1'){
  await until(()=>s.writer.authority.owner(s.f.id)?.state==='active',15000);
  for(const name of ['Daha sonra','Anladım'])if(await page.getByRole('button',{name,exact:true}).isVisible())await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('button',{name:'Can iksiri kullan',exact:true}).click();
  await until(()=>s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions===3,5000);
  await page.getByRole('button',{name:'Ses ve oyun ayarları',exact:true}).click();
  await page.getByRole('button',{name:/Kanal 4/}).click();
  await until(()=>s.writer.authority.owner(s.f.id)?.channel===4,5000);
  await page.getByRole('button',{name:'Işınlanma',exact:true}).click();
  await page.getByRole('button',{name:/Kuzey Ormanı/}).click();
  await until(()=>s.f.sql.prepare('SELECT area FROM players WHERE id=?').get(s.f.id).area==='forest',5000);
  await page.waitForTimeout(700);
  const position=()=>s.f.sql.prepare('SELECT x,y,position_revision FROM players WHERE id=?').get(s.f.id),before=position();
  await page.keyboard.down('d');await page.waitForTimeout(700);await page.keyboard.up('d');
  await until(()=>position().position_revision>before.position_revision,5000);proof.movement={before,after:position()};
  proof.clientResources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>/\/assets\/.*\.js(?:$|\?)/.test(x.name)).map(x=>new URL(x.name).pathname));
  assert(proof.clientResources.some(x=>x.includes('/'+CLIENT_ASSET_NAMESPACE+'/core511-transport-')));
  assert(proof.clientResources.every(x=>x.startsWith('/assets/'+CLIENT_ASSET_NAMESPACE+'/')));
  assert(!proof.clientResources.some(x=>x.includes('/game-client-Bqw')||x.includes('/auth-portal-CUX')));
  proof.closedSends=await page.evaluate(()=>window.__core511ClosedSends);
  assert.equal(proof.pageErrors.length,0,JSON.stringify(proof.pageErrors));assert.equal(proof.consoleErrors.length,0,JSON.stringify(proof.consoleErrors));assert.equal(s.faults.length,0);
  proof.potions=s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions;assert.equal(proof.potions,3);
  proof.checks=['real Chromium TLS native authenticated bootstrap','single versioned ES-module graph and native WS','UI potion exactly one durable debit','UI channel4 epoch transfer','UI forest travel','real keyboard authoritative movement','zero page/console/native errors'];
  proof.final=await snapshot();await page.screenshot({path:path.resolve('scripts/core511/evidence/terminal-browser-final.png'),fullPage:true});proof.passed=true;
 }else{
 console.log('BROWSER_READY '+JSON.stringify(await snapshot()));
 const rl=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
 for await(const line of rl){if(!line.trim())continue;const command=JSON.parse(line);try{
  if(command.op==='snapshot')console.log('BROWSER_STATE '+JSON.stringify(await snapshot()));
  else if(command.op==='click'){await page.getByRole('button',{name:command.name,exact:command.exact??false}).click({timeout:5000});await page.waitForTimeout(1500);console.log('BROWSER_STATE '+JSON.stringify(await snapshot()));}
  else if(command.op==='screenshot'){const file=path.resolve('scripts/core511/evidence/terminal-browser-'+command.name+'.png');await page.screenshot({path:file,fullPage:true});console.log('SCREENSHOT '+file);}
  else if(command.op==='evaluate'){const value=await page.evaluate(command.code);console.log('BROWSER_VALUE '+JSON.stringify(value));}
  else if(command.op==='finish'){proof.checks=command.checks??[];assert(proof.checks.length>=4);assert.equal(proof.pageErrors.length,0,JSON.stringify(proof.pageErrors));assert.equal(s.faults.length,0,JSON.stringify(s.faults));proof.final=await snapshot();proof.potions=s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions;proof.passed=true;break;}
  else if(command.op==='stop'){proof.error={message:command.reason??'browser_gate_incomplete'};process.exitCode=1;break;}
 }catch(e){console.log('BROWSER_COMMAND_FAILED '+JSON.stringify({message:e.message}));}}
 }
}catch(e){proof.error={message:e.message,code:e.code,stack:e.stack};if(page){proof.failureText=await page.locator('body').innerText().catch(()=>null);proof.closedSends=await page.evaluate(()=>window.__core511ClosedSends).catch(()=>null);}proof.failureOwner=s?.writer.authority.owner(s.f.id);process.exitCode=1;}
finally{
 await browser?.close();if(child&&child.exitCode===null){child.kill('SIGTERM');await once(child,'exit').catch(()=>{});}for(const fn of cleanup.toReversed())try{await fn();}catch(e){proof.cleanupErrors??=[];proof.cleanupErrors.push(e.message);proof.passed=false;process.exitCode=1;}
 proof.sourceUnchanged=sourceIdentity().sha256===proof.sourceSha256;proof.passed&&=proof.sourceUnchanged;delete proof.instance;fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\n');fs.rmSync(root,{recursive:true,force:true});console.log('BROWSER_FINAL '+JSON.stringify({passed:proof.passed,error:proof.error?.message}));
}
