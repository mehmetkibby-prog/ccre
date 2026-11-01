// User amendment23:33: correctness repaired separately, final33/34 pair only.
// Historical runs and their original acceptance remain unchanged.
// Two final consecutive passes on the same candidate remain required.
// Uses native rules/sole writer/world/four OS channels/read worker, with signed
// fixture account-service replies and WS bytes carried through MessageChannels.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {once} from 'node:events';
import {MessageChannel} from 'node:worker_threads';
import {randomUUID,randomBytes} from 'node:crypto';
import {nativeHttpHost} from '../tests/native-http-host-fixture.mjs';
import {realmStartupConfig} from '../tests/native-realm-startup-fixture.mjs';
import {put} from '../tests/pvp-fixture.mjs';
import {nativeTokenHash} from '../entry-writer.mjs';
import {ProcessStream} from '../process-stream.mjs';
import {MessagePortStream} from '../message-port-stream.mjs';
import {PROTOCOL,REQUIRED_MECHANICS,demand} from '../contract.mjs';
import {sourceIdentity} from '../source-identity.mjs';
import {validateLocalLoad,validateLocalPerformance} from '../acceptance.mjs';
import {createControlProbe,controlComparison} from './control-probe.mjs';
import {FINAL_CAMPAIGN_POLICY as RESUMED_POLICY,finalCampaignMayContinue} from './final-campaign-policy.mjs';
import {writerLatencyProbe,framingLatencyProbe} from './latency-probe.mjs';
import {InputResponses} from '../input-response-measurements.mjs';
import {PERFORMANCE_POLICY as P} from '../performance-policy.mjs';
import {ProfileCapture} from './profile-capture.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const focusProfile=process.env.CORE511_FOCUS_PROFILE==='1',detailedProfile=process.env.CORE511_DETAILED_PROFILE==='1',mainOnlyProfile=process.env.CORE511_MAIN_PROFILE==='1',captureChannels=detailedProfile||focusProfile,captureProfile=captureChannels||mainOnlyProfile,campaign='post-queue-20261014',diagnosticStep=process.env.CORE511_NATIVE_DIAGNOSTIC_STEP??null,attempt=diagnosticStep?null:Number(process.env.CORE511_NATIVE_LOAD_ATTEMPT),evidenceDir=path.join(import.meta.dirname,'../evidence');
demand(diagnosticStep===null,'no_new_performance_diagnostics_authorized');
demand(diagnosticStep||Number.isSafeInteger(attempt)&&attempt>=1,'authorized_run_number');
const marker=n=>path.join(evidenceDir,`native-load-${campaign}-run-${n}.json`);
const recordFile=diagnosticStep?path.join(evidenceDir,`native-load-${campaign}-diagnostic-${diagnosticStep}.json`):marker(attempt);
demand(!fs.existsSync(recordFile)&&(diagnosticStep||Array.from({length:attempt-1},(_,i)=>fs.existsSync(marker(i+1))).every(Boolean)),'authorized_run_order_or_already_used');
const history=Array.from({length:diagnosticStep?0:attempt-1},(_,i)=>{const m=JSON.parse(fs.readFileSync(marker(i+1)));const r=JSON.parse(fs.readFileSync(path.join(evidenceDir,m.evidence)));demand(r.attempt===i+1&&r.runId===m.runId&&r.sourceIdentity.sha256===m.sourceSha256,'campaign_evidence_mismatch');return r;});
const pair=history.slice(-2);demand(!(pair.length===2&&pair.every(r=>r.sourceUnchanged===true&&r.performanceAcceptance?.passed===true)&&pair[0].sourceIdentity.sha256===pair[1].sourceIdentity.sha256),'qualified_pair_stop_and_package');
const out=process.env.CORE511_NATIVE_LOAD_OUT,runId=randomUUID(),durationMs=diagnosticStep?30000:180000,identity=sourceIdentity(),cleanup=[],scope={after:fn=>cleanup.push(fn)},clients=[],failures=[];
demand(finalCampaignMayContinue(history,identity.sha256),'final_pair_failed_or_changed_stop');
const correctness=JSON.parse(fs.readFileSync(path.join(evidenceDir,'transfer-correctness-resume2333.json')));
demand(correctness.passed===true&&correctness.sourceSha256===identity.sha256&&correctness.runs?.length===5&&correctness.gcAndLostAckPassed===true,'correctness_gate_required_before_final_pair');
for(const file of correctness.runs){
 demand(/^transfer-corrected-five-r[1-5]\.json$/.test(file),'correctness_evidence_scope');const r=JSON.parse(fs.readFileSync(path.join(evidenceDir,file)));
 demand(r.status==='passed'&&r.sourceUnchanged===true&&r.sourceIdentity.sha256===identity.sha256&&r.completedTransfers===200&&r.transfers.length===200&&r.errors.length===0&&r.faults.length===0&&r.processEvents.length===0&&r.fences.length===0&&r.routeErrors.length===0&&r.unacknowledged===0&&r.counters.unexpectedDisconnects===0&&r.counters.moverUnexpectedDisconnects===0&&r.counters.sent===r.counters.acknowledged,'correctness_transfer_evidence_failed');
}
demand(new Set(correctness.runs).size===5,'correctness_distinct_runs_required');
demand(path.isAbsolute(out??'')&&!fs.existsSync(out),'new_absolute_evidence_required');
fs.mkdirSync(path.dirname(out),{recursive:true});const write=value=>fs.writeFileSync(out,JSON.stringify(value,null,2)+'\n');
const pause=ms=>new Promise(r=>setTimeout(r,ms)),p95=a=>a.length?[...a].sort((x,y)=>x-y)[Math.ceil(a.length*.95)-1]:0;
let latency,framing,s,timer,mainProfile,profiles,stopping=false,measuring=false,started,report,diagnosticsBefore,noise,controlSample;
const responses=new InputResponses();
const counters={errors:0,disconnects:0,sent:0,acknowledged:0,frames:0,events:0,moves:0,attacks:0,potions:0,heartbeats:0};
const fail=(kind,error)=>{counters.errors++;if(failures.length<100)failures.push({at:Date.now(),kind,code:error?.code??error?.message??String(error)});};
async function denyNetwork(host){return new Promise((resolve,reject)=>{const socket=net.connect({host,port:9});socket.on('connect',()=>{socket.destroy();reject(Error('network_not_denied'));});socket.on('error',e=>e.code==='EPERM'||e.code==='EACCES'?resolve(e.code):reject(e));});}
function request(p,route,body){return new Request(s.f.origin+route,{method:'POST',headers:{Origin:s.f.origin,Cookie:'__Host-yasam-session='+p.token+'; __Host-yasam-csrf='+p.csrf,'X-CSRF-Token':p.csrf,'X-Game-Instance':p.instance,'Content-Type':'application/json'},body:JSON.stringify(body)});}
function send(c,payload){
 demand(c.ws.readyState===1&&!c.pending.size,'validation_client_busy');const sequence=++c.sequence;c.pending.set(sequence,{payload,at:performance.now(),measured:measuring});
 if(measuring){counters.sent++;if(payload.action==='move'){counters.moves++;c.moves++;}else if(payload.action==='attack'){counters.attacks++;c.attacks++;}else if(payload.action==='use_potion')counters.potions++;else if(payload.action==='heartbeat')counters.heartbeats++;}
 c.ws.send(JSON.stringify({type:'input',sequence,payload}));
}
async function settled(c,ms=10000){const until=performance.now()+ms;while(c.pending.size&&performance.now()<until)await pause(5);demand(!c.pending.size,'preflight_input_unacknowledged');}
async function connect(p){
 const response=await s.core.http(request(p,'/api/realtime/core511-ticket',{protocol:PROTOCOL})),ticket=await response.json();demand(response.status===200,'native_ticket_'+response.status+'_'+ticket.error);demand(ticket.channel===p.channel,'native_population_channel_changed');
 const row=s.supervisor.rows.get(p.channel),name='validation:'+randomUUID(),ipc=new ProcessStream(row.child,{stream:name}),{port1,port2}=new MessageChannel(),a=new MessagePortStream(port1),b=new MessagePortStream(port2);b.pipe(ipc).pipe(b);
 await new Promise((resolve,reject)=>row.child.send({type:'validation-client',stream:name},e=>e?reject(e):resolve()));
 const ws=new WebSocket('ws://127.0.0.1'+ticket.url,{origin:s.f.origin,createConnection:()=>a}),c={p,ws,a,b,ipc,sequence:0,pending:new Map(),ready:false,moves:0,attacks:0,eventIds:new Set(),eventQueue:new Set(),eventPending:null,errors:[]};clients.push(c);
 ws.on('error',e=>{if(!stopping)fail('socket',e);});ws.on('close',(code,reason)=>{if(!stopping){counters.disconnects++;if(failures.length<100)failures.push({at:Date.now(),kind:'disconnect',channel:c.p.channel,code,reason:String(reason).slice(0,160)});}});
 ws.on('message',bytes=>{try{
  const packet=JSON.parse(bytes);
  if(packet.type==='ready'){demand(packet.protocol===PROTOCOL&&packet.lastAccepted===0,'native_ready');c.ready=true;return;}
  if(packet.type==='frame'){
   if(measuring)counters.frames++;
   for(const result of packet.results??[]){const pending=c.pending.get(result.sequence);if(!pending)continue;c.pending.delete(result.sequence);if(pending.measured){counters.acknowledged++;responses.record({at:pending.at,actor:c.p.id,channel:c.p.channel,action:pending.payload.action,sequence:result.sequence});}
    if(result.status!==undefined&&(result.status<200||result.status>=300)||result.error||result.body?.error||result.body?.ok===false){const error=Error(JSON.stringify({action:pending.payload.action,status:result.status,error:result.error??result.body?.error}));c.errors.push(error.message);fail('native_result',error);}
   }
  }else if(packet.type==='event'){
   if(!c.eventIds.has(packet.id)){c.eventIds.add(packet.id);if(measuring)counters.events++;}if(!c.eventPending?.includes(packet.id))c.eventQueue.add(packet.id);
  }else if(packet.type==='event_acked'){demand(JSON.stringify(packet.ids)===JSON.stringify(c.eventPending),'event_ack_mismatch');c.eventPending=null;}
  else if(packet.type!=='gm_visibility')fail('unexpected_packet',Error(JSON.stringify(packet)));
  if(!c.eventPending&&c.eventQueue.size){c.eventPending=[...c.eventQueue].slice(0,64);for(const id of c.eventPending)c.eventQueue.delete(id);ws.send(JSON.stringify({type:'event_ack',ids:c.eventPending}));}
 }catch(e){fail('packet',e);}});
 await once(ws,'open');ws.send(JSON.stringify({type:'auth',ticket:ticket.ticket}));const until=performance.now()+10000;while(!c.ready&&ws.readyState===1&&performance.now()<until)await pause(5);demand(c.ready,'native_admission_failed');return c;
}
try{
 const networkProof={ipv4:await denyNetwork('127.0.0.1'),ipv6:await denyNetwork('::1')};const players=[];
 s=await nativeHttpHost(scope,{channelEntry:path.join(import.meta.dirname,'native-channel-entry.mjs'),realmSetup:async(host,seed)=>{
  const realm=realmStartupConfig(scope,host);await realm.prepare();
  await host.database.atomic(()=>{
   const sql=host.database.sqlite,template=sql.prepare('SELECT * FROM players WHERE id=?').get(seed.id),now=Date.now();
   // Seed offline actors. Native capacity triggers and actual admission remain
   // enabled; the fixture's original three actors are not additional clients.
   sql.exec('UPDATE players SET last_seen=0; DELETE FROM game_presence');
   for(let channel=1;channel<=4;channel++)for(let i=0;i<25;i++){
    const n=(channel-1)*25+i,id=runId+':'+n,accountId=id+':account',token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex'),instance=randomUUID(),x=2700+(i%5)*28,y=2025+Math.floor(i/5)*28,targetId='golge-validation-'+runId+'-'+channel+'-'+i;
    put(sql,'accounts',{...seed.account,id:accountId,username:'validation'+n,username_normalized:'validation'+n,email:'validation'+n+'@fixture.invalid',email_normalized:'validation'+n+'@fixture.invalid'});
    put(sql,'players',{...template,id,account_id:accountId,name:'Validation'+n,channel,area:'forest',x,y,hp:100000,max_hp:1000000,potions:2,gems:1000,essence:1000,attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0,last_seen:0,loadlab_run_id:''});
    put(sql,'auth_sessions',{token_hash:nativeTokenHash(token),csrf_hash:nativeTokenHash(csrf),account_id:accountId,created_at:Math.floor(now/1000),last_seen_at:Math.floor(now/1000),expires_at:Math.floor(now/1000)+3600,security_version:seed.account.security_version});
    put(sql,'game_presence',{account_id:accountId,token_hash:nativeTokenHash(token),instance_id:instance,expires_at_ms:now+40000,chat_after_id:0});
    put(sql,'monsters',{id:targetId,name:'Gölge',area:'forest',channel,x:x+20,y,hp:100000000,max_hp:100000000,spawn_round:17,last_damaged_at_ms:now,last_regen_at_ms:now});
    players.push({id,accountId,token,csrf,instance,channel,x,y,targetId});
   }
  });
 }});
 noise=await createControlProbe();scope.after(()=>noise.close());
 const pushFault=s.faults.push.bind(s.faults);s.faults.push=(...issues)=>pushFault(...issues.map(issue=>{
  const now=Date.now(),session=s.core.sessions.get(issue.actor),bridge=s.core.presence.entries.get(issue.actor),security=session?.security,central=session&&s.core.realm?.security.entries.get(session.identity.account);
  const context=issue.actor&&s.faults.length<10?{channel:session?.identity.channel,hasBridge:!!bridge,lastSeenAgeMs:bridge?now-bridge.lastAt:null,mirrorRemainingMs:security?security.securityValidUntil-now:null,centralRemainingMs:central?central.validUntil-now:null,persistedPresence:!!(session&&s.host.database.sqlite.prepare('SELECT 1 FROM game_presence WHERE account_id=? AND instance_id=?').get(session.identity.account,session.session.gamePresence.instanceId))}:null;
  return {...issue,observedAtMs:now,context};
 }));
 const faultEvidence=()=>s.faults.map(f=>({at:f.observedAtMs,code:f.error?.code,message:f.error?.message,stack:f.error?.stack,context:f.context}));s.faultEvidence=faultEvidence;
 const sql=s.host.database.sqlite;await s.host.database.atomic(()=>{for(const p of players)globalThis.__colLaunch.grant(p.accountId,true);});
 framing=framingLatencyProbe();latency=writerLatencyProbe(s.writer??s.core.writer,{sqlTiming:captureChannels,reader:s.core.reader});s.core.start();for(const row of s.supervisor.rows.values())row.child.setMaxListeners(100);
 // Native automatic admission chooses the emptiest channel, CH1 last on ties.
 // Use its actual policy instead of forcing or weakening the admission guard.
 for(let i=0;i<25;i++)for(const channel of [2,3,4,1])await connect(players.find(p=>p.channel===channel&&p.id.endsWith(':'+((channel-1)*25+i))));
 demand(clients.length===100&&clients.every(c=>c.ready&&c.ws.readyState===1),'native_population_incomplete');
 // Single-input preparation validates the scenario before the one timed run.
 for(const channel of [1,2,3,4]){const c=clients.find(c=>c.p.channel===channel);send(c,{action:'move',area:'forest',x:c.p.x+2,y:c.p.y});await settled(c);send(c,{action:'attack',targetId:c.p.targetId,spawnRound:17,ability:0,intentId:randomUUID()});await settled(c);}
 demand(counters.errors===0&&counters.disconnects===0,'native_scenario_preflight');
 const receiptCount=()=>sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n+sql.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,receiptsBefore=receiptCount();
 write({schemaVersion:1,status:'prepared',runId,sourceIdentity:identity,networkProof,players:100,measurementStarted:false});
 diagnosticsBefore=await s.core.diagnostics.sample();fs.writeFileSync(recordFile,JSON.stringify({campaign,attempt,...RESUMED_POLICY,measurementKind:diagnosticStep?'30s-diagnostic-not-acceptance':'180s-acceptance-attempt',diagnosticStep,runId,sourceSha256:identity.sha256,evidence:path.basename(out),durationMs,startedAtMs:Date.now()},null,2)+'\n',{flag:'wx'});if(captureProfile){mainProfile=new ProfileCapture();await mainProfile.start();if(captureChannels)await Promise.all([...s.core.processes.values()].map(row=>row.control.request('benchmark_profile',{operation:'start',runId})));}await Promise.all([s.core.diagnostics.beginLoad(runId),noise.request('begin',runId)]);started=performance.now();const startedAtMs=Date.now();responses.begin(started);latency.begin();framing.begin();measuring=true;let turn=0;
 timer=setInterval(()=>{turn++;for(const c of clients){if(c.ws.readyState!==1||c.pending.size)continue;let payload;
  if(!c.usedPotion){c.usedPotion=true;payload={action:'use_potion'};}
  else if(turn%20===0)payload={action:'heartbeat'};
  else if(turn%2===1)payload={action:'move',area:'forest',x:c.p.x+(turn%4===1?2:0),y:c.p.y};
  else payload={action:'attack',targetId:c.p.targetId,spawnRound:17,ability:turn%40===2?1:0,intentId:randomUUID()};
  try{send(c,payload);}catch(e){fail('send',e);}
 }},500);
 process.stdout.write(`native_load_started_100x${durationMs/1000}s\n`);
 await pause(durationMs);clearInterval(timer);timer=null;const until=performance.now()+5000;while(clients.some(c=>c.pending.size)&&performance.now()<until)await pause(10);
 const [measured,control]=await Promise.all([s.core.diagnostics.endLoad(runId),noise.request('end',runId)]),elapsed=performance.now()-started;controlSample=control;measuring=false;
 profiles=captureProfile?{channels:captureChannels?await Promise.all([...s.core.processes].map(async([channel,row])=>({channel,...await row.control.request('benchmark_profile',{operation:'end',runId})}))):[],main:await mainProfile.stop(path.join(evidenceDir,`profile-${runId}-main.cpuprofile`))}:null;
 demand(control.complete&&control.runId===runId&&control.pid===noise.identity.pid&&control.incarnation===noise.identity.incarnation&&control.durationMs>=durationMs&&control.droppedGaps===0,'control_probe_incomplete');
 const rows=measured.measurement.eventLoops,channelRows=rows.filter(r=>r.target.startsWith('channel-')),acks=channelRows.flatMap(r=>r.game.ackSamples),main=rows.find(r=>r.target==='main'),potions=sql.prepare('SELECT id,potions FROM players WHERE id LIKE ?').all(runId+':%'),receiptsVerified=potions.length===100&&potions.every(p=>p.potions===1),isolation={productionDatabaseOpened:false,privateDataRoot:(fs.statSync(path.dirname(s.host.file)).mode&0o777)===0o700,externalServicesReachable:false,temporaryAccountsOnly:true,networkProof,mechanism:'inherited seccomp denies every non-Unix socket; fresh 0700 SQLite root; signed fixture account service'};
 report={...measured,durableGroups:s.core.writer.durableGroups,walSync:s.host.database.walSync.snapshot(),writerLatency:latency.end(),framingLatency:framing.end(),profiles,profilingMode:detailedProfile?'detailed':focusProfile?'focus-all-diagnostic':mainOnlyProfile?'main-cpu-light-writer-diagnostic':'acceptance-light',diagnosticStep,acceptanceEligible:diagnosticStep===null,resumedPolicy:RESUMED_POLICY,localExclusionsApplied:0,controlProbe:control,controlComparison:controlComparison(rows,control),resourcesIncludingControl:{cpuBudget:4,totalCpuFraction:measured.resources.totalCpuFraction+control.processCpuMs/control.durationMs/4,maxRssBytes:measured.resources.maxRssBytes+control.maxRssBytes},performancePolicy:P,inputResponses:responses.report(),schemaVersion:1,status:'measured',manifestSha256:identity.sha256,sourceIdentity:identity,runId,workload:'native-gameplay-mixed',transport:'message-channel',startedAtMs,durationMs:elapsed,diagnosticsBefore,diagnosticsAfter:await s.core.diagnostics.sample(),players:100,simultaneouslyConnected:100,completedPlayers:clients.filter(c=>c.ws.readyState===1&&!c.pending.size).length,...counters,unacknowledged:clients.reduce((n,c)=>n+c.pending.size,0),isolation,
  verifiedMechanics:Object.fromEntries(REQUIRED_MECHANICS.map(name=>[name,false])),
  channels:channelRows.map(row=>{const channel=Number(row.target.slice(8)),group=clients.filter(c=>c.p.channel===channel),g=row.game;return {channel,players:g.players,minPlayers:g.minPlayers,tickP95Ms:g.tickP95Ms,tickP99Ms:g.tickP99Ms,elu:row.elu,maxPauseMs:row.maxPauseMs,maxInputMs:g.maxInputMs,hotSqlReads:g.hotSqlReads,moves:group.reduce((n,c)=>n+c.moves,0),attacks:group.reduce((n,c)=>n+c.attacks,0),maxTickMs:g.maxTickMs,missed:g.missed,slowest:g.slowest};}),
  writer:{elu:main.elu,ackP95Ms:p95(acks),maxPauseMs:main.maxPauseMs,committedEvents:receiptCount()-receiptsBefore,errors:s.faults.length,receiptsVerified,potions:{players:potions.length,expectedEach:1,matched:potions.filter(p=>p.potions===1).length}},faults:faultEvidence(),failures,
  limitations:['Native mixed sustained workload: movement, local PvE, skills, monster AI, potion debit, heartbeat, native checkpoints and world jobs. Not every required mechanic exercised under load.','100 arranged high-HP temporary actors and targets; no natural progression, lethal loot loop, dungeon/arena/guild war workload.','Signed central-account replies are local fixture responses; no real central service or nginx/browser network latency.',captureProfile?(mainOnlyProfile?'Full-window2ms main CPU profile; light writer startup intervals, no SQL statement wrappers. No overhead or machine-pause exclusion.':'Full-window2ms CPU and function tracing enabled; no overhead or machine-pause exclusion.'):'CPU/function profiling disabled after recorded diagnostic profiles. Full-window raw loop timers/histograms, whole-tick wall time including egress, GC, client E2E and startup retained. CPU includes generator. No pause exclusion.','This is a source candidate identity, not a signed installable package. Full-game, installer and browser release gates remain independent.']};
 // Control correlation is diagnostic only under raw player-experience acceptance.
 report.acceptance=validateLocalLoad(report,identity.sha256);report.performanceAcceptance=validateLocalPerformance(report,identity.sha256);if(diagnosticStep)report.diagnostic={durationMs,fullAcceptance:false,channelTargets:report.channels.every(c=>c.tickP95Ms<=P.tickP95Ms&&c.tickP99Ms<=P.tickP99Ms&&c.maxPauseMs<=P.maxPauseMs),mainElu:main.elu,rawMaxChannelMs:Math.max(...report.channels.map(c=>c.maxPauseMs)),note:'30s diagnostic under explicit19:59 user instruction; does not qualify as180s acceptance or alter comparable180s progress counter.'};for(const row of rows)if(row.game){row.game.ackCount=row.game.ackSamples.length;row.game.ackP95Ms=p95(row.game.ackSamples);delete row.game.ackSamples;}write(report);
 process.stdout.write(JSON.stringify({finished:true,durationMs:elapsed,errors:counters.errors,disconnects:counters.disconnects,potionsVerified:receiptsVerified,acceptance:report.acceptance.passed,maxPauseMs:Math.max(...rows.map(r=>r.maxPauseMs))})+'\n');
}catch(error){write({...report,schemaVersion:1,status:'failed',campaign,attempt,runId,sourceIdentity:identity,controlProbe:controlSample??null,measurementStarted:started!==undefined,elapsedMs:started===undefined?0:performance.now()-started,error:{code:error.code,message:error.message,stack:error.stack},partialMeasurement:error.partialMeasurement??null,diagnosticsBefore,diagnosticsAfter:await s?.core.diagnostics.sample().catch(e=>({error:e.code??e.message})),counters,unacknowledged:clients.reduce((n,c)=>n+c.pending.size,0),failures,faults:s?.faultEvidence?.(),acceptance:{passed:false,failures:[error.code??error.message]}});process.stderr.write('native_load_failed '+error.message+'\n');process.exitCode=1;
}finally{
 stopping=true;clearInterval(timer);for(const c of clients){c.ws.terminate();c.a.destroy();c.b.destroy();c.ipc.destroy();}
 const errors=[];for(const fn of cleanup.toReversed())try{await fn();}catch(e){errors.push(e.message);}
 if(errors.length){const result=JSON.parse(fs.readFileSync(out));result.cleanupErrors=errors;write(result);process.stderr.write('native_load_cleanup_failed\n');process.exitCode=1;}
 if(fs.existsSync(out)){const result=JSON.parse(fs.readFileSync(out));result.campaign=campaign;result.attempt=attempt;result.sourceUnchanged=sourceIdentity().sha256===identity.sha256;write(result);}
}
