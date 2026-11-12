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

const root=path.resolve(import.meta.dirname,'..'),baseline=process.env.CHAT_BASELINE==='1',working=process.env.STUTTER_TREE||(baseline?root+'/../r103_release/working':root+'/working'),coreRoot=working+'/core511-source/scripts/core511';
const assetRoot=process.env.AUDIT_ASSETS||(baseline?root+'/../r103_release':root)+'/evidence/chat-browser-assets';
const cache=(reviewWorkspace+'r60_mount_work/design-r60/live-assets'),out=root+'/evidence/browser-'+(process.env.CORE101_REALM_ID||'r1')+'-hud'+(process.env.CHAMPION_DEMO==='1'?'-champion':'')+(process.env.LAYOUT_BEFORE==='1'?'-before':'')+(process.env.MODE==='mobile'?'-mobile':'')+'-'+(process.env.PREVIEW_NAME||'chat-r103');
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
  if(process.env.TOWER==='1'){const {createTowerSchema,TOWER_DEFAULTS}=await import(coreRoot+'/tower-config.mjs');createTowerSchema(sql);const cfg=structuredClone(TOWER_DEFAULTS);cfg.minLevel=1;for(const [index,f] of cfg.floors.entries()){f.waves=1;f.spawns=[{...f.spawns[0],kind:index===9?'azrail':'acolyte',count:1,hp:1,damage:0,xp:0,drops:[]}];}sql.prepare('UPDATE kadim_tower_settings SET value=?').run(JSON.stringify(cfg));}
  sql.prepare("UPDATE players SET name='Core Şövalyesi',role='avci',area='forest',channel=1,x=2700,y=2025,hp=9262,max_hp=12000,level=30,essence=100000,gems=10000,has_rod=1,rod_equipped=0,last_seen=?,hp_revision=0,respawn_at_ms=0,stun_until_ms=0,root_until_ms=0,combat_lock_until_ms=0 WHERE id=?").run(Math.floor(Date.now()/1000),seed.id);
  sql.prepare('UPDATE players SET role=?,specialization=?,potions=199,essence=128,xp=3500 WHERE id=?').run(process.env.ROLE||'arkanist',process.env.BRANCH||'arkanist_burst',seed.id);
  if(process.env.EMERALD_AUDIT==='1'){
   const item={...JSON.parse(fs.readFileSync(root+'/evidence/emerald-rune-audit.json')).inventoryExample,player_id:seed.id},keys=Object.keys(item);
   assert.equal(item.role,'avci');assert.equal(item.rarity,'emerald');assert.equal(item.kind,'armor');
   sql.prepare('INSERT INTO player_items('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>item[k]));
  }
  if(process.env.TOWER==='1')sql.prepare("UPDATE players SET area='bazaar',x=2070,y=430 WHERE id=?").run(seed.id);
  if(process.env.HASO_DEMO==='1')sql.prepare("UPDATE players SET area='bazaar',x=1200,y=500 WHERE id=?").run(seed.id);
  sql.prepare('UPDATE auth_sessions SET expires_at=? WHERE account_id=?').run(Math.floor(Date.now()/1000)+14400,seed.account.id);
  sql.prepare('DELETE FROM game_presence WHERE account_id=?').run(seed.account.id);
  sql.prepare('UPDATE players SET last_seen=1 WHERE id!=?').run(seed.id);
  sql.prepare('INSERT OR REPLACE INTO player_onboarding(player_id,step,potion_hint_seen) VALUES(?,3,1)').run(seed.id);
  sql.exec("DELETE FROM messages WHERE announcement_request_id LIKE 'level-%'");
  sql.exec('DELETE FROM monsters');
  (await import(coreRoot+'/mounts-schema.mjs')).createMountSchema(sql,{enabled:true});
  sql.prepare("INSERT OR REPLACE INTO mount_profiles_r49(player_id,selected) VALUES(?,'wolf')").run(seed.id);
  sql.prepare("INSERT OR REPLACE INTO mount_unlocks_r49(player_id,kind,unlocked_at_ms) VALUES(?,'wolf',?)").run(seed.id,Date.now());
  const {put}=await import(coreRoot+'/tests/pvp-fixture.mjs');
  if(process.env.ADDITIONS_TEST==='1'){
   sql.prepare('UPDATE players SET core_coins=900,level=65,rank_tier=18 WHERE id=?').run(seed.id);
   sql.prepare("UPDATE player_items SET equipped=0 WHERE player_id=? AND kind IN ('weapon','armor')").run(seed.id);
   for(const kind of ['weapon','armor']){
    const id='infinite-emerald-'+kind;
    put(sql,'player_items',{id,player_id:seed.id,role:process.env.ROLE||'arkanist',kind,item_name:'Sonsuz Kadim Zümrüt',rarity:'emerald',power:120,enchantments:'[]',equipped:1,created_at:1});
    sql.prepare('INSERT INTO content_forge_r102 VALUES(?,?,?,?)').run(id,seed.id,'{}',Date.now());
   }
  }

  put(sql,'parties',{id:'hud-layout-party',leader_id:seed.id,created_at:Math.floor(Date.now()/1000)});
  put(sql,'party_members',{party_id:'hud-layout-party',player_id:seed.id,joined_at:1});
  const player=sql.prepare('SELECT * FROM players WHERE id=?').get(seed.id);
  for(let i=1;i<=4;i++){
   const account={...seed.account,id:'hud-account-'+i,username:'HudPlayer'+i,username_normalized:'hudplayer'+i,email:'hud'+i+'@fixture.invalid',email_normalized:'hud'+i+'@fixture.invalid'};
   put(sql,'accounts',account);put(sql,'players',{...player,id:'hud-player-'+i,name:'UzunKarakterAdi'+i,account_id:account.id,last_seen:0});
   put(sql,'party_members',{party_id:'hud-layout-party',player_id:'hud-player-'+i,joined_at:i+1});
  }

  // Synthetic messages in this isolated database only; no live chat is sent.
  sql.exec('DELETE FROM messages');
  const demoMessages=[['AyIşığı','Herkese iyi oyunlar!'],['Kuzey','Zindana gelecek var mı?'],['Core Şövalyesi','Ben geliyorum, gruba al.']];
  for(const [i,[name,body]] of demoMessages.entries())sql.prepare("INSERT INTO messages(player_id,player_name,scope,channel,body,created_at) VALUES(?,?,'world',1,?,?)").run(i===2?seed.id:'hud-player-'+(i+1),name,body,Math.floor(Date.now()/1000)-10+i);
  // No nearby enemies in this isolated preview.
 }});
 await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));
 if(process.env.CHAMPION_DEMO==='1'){
  const {championThresholdR102}=await import(coreRoot+'/content-model-r102.mjs');
  const {CONTENT_DEFAULTS_R102}=await import(coreRoot+'/content-config-r102.mjs');
  await s.core.permanentPlayers([s.f.id],()=>s.f.sql.prepare("UPDATE players SET name='CreoMetin',level=65,rank_tier=18,champion_level_r102=1,champion_entered_r102=1,champion_xp_r102=? WHERE id=?").run(championThresholdR102(1,CONTENT_DEFAULTS_R102.champion),s.f.id));
 }

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
 const aliases=JSON.parse(fs.readFileSync((reviewWorkspace+'qa40_player_work/asset-aliases.json')));
 for(const row of Object.values(aliases))assert.equal(createHash('sha256').update(fs.readFileSync(row.file)).digest('hex'),row.sha256,'exact cached media alias');
 const asset=p=>[(reviewWorkspace+'r105_performance_review/evidence/public-media')+p,(reviewWorkspace+'r105_performance_review/evidence/public-media')+p.replace('/assets/'+CLIENT_ASSET_NAMESPACE+'/','/assets/'),(reviewWorkspace+'r105_tower_recovery/evidence/public-media')+p.replace('/assets/'+CLIENT_ASSET_NAMESPACE+'/','/assets/'),root+'/evidence/public-media'+p,root+'/evidence/public-media'+p.replace('/assets/'+CLIENT_ASSET_NAMESPACE+'/','/assets/'),(reviewWorkspace+'r102_content/evidence/public-media')+p,(reviewWorkspace+'r100_hud_refresh/evidence/hud-media')+p,(reviewWorkspace+'r100_hud_refresh/evidence/public-media')+p,(reviewWorkspace+'r100_attack_fix/evidence/public-media')+p,cache+p,(reviewWorkspace+'general_promo_video/assets')+p,...(aliases[p]?[aliases[p].file]:[]),...(p==='/favicon.svg'?[(reviewWorkspace+'site_launch_v2/public/favicon.svg')]:[])].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile())??null;
 const nativeRequest=(url,method,body,instance)=>new Request(s.f.origin+url,{method,headers:{Origin:s.f.origin,Cookie:'__Host-yasam-session='+s.f.token+'; __Host-yasam-csrf='+s.f.csrf,'X-CSRF-Token':s.f.csrf,'X-Game-Instance':instance,'Content-Type':'application/json','X-Real-IP':'198.51.100.93'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://fixture');
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/afk/')){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks).toString(),body=raw?JSON.parse(raw):undefined;
   const request=nativeRequest(url.pathname+url.search,req.method,body,req.headers['x-game-instance']||s.f.instance),at=Date.now();
   const response=await s.bindings.route(request,()=>native.default(request));
   const failure=response.status>=400?await response.clone().json().catch(()=>null):null;
   const idle=url.pathname==='/api/game-presence'&&response.ok?(await response.clone().json()).idleExempt:undefined;
   const record={at,phase,method:req.method,path:url.pathname,status:response.status,ms:Date.now()-at,action:body?.action,idleExempt:idle,instance:req.headers['x-game-instance'],...(failure?{code:failure.code,error:failure.error,message:failure.message}:{})};requests.push(record);log('http',record);
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
  const headers={...req.headers,origin:s.f.origin,'x-real-ip':'198.51.100.93'};bridge.write('GET '+req.url+' HTTP/1.1\r\n'+Object.entries(headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');if(head.length)bridge.write(head);socket.pipe(lag()).pipe(bridge).pipe(lag()).pipe(socket);socket.on('error',()=>bridge.destroy());bridge.on('error',()=>socket.destroy());
 }catch(error){errors.push({kind:'websocket',message:error.message});socket.destroy();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROMIUM||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const mobile=process.env.MODE==='mobile',compact=mobile; const context=await browser.newContext({viewport:compact?{width:844,height:390}:{width:1280,height:800},deviceScaleFactor:2,isMobile:compact,hasTouch:compact,serviceWorkers:'block',...(process.env.IPHONE==='1'?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'}:{})}),page=await context.newPage(),touch=await context.newCDPSession(page);page.setDefaultTimeout(10000);
 const captureResponsive=async(name,width=390,height=844)=>{await page.setViewportSize({width,height});await pause(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' horizontal overflow');await page.screenshot({path:out+'/'+name+'.png'});};
 const tap=async locator=>{await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox();assert(b,'touch target missing');await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 page.on('pageerror',error=>{errors.push({kind:'browser',message:error.message,stack:error.stack});log('faults',errors.at(-1));});
 page.on('console',m=>{if(['error','warning'].includes(m.type()))log('console',{kind:m.type(),message:m.text().slice(0,1200)});});
 page.on('websocket',socket=>{socket.on('framesent',event=>{try{const value=JSON.parse(String(event.payload));if(value.type==='input'){const row={at:Date.now(),phase,type:value.type,sequence:value.sequence,action:value.payload?.action??value.action};commands.push(row);log('inputs',row);}}catch{}});socket.on('framereceived',event=>{try{const value=JSON.parse(String(event.payload));if(['error','rejected','not_queued','retry'].includes(value.type))log('responses',value);if(value.type==='frame'&&value.results?.length)log('results',{results:value.results});}catch{}});});
 await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.addInitScript(()=>{const Native=window.WebSocket;window.WebSocket=class extends Native{addEventListener(type,fn,...args){return super.addEventListener(type,type==='message'?event=>{if(window.__dropTowerSocket===this)return;fn.call(this,event);}:fn,...args);}};});
 await page.addInitScript(()=>{Object.defineProperty(AbortSignal,'any',{value:undefined,configurable:true});Object.defineProperty(AbortSignal,'timeout',{value:undefined,configurable:true});});
 await page.addInitScript(account=>{performance.setResourceTimingBufferSize(3000);sessionStorage.setItem('coreoflife-chrome-warning:'+account,'accepted');},s.f.account.id);
 await page.addInitScript(()=>{
  const draw=CanvasRenderingContext2D.prototype.fillText;
  window.__namePreview={};
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){
   if(text==='CreoMetin'||/^Şamp\. \d+ Lv$/.test(String(text))){
    const m=this.getTransform(),box=this.canvas.getBoundingClientRect(),dpr=this.canvas.width/Math.max(1,box.width);
    window.__namePreview[text]={font:this.font,fill:this.fillStyle,shadowColor:this.shadowColor,shadowBlur:this.shadowBlur,x:(m.a*x+m.c*y+m.e)/dpr+box.left,y:(m.b*x+m.d*y+m.f)/dpr+box.top};
   }
   return draw.call(this,text,x,y,...rest);
  };
 });
 phase='native-entry';await page.goto(origin);await page.getByRole('button',{name:'Maceraya katıl'}).click({timeout:30000});
 if(process.env.BEFORE==='1'){
  await wait(()=>[...missing].some(p=>p.endsWith('game-client-core511-r102-b896c05b93a63114.js')),'old broken game import must reproduce');
  await pause(1200);await page.screenshot({path:out+'/old-entry-failed.png'});
  assert(!await page.locator('.primary-skill-bar').isVisible());
  checks.push({name:'live previous portal reproduces missing game module after character selection'});report.passed=true;
 }else{
 await page.getByRole('button',{name:/Kanal 1.*Katıl/s}).click({timeout:30000});
 await wait(()=>requests.some(r=>r.path==='/api/realtime/core511-character'&&r.status===200),'native character admission missing');
 const instance=requests.findLast(r=>r.path==='/api/realtime/core511-character'&&r.status===200)?.instance;assert(instance);
 await page.evaluate(async({bridge,instance,namespace})=>{const url='/assets/'+namespace+'/'+bridge;window.__qaReadCore=(await import(url)).browserCore(instance);},{bridge:proof.bridge,instance,namespace:CLIENT_ASSET_NAMESPACE});
 await page.waitForFunction(()=>window.__qaReadCore?.ready&&window.__qaReadCore.world?.players?.length);
 const own=()=>page.evaluate(id=>{const c=window.__qaReadCore,p=c?.world?.players?.find(p=>p.id===id);return p?{id:p.id,x:p.x,y:p.y,hp:p.hp,area:c.world.area,channel:c.world.channel,tool:p.equippedToolR93??c.world.zumrutR93?.equippedTool??'',rod:p.rod_equipped}:null;},s.f.id);
 let tutorialSeen=false;const dismissTutorial=async(waitForPopup=false)=>{const b=page.getByRole('button',{name:'Daha sonra',exact:true});if(waitForPopup&&!tutorialSeen)await b.waitFor({state:'visible',timeout:5000}).catch(()=>{});if(await b.isVisible()){await b.click();await b.waitFor({state:'hidden'});tutorialSeen=true;}for(let i=0;i<8;i++){const hint=page.locator('.quests438-dismiss:visible').first();if(!await hint.isVisible())break;await hint.click();await pause(80);}};await dismissTutorial(true);
 assert.equal((await own()).area,process.env.TOWER==='1'||process.env.HASO_DEMO==='1'?'bazaar':'forest');checks.push({name:'native normal entry',area:'forest',channels:s.supervisor.rows.size});

 const discord=await page.locator('a[href*="discord.gg"]').evaluateAll(a=>a.map(x=>x.href));assert(discord.length>0);assert(discord.every(h=>h==='https://discord.gg/pBywtjhTN'));checks.push({name:'In-game Discord URL',urls:discord});
 phase='game-loaded';
 await page.locator('canvas:visible').first().waitFor({state:'visible'});
 await page.locator('.primary-skill-bar button[data-ability="0"]').waitFor({state:'visible'});
 await pause(400);
 phase='tower-recovery';
 const enter=await page.evaluate(()=>window.__qaReadCore.command({action:'adventure_tower_enter',requestId:crypto.randomUUID()}));assert.equal(enter.status,200,JSON.stringify(enter));
 await page.waitForFunction(()=>window.__qaReadCore.world?.adventure511?.run?.floor===1);
 const player=s.f.sql.prepare('SELECT * FROM players WHERE id=?').get(s.f.id),enemy=s.f.sql.prepare('SELECT * FROM monsters WHERE area=? AND hp>0').get(player.area);
 await s.core.permanentPlayers([s.f.id],()=>{s.f.sql.prepare('UPDATE players SET x=?,y=?,attack_one_at=0 WHERE id=?').run(enemy.x,enemy.y,s.f.id);});
 await page.screenshot({path:out+'/tower-before.png'});
 await page.evaluate(enemy=>{window.__dropTowerSocket=window.__qaReadCore.ws;window.__towerAttackDone=false;window.__towerAttack=window.__qaReadCore.command({action:'attack',targetId:enemy.id,spawnRound:enemy.spawn_round,ability:0,intentId:crypto.randomUUID(),requestId:crypto.randomUUID()}).then(result=>{window.__towerAttackDone=true;window.__towerAttackResult=result;return result;});},enemy);
 await pause(4000);
 assert.equal(await page.evaluate(()=>window.__qaReadCore.world.adventure511.run.floor),1,'loss holds stale floor before recovery');
 assert.match(s.f.sql.prepare('SELECT area FROM players WHERE id=?').get(s.f.id).area,/_02$/,'server advanced');
 await page.waitForFunction(()=>window.__towerAttackDone&&window.__qaReadCore.world?.adventure511?.run?.floor===2,{},{timeout:25000});
 assert.equal(await page.evaluate(()=>window.__towerAttackResult.status),200);
 assert.equal(commands.filter(v=>v.action==='attack').length,1,'committed attack must not replay');
 assert(await page.locator('.primary-skill-bar').isVisible());
 await page.screenshot({path:out+'/tower-recovered.png'});
 const recovered=await page.evaluate(()=>{const c=window.__qaReadCore;return {floor:c.world.adventure511.run.floor,ready:c.ready,connection:c.connection,queued:c.queue.length};});
 checks.push({name:'Exact compiled game recovers lost tower stream and durable attack receipt without F5 or replay',...recovered});
 assert.deepEqual(errors,[],'no browser/HTTP errors after character selection');
 assert.deepEqual([...missing],[],'no missing modules, styles, or game media');
 assert.deepEqual(s.faults.map(x=>x.error?.message),[]);
 checks.push({name:'actual portal lazy import, character admission, channel 1, live world and rendered game HUD'});
 report.passed=true;
 }
}catch(error){report.failure={phase,message:error.message,stack:error.stack};if(browser){const page=browser.contexts()[0]?.pages()[0];if(page){report.failure.dom=await page.locator('body').innerText().catch(()=>null);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}}console.error(error);process.exitCode=1;
}finally{
 report.durationMs=Date.now()-started;report.requests=requests;report.errors=errors;report.nativeFaults=s?.faults?.map(x=>x.error?.message)||[];report.missingAssets=[...missing];fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 await browser?.close();for(const b of bridges)b.destroy();if(server)await new Promise(r=>server.close(r));for(const fn of cleanups.reverse())try{await fn();}catch(error){console.error('cleanup',error.message);}console.log(JSON.stringify({passed:report.passed??false,phase,checks:checks.length,failure:report.failure?.message,report:out+'/report.json'}));
}
