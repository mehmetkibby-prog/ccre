import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {Transform} from 'node:stream';
import {pathToFileURL} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '/workspace/ccre/r60_mount_work/tooling/node_modules/playwright/index.mjs';

const project=path.resolve(import.meta.dirname,'../..'),root=project+'/r109_latency_completion',reviewWorkspace=project+'/',working=process.env.STUTTER_TREE||root+'/working',coreRoot=working+'/core511-source/scripts/core511';
const assetRoot=process.env.AUDIT_ASSETS||project+'/r118_royal_champions/evidence/runtime-assets';
const cache=reviewWorkspace+'r60_mount_work/design-r60/live-assets',out=project+'/r118_royal_champions/evidence/'+(process.env.ADMIN_ONLY==='1'?'runtime-admin-preview-':'runtime-browser-')+(process.env.CORE101_REALM_ID||'r1')+'-'+(process.env.MODE||'desktop');
fs.mkdirSync(out,{recursive:true});for(const file of fs.readdirSync(out))if(file.endsWith('.jsonl'))fs.unlinkSync(out+'/'+file);
const proof=JSON.parse(fs.readFileSync(coreRoot+'/generated/native-client-proof.json'));
const {CLIENT_ASSET_NAMESPACE}=await import(coreRoot+'/client-assets.mjs');
const {AutoIpAuthorityR102,AUTO_IP_PATH_R102}=await import(coreRoot+'/auto-ip-r102.mjs');
const {RealmServiceVerifier}=await import(coreRoot+'/realm-service-auth-r101.mjs');
const ipAuthority=new AutoIpAuthorityR102();ipAuthority.readyAt=0;
const cleanups=[],scope={after:fn=>cleanups.push(fn)},requests=[],commands=[],errors=[],missing=new Set(),bridges=[],checks=[];
const log=(name,value)=>fs.appendFileSync(out+'/'+name+'.jsonl',JSON.stringify({at:Date.now(),phase,...value})+'\n');
const {nativeHttpHost}=await import(coreRoot+'/tests/native-http-host-fixture.mjs');
const {currentRealmFixture:realmStartupConfig}=await import(root+'/tests/current-realm-fixture.mjs');
const {ProcessStream}=await import(coreRoot+'/process-stream.mjs');
const {BASE,temporary}=await import(coreRoot+'/tests/helpers.mjs');
const {attachPanelRuntime}=await import(working+'/core511-source/scripts/delivery511/panel-control.mjs');
let phase='preparation',browser,server,s,linkDelay=0,handoffs=0,started=Date.now(),browserUsersR113=[],independentTowersR113=[];
const lag=()=>new Transform({transform(chunk,enc,callback){const delay=linkDelay;setTimeout(()=>this.push(chunk),delay);callback();}});
const report={scope:'Actual generated game, isolated native HTTP/SQLite/channel processes, cached static assets, no live VDS.',client:proof.name,checks};
report.webSocketTransport=process.env.BROWSER_WS_TRANSPORT==='handoff'?'production-style-socket-handoff':'test-process-bridge';
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
  sql.prepare("UPDATE players SET name='Saltanat Hükümdarı',role='arkanist',specialization='arkanist_burst',area='bazaar',channel=1,x=1740,y=500,hp=20000,max_hp=20000,level=65,rank_tier=18,champion_level_r102=1,champion_entered_r102=1,essence=100000,gems=100000,potions=199,last_seen=?,hp_revision=0,respawn_at_ms=0,stun_until_ms=0,root_until_ms=0,combat_lock_until_ms=0 WHERE id=?").run(Math.floor(Date.now()/1000),seed.id);
  sql.prepare('UPDATE auth_sessions SET expires_at=? WHERE account_id=?').run(Math.floor(Date.now()/1000)+14400,seed.account.id);
  sql.prepare('DELETE FROM game_presence WHERE account_id=?').run(seed.account.id);
  sql.prepare('UPDATE players SET last_seen=1 WHERE id!=?').run(seed.id);
  sql.prepare('INSERT OR REPLACE INTO player_onboarding(player_id,step,potion_hint_seen) VALUES(?,3,1)').run(seed.id);
  sql.exec('DELETE FROM messages');
  const {put}=await import(coreRoot+'/tests/pvp-fixture.mjs');
  sql.prepare('UPDATE player_items SET equipped=0 WHERE player_id=?').run(seed.id);
  for(const [id,kind,rarity,equipped]of [['r118-transform','weapon','emerald',0],['r118-salvage','armor','emerald',0],['r118-equipped-armor','armor','royal',1],['r118-equipped-weapon','weapon','royal',1]])put(sql,'player_items',{id,player_id:seed.id,kind,item_name:rarity==='royal'?(kind==='weapon'?'Kraliyet Saltanat Asası':'Kraliyet Saltanat Zırhı'):(kind==='weapon'?'Kadim Zümrüt Asa':'Kadim Zümrüt Zırh'),rarity,power:350,role:'arkanist',enchantments:'[]',equipped,created_at:1});
  for(const [kind,amount]of [['emerald_dust',40],['royal_crown',5]])sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=excluded.amount').run(seed.id,kind,amount);

 }});
 await s.host.database.atomic(()=>{globalThis.__colLaunch.grant(s.f.account.id,true);for(const user of browserUsersR113){globalThis.__colLaunch.grant(user.account.id,true);s.f.bot.deadline(user.account.id);}});
 const panel=attachPanelRuntime({host:s.host,core:s.core,world:s.world});await s.world.startJobs();s.core.start();cleanups.push(()=>panel.close());
 // Stage only the HTTP entry and a few server files. Unchanged large dependencies
 // are read-only links. Unlike stageNativeHttp, this requires no missing client tree.
 const temp=temporary(scope),serverDir=path.join(temp,'dist-vds/server');fs.mkdirSync(serverDir,{recursive:true});
 fs.writeFileSync(path.join(temp,'package.json'),'{"type":"module"}');
 for(const name of ['lib','vds-server','node_modules'])fs.symlinkSync(path.join(working,'native510-bb3a6cc689c6',name),path.join(temp,name),'dir');
 fs.cpSync(path.join(BASE,'dist-vds/server'),serverDir,{recursive:true});
 fs.writeFileSync(path.join(serverDir,'__vite_rsc_assets_manifest.js'),'export default {serverResources:{},clientReferenceDeps:{}};\n');
 fs.copyFileSync(working+'/http-runtime/dist-vds/server/index.js',path.join(serverDir,'index.js'));
 const native=await import(pathToFileURL(path.join(serverDir,'index.js')));
 const {adminHandlers}=await import(coreRoot+'/tests/native-admin-fixture.mjs');
 const adminRoutes=adminHandlers({source:fs.readFileSync(working+'/http-runtime/dist-vds/server/index.js','utf8'),database:s.host.database});
 const adminSnapshot=()=>({world:s.f.sql.prepare('SELECT * FROM world_state LIMIT 1').get(),settings:s.f.sql.prepare('SELECT * FROM game_settings LIMIT 1').get(),players:[],presence:[],channels:[1,2,3,4].map(id=>({id,channel:id,online:0})),stats:{onlinePlayers:1,totalPlayers:1,shops:0,items:4},serverTime:Math.floor(Date.now()/1000)});
 const adminStyles=[...fs.readFileSync(assetRoot+'/index.html','utf8').matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(m=>m[0]).join('');
 const adminHtml='<!doctype html><html lang="tr" style="background:#050907;color-scheme:dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+adminStyles+'<link rel="stylesheet" href="/assets/'+CLIENT_ASSET_NAMESPACE+'/admin-client-Ddjb5wZy-71d7507dc759-entry453-757f73732393.css"></head><body><div id="admin"></div><script>const f=window.fetch;window.fetch=(u,o)=>String(u).includes("_rsc")?new Promise(()=>{}):f(u,o);</script><script type="module">import {i,t} from "/assets/'+CLIENT_ASSET_NAMESPACE+'/framework-CXnKph_e-ga4172.js";import Admin from "/assets/'+CLIENT_ASSET_NAMESPACE+'/'+proof.admin.name+'";const R=i();t().hydrateRoot(document.getElementById("admin"),R.createElement(Admin,{email:"admin@fixture.invalid",signOutPath:"/"}),{onRecoverableError:()=>{}});</script></body></html>';
 const aliases=JSON.parse(fs.readFileSync((reviewWorkspace+'qa40_player_work/asset-aliases.json')));
 for(const row of Object.values(aliases))assert.equal(createHash('sha256').update(fs.readFileSync(row.file)).digest('hex'),row.sha256,'exact cached media alias');
 const asset=p=>[project+'/r118_royal_champions/evidence/public-media'+p,project+'/r118_royal_champions/evidence/public-media'+p.replace('/assets/'+CLIENT_ASSET_NAMESPACE+'/','/assets/'),(reviewWorkspace+'r105_performance_review/evidence/public-media')+p,(reviewWorkspace+'r105_performance_review/evidence/public-media')+p.replace('/assets/'+CLIENT_ASSET_NAMESPACE+'/','/assets/'),(reviewWorkspace+'r105_tower_recovery/evidence/public-media')+p.replace('/assets/'+CLIENT_ASSET_NAMESPACE+'/','/assets/'),root+'/evidence/public-media'+p,root+'/evidence/public-media'+p.replace('/assets/'+CLIENT_ASSET_NAMESPACE+'/','/assets/'),(reviewWorkspace+'r102_content/evidence/public-media')+p,(reviewWorkspace+'r100_hud_refresh/evidence/hud-media')+p,(reviewWorkspace+'r100_hud_refresh/evidence/public-media')+p,(reviewWorkspace+'r100_attack_fix/evidence/public-media')+p,cache+p,(reviewWorkspace+'general_promo_video/assets')+p,...(aliases[p]?[aliases[p].file]:[]),...(p==='/favicon.svg'?[(reviewWorkspace+'site_launch_v2/public/favicon.svg')]:[])].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile())??null;
 const nativeRequest=(url,method,body,instance,user=s.f)=>new Request(s.f.origin+url,{method,headers:{Origin:s.f.origin,Cookie:'__Host-yasam-session='+user.token+'; __Host-yasam-csrf='+user.csrf,'X-CSRF-Token':user.csrf,'X-Game-Instance':instance,'Content-Type':'application/json','X-Real-IP':'198.51.100.93'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://fixture');
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/afk/')){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks).toString(),body=raw?JSON.parse(raw):undefined;
   const user=browserUsersR113.find(u=>String(u.index)===req.headers['x-qa-player'])??s.f;
   const request=nativeRequest(url.pathname+url.search,req.method,body,req.headers['x-game-instance']||user.instance,user),at=Date.now();
   // The unchanged launch card belongs to the central accounts admin identity.
   // This isolated game shell projects its real local fixture read state only;
   // it never fakes writes or routes any new R118 authorization around the server.
   const legacyLaunch=url.pathname==='/api/admin/launch'&&req.method==='GET';
   const response=legacyLaunch?Response.json({settings:globalThis.__colLaunch.settings(),status:globalThis.__colLaunch.status(),accounts:[],testAccessR101:{testOnly:false,revision:0}}):url.pathname==='/api/admin'?(req.method==='POST'?await adminRoutes.post(request):Response.json(adminSnapshot())):await s.bindings.route(request,()=>native.default(request));
   const failure=response.status>=400?await response.clone().json().catch(()=>null):null;
   const idle=url.pathname==='/api/game-presence'&&response.ok?(await response.clone().json()).idleExempt:undefined;
   const record={at,phase,player:user.index??0,method:req.method,path:url.pathname,status:response.status,ms:Date.now()-at,action:body?.action,idleExempt:idle,instance:req.headers['x-game-instance'],...(failure?{code:failure.code,error:failure.error,message:failure.message}:{})};requests.push(record);log('http',record);
   res.statusCode=response.status;for(const[k,v]of response.headers)if(!['content-encoding','content-length','set-cookie'].includes(k))res.setHeader(k,v);res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(url.pathname==='/admin-fixture'){res.setHeader('Content-Type','text/html');res.end(adminHtml);return;}
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
  // R110: BROWSER_WS_TRANSPORT=handoff gives the browser socket to the channel
  // process exactly like the production ingress (no test bridge, no lag hop).
  if(process.env.BROWSER_WS_TRANSPORT==='handoff'){
   const channel=Number(req.url.match(/channel\/(\d+)/)?.[1]),headers={...req.headers,origin:s.f.origin,'x-real-ip':'198.51.100.93',connection:'Upgrade',upgrade:'websocket'};
   assert(s.supervisor.handoffWebSocket?.(channel,socket,{url:req.url,headers,head}),'browser WebSocket handoff');handoffs++;return;
  }
  const row=s.supervisor.rows.get(Number(req.url.match(/channel\/(\d+)/)?.[1]));assert(row);const stream='test-browser:'+randomUUID(),bridge=new ProcessStream(row.child,{stream});bridges.push(bridge);
  await new Promise((resolve,reject)=>row.child.send({type:'test-browser-connection',stream},e=>e?reject(e):resolve()));
  const headers={...req.headers,origin:s.f.origin,'x-real-ip':'198.51.100.93'};bridge.write('GET '+req.url+' HTTP/1.1\r\n'+Object.entries(headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');if(head.length)bridge.write(head);socket.pipe(lag()).pipe(bridge).pipe(lag()).pipe(socket);socket.on('error',()=>bridge.destroy());bridge.on('error',()=>socket.destroy());
 }catch(error){errors.push({kind:'websocket',message:error.message});socket.destroy();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROMIUM||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const mobile=process.env.MODE==='mobile',compact=mobile; const context=await browser.newContext({viewport:compact?{width:844,height:390}:{width:1280,height:800},deviceScaleFactor:2,isMobile:compact,hasTouch:compact,serviceWorkers:'block',...(process.env.IPHONE==='1'?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'}:{})}),page=await context.newPage(),touch=await context.newCDPSession(page);page.setDefaultTimeout(10000);
 const captureResponsive=async(name,width=390,height=844)=>{await page.setViewportSize({width,height});await pause(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' horizontal overflow');await page.screenshot({path:out+'/'+name+'.png'});};
 const tap=async locator=>{await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox();assert(b,'touch target missing');await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 page.on('pageerror',error=>{errors.push({kind:'browser',message:error.message,stack:error.stack});log('faults',errors.at(-1));});
 page.on('console',m=>{if(['error','warning'].includes(m.type()))log('console',{kind:m.type(),message:m.text().slice(0,1200)});if(m.type()==='error')errors.push({kind:'console',message:m.text().slice(0,1200)});});
 page.on('websocket',socket=>{socket.on('framesent',event=>{try{const value=JSON.parse(String(event.payload));if(value.type==='input'){const row={at:Date.now(),phase,type:value.type,sequence:value.sequence,action:value.payload?.action??value.action};commands.push(row);log('inputs',row);}}catch{}});socket.on('framereceived',event=>{try{const value=JSON.parse(String(event.payload));if(['error','rejected','not_queued','retry'].includes(value.type))log('responses',value);if(value.type==='frame'&&value.results?.length)log('results',{results:value.results});}catch{}});});
 await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.addInitScript(()=>{Object.defineProperty(AbortSignal,'any',{value:undefined,configurable:true});Object.defineProperty(AbortSignal,'timeout',{value:undefined,configurable:true});});
 await page.addInitScript(account=>{sessionStorage.setItem('coreoflife-chrome-warning:'+account,'accepted');},s.f.account.id);
 await page.addInitScript(()=>{
  const prototype=CanvasRenderingContext2D.prototype,draw=prototype.fillText,drawImage=prototype.drawImage,labels=new WeakMap();window.__npcR118={};
  const record=(ctx,text,x,y)=>{const box=ctx.canvas.getBoundingClientRect();if(!(box.width>0&&box.height>0))return;const m=ctx.getTransform(),dpr=ctx.canvas.width/box.width;window.__npcR118[text]={x:(m.a*x+m.c*y+m.e)/dpr+box.left,y:(m.b*x+m.d*y+m.f)/dpr+box.top,at:Date.now()};};
  prototype.fillText=function(text,x,y,...rest){if(/Kraliyet Ustası|Demirci Haso/.test(String(text))){labels.set(this.canvas,String(text));record(this,String(text),x,y);}return draw.call(this,text,x,y,...rest);};
  // Mobile caches labels in detached canvases. Follow the cached text image
  // into the real visible canvas instead of treating cache pixels as CSS pixels.
  prototype.drawImage=function(source,...args){const label=labels.get(source);if(label){let x,y,w,h;if(args.length===2){[x,y]=args;w=source.width;h=source.height;}else if(args.length===4){[x,y,w,h]=args;}else{[x,y,w,h]=args.slice(4);}record(this,label,x+w/2,y+h/2);}return drawImage.call(this,source,...args);};

 });
 if(process.env.ADMIN_ONLY!=='1'){
 phase='native-entry';await page.goto(origin);await page.getByRole('button',{name:'Maceraya katıl'}).click({timeout:30000});
 await page.getByRole('button',{name:/Kanal 1.*Katıl/s}).click({timeout:30000});
 await wait(()=>requests.some(r=>r.path==='/api/realtime/core511-character'&&r.status===200),'native character admission missing');
 const instance=requests.findLast(r=>r.path==='/api/realtime/core511-character'&&r.status===200)?.instance;assert(instance);
 await page.evaluate(async({bridge,instance,namespace})=>{const url='/assets/'+namespace+'/'+bridge;window.__qaReadCore=(await import(url)).browserCore(instance);},{bridge:proof.bridge,instance,namespace:CLIENT_ASSET_NAMESPACE});
 await page.waitForFunction(()=>window.__qaReadCore?.ready&&window.__qaReadCore.world?.players?.length);
 const own=()=>page.evaluate(id=>{const c=window.__qaReadCore,p=c?.world?.players?.find(p=>p.id===id);return p?{id:p.id,x:p.x,y:p.y,hp:p.hp,area:c.world.area,channel:c.world.channel,tool:p.equippedToolR93??c.world.zumrutR93?.equippedTool??'',rod:p.rod_equipped}:null;},s.f.id);
 let tutorialSeen=false;const dismissTutorial=async(waitForPopup=false)=>{const b=page.getByRole('button',{name:'Daha sonra',exact:true});if(waitForPopup&&!tutorialSeen)await b.waitFor({state:'visible',timeout:5000}).catch(()=>{});if(await b.isVisible()){await b.click();await b.waitFor({state:'hidden'});tutorialSeen=true;}for(let i=0;i<8;i++){const hint=page.locator('.quests438-dismiss:visible').first();if(!await hint.isVisible())break;await hint.click();await pause(80);}};await dismissTutorial(true);
 assert.equal((await own()).area,'bazaar');checks.push({name:'native champion entry',area:'bazaar',channels:s.supervisor.rows.size});
 await page.locator('canvas:visible').first().waitFor({state:'visible'});await pause(500);
 const capture=async name=>{assert(!/\b(?:weapon|armor|helmet|necklace|shoes|emerald_dust|royal_crown)\b/i.test(await page.locator('body').innerText()),'raw item identifiers exposed in UI');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');await page.screenshot({path:out+'/'+name+'.png'});};
 const npc=async name=>{
  // Radix retains its closing portal for an exit animation. A real canvas click
  // must wait until that portal releases pointer input; do not click through it.
  await page.waitForFunction(()=>!document.querySelector('[role=dialog]')&&getComputedStyle(document.body).pointerEvents!=='none');
  await page.waitForFunction(name=>Object.entries(window.__npcR118??{}).some(([k,v])=>k.includes(name)&&Date.now()-v.at<500),name);
  const pos=await page.evaluate(name=>Object.entries(window.__npcR118).find(([k])=>k.includes(name))[1],name);
  const target=await page.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y+40);return{tag:e?.tagName,cls:e?.className,pointerEvents:getComputedStyle(document.body).pointerEvents};},pos);
  log('npc-click',{name,pos,target});assert.equal(target.tag,'CANVAS','NPC body is unobstructed by a closing modal or HUD');
  if(mobile)await page.touchscreen.tap(pos.x,pos.y+40);else await page.mouse.click(pos.x,pos.y+40);
 };
 const material=kind=>s.f.sql.prepare('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(s.f.id,kind)?.amount??0;
 phase='royal-npc';await npc('Kraliyet Ustası');
 await page.getByRole('heading',{name:'Hükümdar Kraliyet Seti',exact:true}).waitFor();
 await page.getByLabel('Kadim Zümrüt eşya seç').selectOption('r118-transform');
 await capture('royal-transform-before');await page.getByRole('button',{name:'Dönüşümü incele',exact:true}).click();
 await page.getByRole('button',{name:'Malzemeleri harca ve dönüştür',exact:true}).click();
 await wait(()=>s.f.sql.prepare('SELECT rarity FROM player_items WHERE id=?').get('r118-transform')?.rarity==='royal','royal transformation durable result');
 assert.equal(material('emerald_dust'),32);assert.equal(material('royal_crown'),4);checks.push({name:'actual NPC, royal UI, durable transform and costs'});await capture('royal-transform-after');
 await page.keyboard.press('Escape');
 phase='royal-town-menu';await page.getByRole('button',{name:'Işınlanma',exact:true}).click();await page.getByRole('button',{name:'Kasaba & Sosyal',exact:true}).click();await page.locator('[data-royal-entry="transform"]').click();await page.getByRole('heading',{name:'Hükümdar Kraliyet Seti',exact:true}).waitFor();assert.equal(await page.getByRole('dialog').count(),1,'town menu closes before royal panel opens');await page.keyboard.press('Escape');checks.push({name:'actual town menu royal entry opens one clean modal'});
 phase='haso';await s.core.permanentPlayers([s.f.id],()=>s.f.sql.prepare("UPDATE players SET x=1200,y=500,combat_lock_until_ms=0 WHERE id=?").run(s.f.id));await wait(async()=>Math.abs((await own()).x-1200)<5,'Haso fixture movement');await npc('Demirci Haso');
 await page.locator('[data-royal-entry="salvage"]').click();
 await page.getByRole('heading',{name:'Zümrüt Tozu · Demirci Haso',exact:true}).waitFor();await page.getByLabel('Kadim Zümrüt eşya seç').selectOption('r118-salvage');await capture('haso-salvage-before');await page.getByRole('button',{name:'Eritmeyi incele',exact:true}).click();await page.getByRole('button',{name:'Eşyayı erit · 1 Toz al',exact:true}).click();
 await wait(()=>!s.f.sql.prepare('SELECT 1 FROM player_items WHERE id=?').get('r118-salvage'),'salvage durable result');assert.equal(material('emerald_dust'),33);checks.push({name:'actual Haso dialog closes, salvage confirms one selected item'});await capture('haso-salvage-after');await page.keyboard.press('Escape');
 phase='champions-travel';page.on('dialog',d=>d.accept());
 await page.getByRole('button',{name:'Işınlanma',exact:true}).click();await page.getByRole('button',{name:'Av Bölgeleri',exact:true}).click();await page.locator('.champions118-destination').click();await page.waitForFunction(()=>window.__qaReadCore.world?.area==='champions');await pause(700);await capture('champions-map');
 const enemy=await page.evaluate(()=>window.__qaReadCore.world.monsters?.find(m=>m.hp>0));assert(enemy,'champion monster visible');
 await s.core.permanentPlayers([s.f.id],()=>s.f.sql.prepare('UPDATE players SET x=?,y=?,combat_lock_until_ms=0 WHERE id=?').run(enemy.x,enemy.y+40,s.f.id));await pause(350);
 const attack=await page.evaluate(enemy=>window.__qaReadCore.command({action:'attack',targetId:enemy.id,spawnRound:enemy.spawn_round,ability:0,intentId:crypto.randomUUID(),requestId:crypto.randomUUID()}),enemy);assert.equal(attack.status,200,JSON.stringify(attack));await wait(()=>s.f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(enemy.id)?.hp<enemy.hp,'actual monster damage');await capture('champions-combat');checks.push({name:'real transport champion travel and combat, compiled map renderer'});
 await s.core.permanentPlayers([s.f.id],()=>s.f.sql.prepare('UPDATE players SET x=1800,y=1950,combat_lock_until_ms=0 WHERE id=?').run(s.f.id));await wait(async()=>Math.abs((await own()).x-1800)<5&&Math.abs((await own()).y-1950)<5,'disengage in clear entry area');await pause(1500);
 const back=await page.evaluate(()=>window.__qaReadCore.command({action:'travel_forest',requestId:crypto.randomUUID()}));assert.equal(back.status,200,JSON.stringify(back));await page.waitForFunction(()=>window.__qaReadCore.world?.area==='forest');await capture('forest-return');checks.push({name:'return to normal forest renders normally'});
 }
 phase='admin-navigation';if(mobile)await page.setViewportSize({width:390,height:844});await page.goto(origin+'/admin-fixture');await page.getByRole('heading',{name:'Oyun Yönetimi',exact:true}).waitFor();
 await page.getByRole('button',{name:'Eşya ve gelişim',exact:true}).click();await page.getByRole('button',{name:/Kraliyet Eşyaları/}).click();await page.getByRole('heading',{name:'Kraliyet Eşyaları',exact:true}).waitFor();
 await page.getByRole('button',{name:'Kraliyet tariflerini kaydet',exact:true}).waitFor();await page.locator('[data-royal-admin]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/admin-royal.png',fullPage:true});await page.getByRole('button',{name:'Kraliyet tariflerini kaydet',exact:true}).click();await wait(()=>requests.some(r=>r.action==='royal_admin_save_r118'&&r.status===200),'admin real royal save');
 await page.getByRole('button',{name:'Haritalar ve savaş',exact:true}).click();await page.getByRole('button',{name:/Şampiyonlar Diyarı/}).click();await page.getByRole('heading',{name:'Şampiyonlar Diyarı',exact:true}).waitFor();await page.locator('[data-champions-admin]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/admin-champions.png',fullPage:true});await page.getByRole('button',{name:'Harita ayarlarını kaydet',exact:true}).click();await wait(()=>requests.some(r=>r.action==='champions_admin_save_r118'&&r.status===200),'admin real champions save');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'compiled admin horizontal overflow');checks.push({name:'actual compiled admin navigation and authenticated native config handlers',overview:'isolated SQL projection plus unchanged launch-read projection; external admin identity controlled fixture'});
 assert.equal(requests.filter(r=>r.status>=400).length,0,JSON.stringify(requests.filter(r=>r.status>=400)));assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(missing.size,0,JSON.stringify([...missing]));assert.equal(s.faults.length,0,JSON.stringify(s.faults.map(f=>f.error?.stack)));report.passed=true;
}catch(error){report.failure={phase,message:error.message,stack:error.stack};if(browser){const page=browser.contexts()[0]?.pages()[0];if(page){report.failure.dom=await page.locator('body').innerText().catch(()=>null);report.failure.npc=await page.evaluate(()=>window.__npcR118??null).catch(()=>null);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}}console.error(error);process.exitCode=1;
}finally{
 report.durationMs=Date.now()-started;report.webSocketHandoffs=handoffs;report.handoffStats=s?.supervisor?.handoffStatsR110??null;report.requests=requests;report.errors=errors;report.nativeFaults=s?.faults?.map(x=>x.error?.message)||[];report.missingAssets=[...missing];fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 await browser?.close();for(const b of bridges)b.destroy();if(server)await new Promise(r=>server.close(r));for(const fn of cleanups.reverse())try{await fn();}catch(error){console.error('cleanup',error.message);}console.log(JSON.stringify({passed:report.passed??false,phase,checks:checks.length,failure:report.failure?.message,report:out+'/report.json'}));
}
