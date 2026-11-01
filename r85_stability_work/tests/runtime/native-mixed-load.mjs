// Bounded local diagnostics. This is not full-game or browser capacity acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const core=new URL('core511-source/scripts/core511/',pathToFileURL((process.env.R85_RUNTIME_TREE??new URL('./r84-baseline/',import.meta.url).pathname)+'/'));
const {nativeHttpHost}=await import(new URL('tests/native-http-host-fixture.mjs',core));
const {realmStartupConfig}=await import(new URL('tests/native-realm-startup-fixture.mjs',core));
const {put}=await import(new URL('tests/pvp-fixture.mjs',core));
const {nativeTokenHash}=await import(new URL('entry-writer.mjs',core));
const {PROTOCOL}=await import(new URL('contract.mjs',core));
const {sourceIdentity}=await import(new URL('source-identity.mjs',core));
const {Core511Transport}=await import(new URL('client-transport.mjs',core));
const {ProcessStream}=await import(new URL('process-stream.mjs',core));
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const realistic=process.env.R85_LOAD_REALISTIC==='1';
const count=Number(process.argv[2]??1),seconds=Number(process.argv[3]??30);
assert([1,10,30,50,100].includes(count));assert(seconds>=10&&seconds<=180);
const label=process.env.R85_RUNTIME_LABEL??'r84';assert(/^[a-z0-9-]+$/.test(label));
const out=new URL(`../../evidence/native-mixed-load-${label}-${count}.json`,import.meta.url);
const hash=sourceIdentity().sha256;assert.equal(hash,process.env.R85_EXPECT_CORE_SHA??'a0e0bcdfd87717a3d5129a0a30d29bda5a4f85639a2b68773af556f19bda6365');
const cleanups=[],scope={after:fn=>cleanups.push(fn)},players=[],clients=[],errors=[],samples=[],rankBootstrap=[],runId=randomUUID();
let abortRun;
const interrupted=new Promise((_,reject)=>{abortRun=signal=>reject(Error('diagnostic_aborted_by_'+signal));});
// Install before the timed window; setup is awaited before using this promise.
interrupted.catch(()=>{});
process.once('SIGTERM',()=>abortRun('SIGTERM'));process.once('SIGINT',()=>abortRun('SIGINT'));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const summary=values=>{const a=[...values].sort((a,b)=>a-b),p=f=>a[Math.max(0,Math.ceil(a.length*f)-1)]??null;return {count:a.length,p50:p(.5),p95:p(.95),p99:p(.99),max:a.at(-1)??null};};
const harnessPins=Object.fromEntries(['native-mixed-load.mjs','run.py','r84-fixture-loader.mjs','register-r84-fixture.mjs'].map(name=>[name,createHash('sha256').update(fs.readFileSync(new URL(name,import.meta.url))).digest('hex')]));
let s,started,stopping=false,timer,queueTimer,setupHeartbeat,progressTimer,report={runId,players:count,seconds,coreSHA256:hash,harnessPins,nodeVersion:process.version,nodeExecArgv:process.execArgv,mainEagerStartup:process.execArgv.includes('--no-lazy'),realisticTransport:realistic,passed:false,fullGameAcceptance:false,liveTouched:false};
function request(p,action,body={}){return new Request(s.f.origin+'/api/realtime/core511-'+action,{method:'POST',headers:{Origin:s.f.origin,Cookie:'__Host-yasam-session='+p.token+'; __Host-yasam-csrf='+p.csrf,'X-CSRF-Token':p.csrf,'X-Game-Instance':p.instance,'Content-Type':'application/json'},body:JSON.stringify({protocol:PROTOCOL,...body})});}
function send(c,payload){assert.equal(c.pending.size,0);const sequence=++c.sequence;c.pending.set(sequence,{action:payload.action,at:performance.now()});if(payload.action==='attack')c.lastAttackAt=performance.now();c.live.ws.send(JSON.stringify({type:'input',sequence,payload}));}
function clientCommand(c,payload){
 if(c.commandPending)return false;c.commandPending=true;if(payload.action==='attack')c.lastAttackAt=performance.now();
 c.clientTransport.command(payload).then(result=>{
  if(result.status>=200&&result.status<300)c.successful[payload.action]=(c.successful[payload.action]??0)+1;
  if(payload.action==='collect'&&result.status<300)c.collected.add(payload.targetId);
 },error=>{if(!stopping)errors.push({kind:'client-command',actor:c.p.id,action:payload.action,code:error.code??error.message});}).finally(()=>{c.commandPending=false;});return true;
}
async function connectActualTransport(c,ticket){
 const p=c.p,row=s.supervisor.rows.get(p.channel),stream='test-browser:'+randomUUID(),socket=new ProcessStream(row.child,{stream});
 await new Promise((resolve,reject)=>row.child.send({type:'test-browser-connection',stream},error=>error?reject(error):resolve()));
 const Socket=class extends WebSocket {constructor(url){super(url.replace(/^wss:/,'ws:'),{origin:s.f.origin,createConnection:()=>socket});}};
 const headers=()=>({Origin:s.f.origin,Cookie:'__Host-yasam-session='+p.token+'; __Host-yasam-csrf='+p.csrf,'X-CSRF-Token':p.csrf,'X-Game-Instance':p.instance,'Content-Type':'application/json'});
 const transport=new Core511Transport({fetch:(url,options)=>s.core.http(new Request(url,options)),WebSocket:Socket,origin:s.f.origin,headers,notify:(kind,value)=>{if(kind==='error'&&!stopping)errors.push({kind:'client-transport',actor:p.id,value});}});
 c.clientTransport=transport;const sendInput=transport.sendInput.bind(transport),rejectInput=transport.rejectInput.bind(transport);
 transport.rejectInput=function(input,code){if(input){c.pending.delete(input.sequence);if(!stopping)c.cancelledInputs.push({sequence:input.sequence,action:input.payload?.action,code,offset:performance.now()-started});}return rejectInput(input,code);};
 transport.sendInput=function(input){if(input&&!input.queued&&!c.pending.has(input.sequence)){c.pending.set(input.sequence,{action:input.payload.action,at:performance.now()});c.sequence=Math.max(c.sequence,input.sequence);}return sendInput(input);};
 await transport.open(ticket);await transport.image();
 const wireSend=transport.ws.send.bind(transport.ws);transport.ws.send=function(bytes,...args){const packet=JSON.parse(String(bytes));if(packet.type==='motion')c.motionFrames++;c.sentBytes=(c.sentBytes??0)+Buffer.byteLength(bytes);return wireSend(bytes,...args);};
 cleanups.push(()=>{transport.dispose();socket.destroy();});return {ws:transport.ws,packets:[]};
}
function realisticFrame(c,at){
 const transport=c.clientTransport,own=transport.world?.players?.find(p=>p.id===c.p.id);if(!own||!transport.ready)return;
 const elapsed=at-started,gap=at-(c.lastFrameAt??at-50),dt=Math.min(.1,Math.max(0,gap/1000));c.maxFrameGapMs=Math.max(c.maxFrameGapMs??0,gap);c.lastFrameAt=at;c.inputFrames=(c.inputFrames??0)+1;
 const beforePending=transport.prediction.pending.reduce((n,row)=>n+row.seconds,0),limitedInputMs=Math.max(0,dt-Math.max(0,.6-beforePending))*1000;
 if(limitedInputMs>1e-4){c.predictionLimitedFrames=(c.predictionLimitedFrames??0)+1;c.predictionLimitedInputMs=(c.predictionLimitedInputMs??0)+limitedInputMs;}
 // Feed the real transport/prediction at 20 Hz. It independently enforces
 // 200 ms authoritative movement, 50 ms previews, two slots and 600 ms cap.
 transport.predictFrame({own,seconds:dt,frameAt:at},(point,seconds)=>{
  const target={x:c.p.x+Math.sin(elapsed/900)*24,y:c.p.y+Math.cos(elapsed/900)*24},dx=target.x-point.x,dy=target.y-point.y,distance=Math.hypot(dx,dy),step=Math.min(distance,100*seconds);
  return distance?{x:point.x+dx/distance*step,y:point.y+dy/distance*step}:point;
 });
 const capped=transport.prediction.pending.reduce((n,row)=>n+row.seconds,0)>=.599;
 if(capped){if(c.predictionCapStart==null){c.predictionCapStart=at;c.predictionCapEpisodes=(c.predictionCapEpisodes??0)+1;}c.predictionCapMs=(c.predictionCapMs??0)+gap;c.maxPredictionCapMs=Math.max(c.maxPredictionCapMs??0,at-c.predictionCapStart);}else {if(c.predictionCapStart!=null)c.maxPredictionCapMs=Math.max(c.maxPredictionCapMs??0,at-c.predictionCapStart);c.predictionCapStart=null;}
 if(c.commandPending)return;
 if(own.hp<=own.max_hp*.35&&Number(own.potions)>0&&at-(c.lastPotionAt??-Infinity)>=2000){c.lastPotionAt=at;clientCommand(c,{action:'use_potion'});return;}
 if(c.kills<2&&elapsed>2000+c.kills*10000&&at-c.lastAttackAt>=1300){clientCommand(c,{action:'attack',targetId:c.p.targetId+'-lethal-'+c.kills++,spawnRound:17,ability:0,intentId:randomUUID()});return;}
 if(c.collects<2&&elapsed>4000+c.collects*12000){clientCommand(c,{action:'collect',targetId:c.p.drops[c.collects++]});return;}
 if(at-(c.lastHeartbeatAt??-Infinity)>=5000){c.lastHeartbeatAt=at;clientCommand(c,{action:'heartbeat'});return;}
 const drops=transport.world?.drops??transport.world?.worldDrops??[];
 const drop=drops.find(d=>(d.owner_id??d.ownerId)===c.p.id&&!c.p.drops.includes(d.id)&&!c.collected.has(d.id)&&Number(d.collectible_at??0)<=Date.now()/1000&&Math.hypot(d.x-own.x,d.y-own.y)<=100);
 if(drop&&at-(c.lastCollectAt??-Infinity)>=200){c.lastCollectAt=at;clientCommand(c,{action:'collect',targetId:drop.id,automatic:true});return;}
 if(at-c.lastAttackAt>=1300){const targets=c.kills>=2?[c.p.targetId+'-lethal-0',c.p.targetId+'-lethal-1',c.p.targetId]:[c.p.targetId],target=targets.map(id=>transport.world?.monsters?.find(m=>m.id===id)).find(m=>m&&m.hp>0&&Math.hypot(m.x-own.x,m.y-own.y)<=100);if(target)clientCommand(c,{action:'attack',targetId:target.id,spawnRound:target.spawn_round??target.spawnRound,ability:0,intentId:randomUUID()});}
}
try {
 s=await nativeHttpHost(scope,{realmSetup:async(host,seed)=>{
  const realm=realmStartupConfig(scope,host);await realm.prepare();
  await host.database.atomic(()=>{
   const sql=host.database.sqlite,template=sql.prepare('SELECT * FROM players WHERE id=?').get(seed.id),now=Date.now();
   sql.exec('UPDATE players SET last_seen=0; DELETE FROM game_presence');
   for(let n=0;n<count;n++){
    const id=runId+':'+n,accountId=id+':account',channel=n%4+1,index=Math.floor(n/4),x=2700+(index%5)*28,y=2025+Math.floor(index/5)*28,token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex'),instance=randomUUID(),targetId='golge-load-'+runId+'-'+n;
    put(sql,'accounts',{...seed.account,id:accountId,username:'native'+n,username_normalized:'native'+n,email:'native'+n+'@fixture.invalid',email_normalized:'native'+n+'@fixture.invalid'});
    put(sql,'players',{...template,id,account_id:accountId,name:'Native'+n,channel,area:'forest',x,y,hp:100000,max_hp:1000000,potions:realistic?64:2,gems:1000,essence:1000,attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0,last_seen:0,loadlab_run_id:'',...(realistic&&n%2===0?{level:40,rank_tier:0,rank_xp:0,rank_started_at:0,rank_forest:50,rank_frozen:50,rank_black:50,rank_ancient:50}:{})});
    if(realistic&&n%2===0){
     const read=()=>({...sql.prepare('SELECT level,rank_tier,rank_xp,rank_started_at,rank_forest,rank_frozen,rank_black,rank_ancient,rank_unlocked,hp,max_hp,hp_revision FROM players WHERE id=?').get(id)}),before=read();
     // Exercise the actual native level-entry and quest-completion triggers.
     // Directly inserting level65 leaves rank_started_at=0 and creates an
     // impossible established-rank fixture that reloads on its first kill.
     sql.prepare('UPDATE players SET level=65 WHERE id=?').run(id);const afterLevelEntry=read();
     assert.equal(before.level,40);assert.equal(before.rank_started_at,0);assert.equal(afterLevelEntry.level,65);assert(afterLevelEntry.rank_started_at>0);
     sql.prepare('UPDATE players SET rank_forest=rank_forest WHERE id=?').run(id);
     assert.equal(read().rank_tier,1);
     // Preserve the existing arranged stress HP/XP; do not warm combat.
     sql.prepare('UPDATE players SET rank_xp=100,hp=100000,max_hp=1000000 WHERE id=?').run(id);
     const after=read();assert.equal(after.rank_tier,1);assert.equal(after.rank_xp,100);assert.equal(after.rank_started_at,afterLevelEntry.rank_started_at);
     rankBootstrap.push({actor:id,before,afterLevelEntry,after});
    }
    put(sql,'auth_sessions',{token_hash:nativeTokenHash(token),csrf_hash:nativeTokenHash(csrf),account_id:accountId,created_at:Math.floor(now/1000),last_seen_at:Math.floor(now/1000),expires_at:Math.floor(now/1000)+3600,security_version:seed.account.security_version});
    put(sql,'game_presence',{account_id:accountId,token_hash:nativeTokenHash(token),instance_id:instance,expires_at_ms:now+40000,chat_after_id:0});
    for(const [suffix,hp] of [['',100000000],['-lethal-0',1],['-lethal-1',1]])put(sql,'monsters',{id:targetId+suffix,name:'Gölge',area:'forest',channel,x:x+20,y,hp,max_hp:hp,spawn_round:17,last_damaged_at_ms:now,last_regen_at_ms:now});
    const drops=[];
    for(let j=0;j<2;j++){const drop=id+':drop:'+j;drops.push(drop);put(sql,'world_drops',{id:drop,owner_id:id,monster_id:targetId,kind:'weathered_iron',item_name:'Fixture material',rarity:'white',power:0,amount:3,role:null,enchantments:'[]',x,y,expires_at:Math.floor(now/1000)+600,collectible_at:Math.floor(now/1000)});}
    players.push({id,accountId,channel,x,y,token,csrf,instance,targetId,drops});
   }
  });
 }});
 await s.host.database.atomic(()=>{for(const p of players)globalThis.__colLaunch.grant(p.accountId,true);});
 s.core.start();await s.world.startJobs();
 if(realistic)setupHeartbeat=setInterval(()=>{for(const c of clients)if(c.clientTransport?.ready&&!c.commandPending)clientCommand(c,{action:'heartbeat'});},5000);
 for(const p of players){
  // Each account begins its fixture session immediately before its first join.
  // Already joined actors keep ordinary server heartbeats during admission.
  await s.host.database.atomic(()=>s.host.database.sqlite.prepare('UPDATE game_presence SET expires_at_ms=? WHERE account_id=?').run(Date.now()+40000,p.accountId));
  const response=await s.core.http(request(p,'character',{channel:p.channel})),ticket=await response.json();assert.equal(response.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,p.channel);
  const c={p,sequence:0,pending:new Map(),turn:0,potion:false,kills:0,collects:0,lastAttackAt:-Infinity,lastMoveAck:null,maxMoveAckGap:0,commandPending:false,successful:{},collected:new Set(),motionFrames:0,cancelledInputs:[]};clients.push(c);
  const live=realistic?await connectActualTransport(c,ticket):await s.connect(ticket);c.live=live;
  live.ws.on('close',(code,reason)=>{if(!stopping)errors.push({kind:'disconnect',actor:p.id,code,reason:String(reason)});});
  live.ws.on('message',bytes=>{const packet=JSON.parse(bytes);c.receivedBytes=(c.receivedBytes??0)+bytes.length;if(packet.type==='event'&&!realistic){live.ws.send(JSON.stringify({type:'event_ack',ids:[packet.id]}));}
   if(realistic&&packet.type==='not_queued')c.pending.delete(packet.sequence);
   if(realistic&&packet.type==='rejected'){const pending=c.pending.get(packet.sequence);c.pending.delete(packet.sequence);errors.push({kind:'rejected-input',actor:p.id,action:pending?.action,code:packet.code});}
   for(const result of packet.results??[]){const pending=c.pending.get(result.sequence);if(!pending)continue;c.pending.delete(result.sequence);const at=performance.now();samples.push({actor:p.id,channel:p.channel,sequence:result.sequence,action:pending.action,ms:at-pending.at,offset:pending.at-started,status:result.status??200});
    if(pending.action==='move'){if(c.lastMoveAck!==null)c.maxMoveAckGap=Math.max(c.maxMoveAckGap,at-c.lastMoveAck);c.lastMoveAck=at;}
    if(result.status>=400||result.error||result.body?.error||result.body?.ok===false)errors.push({kind:'result',actor:p.id,action:pending.action,status:result.status,body:result.body,error:result.error});
   }live.packets.length=0;
  });
 }
 clearInterval(setupHeartbeat);setupHeartbeat=null;
 while(clients.some(c=>c.commandPending))await pause(20);
 report.rankBootstrap={method:'Native level40→65 UPDATE triggers rank_started_at; native rank quest trigger awards tier1; existing arranged highHP and rankXP then seeded. No gameplay combat warmup.',actors:rankBootstrap};report.setupHeartbeats=clients.reduce((n,c)=>n+(c.successful.heartbeat??0),0);samples.length=0;
 const before=await s.core.diagnostics.sample();await s.core.diagnostics.beginLoad(runId);started=performance.now();
 const queueSamples=[],commandHolds=[];
 queueTimer=setInterval(()=>{const at=performance.now(),jobs=s.host.database.writeQueue??[],oldest=jobs.reduce((age,job)=>Math.max(age,Number.isFinite(job.queuedAt477)?at-job.queuedAt477:0),0);queueSamples.push({offset:at-started,writerDepth:jobs.length,oldestWriterAgeMs:oldest,mainRssBytes:process.memoryUsage().rss,maxClientQueue:Math.max(0,...clients.map(c=>c.clientTransport?.queue.length??0)),maxClientPending:Math.max(0,...clients.map(c=>c.pending.size))});for(const c of clients)for(const [sequence,pending] of c.pending)if(at-pending.at>=600)commandHolds.push({actor:c.p.id,sequence,action:pending.action,ageMs:at-pending.at,offset:at-started});},100);
 const writerAcks=[],readerQueries=[],command=s.writer.command.bind(s.writer),query=s.reader.query.bind(s.reader);
 s.writer.command=async(...args)=>{const at=performance.now();try{return await command(...args);}finally{writerAcks.push({ms:performance.now()-at,offset:at-started,operation:args[1]?.operation,action:args[1]?.payload?.input?.action});}};
 s.reader.query=async(name,...args)=>{const at=performance.now();try{return await query(name,...args);}finally{readerQueries.push({name,ms:performance.now()-at,offset:at-started});}};
 timer=setInterval(()=>{for(const c of clients){if(realistic){realisticFrame(c,performance.now());continue;}if(c.pending.size||c.live.ws.readyState!==1)continue;const elapsed=performance.now()-started;let payload;
  if(!c.potion){c.potion=true;payload={action:'use_potion'};}
  else if(c.kills<2&&elapsed>2000+c.kills*10000&&performance.now()-c.lastAttackAt>=1300){payload={action:'attack',targetId:c.p.targetId+'-lethal-'+c.kills++,spawnRound:17,ability:0,intentId:randomUUID()};}
  else if(c.collects<2&&elapsed>4000+c.collects*12000){payload={action:'collect',targetId:c.p.drops[c.collects++]};}
  else if(c.turn%12===0)payload={action:'heartbeat'};
  else if(c.turn%2===0||performance.now()-c.lastAttackAt<1300)payload={action:'move',area:'forest',x:c.p.x+(c.turn%4===0?2:0),y:c.p.y};
  else payload={action:'attack',targetId:c.p.targetId,spawnRound:17,ability:0,intentId:randomUUID()};
  c.turn++;send(c,payload);
 }},realistic?50:500);
 console.log(JSON.stringify({event:'native_mixed_started',players:count,seconds,runId}));
 progressTimer=setInterval(()=>console.log(JSON.stringify({event:'native_mixed_progress',players:count,elapsedSeconds:(performance.now()-started)/1000,acks:samples.length,maxAckMs:samples.reduce((n,s)=>Math.max(n,s.ms),0),errors:errors.length,faults:s.faults.length,pending:clients.reduce((n,c)=>n+c.pending.size,0),predictionCapActors:clients.filter(c=>c.predictionCapStart!=null).length,writerQueue:s.host.database.writeQueue.length,rss:process.memoryUsage().rss})),15000);
 await Promise.race([pause(seconds*1000),interrupted]);clearInterval(timer);timer=null;for(const c of clients)c.clientTransport?.suspendPrediction();const end=performance.now()+10000;while(clients.some(c=>c.pending.size||c.commandPending||c.clientTransport?.pendingInputs().length||c.clientTransport?.queue.length)&&performance.now()<end)await pause(20);clearInterval(queueTimer);queueTimer=null;
 clearInterval(progressTimer);progressTimer=null;
 const measured=await s.core.diagnostics.endLoad(runId),sql=s.host.database.sqlite;
 const economics=players.map(p=>({actor:p.id,potions:sql.prepare('SELECT potions FROM players WHERE id=?').get(p.id).potions,expectedPotions:realistic?64-(clients.find(c=>c.p===p).successful.use_potion??0):1,progress:sql.prepare('SELECT level,xp,rank_tier,rank_xp FROM players WHERE id=?').get(p.id),material:sql.prepare("SELECT amount FROM dungeon_materials WHERE player_id=? AND kind='weathered_iron'").get(p.id)?.amount??0,dropsRemaining:sql.prepare('SELECT COUNT(*) n FROM world_drops WHERE id IN (?,?)').get(...p.drops).n,terminalLives:[0,1].map(j=>sql.prepare('SELECT hp,spawn_round FROM monsters WHERE id=?').get(p.targetId+'-lethal-'+j)),xpClaims:sql.prepare('SELECT COUNT(*) n FROM monster_xp_claims WHERE monster_id IN (?,?) AND player_id=? AND spawn_round=17').get(p.targetId+'-lethal-0',p.targetId+'-lethal-1',p.id).n,allOwnTargetKillClaims:sql.prepare('SELECT COUNT(*) n FROM monster_xp_claims WHERE monster_id IN (?,?,?) AND player_id=?').get(p.targetId,p.targetId+'-lethal-0',p.targetId+'-lethal-1',p.id).n}));
 const faults=s.faults.map(f=>({code:f.error?.code,message:f.error?.message,stack:f.error?.stack}));
 report={...report,passed:errors.length===0&&faults.length===0&&clients.every(c=>c.pending.size===0&&c.live.ws.readyState===1&&(!c.clientTransport||c.clientTransport.pendingInputs().length===0&&c.clientTransport.queue.length===0&&!c.commandPending))&&economics.every(e=>e.potions===e.expectedPotions&&e.material>=6&&e.dropsRemaining===0&&e.terminalLives.every(life=>life.hp===0||life.spawn_round>17)&&e.xpClaims===2),durationMs:performance.now()-started,transport:'actual WebSocket frames through ProcessStream to OS channel processes; not TCP/browser',owners:s.host.children.size,commandLatencyMs:summary(samples.map(r=>r.ms)),byAction:Object.fromEntries([...new Set(samples.map(r=>r.action))].map(action=>[action,summary(samples.filter(r=>r.action===action).map(r=>r.ms))])),writerAckMs:summary(writerAcks.map(r=>r.ms)),writerAcks,readerQueries,readerQueryWallMs:Object.fromEntries([...new Set(readerQueries.map(r=>r.name))].map(name=>[name,summary(readerQueries.filter(r=>r.name===name).map(r=>r.ms))])),errors,faults,unacknowledged:clients.reduce((n,c)=>n+c.pending.size,0),perActorMaximumMoveAckGapMs:clients.map(c=>({actor:c.p.id,ms:c.maxMoveAckGap})),economics,diagnosticsBefore:before,diagnosticsAfter:await s.core.diagnostics.sample(),measurement:measured,samples,sourceUnchanged:sourceIdentity().sha256===hash,limitations:['30-180s arranged actors with two native lethal hits and two seeded material drops per actor, then nonlethal combat. Not sustained natural loot progression.','Movement input scheduled at roughly 1 Hz mixed with other actions; movement ACK gap is not rendered player stall.','Signed central auth uses local verified fixture replies. Generator and measurements share the main process.','No browser FPS, WAN latency, dungeon/arena/guild/admin mix, complete static assets, or long-duration capacity acceptance.']};
 report.queueObservation={sampleEveryMs:100,samples:queueSamples,maxWriterDepth:Math.max(0,...queueSamples.map(r=>r.writerDepth)),maxOldestWriterAgeMs:Math.max(0,...queueSamples.map(r=>r.oldestWriterAgeMs)),maxMainRssBytes:Math.max(0,...queueSamples.map(r=>r.mainRssBytes)),commandHoldsOver600Ms:commandHolds,maxPendingCommandAgeMs:Math.max(0,...commandHolds.map(r=>r.ageMs)),scope:'Sampled main writer FIFO and input-await age; not browser visual stop measurement'};
 if(realistic){report.clientTransport={implementation:'Actual pinned Core511Transport + OwnPrediction, no simulated server acknowledgements',inputFrameIntervalMs:50,authoritativeMovementMinimumMs:200,motionPreviewMinimumMs:50,predictionLimitMs:600,attackMinimumMs:1300,eligiblePotionMinimumMs:2000,heartbeatIntervalMs:5000,rankedActorCount:Math.ceil(count/2),actors:clients.map(c=>({actor:c.p.id,motionFrames:c.motionFrames,sentBytes:c.sentBytes,receivedBytes:c.receivedBytes,successfulCommands:c.successful,maxMoveAckGapMs:c.maxMoveAckGap,inputFrames:c.inputFrames,maxGeneratorFrameGapMs:c.maxFrameGapMs,totalPredictionCapMs:c.predictionCapMs??0,maxPredictionCapEpisodeMs:c.maxPredictionCapMs??0,predictionCapEpisodes:c.predictionCapEpisodes??0,predictionLimitedFrames:c.predictionLimitedFrames??0,predictionLimitedInputMs:c.predictionLimitedInputMs??0,cancelledInputs:structuredClone(c.cancelledInputs),remainingCommandQueue:c.clientTransport.queue.length}))};report.limitations[0]='Actual transport input/command scheduling with arranged high-HP actors and targets, two seeded lethal rounds/material drops per actor plus natural repeated respawns/visible loot when available. Does not reproduce every natural encounter.';report.limitations[1]='Actual client transport and prediction run without a rendered DOM/canvas; movement ACK gaps and prediction limits are not measured visual FPS/stalls.';}
 report.runtimeCancelledInputCount=clients.reduce((n,c)=>n+c.cancelledInputs.length,0);report.passScope='Native economy checks, healthy transport/no faults or live input cancellation, drained input slots and unchanged core identity; latency and prediction caps are a separate performance gate.';report.ackSemantics='Wire input-to-result latency; attack202 is provisional. Writer waits and final durable economic checks are separate. Prediction cap episodes are sampled at50ms; unadvanced requested input time is computed from actual OwnPrediction pending seconds before advance. No rendered stall/FPS inference.';report.passed&&=report.sourceUnchanged&&errors.length===0&&s.faults.length===0&&report.runtimeCancelledInputCount===0;if(!report.passed)process.exitCode=1;
}catch(error){report={...report,error:{message:error.message,stack:error.stack},errors};process.exitCode=1;}
finally{
 stopping=true;clearInterval(timer);clearInterval(queueTimer);clearInterval(setupHeartbeat);clearInterval(progressTimer);for(const c of clients){c.clientTransport?.dispose();c.live?.ws.terminate();}const cleanupErrors=[];
 for(const cleanup of cleanups.toReversed())try{await cleanup();}catch(error){cleanupErrors.push(error.stack);}
 if(cleanupErrors.length){report.cleanupErrors=cleanupErrors;report.passed=false;process.exitCode=1;}
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({event:'native_mixed_finished',players:count,passed:report.passed,error:report.error?.message,errors:errors.length,p99:report.commandLatencyMs?.p99,max:report.commandLatencyMs?.max,out:out.pathname}));
}
