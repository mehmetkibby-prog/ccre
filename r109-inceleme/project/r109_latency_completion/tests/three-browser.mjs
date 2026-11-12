import {fileURLToPath as reviewFilePath} from 'node:url';
const reviewWorkspace=reviewFilePath(new URL('../../',import.meta.url));
// R93 full generated game app, genuine local native HTTP / SQLite / channel
// processes. Only accounts boundary and cached public static assets are fixtures.
// Run only after parent finishes generated R93 client/HTTP proofs:
// R85_RUNTIME_TREE=<root>/working python3 ../r92_mobile_xp/tests/run.py <this-file>
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {Transform} from 'node:stream';
import {pathToFileURL} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '/workspace/ccre/r60_mount_work/tooling/node_modules/playwright/index.mjs';

const root=path.resolve(import.meta.dirname,'..'),working=process.env.STUTTER_TREE||(reviewWorkspace+'r104_boot_repair/working'),coreRoot=working+'/core511-source/scripts/core511';
const assetRoot=process.env.AUDIT_ASSETS||(reviewWorkspace+'r104_boot_repair/evidence/chat-browser-assets');
const cache=(reviewWorkspace+'r60_mount_work/design-r60/live-assets'),out=root+'/evidence/three-browser-'+(process.env.AUDIT_NAME||'baseline');
const actors=[],browsers=[];const hash=x=>createHash('sha256').update(x).digest('base64url');
fs.mkdirSync(out,{recursive:true});for(const file of fs.readdirSync(out))if(file.endsWith('.jsonl'))fs.unlinkSync(out+'/'+file);
const proof=JSON.parse(fs.readFileSync(coreRoot+'/generated/native-client-proof.json'));
const {CLIENT_ASSET_NAMESPACE}=await import(coreRoot+'/client-assets.mjs');
const {AutoIpAuthorityR102,AUTO_IP_PATH_R102}=await import(coreRoot+'/auto-ip-r102.mjs');
const {RealmServiceVerifier}=await import(coreRoot+'/realm-service-auth-r101.mjs');
const ipAuthority=new AutoIpAuthorityR102();ipAuthority.readyAt=0;
const cleanups=[],scope={after:fn=>cleanups.push(fn)},requests=[],commands=[],errors=[],missing=new Set(),bridges=[],checks=[];
const log=(name,value)=>fs.appendFileSync(out+'/'+name+'.jsonl',JSON.stringify({at:Date.now(),phase,...value})+'\n');
const {nativeHttpHost}=await import(coreRoot+'/tests/native-http-host-fixture.mjs');
const {currentRealmFixture:realmStartupConfig}=await import('./current-realm-fixture.mjs');
const {ProcessStream}=await import(coreRoot+'/process-stream.mjs');
const {BASE,temporary}=await import(coreRoot+'/tests/helpers.mjs');
const {attachPanelRuntime}=await import(working+'/core511-source/scripts/delivery511/panel-control.mjs');
let phase='preparation',browser,server,s,linkDelay=0,started=Date.now();
const lag=()=>new Transform({transform(chunk,enc,callback){const delay=linkDelay;setTimeout(()=>this.push(chunk),delay);callback();}});
const report={scope:'Actual generated game, isolated native HTTP/SQLite/channel processes, cached static assets, no live VDS.',client:proof.name,checks};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(predicate,message,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){if(await predicate())return;await pause(70);}throw Error(message);}
try{
 s=await nativeHttpHost(scope,{realmId:process.env.CORE101_REALM_ID||'r1',realmSetup:async(host,seed)=>{
  const realmFixture=realmStartupConfig(scope,host);await realmFixture.prepare();
  const ipVerifier=new RealmServiceVerifier(new Map([[host.expected.realmId,Buffer.from(fs.readFileSync(realmFixture.config.realm.keyFile,'utf8').trim(),'hex')]]));
  const signed=globalThis.fetch;globalThis.fetch=(url,options)=>{
   if(options?.headers?.['x-col-service-path']===AUTO_IP_PATH_R102){
    const verified=ipVerifier.verify({method:'POST',pathname:AUTO_IP_PATH_R102,headers:options.headers,body:options.body});assert(verified);return Promise.resolve(Response.json(ipAuthority.handle(verified.realmId,JSON.parse(options.body))));
   }
   return options?.headers?.['x-col-service-path']==='/internal/launch/status'?Promise.resolve(Response.json({phase:'normal',showLanding:false,canPlay:true,registrationOpen:true,serverTime:Date.now()})):signed(url,options);
  };
  const sql=host.database.sqlite;
  {const {createTowerSchema,TOWER_DEFAULTS}=await import(coreRoot+'/tower-config.mjs');createTowerSchema(sql);const cfg=structuredClone(TOWER_DEFAULTS);cfg.minLevel=1;for(const f of cfg.floors)for(const enemy of f.spawns){enemy.hp=process.env.AUDIT_COMBAT==='1'?85:1;enemy.damage=process.env.AUDIT_COMBAT==='1'?9:0;if(process.env.AUDIT_COMBAT!=='1'){enemy.xp=0;enemy.drops=[];}}sql.prepare('UPDATE kadim_tower_settings SET value=?').run(JSON.stringify(cfg));}
  sql.prepare("UPDATE players SET name='Kule0',role='arkanist',specialization='arkanist_burst',area='bazaar',channel=1,x=2070,y=430,hp=12000,max_hp=12000,stat_hp=10000,level=65,potions=199,essence=100000,gems=10000,last_seen=?,hp_revision=0,respawn_at_ms=0,stun_until_ms=0,root_until_ms=0,combat_lock_until_ms=0 WHERE id=?").run(Math.floor(Date.now()/1000),seed.id);
  sql.prepare('UPDATE auth_sessions SET expires_at=? WHERE account_id=?').run(Math.floor(Date.now()/1000)+14400,seed.account.id);
  sql.prepare('DELETE FROM game_presence WHERE account_id=?').run(seed.account.id);
  sql.exec('DELETE FROM monsters');
  const {put}=await import(coreRoot+'/tests/pvp-fixture.mjs');
  if(process.env.AUDIT_COMBAT==='1')sql.prepare('UPDATE players SET champion_level_r102=1,champion_xp_r102=0,rank_tier=18,champion_entered_r102=1,skill_one=5,skill_two=5,skill_three=5,skill_four=1 WHERE id=?').run(seed.id);
  const player=sql.prepare('SELECT * FROM players WHERE id=?').get(seed.id),session=sql.prepare('SELECT * FROM auth_sessions WHERE account_id=?').get(seed.account.id);
  for(let i=0;i<3;i++){
   const actor={n:i,id:i?randomUUID():seed.id,account:i?{...seed.account,id:randomUUID(),username:'Kule'+i,username_normalized:'kule'+i,email:'kule'+i+'@fixture.invalid',email_normalized:'kule'+i+'@fixture.invalid'}:seed.account,token:i?'tower_session_'+randomUUID():seed.token,csrf:seed.csrf,instance:i?randomUUID():seed.instance};actors.push(actor);
   if(i){put(sql,'accounts',actor.account);put(sql,'players',{...player,id:actor.id,name:'Kule'+i,account_id:actor.account.id});put(sql,'auth_sessions',{...session,token_hash:hash(actor.token),account_id:actor.account.id});}
   sql.prepare('INSERT OR REPLACE INTO player_onboarding(player_id,step,potion_hint_seen) VALUES(?,3,1)').run(actor.id);
  }
  put(sql,'parties',{id:'tower-group',leader_id:actors[0].id,created_at:Math.floor(Date.now()/1000)});
  for(const a of actors)put(sql,'party_members',{party_id:'tower-group',player_id:a.id,joined_at:Math.floor(Date.now()/1000)});

 }});
 for(const a of actors)await s.host.database.atomic(()=>globalThis.__colLaunch.grant(a.account.id,true));

 const panel=attachPanelRuntime({host:s.host,core:s.core,world:s.world});await s.world.startJobs();s.core.start();cleanups.push(()=>panel.close());
 // Stage only the HTTP entry and a few server files. Unchanged large dependencies
 // are read-only links. Unlike stageNativeHttp, this requires no missing client tree.
 const temp=temporary(scope),serverDir=path.join(temp,'dist-vds/server');fs.mkdirSync(serverDir,{recursive:true});
 fs.writeFileSync(path.join(temp,'package.json'),'{"type":"module"}');
 for(const name of ['lib','vds-server','node_modules'])fs.symlinkSync(path.join(BASE,name),path.join(temp,name),'dir');
 fs.cpSync(path.join(BASE,'dist-vds/server'),serverDir,{recursive:true});
 fs.writeFileSync(path.join(serverDir,'__vite_rsc_assets_manifest.js'),'export default {serverResources:{},clientReferenceDeps:{}};\n');
 fs.copyFileSync(working+'/http-runtime/dist-vds/server/index.js',path.join(serverDir,'index.js'));
 const native=await import(pathToFileURL(path.join(serverDir,'index.js')));
 const aliases=JSON.parse(fs.readFileSync((reviewWorkspace+'qa40_player_work/asset-aliases.json')));
 for(const row of Object.values(aliases))assert.equal(createHash('sha256').update(fs.readFileSync(row.file)).digest('hex'),row.sha256,'exact cached media alias');
 const asset=p=>[(reviewWorkspace+'r105_performance_review/evidence/public-media')+p,(reviewWorkspace+'r105_performance_review/evidence/public-media')+p.replace('/assets/'+CLIENT_ASSET_NAMESPACE+'/','/assets/'),(reviewWorkspace+'r105_tower_recovery/evidence/public-media')+p.replace('/assets/'+CLIENT_ASSET_NAMESPACE+'/','/assets/'),root+'/evidence/public-media'+p,root+'/evidence/public-media'+p.replace('/assets/'+CLIENT_ASSET_NAMESPACE+'/','/assets/'),(reviewWorkspace+'r102_content/evidence/public-media')+p,(reviewWorkspace+'r100_hud_refresh/evidence/hud-media')+p,(reviewWorkspace+'r100_hud_refresh/evidence/public-media')+p,(reviewWorkspace+'r100_attack_fix/evidence/public-media')+p,cache+p,(reviewWorkspace+'general_promo_video/assets')+p,...(aliases[p]?[aliases[p].file]:[]),...(p==='/favicon.svg'?[(reviewWorkspace+'site_launch_v2/public/favicon.svg')]:[])].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile())??null;
 const nativeRequest=(actor,url,method,body,instance)=>new Request(s.f.origin+url,{method,headers:{Origin:s.f.origin,Cookie:'__Host-yasam-session='+actor.token+'; __Host-yasam-csrf='+actor.csrf,'X-CSRF-Token':actor.csrf,'X-Game-Instance':instance,'Content-Type':'application/json','X-Real-IP':'198.51.100.93'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://fixture'),actor=actors[Number(req.headers.cookie?.match(/qa_actor=(\d)/)?.[1]??0)];
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/afk/')){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks).toString(),body=raw?JSON.parse(raw):undefined;
   const request=nativeRequest(actor,url.pathname+url.search,req.method,body,req.headers['x-game-instance']||actor.instance),at=Date.now();
   const response=await s.bindings.route(request,()=>native.default(request));
   const failure=response.status>=400?await response.clone().json().catch(()=>null):null;
   const idle=url.pathname==='/api/game-presence'&&response.ok?(await response.clone().json()).idleExempt:undefined;
   const record={actor:actor.n,at,phase,method:req.method,path:url.pathname,status:response.status,ms:Date.now()-at,action:body?.action,idleExempt:idle,instance:req.headers['x-game-instance'],...(failure?{code:failure.code,error:failure.error,message:failure.message}:{})};requests.push(record);log('http',record);
   res.statusCode=response.status;for(const[k,v]of response.headers)if(!['content-encoding','content-length','set-cookie'].includes(k))res.setHeader(k,v);res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  let f;
  if(url.pathname==='/')f=assetRoot+'/'+(process.env.BEFORE==='1'?'before.html':'index.html');
  else if(url.pathname.startsWith('/assets/')){
   f=assetRoot+url.pathname;
   // JS/CSS is served exactly as the installer materialized it. No old-name
   // aliases, regex rewrites, generated-tree or historical-module fallback.
   if(!fs.existsSync(f)&&!url.pathname.endsWith('.js')&&!url.pathname.endsWith('.css'))f=asset(url.pathname)||asset('/assets/'+path.basename(url.pathname))||coreRoot+'/generated/client/'+path.basename(url.pathname);
  }else f=asset(url.pathname);
  if(!f||!fs.existsSync(f)){missing.add(url.pathname);res.writeHead(404).end();return;}
  const ext=path.extname(f);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp3':'audio/mpeg'})[ext]??'application/octet-stream');res.end(fs.readFileSync(f));
 }catch(error){errors.push({kind:'http',message:error.message,stack:error.stack});log('faults',errors.at(-1));if(!res.headersSent)res.writeHead(500);res.end('fixture request failed');}});
 server.on('upgrade',async(req,socket,head)=>{try{
  const row=s.supervisor.rows.get(Number(req.url.match(/channel\/(\d+)/)?.[1]));assert(row);const stream='test-browser:'+randomUUID(),bridge=new ProcessStream(row.child,{stream});bridges.push(bridge);
  await new Promise((resolve,reject)=>row.child.send({type:'test-browser-connection',stream},e=>e?reject(e):resolve()));
  const headers={...req.headers,origin:s.f.origin,'x-real-ip':'198.51.100.93'};bridge.write('GET '+req.url+' HTTP/1.1\r\n'+Object.entries(headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');if(head.length)bridge.write(head);socket.pipe(bridge).pipe(socket);socket.on('error',()=>bridge.destroy());bridge.on('error',()=>socket.destroy());
 }catch(error){errors.push({kind:'websocket',message:error.message});socket.destroy();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;

 for(const actor of actors){
  const browser=await chromium.launch({executablePath:process.env.REVIEW_CHROMIUM||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});browsers.push(browser);
  const context=await browser.newContext({viewport:{width:1100,height:700},serviceWorkers:'block'});await context.addCookies([{name:'qa_actor',value:String(actor.n),url:origin}]);
  const page=await context.newPage();actor.page=page;page.setDefaultTimeout(15000);
  page.on('pageerror',e=>{const row={actor:actor.n,kind:'browser',message:e.message,stack:e.stack};errors.push(row);log('faults',row);});
  page.on('console',m=>{if(['error','warning'].includes(m.type()))log('console',{actor:actor.n,kind:m.type(),message:m.text().slice(0,1000)});});
  page.on('websocket',socket=>{log('socket',{actor:actor.n,event:'open'});socket.on('close',()=>log('socket',{actor:actor.n,event:'close'}));socket.on('socketerror',e=>log('socket',{actor:actor.n,event:'error',error:e}));socket.on('framesent',event=>{try{const v=JSON.parse(String(event.payload));if(v.type==='input')log('inputs',{actor:actor.n,sequence:v.sequence,action:v.payload?.action});}catch{}});socket.on('framereceived',event=>{try{const v=JSON.parse(String(event.payload));if(['error','rejected','not_queued','retry','revoked','world_reset'].includes(v.type))log('responses',{actor:actor.n,...v});if(v.type==='frame'&&v.results?.length)log('results',{actor:actor.n,results:v.results});}catch{}});});
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  // Observability only: do not drop, delay, reorder or replace any frame.
  await page.addInitScript(()=>{const Native=window.WebSocket;window.__socketEvents=[];window.WebSocket=class extends Native{constructor(...args){super(...args);this.addEventListener('close',e=>window.__socketEvents.push({at:Date.now(),kind:'close',code:e.code,reason:e.reason,clean:e.wasClean}));this.addEventListener('error',()=>window.__socketEvents.push({at:Date.now(),kind:'error'}));}};});
  await page.addInitScript(account=>sessionStorage.setItem('coreoflife-chrome-warning:'+account,'accepted'),actor.account.id);
  phase='entry-'+actor.n;await page.goto(origin);await page.getByRole('button',{name:'Maceraya katıl'}).click({timeout:30000});await page.getByRole('button',{name:/Kanal 1.*Katıl/s}).click({timeout:30000});
  await wait(()=>requests.some(r=>r.actor===actor.n&&r.path==='/api/realtime/core511-character'&&r.status===200),'character admission');
  const instance=requests.findLast(r=>r.actor===actor.n&&r.path==='/api/realtime/core511-character'&&r.status===200).instance;
  await page.evaluate(async({bridge,instance,namespace})=>{window.__qaReadCore=(await import('/assets/'+namespace+'/'+bridge)).browserCore(instance);window.__coreNotes=[];window.__qaReadCore.subscribe((kind,value)=>{if(['error','status'].includes(kind))window.__coreNotes.push({at:Date.now(),kind,value});});},{bridge:proof.bridge,instance,namespace:CLIENT_ASSET_NAMESPACE});
  await page.waitForFunction(()=>window.__qaReadCore?.ready&&window.__qaReadCore.world?.players?.length);
  const later=page.getByRole('button',{name:'Daha sonra',exact:true});if(await later.isVisible())await later.click();
  await page.locator('.primary-skill-bar').waitFor({state:'visible'});
  const discord=await page.locator('a[href*="discord.gg"]').evaluateAll(a=>a.map(x=>x.href));assert(discord.length>0);assert(discord.every(h=>h==='https://discord.gg/pBywtjhTN'));checks.push({name:'In-game Discord URL',actor:actor.n,urls:discord});
  console.log('Browser process ready',actor.n);
 }
 phase='normal-tower';
 for(const a of actors){const r=await a.page.evaluate(()=>window.__qaReadCore.command({action:'adventure_tower_enter',requestId:crypto.randomUUID()}));assert.equal(r.status,200,JSON.stringify(r));}
 await Promise.all(actors.map(a=>a.page.waitForFunction(()=>window.__qaReadCore.world?.adventure511?.run?.floor===1)));
 for(const a of actors){await a.page.evaluate(({id,n})=>{
  window.__bot={stopped:false,busy:false,lastAttack:0,results:[],started:Date.now(),floors:[]};
  const b=window.__bot,c=window.__qaReadCore;
  b.timer=setInterval(async()=>{
   if(b.stopped||b.busy||!c.ready)return;
   const w=c.world,p=w?.players.find(x=>x.id===id),run=w?.adventure511?.run;if(!p||!run)return;
   if(b.floors.at(-1)?.floor!==run.floor)b.floors.push({at:Date.now(),floor:run.floor,area:w.area});
   if(run.floor===10&&run.clear){b.stopped=true;return;}
   const ms=(w.monsters||[]).filter(m=>m.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
   const enemy=ms[0];if(!enemy)return;
   b.busy=true;try{
    const distance=Math.hypot(enemy.x-p.x,enemy.y-p.y);let result;
    if(distance>160){const step=Math.min(30,distance-150);c.move({action:'move',x:p.x+(enemy.x-p.x)/distance*step,y:p.y+(enemy.y-p.y)/distance*step,area:w.area,basePositionRevision:p.position_revision,requestId:crypto.randomUUID()});}
    else if(Date.now()-b.lastAttack>=900){b.lastAttack=Date.now();result=await c.command({action:'attack',ability:0,targetId:enemy.id,spawnRound:enemy.spawn_round,requestId:crypto.randomUUID(),intentId:crypto.randomUUID()});}
    if(result&&result.status!==200)b.results.push({at:Date.now(),status:result.status,body:result.body});
   }catch(e){b.results.push({at:Date.now(),error:e.message,code:e.code});}finally{b.busy=false;}
  },230+n*5);
 },{id:a.id,n:a.n});}
 const deadline=Date.now()+600000;let completed=false,iteration=0;
 while(Date.now()<deadline){
  await pause(3000);const states=await Promise.all(actors.map(a=>a.page.evaluate(()=>{const c=window.__qaReadCore,b=window.__bot,p=c.world?.players.find(p=>p.id===c.playerId);return {ready:c.ready,connection:c.connection,at:Date.now(),area:c.world?.area,floor:c.world?.adventure511?.run?.floor,run:c.world?.adventure511?.run,position:p&&{x:p.x,y:p.y,revision:p.position_revision},monsters:c.world?.monsters?.filter(m=>m.hp>0).length,queue:c.queue.length,active:c.active?.payload,busy:b.busy,errors:b.results.slice(-3),stopped:b.stopped,notes:window.__coreNotes.slice(-3),sockets:window.__socketEvents};})));
  const durable=actors.map(a=>s.f.sql.prepare('SELECT id,area,x,y,hp FROM players WHERE id=?').get(a.id));log('states',{states,durable});if(iteration++%4===0)console.log(JSON.stringify({phase,floors:states.map(x=>x.floor),monsters:states.map(x=>x.monsters),errors:states.map(x=>x.errors),queue:states.map(x=>x.queue)}));
  if(fs.existsSync(out+'/STOP'))throw Error('audit requested stop');
  if(s.faults.length)throw Error(s.faults.map(x=>x.error?.stack).join('\n'));
  if(states.every(x=>x.stopped)){completed=true;break;}
  if(states.some(x=>!x.run))throw Error('test actor left tower before completion');
 }
 assert(completed,'three independent browser processes must finish all 10 tower floors');
 for(const a of actors){await a.page.screenshot({path:out+'/browser-'+a.n+'-complete.png'});const state=await a.page.evaluate(()=>({bot:window.__bot,notes:window.__coreNotes,sockets:window.__socketEvents}));delete state.bot.timer;log('final',{actor:a.n,...state});assert.deepEqual(state.sockets,[],'no spontaneous socket disconnection');assert.deepEqual(state.bot.results,[],'no combat rejection or unhandled command');assert.deepEqual(state.bot.floors.map(x=>x.floor),[1,2,3,4,5,6,7,8,9,10]);}
 assert.deepEqual(errors,[]);assert.deepEqual([...missing],[]);report.passed=true;checks.push({name:'Three independent Chromium processes, same IP, three accounts, one party, all ten tower floors, normal streaming and real movement/attacks'});
}catch(error){report.failure={phase,message:error.message,stack:error.stack};for(const a of actors){if(a.page){await a.page.screenshot({path:out+'/failure-'+a.n+'.png'}).catch(()=>{});}}console.error(error);process.exitCode=1;
}finally{
 report.durationMs=Date.now()-started;report.requests=requests;report.errors=errors;report.nativeFaults=s?.faults?.map(x=>x.error?.message)||[];report.missingAssets=[...missing];fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 for(const b of browsers)await b.close();for(const b of bridges)b.destroy();if(server)await new Promise(r=>server.close(r));for(const fn of cleanups.reverse())try{await fn();}catch(error){console.error('cleanup',error.message);}console.log(JSON.stringify({passed:report.passed??false,phase,checks:checks.length,failure:report.failure?.message,report:out+'/report.json'}));
}
