import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Core511Transport} from '../client-transport.mjs';
import {randomUUID} from 'node:crypto';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {ProcessStream} from '../process-stream.mjs';
import {until} from './helpers.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');

test('actual client transport predicts at 60 Hz while attack, claim and loot commands overlap on native HTTP/WS',{timeout:90000},async t=>{
 const duration=18000,s=await nativeHttpHost(t,{realmSetup:async(host,seed)=>{
  const sql=host.database.sqlite;sql.prepare('UPDATE bot_due SET due_ms=? WHERE account_id=?').run(Date.now()+120000,seed.account.id);
  sql.prepare("UPDATE players SET role='avci',area='forest',channel=1,x=2700,y=2025,hp=1000000,max_hp=1000000,level=40,is_gm=0,loadlab_run_id='',attack_one_at=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(seed.id);
  for(let i=0;i<20;i++)sql.prepare("INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round,respawn_at) VALUES(?,?,'forest',1,?,?,12,12,1,0)").run('golge-concurrent20-'+i,'Normal monster '+i,2700+Math.cos(i)*35,2025+Math.sin(i)*35);
 }});
 await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));
 const packets=[],errors=[],latencies=[],moves=[];let activeSent=null;
 class DirectSocket extends WebSocket {
  constructor(url){const parsed=new URL(url),channel=Number(parsed.pathname.split('/').at(-1)),child=s.supervisor.rows.get(channel).child,stream='test-browser:'+randomUUID(),connection=new ProcessStream(child,{stream});child.send({type:'test-browser-connection',stream});super('ws://127.0.0.1'+parsed.pathname,{origin:s.f.origin,createConnection:()=>connection});this.on('message',bytes=>{const packet=JSON.parse(bytes);packets.push(packet);for(const r of packet.results??[])if(activeSent?.sequence===r.sequence){latencies.push(performance.now()-activeSent.at);if(activeSent.action==='move')moves.push(latencies.at(-1));activeSent=null;}});}
  send(raw,...args){const p=JSON.parse(raw);if(p.type==='input')activeSent={sequence:p.sequence,action:p.payload.action,at:performance.now()};return super.send(raw,...args);}
 }
 const fetch=async(url,options={})=>{const u=new URL(url,s.f.origin),body=JSON.parse(options.body??'{}'),r=await s.http(u.pathname.split('core511-').at(-1),body);return Response.json(r,{status:r.status});};
 const client=new Core511Transport({fetch,WebSocket:DirectSocket,origin:s.f.origin,headers:()=>Object.fromEntries(s.f.request().headers),notify:(type,value)=>{if(type==='error')errors.push(value);}});t.after(()=>client.dispose());
 s.core.start();await client.replace('character',{channel:1});const baseline=s.f.sql.prepare('SELECT xp,quest_kills438 FROM players WHERE id=?').get(s.f.id);
 let attacks=0,claims=0,collections=0,largestQueue=0,maxPending=0,nextAttack=0,nextCollect=0,last=performance.now(),lastMoving=last,maxStall=0,direction=1;const pending=new Set(),failures=[];
 const submit=payload=>{const promise=client.command(payload);pending.add(promise);promise.then(result=>{if(result.status!==200)failures.push({action:payload.action,...result});if(payload.action==='attack'&&result.status===200){const targets=result.body.hits?.filter(h=>h.killed).map(h=>({id:h.id,spawnRound:h.spawnRound??payload.spawnRound}))??[];if(targets.length){claims++;submit({action:'claim_rewards',rewardTargets:targets});}}},error=>failures.push({action:payload.action,error:String(error)})).finally(()=>pending.delete(promise));return promise;};
 const start=performance.now();while(performance.now()-start<duration){
  const now=performance.now(),elapsed=now-start,dt=Math.min(.05,(now-last)/1000);last=now;const own=client.world.players.find(p=>p.id===s.f.id),before=client.prediction.position(now)??own;
  if(before.x>2730)direction=-1;if(before.x<2670)direction=1;const intent=direction,shown=client.predictFrame({own,seconds:dt},(p,seconds)=>({x:p.x+intent*90*seconds,y:p.y}));
  if(Math.abs(shown.x-before.x)>.01){maxStall=Math.max(maxStall,now-lastMoving);lastMoving=now;}
  maxPending=Math.max(maxPending,client.prediction.pending.reduce((n,p)=>n+p.seconds,0));largestQueue=Math.max(largestQueue,client.queue.length);
  if(elapsed>=nextAttack){nextAttack=elapsed+1100;const monster=client.world.monsters.find(m=>m.id.startsWith('golge-concurrent20-')&&m.hp>0);if(monster){attacks++;submit({action:'attack',targetId:monster.id,spawnRound:monster.spawn_round,ability:0,intentId:'concurrent20-'+attacks});}}
  if(elapsed>=nextCollect){nextCollect=elapsed+350;const drop=s.f.sql.prepare("SELECT id FROM world_drops WHERE owner_id=? AND collectible_at<=? AND expires_at>? AND enchantments NOT LIKE '%pending%' LIMIT 1").get(s.f.id,Math.floor(Date.now()/1000),Math.floor(Date.now()/1000));if(drop){collections++;submit({action:'collect',targetId:drop.id});}}
  assert.equal(client.ready,true,'connection lost during input overlap');assert.equal(s.faults.length,0,JSON.stringify(s.faults));await new Promise(r=>setTimeout(r,16));
 }
 await until(()=>pending.size===0&&!client.active&&client.queue.length===0,10000);const after=s.f.sql.prepare('SELECT xp,quest_kills438 FROM players WHERE id=?').get(s.f.id);
 const evidence={realBrowser:false,testKind:'production browser transport and native HTTP handler/WS processes over ProcessStream; 60Hz input scheduler',durationMs:performance.now()-start,attacks,claims,collections,baseline,after,largestQueue,maxPredictionSeconds:maxPending,maxDisplayedMovementGapMs:maxStall,maxMoveAckMs:Math.max(0,...moves),movementAcks:moves.length,commandAcks:latencies.length,failures,errors,passed:false};
 evidence.passed=attacks>5&&after.xp>baseline.xp&&after.quest_kills438>baseline.quest_kills438&&failures.length===0&&errors.length===0&&moves.length>50&&maxPending<.6&&maxStall<600;
 fs.writeFileSync(process.env.R20_CLIENT_EVIDENCE??'/tmp/r20-client-concurrent-process.json',JSON.stringify(evidence,null,2));assert.equal(evidence.passed,true,JSON.stringify(evidence));
});
