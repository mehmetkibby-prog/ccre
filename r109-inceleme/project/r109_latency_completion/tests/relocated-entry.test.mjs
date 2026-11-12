import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID,randomBytes,generateKeyPairSync} from 'node:crypto';
const baseline=process.env.BOOT_BASELINE==='1',label=process.env.RUNTIME_LABEL||(baseline?'relocated-baseline':'relocated');
// RUNTIME_STAGE_FILE/RUNTIME_EVIDENCE_DIR let a later release (R110) start its own installed tree.
const root=path.resolve(import.meta.dirname,'..'),evidenceDir=process.env.RUNTIME_EVIDENCE_DIR||root+'/evidence',stage=JSON.parse(fs.readFileSync(process.env.RUNTIME_STAGE_FILE||root+(baseline?'/evidence/runtime-stage-baseline.json':'/evidence/runtime-stage.json'))),release=stage.release,core=release+'/core511-source/scripts/core511',native=release+'/native510-bb3a6cc689c6/vds-server/src';
const {RealmServiceVerifier}=await import(core+'/realm-service-auth-r101.mjs');
const {createEmptyRealmWorld}=await import(native+'/realm-world-bootstrap.mjs');
const {LocalDatabase}=await import(native+'/database.mjs');
const {prepareNewRealmSchemaR101}=await import(core+'/generated/new-realm-schema-r101.mjs');
const {createNativeWorldStartup}=await import(core+'/generated/native-world-startup.mjs');
const {DatabaseHost}=await import(core+'/database-host.mjs');
const {NativeWorldStartup}=await import(core+'/native-world-startup.mjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=http.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function stop(c){if(c.exitCode!==null)return;const done=once(c,'exit');c.kill('SIGTERM');await Promise.race([done,pause(8000)]);if(c.exitCode===null){process.kill(-c.pid,'SIGKILL');await done;}}
async function seed(realm){
 fs.mkdirSync(realm.dataRoot);createEmptyRealmWorld({destination:realm.database,realmId:realm.id,dbIdentity:realm.dbIdentity});
 const database=new LocalDatabase(realm.database,{groupWrites:false,asyncDurable:false});
 try{await prepareNewRealmSchemaR101(database.sqlite,{database:realm.database});await createNativeWorldStartup(database).ensureWorldSeed();database.sqlite.prepare('UPDATE game_settings SET channel_capacity=? WHERE id=1').run(realm.initialChannelCapacity);if(realm.id==='r1'){
   const put=database.sqlite.prepare('INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round) VALUES(?,?,?,?,?,?,?,?,?)');
   database.sqlite.exec('BEGIN');for(let n=0;n<15000;n++)put.run('golge-startup-r104-'+n,'Gölge Muhafızı','forest',1,1000+n%100,1000+Math.floor(n/100),100,100,1);database.sqlite.exec('COMMIT');
  }await database.durableAfterCommit();}finally{database.close();}
 const host=await DatabaseHost.open({file:realm.database,realmId:realm.id,dbIdentity:realm.dbIdentity});try{await host.bootstrap();await NativeWorldStartup.prepare(host);}finally{await host.close();}
}
test('exact installed server starts both realms with eight real channels outside the development tree',{timeout:90000},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r102-entry-data-')),keys=new Map([['r1',randomBytes(32)],['r2',randomBytes(32)]]),verifier=new RealmServiceVerifier(keys),children=[];let calls=0;
 const accounts=http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks).toString(),pathname=req.headers['x-col-service-path'];assert(verifier.verify({method:'POST',pathname,headers:req.headers,body}));calls++;assert.equal(pathname,'/internal/maintenance/status');res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({revision:1,phase:'maintenance',startedAt:0,deadlineMs:0,adminAccountId:'',maintenanceText:''}));}catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}));}});accounts.listen(0,'127.0.0.1');await once(accounts,'listening');
 t.after(async()=>{for(const c of children)await stop(c);accounts.closeAllConnections();await new Promise(r=>accounts.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 const ports=await Promise.all(Array.from({length:18},port));assert.equal(new Set(ports).size,18);
 const realms=['r1','r2'].map((id,i)=>({id,name:i?'Core Akademi':'Core Efsane',status:'maintenance',registrationOpen:true,channels:4,initialChannelCapacity:i?10:25,coreProtocol:'coreoflife-kernel-v1',origin:`https://${id}.fixture.invalid`,realtimeOrigin:`https://rt-${id}.fixture.invalid`,dataRoot:path.join(dir,id),database:path.join(dir,id,'game.sqlite'),dbIdentity:randomUUID(),ports:{proxy:ports[i*9],app:ports[i*9+1],realtime:ports[i*9+2],dungeon:ports[i*9+3],voice:ports[i*9+4],channels:ports.slice(i*9+5,i*9+9)}}));
 const manifest={version:1,phase:'101',primaryRealmId:'r1',accountsDatabase:dir+'/accounts.sqlite',authOrigin:'https://accounts.fixture.invalid',authPort:accounts.address().port,realms};fs.writeFileSync(dir+'/manifest.json',JSON.stringify(manifest));
 const evidence=[];
 for(const realm of realms){
  await seed(realm);const keyFile=realm.dataRoot+'/service.key';fs.writeFileSync(keyFile,keys.get(realm.id).toString('hex'));
  const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),config={database:realm.database,hosts:[realm.id+'.fixture.invalid'],proxyToken:randomBytes(32).toString('hex'),environment:{CORE101_REALM_ID:realm.id,CORE_REALM_ID:realm.id,CORE_DATA_ROOT:realm.dataRoot,CORE511_RETENTION:'1',CORE511_OUTBOX_V2:'1',REALTIME_SIGNING_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'der'}).toString('base64')},realm:{role:'game',id:realm.id,dbIdentity:realm.dbIdentity,manifestFile:dir+'/manifest.json',keyFile},delivery511:{releaseRoot:release,appPort:realm.ports.app,proxyPort:realm.ports.proxy,channelPorts:realm.ports.channels}};
  const configFile=realm.dataRoot+'/config.json';fs.writeFileSync(configFile,JSON.stringify(config));const env={...process.env,CORE_CONFIG_FILE:configFile};delete env.COL_CORE511_BASE;
  const child=spawn(process.execPath,[release+'/core511-source/scripts/delivery511/runtime-entry.mjs'],{detached:true,env,stdio:['ignore','pipe','pipe']});child.output='';child.stdout.on('data',b=>child.output+=b);child.stderr.on('data',b=>child.output+=b);children.push(child);
 }
 for(let i=0;i<realms.length;i++){
  const realm=realms[i],child=children[i],end=Date.now()+30000;let health;
  while(Date.now()<end){assert.equal(child.exitCode,null,child.output);try{const response=await fetch('http://127.0.0.1:'+realm.ports.app+'/api/vds-health',{signal:AbortSignal.timeout(1000)});health=await response.json();if(response.ok&&health.ok)break;}catch{}await pause(100);}
  assert.equal(health?.captchaWorker,'R106_CAPTCHA1',child.output);assert.equal(health?.populationStability,'R107_POPULATION1',child.output);assert.equal(health?.latencyRepair,'R109_LATENCY2',child.output);assert.equal(health?.connectionRecovery,'R105_TOWER2',child.output);assert.equal(health?.performanceReview,'R105_PERF1',child.output);assert.equal(health?.readerBoot,'R104_BOOT1',child.output);assert.equal(health?.academyPrereg,'R104_AKADEMI4');assert.equal(health?.additionsHotfix,'R102_COMPLETE3',child.output);assert.equal(health.skillVisuals,'R103_SKILLS1');assert.equal(health.browserCompatibility,'R103_ABORT1');if(!baseline){assert.equal(health.autoSession,'R103_AUTO_SESSION1');assert.equal(health.mobileChat,'R103_CHAT_ANCHOR2');}assert.equal(health.realm.realmId,realm.id);assert.equal(health.realm.dbIdentity,realm.dbIdentity);assert.equal(health.channelProcesses.channels.length,4);assert(health.channelProcesses.channels.every(c=>c.ready&&c.capacity===realm.initialChannelCapacity));
  if(realm.id==='r1')assert(child.output.includes('core511_boot_read'),'large boot limit was not exercised');
  const context=await(await fetch('http://127.0.0.1:'+realm.ports.app+'/api/realm/context')).json();assert.equal(context.realm.id,realm.id);
  const ready=await(await fetch('http://127.0.0.1:'+realm.ports.proxy+'/full-readyz')).json();assert.equal(ready.ok,true);
  if(process.env.RUNTIME_EXPECT_R110==='1')assert.equal(health.realtimeHandoff,'R110_HANDOFF1',child.output);
  fs.writeFileSync(evidenceDir+'/'+label+'-'+realm.id+'.log',child.output);evidence.push({realm:realm.id,health,ingress:ready});
 }
 assert(calls>=2);for(const c of children){await stop(c);assert.equal(c.exitCode,0,c.output);}
 fs.writeFileSync(evidenceDir+'/'+label+'-runtime.json',JSON.stringify({release,package:stage.package,live:false,accounts:'signed fixture',realRuntimeEntry:true,realChannels:8,realms:evidence,cleanShutdown:true},null,2));
});

test('relocated native captcha worker resolves its imports and produces a PNG',async t=>{
 const {CaptchaRendererR106}=await import(native+'/captcha-renderer-r106.mjs');
 const renderer=new CaptchaRendererR106();t.after(()=>renderer.close());
 const png=await renderer.render('472819');assert.equal(png.readUInt32BE(16),252);assert.equal(png.readUInt32BE(20),88);assert.equal(renderer.snapshot().completed,1);
});
