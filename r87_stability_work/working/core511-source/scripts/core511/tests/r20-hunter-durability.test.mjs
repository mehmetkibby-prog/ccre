import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Core511Transport} from '../client-transport.mjs';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {ProcessStream} from '../process-stream.mjs';
import {randomUUID} from 'node:crypto';
import {until} from './helpers.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// The fixture still commits/syncs SQLite normally. Only acknowledgement of an
// already durable native write is delayed, never the contents/rules of a write.
test('native lethal hunter/reward writes and concurrent prediction under delayed durability',{timeout:120000},async t=>{
 const s=await nativeHttpHost(t,{realmSetup:async(host,seed)=>{
  const q=host.database.sqlite;q.prepare('UPDATE bot_due SET due_ms=? WHERE account_id=?').run(Date.now()+180000,seed.account.id);
  q.prepare("UPDATE players SET role='avci',area='forest',channel=1,x=2700,y=2025,hp=1000000,max_hp=1000000,level=40,is_gm=0,loadlab_run_id='',attack_one_at=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(seed.id);
  for(let i=0;i<72;i++)q.prepare("INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round,respawn_at) VALUES(?,?,'forest',1,?,?,12,12,1,0)").run('golge-durable20-'+i,'Hunter durability test '+i,2700+Math.cos(i)*35,2025+Math.sin(i)*35);
 }});
 await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));
 let diskDelay=0,networkDelay=0,phase=null,flushes=0;const originalDurable=s.host.database.durableAfterCommit.bind(s.host.database);
 s.host.database.durableAfterCommit=()=>{const duration=diskDelay;flushes++;return Promise.resolve(originalDurable()).then(async value=>{if(duration)await wait(duration);return value;});};
 t.after(()=>s.host.database.durableAfterCommit=originalDurable);
 class DirectSocket extends WebSocket{
  constructor(url){const u=new URL(url),ch=Number(u.pathname.split('/').at(-1)),row=s.supervisor.rows.get(ch),name='test-browser:'+randomUUID(),socket=new ProcessStream(row.child,{stream:name});row.child.send({type:'test-browser-connection',stream:name});super('ws://127.0.0.1'+u.pathname,{origin:s.f.origin,createConnection:()=>socket});t.after(()=>socket.destroy());}
  send(bytes,...args){const frame=JSON.parse(String(bytes));if(networkDelay&&frame.type==='input')setTimeout(()=>{if(this.readyState===1)super.send(bytes,...args);},networkDelay);else super.send(bytes,...args);}
  addEventListener(type,fn,...args){return super.addEventListener(type,type==='message'?event=>{if(networkDelay)setTimeout(()=>fn(event),networkDelay);else fn(event);}:fn,...args);}
 }
 const fetch=async(url,options={})=>{const u=new URL(url,s.f.origin),r=await s.http(u.pathname.split('core511-').at(-1),JSON.parse(options.body??'{}'));return Response.json(r,{status:r.status});};
 const client=new Core511Transport({fetch,WebSocket:DirectSocket,origin:s.f.origin,headers:()=>Object.fromEntries(s.f.request().headers)});t.after(()=>client.dispose());
 await client.replace('character',{channel:1});client.entrySelected=true;s.core.start();await client.image();
 const baseline=s.f.sql.prepare('SELECT xp,quest_kills438 FROM players WHERE id=?').get(s.f.id);
 const errors=[],results=[],moves=[],phases=[];let start=performance.now(),pending=[],lastPosition=null,lastShownAt=start,lastFrameAt=start,lastSend=new Map(),nextAttack=0,heldTarget=null,shown=null,claimed=new Set(),collected=new Set();
 const sendMethod=typeof client.sendInput==='function'?'sendInput':'sendActive',realSend=client[sendMethod].bind(client);client[sendMethod]=(...args)=>{const row=args[0]??client.active;if(row&&!row.queued&&!lastSend.has(row.sequence))lastSend.set(row.sequence,performance.now());return realSend(...args);};
 const realResult=client.result.bind(client);client.result=(result,...args)=>{const active=client.pendingInputs?.().find(row=>row.sequence===result.sequence)??client.active,now=performance.now();if(active?.sequence===result.sequence){const row={action:active.payload.action,status:result.status??200,ackMs:now-lastSend.get(active.sequence),at:now-start,phase:phase?.name,body:result.body??result};if(active.movement)moves.push(row);else results.push(row);}return realResult(result,...args);};
 client.subscribe((kind,value)=>{if(kind==='error')errors.push(value);});
 function send(payload){const created=performance.now(),currentPhase=phase;const p=client.command(payload).then(result=>{currentPhase.commands++;currentPhase.maxCommandMs=Math.max(currentPhase.maxCommandMs,performance.now()-created);if(payload.action==='attack'&&result.body.hits?.some(h=>h.killed))heldTarget=null;if(payload.action==='claim_rewards')for(const r of payload.rewardTargets)claimed.add(r.id+':'+r.spawnRound);if(payload.action==='collect')collected.add(payload.targetId);}).catch(error=>errors.push({code:error.code,message:error.message})).finally(()=>pending.splice(pending.indexOf(p),1));pending.push(p);}
 for(const settings of [{name:'normal',disk:0,net:30,ms:12000},{name:'disk60-rtt60',disk:60,net:30,ms:16000},{name:'disk60-rtt150',disk:60,net:75,ms:16000}]){
  diskDelay=settings.disk;networkDelay=settings.net;phase={name:settings.name,commands:0,frames:0,capFrames:0,maxPendingSeconds:0,maxShownGapMs:0,maxCommandMs:0,maxActiveAgeMs:0,flushes:-flushes};phases.push(phase);const end=performance.now()+settings.ms;lastShownAt=lastFrameAt=performance.now();lastPosition=null;
  while(performance.now()<end){const now=performance.now(),own=client.world?.players.find(p=>p.id===s.f.id);
   if(own){const direction=Math.floor((now-start)/1500)%2?1:-1,dt=Math.min(.05,(now-lastFrameAt)/1000);shown=client.predictFrame({own,seconds:dt},(p,seconds)=>({x:p.x+direction*180*seconds,y:p.y}));const seconds=client.prediction.pending.reduce((sum,p)=>sum+p.seconds,0);phase.maxPendingSeconds=Math.max(phase.maxPendingSeconds,seconds);if(seconds>=.5999)phase.capFrames++;if(lastPosition&&Math.hypot(shown.x-lastPosition.x,shown.y-lastPosition.y)>.05){phase.maxShownGapMs=Math.max(phase.maxShownGapMs,now-lastShownAt);lastShownAt=now;}lastPosition=shown;phase.frames++;}
   lastFrameAt=now;if(client.active)phase.maxActiveAgeMs=Math.max(phase.maxActiveAgeMs,now-(lastSend.get(client.active.sequence)??now));
   // Production attack and reward commands compete with independently generated
   // movement; target/body points are the rendered/predicted client positions.
   if(pending.length<2){const rewardTargets=s.f.sql.prepare("SELECT d.monster_id AS id,d.spawn_round AS spawnRound FROM normal_defeats d JOIN monster_participants p ON p.monster_id=d.monster_id AND p.spawn_round=d.spawn_round WHERE d.monster_id LIKE 'golge-durable20-%' AND d.rewards_completed_at=0 AND p.player_id=? LIMIT 10").all(s.f.id).filter(r=>!claimed.has(r.id+':'+r.spawnRound));const drop=s.f.sql.prepare("SELECT id FROM world_drops WHERE owner_id=? AND collectible_at<=? AND expires_at>? AND enchantments NOT LIKE '%pending%' LIMIT 1").get(s.f.id,Math.floor(Date.now()/1000),Math.floor(Date.now()/1000));
    if(rewardTargets.length){for(const r of rewardTargets)claimed.add(r.id+':'+r.spawnRound);send({action:'claim_rewards',rewardTargets});}
    else if(drop&&!collected.has(drop.id)){collected.add(drop.id);send({action:'collect',targetId:drop.id});}
    else if(now>=nextAttack){nextAttack=now+750;const target=client.world.monsters.find(m=>m.id===heldTarget&&m.hp>0)??client.world.monsters.find(m=>m.id.startsWith('golge-durable20-')&&m.hp>0);if(target){heldTarget=target.id;const point=client.position('monsters',target,now);send({action:'attack',targetId:target.id,spawnRound:target.spawn_round,ability:0,intentId:randomUUID(),x:shown?.x??own.x,y:shown?.y??own.y,targetX:point.x,targetY:point.y});}}
   }
   await wait(16);
  }
  await Promise.all(pending);await until(()=>!client.active&&!client.queue.length,15000);phase.flushes+=flushes;
 }
 diskDelay=0;networkDelay=0;
 const killed=s.f.sql.prepare("SELECT COUNT(*) n FROM normal_defeats WHERE monster_id LIKE 'golge-durable20-%'").get().n,rewards=s.f.sql.prepare("SELECT COUNT(*) n FROM normal_reward_claims WHERE monster_id LIKE 'golge-durable20-%'").get().n,final=s.f.sql.prepare('SELECT xp,quest_kills438 FROM players WHERE id=?').get(s.f.id),summary={durationMs:performance.now()-start,phases,killed,rewards,baseline,final,results,moves,errors,faults:s.faults.map(f=>String(f.error??f))};
 fs.writeFileSync(process.env.R20_DURABILITY_OUT??'/tmp/r20-hunter-durability.json',JSON.stringify(summary,null,2));t.diagnostic(JSON.stringify({...summary,results:results.length,moves:moves.length}));
 assert.equal(errors.length,0);assert.equal(s.faults.length,0);assert(killed>5);assert.equal(rewards,killed,'each defeat rewarded exactly once');assert(final.xp>baseline.xp);assert(final.quest_kills438>baseline.quest_kills438);assert(results.some(r=>r.action==='collect'&&r.status===200));assert(moves.length>30);
 // Isolated continuous-input visual-gap regression bound, not a production
 // canary latency threshold. The pre-fix 238/280 ms cap stalls fail this gate.
 for(const phase of phases)assert(phase.maxShownGapMs<150,phase.name+' visible movement gap '+phase.maxShownGapMs+' ms');
});
