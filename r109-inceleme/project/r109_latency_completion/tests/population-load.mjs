// Local, isolated native game; four real OS channel processes. No live services.
// Bots use a separate process/heap. Same host CPU quota remains shared, not VDS capacity.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {MessageChannel} from 'node:worker_threads';
import {PerformanceObserver,performance} from 'node:perf_hooks';
import {Session} from 'node:inspector';
const root=path.resolve(import.meta.dirname,'..'),tree=process.env.STUTTER_TREE,core=tree+'/core511-source/scripts/core511';
// Explicit local diagnostic only; the package and live launch flags are untouched.
if(process.env.R108_TEST_READ_BATCH==='0')process.env.CORE511_READ_SNAPSHOT_BATCH='0';
const capacity=process.env.CORE101_REALM_ID==='r2'?10:25;
const N=Number(process.env.LOAD_PLAYERS),duration=Number(process.env.LOAD_MS||60000),label=process.env.LOAD_LABEL;
assert([10,30,40,50,100].includes(N));assert(N<=capacity*4,'respect realm admission capacity');assert(duration>=10000&&duration<=180000);assert(/^[a-z0-9-]+$/.test(label));
const out=root+'/evidence/'+label+'-'+N+'.json';assert(!fs.existsSync(out),'keep earlier results immutable');
const {nativeHttpHost}=await import(core+'/tests/native-http-host-fixture.mjs');
const {currentRealmFixture}=await import('./current-realm-fixture.mjs');
const {put}=await import(core+'/tests/pvp-fixture.mjs');
const {remoteBots}=await import('./population-gateway.mjs');
const {seedPopulation,nativeRoute}=await import('./population-fixture.mjs');
const {reportSharedBoss}=await import('./population-shared-boss.mjs');
const {populationWeaponCounterSnapshot}=await import('./population-equipment.mjs');
const mode=process.env.POPULATION_MODE||'mixed';
assert(['mixed','forest','tower','solo','mist','black','rune_v2','shared_boss','shared_boss_terminal'].includes(mode),'known load scenario required');
const {ProcessStream}=await import(core+'/process-stream.mjs');
const {MessagePortStream}=await import(core+'/message-port-stream.mjs');
const {createTowerSchema,TOWER_DEFAULTS}=await import(core+'/tower-config.mjs');
const {attachPanelRuntime}=await import(tree+'/core511-source/scripts/delivery511/panel-control.mjs');
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const hash=x=>createHash('sha256').update(x).digest('base64url');
const pause=ms=>new Promise(r=>setTimeout(r,ms)),clean=[],actors=[],bridges=[],errors=[],counts={attacks:0,moves:0,replies:0};
const hostStats=()=>({...Object.fromEntries(['cpu.stat','cpu.pressure','memory.events','memory.pressure','io.pressure'].map(n=>[n,fs.existsSync('/sys/fs/cgroup/'+n)?fs.readFileSync('/sys/fs/cgroup/'+n,'utf8'):null])),procCpu:fs.readFileSync('/proc/stat','utf8').split('\n')[0]});
const gc=[],sqlDiagnostic=[];let gcObserver,inspector,cpuClockOriginMs=null,census=null;
const inspect=(method,params={})=>new Promise((resolve,reject)=>inspector.post(method,params,(error,result)=>error?reject(error):resolve(result)));
 let s,timer,panel,measuring=false,report={players:N,label,realm:process.env.CORE101_REALM_ID||'r1',durationRequestedMs:duration,workload:process.env.POPULATION_MODE||'mixed',fixture:{monsterHp:85,monsterDamage:9,playerStatHp:1000000,channelCapacity:capacity,channelDistribution:process.env.LOAD_DISTRIBUTION==='packed'?'fill-each-channel-to-real-capacity':'balanced-four-channels',liveAccess:false,coLocatedBots:false,separateBotProcess:true}},runId=randomUUID();
 const scope={after:f=>clean.push(f)},sharedAcquires={};
report.runtimeFiles=Object.fromEntries(['adventure-channel.mjs','native-http-bindings.mjs','process-stream.mjs','cold-world.mjs','read-worker.mjs','slim-reload.mjs','combat-checkpoint.mjs','coordinator.mjs','reward-worker-r533.mjs','statement-boot-pool-r61.mjs','reward-sql-r531.mjs','death-batch-channel-r57.mjs','death-batch-single-r57.mjs'].map(name=>[name,createHash('sha256').update(fs.readFileSync(core+'/'+name)).digest('hex')]));
try{
 const listeners={},reservations=[];
 if(process.env.R108_WS_TRANSPORT!=='ipc'){
  try{for(let channel=1;channel<=4;channel++){const srv=net.createServer();await new Promise((resolve,reject)=>{srv.once('error',reject);srv.listen(0,'127.0.0.1',resolve);});reservations.push(srv);listeners[channel]={host:'127.0.0.1',port:srv.address().port};}}
  finally{await Promise.all(reservations.map(srv=>new Promise(resolve=>srv.close(resolve))));}
 }
 report.webSocketTransport=process.env.R108_WS_TRANSPORT==='ipc'?'test-only-process-bridge':'production-style-tcp-proxy';
 s=await nativeHttpHost(scope,{realmId:report.realm,listeners,channelEntry:core+'/benchmark/native-channel-entry.mjs',realmSetup:async(host,seed)=>{
  const realm=currentRealmFixture(scope,host),file=realm.config.realm.manifestFile,manifest=JSON.parse(fs.readFileSync(file));
  // Keep the real realm capacity and admission guard. No scaling bypass.
  assert.equal(manifest.realms.find(r=>r.id===report.realm).initialChannelCapacity,capacity);await realm.prepare();
  const original=globalThis.fetch;clean.push(()=>{globalThis.fetch=original;});
  globalThis.fetch=(url,opt)=>opt?.headers?.['x-col-service-path']==='/internal/launch/status'?Promise.resolve(Response.json({phase:'normal',showLanding:false,canPlay:true,registrationOpen:true,serverTime:Date.now()})):original(url,opt);
  const q=host.database.sqlite;
  // Test-only census below every runtime wrapper; counts the measured window only.
  if(process.env.SQL_CENSUS==='1'){const {installSqlCensus}=await import('./sql-census.mjs');census=installSqlCensus(q,{active:()=>measuring});}
  if(process.env.SQL_DIAGNOSTIC==='1'){
   const original=q.prepare;
   q.prepare=function(query,...options){const statement=original.call(this,query,...options);for(const name of ['all','get','run']){const invoke=statement[name];statement[name]=function(...params){const at=performance.now();try{return invoke.apply(this,params);}finally{const ms=performance.now()-at;if(measuring&&ms>=1&&sqlDiagnostic.length<250){const row={query,method:name,ms,atMs:performance.timeOrigin+at};sqlDiagnostic.push(row);if(process.env.SQL_PLAN_DIAGNOSTIC==='1'&&query.includes('curve(level,total_xp,next_cost)'))row.plan=original.call(q,'EXPLAIN QUERY PLAN '+query).all(...params);}}};}return statement;};
  }
  createTowerSchema(q);const cfg=structuredClone(TOWER_DEFAULTS);cfg.minLevel=1;
  for(const floor of cfg.floors)for(const enemy of floor.spawns){enemy.hp=85;enemy.damage=9;}
  q.prepare('UPDATE kadim_tower_settings SET value=?').run(JSON.stringify(cfg));q.prepare('UPDATE game_settings SET channel_capacity=? WHERE id=1').run(capacity);
  q.prepare("UPDATE players SET area='bazaar',x=2070,y=430,level=65,rank_tier=18,champion_level_r102=1,champion_entered_r102=1,hp=12000,max_hp=12000,stat_hp=10000,skill_one=5,skill_two=5,skill_three=5,skill_four=1,last_seen=0 WHERE id=?").run(seed.id);
  const player=q.prepare('SELECT * FROM players WHERE id=?').get(seed.id),session=q.prepare('SELECT * FROM auth_sessions WHERE account_id=?').get(seed.account.id),now=Date.now();
  q.exec('DELETE FROM game_presence;UPDATE players SET last_seen=0');
  for(let n=0;n<N;n++){
   const packed=process.env.LOAD_DISTRIBUTION==='packed',channel=packed?Math.floor(n/capacity)+1:n%4+1,index=packed?n%capacity:Math.floor(n/4),id=n?randomUUID():seed.id,account=n?{...seed.account,id:randomUUID(),username:'Load'+n,username_normalized:'load'+n,email:'load'+n+'@fixture.invalid',email_normalized:'load'+n+'@fixture.invalid'}:seed.account;
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
  report.populationFixture=await seedPopulation(host,actors,mode);
 }});
 s.testListeners=listeners;s.route=await nativeRoute(scope);
 if(report.populationFixture.boss){const acquire=s.world.combat.acquire.bind(s.world.combat);s.world.combat.acquire=(peer,...args)=>{sharedAcquires[peer.channel]=(sharedAcquires[peer.channel]??0)+1;return acquire(peer,...args);};}
 if(report.populationFixture.equipment)report.equipmentBefore=populationWeaponCounterSnapshot(s.host.database.sqlite,actors);
 panel=attachPanelRuntime({host:s.host,core:s.core,world:s.world});clean.push(()=>panel.close());await s.world.startJobs();s.core.start();
 for(const row of s.supervisor.rows.values())row.child.setMaxListeners(150);
 const remote=await remoteBots(scope,s,actors);console.log('remote bots',N,remote.pid);
 await pause(10000);assert.equal(s.faults.length,0,'warmup native faults');assert.equal(errors.length,0,'warmup command errors');
 const hostBefore=hostStats();gcObserver=new PerformanceObserver(list=>{for(const e of list.getEntries())if(gc.length<4096)gc.push({atMs:performance.timeOrigin+e.startTime,ms:e.duration,kind:e.detail.kind});});gcObserver.observe({entryTypes:['gc']});
 if(process.env.ALLOCATION_PROFILE==='1'||process.env.CPU_PROFILE==='1'){
  inspector=new Session();inspector.connect();await inspect('HeapProfiler.enable');
  if(process.env.ALLOCATION_PROFILE==='1')await inspect('HeapProfiler.startSampling',{samplingInterval:32768,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
  await inspect('Profiler.enable');cpuClockOriginMs=performance.timeOrigin+performance.now()-Number(process.hrtime.bigint())/1e6;await inspect('Profiler.start');
 }
 const profileChannels=process.env.PROFILE_CHANNELS?process.env.PROFILE_CHANNELS.split(',').map(Number):[];
 assert(profileChannels.every(n=>[1,2,3,4].includes(n))&&new Set(profileChannels).size===profileChannels.length,'diagnostic profile channels');
 if(profileChannels.length)fs.mkdirSync(core+'/evidence',{recursive:true});
 for(const n of profileChannels)await s.core.processes.get(n).control.request('benchmark_profile',{operation:'start',runId});
 await remote.call('begin');await s.core.diagnostics.beginLoad(runId);measuring=true;const started=Date.now();console.log('measurement',N,duration);
 await pause(duration);measuring=false;clearInterval(timer);timer=null;
 const measured=await s.core.diagnostics.endLoad(runId);
 report.measurement=measured;
 if(census)report.sqlCensus=census.report();
 report.channelProfiles=[];
 for(const n of profileChannels)report.channelProfiles.push({channel:n,...await s.core.processes.get(n).control.request('benchmark_profile',{operation:'end',runId})});
 // Read the existing bounded diagnostic recorder after the measured window.
 // Do not enable tracing, wrap SQL, or include startup work in pause attribution.
 const {runtimePerformance}=await import(tree+'/native510-bb3a6cc689c6/vds-server/src/runtime-performance.mjs');
 const work=runtimePerformance().snapshot();
 report.existingWorkDiagnostics={scope:'bounded-existing-recorder-last-64-slow-events',workScope:'last-300-seconds-including-startup',recentSlowWork:(work.recentSlowWork??[]).filter(x=>x.startedAtMs>=started),work:work.work};
 const {checkpointSqlStatsR531}=await import(core+'/checkpoint-sql-r531.mjs');
 const {statementBootPoolStatsR61}=await import(core+'/statement-boot-pool-r61.mjs');
 const {preparedStatementsStats477}=await import(tree+'/native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs');
 report.existingCacheDiagnostics={scope:'process-lifetime-including-startup; read after measurement only',checkpoints:checkpointSqlStatsR531(),bootPool:statementBootPoolStatsR61(s.host.database.sqlite),prepared:preparedStatementsStats477(s.host.database.sqlite)};
 if(inspector){
  if(process.env.ALLOCATION_PROFILE==='1'){const allocation=await inspect('HeapProfiler.stopSampling');fs.writeFileSync(out.replace('.json','.heapprofile'),JSON.stringify(allocation.profile));}
  const cpu=await inspect('Profiler.stop');
  fs.writeFileSync(out.replace('.json','.cpuprofile'),JSON.stringify(cpu.profile));
  inspector.disconnect();inspector=null;
 }
 report.instrumentation={execArgv:process.execArgv,allocationSampling:process.env.ALLOCATION_PROFILE==='1',cpuSampling:process.env.CPU_PROFILE==='1',sqlTiming:process.env.SQL_DIAGNOSTIC==='1',cpuClockOriginMs,readerBatchDisabledForDiagnostic:process.env.R108_TEST_READ_BATCH==='0',pid:process.pid};report.sqlDiagnostic=sqlDiagnostic;
 gcObserver.disconnect();report.host={before:hostBefore,after:hostStats()};report.mainGc=gc;report.writerStalls=s.core.diagnostics.writerStallsR79?.snapshot();
 const bots=await remote.call('end');report.botDriver=bots.resources;report.botDriver.pid=bots.pid;report.endSettlement=bots.endSettlement;
 if(report.populationFixture.boss){
  const deadline=Date.now()+10000;
  do{report.sharedBoss=reportSharedBoss(s.host.database.sqlite,actors,report.populationFixture.boss,{acquiresByChannel:sharedAcquires});if(report.sharedBoss.passed)break;await pause(100);}while(Date.now()<deadline);
 }
 if(report.populationFixture.equipment){report.equipmentAfter=populationWeaponCounterSnapshot(s.host.database.sqlite,actors);report.equipmentKills=report.equipmentAfter.reduce((sum,row,index)=>sum+row.kills-report.equipmentBefore[index].kills,0);}
 report.soloRows=s.host.database.sqlite.prepare('SELECT id,status,state FROM dungeon_runs').all().map(row=>{const r=JSON.parse(row.state);return {id:row.id,status:row.status,stage:r.stage,message:r.message,deadline:r.deadline,members:r.members.map(m=>({actor:actors.find(a=>a.id===m.id)?.n,hp:m.hp,maxHp:m.maxHp,left:m.left}))};});
 const rows=measured.measurement.eventLoops,channels=rows.filter(r=>r.target.startsWith('channel-')),main=rows.find(r=>r.target==='main');
 report={...report,passed:bots.errors.length===0&&s.faults.length===0&&bots.endSettlement?.completed===true&&bots.actors.every(a=>a.ready&&!a.busy&&a.queued===0&&a.active===0&&a.pendingKills===0&&a.pendingClaims===0&&(a.zone!=='solo'||a.soloStage>0)),durationMs:Date.now()-started,measurement:measured,counts:bots.counts,provisionalOutcomes:bots.provisionalOutcomes,errors:bots.errors,faults:s.faults.map(f=>({code:f.error?.code,message:f.error?.message})),actors:bots.actors,summary:{tickP95Ms:Math.max(...channels.map(c=>c.game.tickP95Ms)),tickP99Ms:Math.max(...channels.map(c=>c.game.tickP99Ms)),maxTickMs:Math.max(...channels.map(c=>c.game.maxTickMs)),mainMaxPauseMs:main.maxPauseMs,mainPausesOver50Ms:main.pauseCountsOver50Ms.timer,channelPausesOver50Ms:channels.reduce((n,c)=>n+c.pauseCountsOver50Ms.timer,0),maxChannelPauseMs:Math.max(...channels.map(c=>c.maxPauseMs)),mainElu:main.elu,mainMaxRssBytes:main.maxRssBytes,resources:measured.resources}};
 if(report.sharedBoss&&!report.sharedBoss.passed)report.passed=false;
 if(report.populationFixture.equipment&&!report.populationFixture.boss&&report.equipmentKills<=0){report.passed=false;report.equipmentFailure='No persisted ordinary weapon kill counter exercised';}
 console.log(JSON.stringify({passed:report.passed,...report.summary}));assert(report.passed,'load correctness failed');
}catch(e){report.passed=false;report.failure={message:e.message,stack:e.stack};report.errors??=errors;report.faults??=s?.faults.map(f=>f.error?.message);console.error(e);process.exitCode=1;}
finally{inspector?.disconnect();gcObserver?.disconnect();clearInterval(timer);fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');for(const a of actors)a.client?.dispose();for(const b of bridges)b.destroy();for(const f of clean.reverse())try{await f();}catch(e){console.error('cleanup',e.message);}}
