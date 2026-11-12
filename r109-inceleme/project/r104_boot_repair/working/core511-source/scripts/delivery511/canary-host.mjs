import fs from 'node:fs';
import path from 'node:path';
import {fork} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {nativeHttpServerFixture} from '../core511/tests/native-http-server-fixture.mjs';
import {put} from '../core511/tests/pvp-fixture.mjs';
import {nativeTokenHash} from '../core511/entry-writer.mjs';
import {sourceIdentity} from '../core511/source-identity.mjs';
import {validateLoad as validateVdsLoad} from './vds-policy/acceptance.mjs';
import {validateLoad as validateOriginalLoad} from '../core511/acceptance.mjs';
import {demand} from '../core511/contract.mjs';
import {percentile} from '../core511/input-response-measurements.mjs';
import {canaryIsolation} from './canary-isolation.mjs';
import {requestChild,stopChild} from './canary-lifecycle.mjs';
const scratch=process.argv.includes('--scratch-driver-test'),identity=sourceIdentity(),runId=randomUUID(),cleanup=[],t={after:fn=>cleanup.push(fn)},players=[];
const out=path.resolve(process.env.CORE511_CANARY_ROOT??'','report.json');let s,bot,report,started=false;
const rpc=(operation,value,timeout)=>requestChild(bot,operation,value,timeout);
const workerErrors=[];
process.on('worker',worker=>worker.once('error',error=>{
 const row={code:error.code,message:error.message,stack:error.stack};if(workerErrors.length<8)workerErrors.push(row);console.error(JSON.stringify({canaryWorkerError:row}));
}));
let currentStage='isolation';
function stage(name){currentStage=name;console.log(JSON.stringify({canaryStage:name,runId,at:new Date().toISOString()}));}
try{
 stage('isolation');
 const isolation=await canaryIsolation({scratch});demand(process.env.CORE511_CANDIDATE_SHA===identity.sha256,'canary_candidate_mismatch');demand(!fs.existsSync(out),'canary_report_exists');
 stage('fixture_start');
 s=await nativeHttpServerFixture(t,{worldJobs:true,channelEntry:path.resolve(import.meta.dirname,'../core511/benchmark/native-channel-entry.mjs'),realmSetup:async(host,seed)=>{
  await host.database.atomic(()=>{
   const sql=host.database.sqlite,template=sql.prepare('SELECT * FROM players WHERE id=?').get(seed.id),now=Date.now();sql.exec('UPDATE players SET last_seen=0; DELETE FROM game_presence');
   for(let channel=1;channel<=4;channel++)for(let i=0;i<25;i++){
    const n=(channel-1)*25+i,id=runId+':'+n,accountId=id+':account',token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex'),instance=randomUUID(),x=2700+(i%5)*28,y=2025+Math.floor(i/5)*28,targetId='golge-validation-'+runId+'-'+channel+'-'+i;
    put(sql,'accounts',{...seed.account,id:accountId,username:'validation'+n,username_normalized:'validation'+n,email:'validation'+n+'@fixture.invalid',email_normalized:'validation'+n+'@fixture.invalid'});
    put(sql,'players',{...template,id,account_id:accountId,name:'Validation'+n,channel,area:'forest',x,y,hp:100000,max_hp:1000000,potions:2,gems:1000,essence:1000,attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0,last_seen:0,loadlab_run_id:''});
    put(sql,'auth_sessions',{token_hash:nativeTokenHash(token),csrf_hash:nativeTokenHash(csrf),account_id:accountId,created_at:Math.floor(now/1000),last_seen_at:Math.floor(now/1000),expires_at:Math.floor(now/1000)+3600,security_version:seed.account.security_version});
    put(sql,'game_presence',{account_id:accountId,token_hash:nativeTokenHash(token),instance_id:instance,expires_at_ms:now+40000,chat_after_id:0});
    put(sql,'monsters',{id:targetId,name:'Gölge',area:'forest',channel,x:x+20,y,hp:100000000,max_hp:100000000,spawn_round:17,last_damaged_at_ms:now,last_regen_at_ms:now});
    players.push({id,index:i,accountId,token,csrf,instance,channel,x,y,targetId});
   }
  });
 }});
 await s.host.database.atomic(()=>{for(const p of players)globalThis.__colLaunch.grant(p.accountId,true);});s.core.start();
 stage('generator_init');bot=fork(new URL('./canary-client.mjs',import.meta.url),[],{stdio:['ignore','inherit','inherit','ipc'],serialization:'advanced'});
 const ready=await rpc('init',{players,origin:s.f.origin,appPort:s.server.port,ports:Object.fromEntries(Object.entries(s.listeners).map(([ch,v])=>[ch,v.port])),durationMs:180000},60000);demand(ready.ready===100&&ready.nice===10,'canary_generator_not_ready');
 const sql=s.host.database.sqlite,receiptCount=()=>sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n+sql.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,before=receiptCount();
 stage('measuring_180_seconds');await s.core.diagnostics.beginLoad(runId);started=true;const startedAtMs=Date.now();await rpc('run',null,190000);stage('collecting_report');const measured=await s.core.diagnostics.endLoad(runId);started=false;const result=await rpc('report');
 const rows=measured.measurement.eventLoops,channels=rows.filter(r=>r.target.startsWith('channel-')),main=rows.find(r=>r.target==='main'),potions=sql.prepare('SELECT id,potions FROM players WHERE id LIKE ?').all(runId+':%'),matched=potions.filter(p=>p.potions===1).length;
 report={...measured,...result,schemaVersion:1,status:'measured',manifestSha256:identity.sha256,sourceIdentity:identity,runId,startedAtMs,transport:'websocket',workload:'native-gameplay-mixed',players:100,simultaneouslyConnected:100,isolation,exclusionsApplied:0,sourceUnchanged:sourceIdentity().sha256===identity.sha256,
  channels:channels.map(row=>{const channel=Number(row.target.slice(8)),g=row.game,c=result.channels.find(c=>c.channel===channel);return {channel,players:g.players,minPlayers:g.minPlayers,tickP95Ms:g.tickP95Ms,tickP99Ms:g.tickP99Ms,elu:row.elu,maxPauseMs:row.maxPauseMs,hotSqlReads:g.hotSqlReads,moves:c.moves,attacks:c.attacks};}),
  writer:{elu:main.elu,ackP95Ms:percentile(channels.flatMap(r=>r.game.ackSamples),.95),maxPauseMs:main.maxPauseMs,committedEvents:receiptCount()-before,errors:s.faults.length,receiptsVerified:matched===100,potions:{players:potions.length,expectedEach:1,matched}},
  faults:s.faults.map(f=>({code:f.error?.code,message:f.error?.message})),resourcesIncludingGenerator:{cpuBudget:4,totalCpuFraction:measured.resources.totalCpuFraction+result.generator.totalCpuFraction,maxRssBytes:measured.resources.maxRssBytes+result.generator.maxRssBytes},walSync:s.host.database.walSync.snapshot()};
 report.acceptance=(scratch?validateOriginalLoad:validateVdsLoad)(report,{transport:'websocket',durationMs:180000,manifestSha256:identity.sha256,requireCompleteGame:false});
 if(!report.sourceUnchanged)report.acceptance.failures.push('candidate_changed');if(report.generator.nice!==10)report.acceptance.failures.push('generator_priority');if(report.resourcesIncludingGenerator.maxRssBytes>3*1024**3)report.acceptance.failures.push('game_and_generator_ram');report.acceptance.passed=report.acceptance.failures.length===0;
 report.vdsSummary={maxPauseMs:Math.max(...rows.map(r=>r.maxPauseMs)),tickP95Ms:Math.max(...report.channels.map(c=>c.tickP95Ms)),tickP99Ms:Math.max(...report.channels.map(c=>c.tickP99Ms)),gameRssBytes:report.resources.maxRssBytes,generatorRssBytes:result.generator.maxRssBytes,generatorCpuFractionOf4:result.generator.totalCpuFraction,generatorNice:result.generator.nice,pauseCountsOver50Ms:rows.map(r=>({target:r.target,...r.pauseCountsOver50Ms})),raw:true,exclusionsApplied:0};
 if(!report.acceptance.passed)process.exitCode=1;
}catch(e){report={...report,schemaVersion:1,status:'failed',scratchDriverOnly:scratch,sourceIdentity:identity,runId,failedStage:currentStage,workerErrors,error:{code:e.code,message:e.message,stack:e.stack},acceptance:{passed:false,failures:[e.code??e.message]}};process.exitCode=1;}
finally{
 stage('cleanup');
 // Persist the measurement/failure before teardown, then finalize after it.
 // A supervising process rejects this provisional report if teardown hangs.
 report.cleanupComplete=false;fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 if(bot){try{await stopChild(bot);}catch(e){report.cleanupErrors??=[];report.cleanupErrors.push(e.message);report.acceptance.failures.push('generator_cleanup');report.acceptance.passed=false;process.exitCode=1;}}
 for(const fn of cleanup.toReversed())try{await fn();}catch(e){report.cleanupErrors??=[];report.cleanupErrors.push(e.message);report.acceptance.failures.push('fixture_cleanup');report.acceptance.passed=false;process.exitCode=1;}
 report.cleanupComplete=!report.cleanupErrors?.length;
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({canary:report.acceptance.passed,status:report.status,scratchDriverOnly:scratch,failures:report.acceptance.failures}));
}
