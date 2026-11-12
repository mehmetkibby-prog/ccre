import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Core511Transport} from '../client-transport.mjs';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {ProcessStream} from '../process-stream.mjs';
import {randomUUID} from 'node:crypto';
import {until,seeded} from './helpers.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const phaseSettings=JSON.parse(process.env.R21_PHASES_JSON??JSON.stringify([{name:'normal',disk:0,net:30,ms:12000},{name:'disk60-rtt60',disk:60,net:30,ms:16000},{name:'disk60-rtt150',disk:60,net:75,ms:16000}]));
assert(Array.isArray(phaseSettings)&&phaseSettings.length>0);
for(const p of phaseSettings)assert(typeof p.name==='string'&&[p.disk,p.net,p.ms,p.jitter??0].every(Number.isFinite)&&p.disk>=0&&p.net>=0&&p.ms>=1000&&(p.jitter??0)>=0);
const totalDuration=phaseSettings.reduce((n,p)=>n+p.ms,0),jitterSeed=Number(process.env.R21_JITTER_SEED??21021),randomDelay=seeded(jitterSeed);
const output=process.env.R21_DURABILITY_OUT??'/tmp/r21-hunter-durability.json';
const percentile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.ceil(p*values.length)-1]:0;
function observeOutcome(action,result,failures,at=0){const status=result.status??200,body=result.body??result;const code=body.code??body.data?.code??null;if(status!==200||body.ok===false||body.data?.ok===false)failures.push({type:'unexpected_result',action,status,code,at,sequence:result.sequence??null});}
function assertNoObservedFailure(summary){assert.equal(summary.failures.length,0,JSON.stringify(summary.failures));assert.equal(summary.sqlDiagnostics.length,0,JSON.stringify(summary.sqlDiagnostics));}
function writeEvidence(file,summary){fs.writeFileSync(file,JSON.stringify(summary,null,2));}
const chooseDrop=(rows,collected,inFlight)=>rows.find(row=>!collected.has(row.id)&&!inFlight.has(row.id));
test('fixture records unexpected 409 and saves fatal evidence before asserting',()=>{const file='/tmp/r21-fixture-failfast-'+randomUUID()+'.json',summary={failures:[],sqlDiagnostics:[]};try{observeOutcome('collect',{status:409,body:{code:'command_sql_rolled_back'}},summary.failures,17);writeEvidence(file,summary);assert.throws(()=>assertNoObservedFailure(summary),/command_sql_rolled_back/);assert.equal(JSON.parse(fs.readFileSync(file)).failures[0].status,409);}finally{fs.rmSync(file,{force:true});}});
test('fixture SQL diagnostic is fatal even without a failed transport result',()=>{assert.throws(()=>assertNoObservedFailure({failures:[],sqlDiagnostics:[{type:'core511_command_sql_rolled_back'}]}),/core511_command_sql_rolled_back/);});
test('fixture drop selection passes acknowledged and in-flight rows without pre-marking unsubmitted rows',()=>{const rows=[{id:'ack'},{id:'flight'},{id:'available'}],collected=new Set(['ack']),inFlight=new Set(['flight']);assert.equal(chooseDrop(rows,collected,inFlight).id,'available');assert(!collected.has('available'));inFlight.delete('flight');assert.equal(chooseDrop(rows,collected,inFlight).id,'flight');});


// The fixture still commits/syncs SQLite normally. Only acknowledgement of an
// already durable native write is delayed, never the contents/rules of a write.
test('native lethal hunter/reward writes and concurrent prediction under delayed durability',{timeout:totalDuration+120000,skip:process.env.R21_FIXTURE_SELFTEST==='1'},async t=>{
 const failures=[],sqlDiagnostics=[];
 const s=await nativeHttpHost(t,{realmSetup:async(host,seed)=>{
  const q=host.database.sqlite;q.prepare('UPDATE bot_due SET due_ms=? WHERE account_id=?').run(Date.now()+totalDuration+120000,seed.account.id);
  q.prepare("UPDATE players SET role='avci',area='forest',channel=1,x=2700,y=2025,hp=1000000,max_hp=1000000,level=40,is_gm=0,loadlab_run_id='',attack_one_at=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(seed.id);
  for(let i=0;i<72;i++)q.prepare("INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round,respawn_at) VALUES(?,?,'forest',1,?,?,12,12,1,0)").run('golge-durable20-'+i,'Hunter durability test '+i,2700+Math.cos(i)*35,2025+Math.sin(i)*35);
 }});
 const originalDiagnostic=s.writer.commandFailures.diagnostic;s.writer.commandFailures.diagnostic=row=>{sqlDiagnostics.push(row);originalDiagnostic(row);};t.after(()=>s.writer.commandFailures.diagnostic=originalDiagnostic);
 await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));
 let diskDelay=0,networkDelay=0,jitter=0,phase=null,flushes=0;const originalDurable=s.host.database.durableAfterCommit.bind(s.host.database);
 s.host.database.durableAfterCommit=()=>{const duration=diskDelay;flushes++;return Promise.resolve(originalDurable()).then(async value=>{if(duration)await wait(duration);return value;});};
 t.after(()=>s.host.database.durableAfterCommit=originalDurable);
 const wire=[],testStarted=performance.now();
 class DirectSocket extends WebSocket{
  constructor(url){const u=new URL(url),ch=Number(u.pathname.split('/').at(-1)),row=s.supervisor.rows.get(ch),name='test-browser:'+randomUUID(),socket=new ProcessStream(row.child,{stream:name});row.child.send({type:'test-browser-connection',stream:name});super('ws://127.0.0.1'+u.pathname,{origin:s.f.origin,createConnection:()=>socket});t.after(()=>socket.destroy());}
  delayed(direction,fn){
   const now=performance.now(),delay=Math.max(0,networkDelay+(randomDelay()*2-1)*jitter),key=direction+'Queue',q=this[key]??(this[key]=[]);
   q.push({at:Math.max(q.at(-1)?.at??now,now+delay),fn});if(q.length>1)return;
   const drain=()=>{while(q.length&&q[0].at<=performance.now())q.shift().fn();if(q.length)setTimeout(drain,Math.max(1,Math.ceil(q[0].at-performance.now())));};
   setTimeout(drain,Math.max(1,Math.ceil(q[0].at-now)));
  }
  // FIFO delivery within each direction, including delayed ACK/event frames.
  // Jitter changes latency, never WebSocket ordering or server rate budgets.
  send(bytes,...args){const frame=JSON.parse(String(bytes));if(frame.type==='input')wire.push({event:'wire-send',at:performance.now()-testStarted,sequence:frame.sequence,action:frame.payload.action,dependsOn:frame.dependsOn});if((networkDelay||jitter)&&frame.type==='input')this.delayed('uplink',()=>{if(this.readyState===1)super.send(bytes,...args);});else super.send(bytes,...args);}
  addEventListener(type,fn,...args){if(type==='close')return super.addEventListener(type,event=>{wire.push({event:'socket-close',at:performance.now()-testStarted,code:event.code,reason:event.reason});fn(event);},...args);return super.addEventListener(type,type==='message'?event=>{const deliver=()=>{const p=JSON.parse(String(event.data));if(p.type==='rejected')failures.push({type:'ingress_rejected',sequence:p.sequence,status:429,code:p.code,at:performance.now()-testStarted});if(['queued','not_queued','retry','rejected','ready'].includes(p.type))wire.push({at:performance.now()-testStarted,...p,results:undefined});fn(event);};if(networkDelay||jitter)this.delayed('downlink',deliver);else deliver();}:fn,...args);}
 }
 const fetch=async(url,options={})=>{const u=new URL(url,s.f.origin),r=await s.http(u.pathname.split('core511-').at(-1),JSON.parse(options.body??'{}'));return Response.json(r,{status:r.status});};
 const client=new Core511Transport({fetch,WebSocket:DirectSocket,origin:s.f.origin,headers:()=>Object.fromEntries(s.f.request().headers)});t.after(()=>client.dispose());
 await client.replace('character',{channel:1});client.entrySelected=true;s.core.start();await client.image();
 const baseline=s.f.sql.prepare('SELECT xp,quest_kills438 FROM players WHERE id=?').get(s.f.id);
 const errors=[],results=[],moves=[],phases=[],trace=[],activity=[];let start=performance.now(),pending=[],lastPosition=null,lastShownAt=start,lastFrameAt=start,lastSend=new Map(),nextAttack=0,heldTarget=null,shown=null,claimed=new Set(),collected=new Set(),inFlightRewards=new Set(),inFlightDrops=new Set();
 const sendMethod=typeof client.sendInput==='function'?'sendInput':'sendActive',realSend=client[sendMethod].bind(client);client[sendMethod]=(...args)=>{const row=args[0]??client.active;if(row&&!row.queued&&!lastSend.has(row.sequence)){lastSend.set(row.sequence,performance.now());trace.push({event:'send',at:performance.now()-start,sequence:row.sequence,action:row.payload.action,batchSeconds:row.movement?client.prediction.flight?.seconds:null,pendingSeconds:client.prediction.pending.reduce((sum,p)=>sum+p.seconds,0),pendingInputs:client.pendingInputs().map(r=>({sequence:r.sequence,action:r.payload.action,queued:r.queued})),queue:client.queue.map(r=>r.payload.action)});}return realSend(...args);};
 const realResult=client.result.bind(client);client.result=(result,...args)=>{const active=client.pendingInputs?.().find(row=>row.sequence===result.sequence)??client.active,now=performance.now();if(active?.sequence===result.sequence){const row={action:active.payload.action,status:result.status??200,ackMs:now-lastSend.get(active.sequence),at:now-start,phase:phase?.name,body:result.body??result};observeOutcome(active.payload.action,result,failures,now-start);if(active.movement)moves.push(row);else results.push(row);}return realResult(result,...args);};
 client.subscribe((kind,value)=>{if(kind==='error')errors.push(value);});
 function send(payload){
  const created=performance.now(),currentPhase=phase,rewardKeys=(payload.rewardTargets??[]).map(r=>r.id+':'+r.spawnRound);for(const key of rewardKeys)inFlightRewards.add(key);if(payload.action==='collect')inFlightDrops.add(payload.targetId);
  const p=client.command(payload).then(result=>{
   currentPhase.commands++;currentPhase.maxCommandMs=Math.max(currentPhase.maxCommandMs,performance.now()-created);
   // The actual result observer makes any non-200 outcome fatal. Never mark a
   // rejected attempt successful, retry it, or silently skip it to pass a run.
   if(result.status!==200||result.body?.ok===false||result.body?.data?.ok===false){if(!failures.some(r=>r.type==='unexpected_result'&&r.action===payload.action&&r.status===result.status&&r.at>=created-start))observeOutcome(payload.action,result,failures,performance.now()-start);return;}
   if(payload.action==='attack'){if(Number.isFinite(result.body.nextAttackAtMs))nextAttack=Math.max(nextAttack,performance.now()+Math.max(0,result.body.nextAttackAtMs-Date.now()));if(result.body.hits?.some(h=>h.killed))heldTarget=null;}
   if(payload.action==='claim_rewards')for(const key of rewardKeys)claimed.add(key);if(payload.action==='collect')collected.add(payload.targetId);
  }).catch(error=>errors.push({code:error.code,message:error.message})).finally(()=>{for(const key of rewardKeys)inFlightRewards.delete(key);if(payload.action==='collect')inFlightDrops.delete(payload.targetId);pending.splice(pending.indexOf(p),1);});pending.push(p);
 }
 function counts(){return{...s.f.sql.prepare('SELECT xp,quest_kills438 FROM players WHERE id=?').get(s.f.id),...s.f.sql.prepare("SELECT COUNT(*) killed,COALESCE(MAX(spawn_round),0) maxSpawnRound FROM normal_defeats WHERE monster_id LIKE 'golge-durable20-%'").get(),rewards:s.f.sql.prepare("SELECT COUNT(*) n FROM normal_reward_claims WHERE monster_id LIKE 'golge-durable20-%'").get().n,collected:results.filter(r=>r.action==='collect'&&r.status===200).length};}
 let lastActivity=counts(),lastActivityAt=start,nextActivityAt=start+60000;
 function recordActivity(now){const current=counts(),row={at:now-start,durationMs:now-lastActivityAt,totals:current,delta:Object.fromEntries(['xp','quest_kills438','killed','rewards','collected'].map(k=>[k,current[k]-lastActivity[k]]))};activity.push(row);lastActivity=current;lastActivityAt=now;nextActivityAt=now+60000;fs.writeFileSync(output+'.progress.json',JSON.stringify({at:now-start,phase:phase.name,activity,failures,sqlDiagnostics,errors,faults:s.faults.map(f=>String(f.error??f))},null,2));}
 for(const settings of phaseSettings){
  diskDelay=settings.disk;networkDelay=settings.net;jitter=settings.jitter??0;phase={name:settings.name,settings,commands:0,frames:0,capFrames:0,maxPendingSeconds:0,maxShownGapMs:0,maxCommandMs:0,maxActiveAgeMs:0,pendingSamples:[],frameGapSamples:[],flushes:-flushes};phases.push(phase);const end=performance.now()+settings.ms;lastShownAt=lastFrameAt=performance.now();lastPosition=null;
  while(performance.now()<end&&!failures.length&&!sqlDiagnostics.length&&!errors.length&&!s.faults.length){const now=performance.now(),own=client.world?.players.find(p=>p.id===s.f.id);
   if(own){const direction=Math.floor((now-start)/1500)%2?1:-1,dt=Math.min(.05,(now-lastFrameAt)/1000);shown=client.predictFrame({own,seconds:dt},(p,seconds)=>({x:p.x+direction*180*seconds,y:p.y}));const seconds=client.prediction.pending.reduce((sum,p)=>sum+p.seconds,0);phase.maxPendingSeconds=Math.max(phase.maxPendingSeconds,seconds);phase.pendingSamples.push(seconds*1000);phase.frameGapSamples.push(now-lastFrameAt);if(seconds>=.5999){phase.capFrames++;trace.push({event:'cap',at:now-start,pendingSeconds:seconds,flight:client.prediction.flight&&{sequence:client.prediction.flight.sequence,seconds:client.prediction.flight.seconds},lastMoveAgo:now-client.lastMove,pendingInputs:client.pendingInputs().map(r=>({sequence:r.sequence,action:r.payload.action,queued:r.queued,ageMs:now-lastSend.get(r.sequence)})),queue:client.queue.map(r=>r.payload.action)});}if(lastPosition&&Math.hypot(shown.x-lastPosition.x,shown.y-lastPosition.y)>.05){phase.maxShownGapMs=Math.max(phase.maxShownGapMs,now-lastShownAt);if(now-lastShownAt>100)trace.push({event:'shown-gap',at:now-start,duration:now-lastShownAt,pendingSeconds:seconds,ready:client.ready,flight:client.prediction.flight?.sequence,active:client.active?.sequence,cooldown:client.movementCooldownUntil??null});lastShownAt=now;}lastPosition=shown;phase.frames++;}
   if(now>=nextActivityAt)recordActivity(now);
   lastFrameAt=now;if(client.active)phase.maxActiveAgeMs=Math.max(phase.maxActiveAgeMs,now-(lastSend.get(client.active.sequence)??now));
   // Production attack and reward commands compete with independently generated
   // movement; target/body points are the rendered/predicted client positions.
   if(pending.length<2){const rewardTargets=s.f.sql.prepare("SELECT d.monster_id AS id,d.spawn_round AS spawnRound FROM normal_defeats d JOIN monster_participants p ON p.monster_id=d.monster_id AND p.spawn_round=d.spawn_round WHERE d.monster_id LIKE 'golge-durable20-%' AND d.rewards_completed_at=0 AND p.player_id=? LIMIT 10").all(s.f.id).filter(r=>!claimed.has(r.id+':'+r.spawnRound)&&!inFlightRewards.has(r.id+':'+r.spawnRound));const drop=chooseDrop(s.f.sql.prepare("SELECT id FROM world_drops WHERE owner_id=? AND collectible_at<=? AND expires_at>? AND enchantments NOT LIKE '%pending%' ORDER BY collectible_at,id").all(s.f.id,Math.floor(Date.now()/1000),Math.floor(Date.now()/1000)),collected,inFlightDrops);
    if(rewardTargets.length){send({action:'claim_rewards',rewardTargets});}
    else if(drop){send({action:'collect',targetId:drop.id});}
    else if(now>=nextAttack){nextAttack=now+750;const target=client.world.monsters.find(m=>m.id===heldTarget&&m.hp>0)??client.world.monsters.find(m=>m.id.startsWith('golge-durable20-')&&m.hp>0);if(target){heldTarget=target.id;const point=client.position('monsters',target,now);send({action:'attack',targetId:target.id,spawnRound:target.spawn_round,ability:0,intentId:randomUUID(),x:shown?.x??own.x,y:shown?.y??own.y,targetX:point.x,targetY:point.y});}}
   }
   await wait(16);
  }
  try{await until(()=>pending.length===0&&!client.active&&!client.queue.length,15000);}catch(error){failures.push({type:'drain_timeout',message:error.message});}phase.flushes+=flushes;phase.pendingMs={p50:percentile(phase.pendingSamples,.5),p95:percentile(phase.pendingSamples,.95),p99:percentile(phase.pendingSamples,.99)};phase.frameGapMs={p95:percentile(phase.frameGapSamples,.95),p99:percentile(phase.frameGapSamples,.99),max:Math.max(...phase.frameGapSamples)};delete phase.pendingSamples;delete phase.frameGapSamples;if(failures.length||sqlDiagnostics.length||errors.length||s.faults.length)break;
 }
 diskDelay=0;networkDelay=0;jitter=0;recordActivity(performance.now());
 const killed=s.f.sql.prepare("SELECT COUNT(*) n FROM normal_defeats WHERE monster_id LIKE 'golge-durable20-%'").get().n,rewards=s.f.sql.prepare("SELECT COUNT(*) n FROM normal_reward_claims WHERE monster_id LIKE 'golge-durable20-%'").get().n,final=s.f.sql.prepare('SELECT xp,quest_kills438 FROM players WHERE id=?').get(s.f.id),summary={durationMs:performance.now()-start,traceOffsetMs:start-testStarted,wire,jitterSeed,activity,phases,killed,rewards,baseline,final,ackMs:{movement:{p50:percentile(moves.map(r=>r.ackMs),.5),p95:percentile(moves.map(r=>r.ackMs),.95),p99:percentile(moves.map(r=>r.ackMs),.99),max:Math.max(0,...moves.map(r=>r.ackMs))},command:{p95:percentile(results.map(r=>r.ackMs),.95),max:Math.max(0,...results.map(r=>r.ackMs))}},statuses:Object.fromEntries([...new Set([...results,...moves].map(r=>r.action+':'+r.status+':'+(r.body.code??'')))].map(key=>[key,[...results,...moves].filter(r=>r.action+':'+r.status+':'+(r.body.code??'')===key).length])),results,moves,trace,failures,sqlDiagnostics,errors,faults:s.faults.map(f=>String(f.error??f))};
 writeEvidence(output,summary);t.diagnostic(JSON.stringify({...summary,results:results.length,moves:moves.length,trace:trace.length,wire:wire.length}));
 assertNoObservedFailure(summary);
 for(const interval of activity.filter(r=>r.durationMs>=50000))for(const key of ['killed','rewards','collected','xp','quest_kills438'])assert(interval.delta[key]>0,`sustained native activity ${key} missing at ${interval.at}ms`);
 if(totalDuration>=60000)assert(lastActivity.maxSpawnRound>1,'native recurring respawn required');
 assert.equal(errors.length,0);assert.equal(s.faults.length,0);assert(killed>5);assert.equal(rewards,killed,'each defeat rewarded exactly once');assert(final.xp>baseline.xp);assert(final.quest_kills438>baseline.quest_kills438);assert(results.some(r=>r.action==='collect'&&r.status===200));assert(moves.length>30);
 // Isolated continuous-input visual-gap regression bound, not a production
 // canary latency threshold. The pre-fix 238/280 ms cap stalls fail this gate.
 for(const phase of phases)assert(phase.maxShownGapMs<150,phase.name+' visible movement gap '+phase.maxShownGapMs+' ms');
});
