// Local, isolated native game; four real OS channel processes. No live services.
// Bots share this host/main process, so results are a local comparison, not VDS capacity.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {MessageChannel} from 'node:worker_threads';
import {PerformanceObserver,performance} from 'node:perf_hooks';
import {Session} from 'node:inspector';
const root=path.resolve(import.meta.dirname,'..'),tree=process.env.STUTTER_TREE,core=tree+'/core511-source/scripts/core511';
const capacity=process.env.CORE101_REALM_ID==='r2'?10:25;
const N=Number(process.env.LOAD_PLAYERS),duration=Number(process.env.LOAD_MS||60000),label=process.env.LOAD_LABEL;
assert([10,50,100].includes(N));assert(N<=capacity*4,'respect realm admission capacity');assert(duration>=10000&&duration<=180000);assert(/^[a-z0-9-]+$/.test(label));
const out=root+'/evidence/'+label+'-'+N+'.json';assert(!fs.existsSync(out),'keep earlier results immutable');
const {nativeHttpHost}=await import(core+'/tests/native-http-host-fixture.mjs');
const {currentRealmFixture}=await import('./current-realm-fixture.mjs');
const {put}=await import(core+'/tests/pvp-fixture.mjs');
const {Core511Transport}=await import(core+'/client-transport.mjs');
const {ProcessStream}=await import(core+'/process-stream.mjs');
const {MessagePortStream}=await import(core+'/message-port-stream.mjs');
const {createTowerSchema,TOWER_DEFAULTS}=await import(core+'/tower-config.mjs');
const {attachPanelRuntime}=await import(tree+'/core511-source/scripts/delivery511/panel-control.mjs');
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const hash=x=>createHash('sha256').update(x).digest('base64url');
const pause=ms=>new Promise(r=>setTimeout(r,ms)),clean=[],actors=[],bridges=[],errors=[],counts={attacks:0,moves:0,replies:0};
const hostStats=()=>Object.fromEntries(['cpu.stat','cpu.pressure','memory.events','memory.pressure','io.pressure'].map(n=>[n,fs.existsSync('/sys/fs/cgroup/'+n)?fs.readFileSync('/sys/fs/cgroup/'+n,'utf8'):null]));
const gc=[];let gcObserver,inspector;
const inspect=(method,params={})=>new Promise((resolve,reject)=>inspector.post(method,params,(error,result)=>error?reject(error):resolve(result)));
let s,timer,panel,measuring=false,report={players:N,label,realm:process.env.CORE101_REALM_ID||'r1',durationRequestedMs:duration,workload:'group tower: five accounts per room, movement, basic attacks, kills, rewards and automatic floor transitions',fixture:{monsterHp:85,monsterDamage:9,playerStatHp:10000,channelCapacity:capacity,liveAccess:false,coLocatedBots:true}},runId=randomUUID();
const scope={after:f=>clean.push(f)};
try{
 s=await nativeHttpHost(scope,{realmId:report.realm,channelEntry:core+'/benchmark/native-channel-entry.mjs',realmSetup:async(host,seed)=>{
  const realm=currentRealmFixture(scope,host),file=realm.config.realm.manifestFile,manifest=JSON.parse(fs.readFileSync(file));
  // Keep the real realm capacity and admission guard. No scaling bypass.
  assert.equal(manifest.realms.find(r=>r.id===report.realm).initialChannelCapacity,capacity);await realm.prepare();
  const original=globalThis.fetch;clean.push(()=>{globalThis.fetch=original;});
  globalThis.fetch=(url,opt)=>opt?.headers?.['x-col-service-path']==='/internal/launch/status'?Promise.resolve(Response.json({phase:'normal',showLanding:false,canPlay:true,registrationOpen:true,serverTime:Date.now()})):original(url,opt);
  const q=host.database.sqlite;createTowerSchema(q);const cfg=structuredClone(TOWER_DEFAULTS);cfg.minLevel=1;
  for(const floor of cfg.floors)for(const enemy of floor.spawns){enemy.hp=85;enemy.damage=9;}
  q.prepare('UPDATE kadim_tower_settings SET value=?').run(JSON.stringify(cfg));q.prepare('UPDATE game_settings SET channel_capacity=? WHERE id=1').run(capacity);
  q.prepare("UPDATE players SET area='bazaar',x=2070,y=430,level=65,rank_tier=18,champion_level_r102=1,champion_entered_r102=1,hp=12000,max_hp=12000,stat_hp=10000,skill_one=5,skill_two=5,skill_three=5,skill_four=1,last_seen=0 WHERE id=?").run(seed.id);
  const player=q.prepare('SELECT * FROM players WHERE id=?').get(seed.id),session=q.prepare('SELECT * FROM auth_sessions WHERE account_id=?').get(seed.account.id),now=Date.now();
  q.exec('DELETE FROM game_presence;UPDATE players SET last_seen=0');
  for(let n=0;n<N;n++){
   const channel=n%4+1,index=Math.floor(n/4),id=n?randomUUID():seed.id,account=n?{...seed.account,id:randomUUID(),username:'Load'+n,username_normalized:'load'+n,email:'load'+n+'@fixture.invalid',email_normalized:'load'+n+'@fixture.invalid'}:seed.account;
   const a={n,id,account,channel,index,token:n?'load_'+randomUUID():seed.token,csrf:seed.csrf,instance:randomUUID(),busy:false,lastAttack:0,lastMove:0,notes:[],floors:new Set()};actors.push(a);
   if(n){put(q,'accounts',account);put(q,'players',{...player,id,account_id:account.id,name:'Load'+n,channel});}
   else q.prepare('UPDATE players SET channel=? WHERE id=?').run(channel,id);
   if(n)put(q,'auth_sessions',{...session,token_hash:hash(a.token),account_id:account.id,expires_at:Math.floor(now/1000)+3600});
   else q.prepare('UPDATE auth_sessions SET expires_at=? WHERE token_hash=?').run(Math.floor(now/1000)+3600,hash(a.token));
   put(q,'game_presence',{account_id:account.id,token_hash:hash(a.token),instance_id:a.instance,expires_at_ms:now+120000,chat_after_id:0});
   const party='load-party-'+channel+'-'+Math.floor(index/5);
   if(index%5===0)put(q,'parties',{id:party,leader_id:id,created_at:Math.floor(now/1000)});
   put(q,'party_members',{party_id:party,player_id:id,joined_at:Math.floor(now/1000)});
  }
 }});
 panel=attachPanelRuntime({host:s.host,core:s.core,world:s.world});clean.push(()=>panel.close());await s.world.startJobs();s.core.start();
 for(const row of s.supervisor.rows.values())row.child.setMaxListeners(150);
 for(const a of actors){
  await s.host.database.atomic(()=>globalThis.__colLaunch.grant(a.account.id,true));
  class LocalSocket extends WebSocket{
   constructor(url){const row=s.supervisor.rows.get(a.channel),stream='validation:'+randomUUID(),ipc=new ProcessStream(row.child,{stream}),{port1,port2}=new MessageChannel(),left=new MessagePortStream(port1),right=new MessagePortStream(port2);right.pipe(ipc).pipe(right);for(const b of [left,right,ipc]){b.on('error',()=>{});bridges.push(b);}row.child.send({type:'validation-client',stream});super(url,{origin:s.f.origin,createConnection:()=>left});}
  }
  a.client=new Core511Transport({WebSocket:LocalSocket,origin:'http://127.0.0.1',headers:()=>({}),fetch:async(url,opt)=>s.core.http(new Request(s.f.origin+new URL(url).pathname,{method:'POST',headers:{origin:s.f.origin,cookie:'__Host-yasam-session='+a.token+'; __Host-yasam-csrf='+a.csrf,'X-CSRF-Token':a.csrf,'X-Game-Instance':a.instance,'X-Real-IP':'198.51.100.'+(a.n+1),'content-type':'application/json'},body:opt.body})),notify:(kind,value)=>{if(kind==='error'){a.notes.push(value);if(measuring)errors.push({actor:a.n,kind,value});}}});
  await a.client.replace('character',{channel:a.channel});await a.client.image();assert(a.client.ready,'ready actor '+a.n);
 }
 assert.equal(actors.length,N);console.log('connected',N);
 for(const a of actors){const r=await a.client.command({action:'adventure_tower_enter',requestId:randomUUID()});assert.equal(r.status,200,JSON.stringify(r));}
 const readyUntil=Date.now()+15000;while(actors.some(a=>!a.client.world?.adventure511?.run)&&Date.now()<readyUntil)await pause(25);assert(actors.every(a=>a.client.world?.adventure511?.run));
 const act=async a=>{
  const c=a.client,w=c.world,p=w?.players.find(p=>p.id===a.id),run=w?.adventure511?.run;if(!c.ready||!p||!run||a.busy)return;
  a.floors.add(run.floor);const enemy=w.monsters.filter(m=>m.hp>0).sort((x,y)=>Math.hypot(x.x-p.x,x.y-p.y)-Math.hypot(y.x-p.x,y.y-p.y))[0];if(!enemy)return;
  const now=Date.now(),distance=Math.hypot(enemy.x-p.x,enemy.y-p.y);a.busy=true;
  try{
   if(distance>160&&now-a.lastMove>=230){a.lastMove=now;const step=Math.min(30,distance-150);c.move({action:'move',x:p.x+(enemy.x-p.x)/distance*step,y:p.y+(enemy.y-p.y)/distance*step,area:w.area,basePositionRevision:p.position_revision,requestId:randomUUID()});if(measuring)counts.moves++;}
   else if(distance<=160&&now-a.lastAttack>=900){a.lastAttack=now;if(measuring)counts.attacks++;const r=await c.command({action:'attack',targetId:enemy.id,spawnRound:enemy.spawn_round,ability:0,requestId:randomUUID(),intentId:randomUUID()});if(measuring)counts.replies++;if(r.status!==200)errors.push({actor:a.n,status:r.status,body:r.body});}
  }catch(e){errors.push({actor:a.n,error:e.message});}finally{a.busy=false;}
 };
 timer=setInterval(()=>{for(const a of actors)void act(a);},50);
 await pause(10000);assert.equal(s.faults.length,0,'warmup native faults');assert.equal(errors.length,0,'warmup command errors');
 const hostBefore=hostStats();gcObserver=new PerformanceObserver(list=>{for(const e of list.getEntries())if(gc.length<4096)gc.push({atMs:performance.timeOrigin+e.startTime,ms:e.duration,kind:e.detail.kind});});gcObserver.observe({entryTypes:['gc']});
 if(process.env.ALLOCATION_PROFILE==='1'){
  inspector=new Session();inspector.connect();await inspect('HeapProfiler.enable');
  await inspect('HeapProfiler.startSampling',{samplingInterval:32768,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
  await inspect('Profiler.enable');await inspect('Profiler.start');
 }
 await s.core.diagnostics.beginLoad(runId);measuring=true;const started=Date.now();console.log('measurement',N,duration);
 await pause(duration);measuring=false;clearInterval(timer);timer=null;
 const measured=await s.core.diagnostics.endLoad(runId);
 if(inspector){
  const allocation=await inspect('HeapProfiler.stopSampling'),cpu=await inspect('Profiler.stop');
  fs.writeFileSync(out.replace('.json','.heapprofile'),JSON.stringify(allocation.profile));
  fs.writeFileSync(out.replace('.json','.cpuprofile'),JSON.stringify(cpu.profile));
  inspector.disconnect();inspector=null;
 }
 report.instrumentation={execArgv:process.execArgv,allocationSampling:process.env.ALLOCATION_PROFILE==='1',pid:process.pid};
 gcObserver.disconnect();report.host={before:hostBefore,after:hostStats()};report.mainGc=gc;report.writerStalls=s.core.diagnostics.writerStallsR79?.snapshot();
 const ending=Date.now()+10000;while(actors.some(a=>a.busy)&&Date.now()<ending)await pause(10);
 const rows=measured.measurement.eventLoops,channels=rows.filter(r=>r.target.startsWith('channel-')),main=rows.find(r=>r.target==='main');
 report={...report,passed:errors.length===0&&s.faults.length===0&&actors.every(a=>a.client.ready&&!a.busy),durationMs:Date.now()-started,measurement:measured,counts,errors,faults:s.faults.map(f=>({code:f.error?.code,message:f.error?.message})),actors:actors.map(a=>({actor:a.n,channel:a.channel,ready:a.client.ready,queued:a.client.queue.length,busy:a.busy,floors:[...a.floors],currentFloor:a.client.world?.adventure511?.run?.floor})),summary:{tickP95Ms:Math.max(...channels.map(c=>c.game.tickP95Ms)),tickP99Ms:Math.max(...channels.map(c=>c.game.tickP99Ms)),maxTickMs:Math.max(...channels.map(c=>c.game.maxTickMs)),mainMaxPauseMs:main.maxPauseMs,mainPausesOver50Ms:main.pauseCountsOver50Ms.timer,channelPausesOver50Ms:channels.reduce((n,c)=>n+c.pauseCountsOver50Ms.timer,0),maxChannelPauseMs:Math.max(...channels.map(c=>c.maxPauseMs)),mainElu:main.elu,mainMaxRssBytes:main.maxRssBytes,resources:measured.resources}};
 console.log(JSON.stringify({passed:report.passed,...report.summary}));assert(report.passed,'load correctness failed');
}catch(e){report.passed=false;report.failure={message:e.message,stack:e.stack};report.errors=errors;report.faults=s?.faults.map(f=>f.error?.message);console.error(e);process.exitCode=1;}
finally{inspector?.disconnect();gcObserver?.disconnect();clearInterval(timer);fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');for(const a of actors)a.client?.dispose();for(const b of bridges)b.destroy();for(const f of clean.reverse())try{await f();}catch(e){console.error('cleanup',e.message);}}
