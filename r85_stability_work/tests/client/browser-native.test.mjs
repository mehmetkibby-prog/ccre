import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {nativeHttpHost} from '../../working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {temporary, until} from '../../working/core511-source/scripts/core511/tests/helpers.mjs';
import {chromium} from '/workspace/ccre/r60_mount_work/tooling/node_modules/playwright/index.mjs';
import {gameSource,transportSource,requestExcerpt,pacingExcerpt,sha} from './source-fixture.mjs';

const manifest=JSON.parse(fs.readFileSync(new URL('./combined-client-candidate.json',import.meta.url)));
const candidate=fs.readFileSync(manifest.candidate,'utf8');
const observations=[];

test('desktop and mobile actual browser input, canvas, current transport and native writer lifecycle',{timeout:150000},async t=>{
 const ports={},reservations=[];
 try {for(const channel of [1,2,3,4]){const listener=net.createServer();reservations.push(listener);await new Promise(r=>listener.listen(0,'127.0.0.1',r));ports[channel]={host:'127.0.0.1',port:listener.address().port};}}
 finally{await Promise.all(reservations.map(listener=>new Promise(r=>listener.close(r))));}
 const s=await nativeHttpHost(t,{listeners:ports,realmSetup:async(host,seed)=>{await host.database.atomic(()=>host.database.sqlite.prepare("UPDATE players SET hp=1,potions=20,area='forest',x=80,y=80 WHERE id=?").run(seed.id));}});await s.world.stopJobs();
 await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));
 assert.equal((await s.http('character',{channel:1})).status,200);
 const dir=temporary(t),key=path.join(dir,'key.pem'),cert=path.join(dir,'cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=game.invalid'],{stdio:'ignore'});
 const sockets=new Set(),requests=[];
 const app=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},async(req,res)=>{
  try{
   if(req.url==='/transport.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(transportSource);return;}
   if(req.url==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(html(s.f.instance));return;}
   if(req.url.startsWith('/api/realtime/core511-')){
    const chunks=[];for await(const part of req)chunks.push(part);const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');
    requests.push({path:req.url,at:performance.now()});
    const reply=await s.core.http(s.f.request({path:req.url,method:req.method,body}));
    res.writeHead(reply.status,Object.fromEntries(reply.headers));res.end(Buffer.from(await reply.arrayBuffer()));return;
   }
   if(req.url.includes('options')){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({frameMotionClock:true,reconnectRecovery:true}));return;}
   res.writeHead(404);res.end('missing fixture route');
  }catch(error){res.writeHead(500);res.end(JSON.stringify({error:error.message}));}
 });
 app.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
 app.on('upgrade',(req,socket,head)=>{
  const channel=Number(req.url.split('/').at(-1));if(!ports[channel]){socket.destroy();return;}
  const peer=net.connect(ports[channel].port,'127.0.0.1',()=>{
   peer.write(req.method+' '+req.url+' HTTP/'+req.httpVersion+'\r\n'+req.rawHeaders.reduce((all,value,i)=>all+(i%2?value+'\r\n':value+': '),'')+'\r\n');
   if(head.length)peer.write(head);socket.pipe(peer);peer.pipe(socket);
  });peer.on('error',()=>socket.destroy());socket.on('error',()=>peer.destroy());socket.on('close',()=>peer.destroy());
 });
 await new Promise((resolve,reject)=>{app.once('error',reject);app.listen(443,'127.0.0.1',resolve);});
 t.after(()=>{for(const socket of sockets)socket.destroy();return new Promise(resolve=>app.close(resolve));});
 for(const profile of [{name:'chromium-desktop',executablePath:'/usr/bin/chromium',mobile:false},{name:'edge-mobile-emulation',executablePath:'/tmp/r72-edge/opt/microsoft/msedge/msedge',mobile:true}]){
  const browser=await chromium.launch({executablePath:profile.executablePath,headless:true,args:['--no-sandbox','--host-resolver-rules=MAP game.invalid 127.0.0.1','--no-proxy-server']});
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:profile.mobile?{width:390,height:844}:{width:1280,height:720},isMobile:profile.mobile,hasTouch:profile.mobile});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto('https://game.invalid/');await page.waitForFunction(()=>window.probe?.ready,{timeout:20000});
   const initial=await page.evaluate(()=>probe.snapshot());
   if(profile.mobile){await page.locator('#move').tap();}else{await page.keyboard.down('ArrowRight');}
   await page.waitForFunction(()=>probe.frames.length>45);if(!profile.mobile)await page.keyboard.up('ArrowRight');else await page.locator('#move').tap();
   fs.writeFileSync(new URL('./browser-native-debug.json',import.meta.url),JSON.stringify(await page.evaluate(()=>probe.snapshot()),null,2));
   await page.waitForFunction(()=>probe.results.some(row=>row.body?.positionRevision??row.data?.positionRevision??row.positionRevision),null,{timeout:10000});
   const healthy=await page.evaluate(()=>probe.snapshot());assert(healthy.sent.some(row=>row.payload?.action==='move'),'native move was sent');assert(healthy.results.some(row=>row.body?.positionRevision??row.data?.positionRevision??row.positionRevision),'native movement result received');
   const heart=await page.evaluate(async()=>{const at=performance.now();const body=await probe.Q('/api/action',{action:'heartbeat'});return {ms:performance.now()-at,body};});assert.equal(heart.body.ok,true);
   // Hold the durability completion after an actual native potion COMMIT. The
   // browser observer times out; the original transport still owns its intent.
   await until(()=>!s.writer.scheduler?.pending,1000).catch(()=>{});
   const original=s.host.database.durableAfterCommit.bind(s.host.database);let release;const held=new Promise(resolve=>release=resolve);let entered=false;
   s.host.database.durableAfterCommit=async(...args)=>{await original(...args);if(s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions===before-1){entered=true;await held;}};
   const before=s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions;
   try{
    await page.evaluate(()=>probe.beginPotion());await until(()=>entered,10000);
    if(profile.mobile)await page.locator('#move').tap();else await page.keyboard.down('ArrowRight');
    await page.waitForFunction(()=>probe.potionOutcome!==null,{timeout:11000});
    const pending=await page.evaluate(()=>probe.snapshot());assert.equal(pending.potionOutcome,'ActionRequestTimeoutError');assert.equal(pending.potionReady,false);assert.equal(pending.potionCommands,1);assert.equal(pending.queue,0);assert(pending.frames>healthy.frames+100,'browser kept rendering during pending mutation');assert(pending.heldLongestStillMs>6000,'prediction still stops while the native acknowledgement is held');
    if(profile.mobile)await page.locator('#move').tap();else await page.keyboard.up('ArrowRight');
    assert.equal(s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions,before-1);
    release();s.host.database.durableAfterCommit=original;
    await page.waitForFunction(()=>probe.snapshot().potionReady,{timeout:10000});
    const settled=await page.evaluate(()=>probe.snapshot());assert.equal(settled.potionCommands,1);assert(settled.maxPredictionMs<=600.001);assert.equal(errors.length,0,errors.join('\n'));
    await page.screenshot({path:new URL('../../evidence/'+profile.name+'.png',import.meta.url).pathname});
    observations.push({profile:profile.name,scope:'Current complete transport module and exact candidate Q/admission bodies; real keyboard or touch, requestAnimationFrame and minimal canvas probe; native SQLite/writer/channel processes via real browser TLS HTTP+WS. Not the unavailable full React game renderer, artwork or physical mobile hardware.',browser:browser.version(),initial:{x:initial.x,y:initial.y},healthy:{x:healthy.x,y:healthy.y,frames:healthy.frames,commands:healthy.sent.length,results:healthy.results.length},heartbeatMs:heart.ms,held:{observer:pending.potionOutcome,actualPotionCommands:pending.potionCommands,maxQueue:pending.queue,renderedFrames:pending.frames-healthy.frames,longestDisplayedPositionStopMs:pending.heldLongestStillMs,meaning:'Admission control prevents duplicate intents but does not remove movement stalls caused by a deliberately held native durable acknowledgement.'},settled:{potions:s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions,maxPredictionMs:settled.maxPredictionMs,renderGapP95Ms:settled.gapP95,renderGapMaxMs:settled.gapMax},errors});
   }finally{release();s.host.database.durableAfterCommit=original;}
   await page.evaluate(()=>probe.core.dispose());
  }finally{await context.close();await browser.close();}
 }
 fs.writeFileSync(new URL('../../evidence/browser-native.json',import.meta.url),JSON.stringify({candidateSha256:sha(candidate),baselineSha256:sha(gameSource),transportSha256:sha(transportSource),liveTouched:false,fullGameRenderer:false,requests:requests.map(row=>row.path),observations},null,2)+'\n');
});

function html(instance){return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px sans-serif;background:#102219;color:#e5f3df}canvas{max-width:100%;border:1px solid #c0c0c0}button{font:inherit;padding:22px;touch-action:manipulation}</style><p>R85 native transport and input probe</p><canvas id="view" width="340" height="240"></canvas><p><button id="move">Move / stop</button></p><pre id="status"></pre><script type="module">
import {browserCore as kernel511,browserRequest as kernel511Request} from '/transport.js';
const Kt=()=>${JSON.stringify(instance)},Zt='x-game-instance',Ut='coreoflife:game-session-ended',Yt='coreoflife:instance-ended',k_=8000,j_=8000,A_=1800,publishAzrailResultR68=()=>{};
${requestExcerpt(candidate)}
${pacingExcerpt(candidate)}
const core=kernel511(Kt()),sent=[],results=[],frames=[],gaps=[];let prior=0,moving=false,maxPredictionMs=0;
const send=core.sendInput.bind(core);core.sendInput=row=>{if(row&&!row.queued)sent.push({at:performance.now(),payload:row.payload,sequence:row.sequence});return send(row);};
const result=core.result.bind(core);core.result=(row,...rest)=>{results.push({...row,at:performance.now()});return result(row,...rest);};
const probe=window.probe={core,sent,results,frames,Q,ready:false,potionOutcome:null,beginPotion(){this.potionOutcome=null;this.holdFrame=frames.length;Q('/api/action',{action:'use_potion'}).then(()=>this.potionOutcome='ok',e=>this.potionOutcome=e.name);},snapshot(){const own=core.world?.players?.find(p=>p.id===core.playerId);let heldLongestStillMs=0,run=0;for(let i=(this.holdFrame??frames.length)+1;i<frames.length;i++){const a=frames[i-1],b=frames[i];run=Math.hypot(a.x-b.x,a.y-b.y)<.00001?run+b.at-a.at:0;heldLongestStillMs=Math.max(heldLongestStillMs,run);}return {x:own?.x,y:own?.y,frames:frames.length,sent,results,potionOutcome:this.potionOutcome,potionReady:autoPotionReadyR85(core),potionCommands:sent.filter(r=>r.payload.action==='use_potion').length,queue:core.queue.length,maxPredictionMs,heldLongestStillMs,gapP95:[...gaps].sort((a,b)=>a-b)[Math.floor(gaps.length*.95)]??0,gapMax:Math.max(0,...gaps)};}};
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();moving=true;}});document.addEventListener('keyup',e=>{if(e.key==='ArrowRight')moving=false;});document.querySelector('#move').addEventListener('click',()=>moving=!moving);
await core.image();probe.ready=true;
const ctx=document.querySelector('#view').getContext('2d');function frame(at){const dt=prior?Math.min(.05,(at-prior)/1000):.016;if(prior)gaps.push(at-prior);prior=at;const own=core.world?.players.find(p=>p.id===core.playerId);const point=core.predictFrame({own,seconds:dt,frameAt:at},(p,seconds)=>({x:p.x+(moving?100*seconds:0),y:p.y}));maxPredictionMs=Math.max(maxPredictionMs,core.prediction.pending.reduce((sum,row)=>sum+row.seconds*1000,0));frames.push({at,x:point.x,y:point.y});ctx.fillStyle='#102219';ctx.fillRect(0,0,340,240);ctx.fillStyle='#bbf279';ctx.beginPath();ctx.arc(30+(point.x%280),120,9,0,Math.PI*2);ctx.fill();document.querySelector('#status').textContent='native channel '+core.world?.channel+'\\nframes '+frames.length+'\\ncommands '+sent.length+'\\nqueue '+core.queue.length;requestAnimationFrame(frame);}requestAnimationFrame(frame);
</script>`;}
