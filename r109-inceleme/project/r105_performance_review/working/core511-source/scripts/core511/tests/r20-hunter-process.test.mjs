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

test('native hunter basic shots and predicted walking publish hit HP without stale server state',{timeout:100000},async t=>{
 const s=await nativeHttpHost(t,{realmSetup:async(host,seed)=>{
  const q=host.database.sqlite;q.prepare('UPDATE bot_due SET due_ms=? WHERE account_id=?').run(Date.now()+180000,seed.account.id);
  q.prepare("UPDATE players SET role='avci',area='forest',channel=1,x=2700,y=2025,hp=1000000,max_hp=1000000,level=40,is_gm=0,loadlab_run_id='',attack_one_at=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(seed.id);
  for(let i=0;i<8;i++)q.prepare("INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round,respawn_at) VALUES(?,?,'forest',1,?,?,?, ?,1,0)").run('golge-hunter20-'+i,'Hunter test '+i,2900+i*5,2025,i<4?20000:12,i<4?20000:12);
 }});
 await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));
 let delay=0;
 class DirectSocket extends WebSocket{
  constructor(url){const u=new URL(url),ch=Number(u.pathname.split('/').at(-1)),row=s.supervisor.rows.get(ch),name='test-browser:'+randomUUID(),socket=new ProcessStream(row.child,{stream:name});row.child.send({type:'test-browser-connection',stream:name});super('ws://127.0.0.1'+u.pathname,{origin:s.f.origin,createConnection:()=>socket});t.after(()=>socket.destroy());}
  send(bytes,...args){const frame=JSON.parse(String(bytes));if(delay&&frame.type==='input')setTimeout(()=>{if(this.readyState===1)super.send(bytes,...args);},delay);else super.send(bytes,...args);}
  addEventListener(type,fn,...args){return super.addEventListener(type,type==='message'?event=>{if(delay)setTimeout(()=>fn(event),delay);else fn(event);}:fn,...args);}
 }
 const fetch=async(url,options={})=>{const u=new URL(url,s.f.origin),r=await s.http(u.pathname.split('core511-').at(-1),JSON.parse(options.body??'{}'));return Response.json(r,{status:r.status});};
 const client=new Core511Transport({fetch,WebSocket:DirectSocket,origin:s.f.origin,headers:()=>Object.fromEntries(s.f.request().headers)});t.after(()=>client.dispose());
 await client.replace('character',{channel:1});client.entrySelected=true;s.core.start();await client.image();
 const errors=[],attacks=[],snapshots=[],moves=[],observed=new Map();let start=performance.now(),pending=[],lastPosition=null,lastShownAt=start,maxShownGap=0,frameSteps=0;
 const realResult=client.result.bind(client);client.result=result=>{const active=client.active;if(active?.movement&&active.sequence===result.sequence)moves.push({status:result.status??200,at:performance.now()-start});return realResult(result);};
 client.subscribe((kind,value)=>{if(kind==='world'){for(const m of value.monsters??[])if(m.id.startsWith('golge-hunter20-'))observed.set(m.id,{hp:m.hp,at:performance.now()});}if(kind==='error')errors.push(value);});
 for(const latency of [0,30,75]){
  delay=latency;const untilTime=performance.now()+12000;let nextShot=0,shots=0;
  while(performance.now()<untilTime){
   const now=performance.now(),own=client.world?.players.find(p=>p.id===s.f.id);
   if(own){const direction=Math.floor((now-start)/1500)%2?1:-1;const shown=client.predictFrame({own,seconds:.016},(p,dt)=>({x:p.x+direction*180*dt,y:p.y}));if(lastPosition&&Math.hypot(shown.x-lastPosition.x,shown.y-lastPosition.y)>.05){maxShownGap=Math.max(maxShownGap,now-lastShownAt);lastShownAt=now;}lastPosition=shown;frameSteps++;}
   if(now>=nextShot&&pending.length<2){nextShot=now+675;const target=client.world.monsters.find(m=>m.id==='golge-hunter20-'+(shots%6)&&m.hp>0)??client.world.monsters.find(m=>m.id.startsWith('golge-hunter20-')&&m.hp>0);if(target){shots++;const at=performance.now(),hp=target.hp,p=client.command({action:'attack',targetId:target.id,spawnRound:target.spawn_round,ability:0,intentId:'hunter20-'+latency+'-'+shots}).then(result=>{const row={latency,ms:performance.now()-at,id:target.id,beforeHp:hp,...result};attacks.push(row);for(const hit of result.body.hits??[]){const found=observed.get(hit.id??hit.targetId??target.id);snapshots.push({id:target.id,hp:found?.hp,at:found?.at,ackAt:performance.now(),hit});}}).catch(error=>errors.push({code:error.code,message:error.message})).finally(()=>pending.splice(pending.indexOf(p),1));pending.push(p);}}
   await wait(16);
  }
  await Promise.all(pending);await until(()=>!client.active&&!client.queue.length,10000);
 }
 const killed=s.f.sql.prepare("SELECT COUNT(*) n FROM normal_defeats WHERE monster_id LIKE 'golge-hunter20-%'").get().n;
 const summary={durationMs:performance.now()-start,frameSteps,attacks:attacks.length,moveAcks:moves.length,maxShownGapMs:maxShownGap,maxAttackAckMs:Math.max(...attacks.map(a=>a.ms)),statuses:attacks.reduce((o,r)=>(o[r.status]=(o[r.status]??0)+1,o),{}),noHitResults:attacks.filter(r=>!(r.body.hits?.length)).map(r=>({status:r.status,body:r.body})),snapshots,killed,errors,faults:s.faults.map(f=>String(f.error??f))};
 fs.writeFileSync(process.env.R20_HUNTER_OUT??'/tmp/r20-hunter-process.json',JSON.stringify(summary,null,2));t.diagnostic(JSON.stringify({...summary,snapshots:summary.snapshots.length}));
 assert.equal(errors.length,0);assert.equal(s.faults.length,0);assert(attacks.length>30);assert(moves.length>50);assert(attacks.some(r=>r.body.hits?.length));assert(killed>0);assert(attacks.every(r=>r.status===200||r.status===429&&r.body.code==='basic_attack_cadence'),JSON.stringify(summary.noHitResults));
 for(const row of snapshots){const hitHp=row.hit.hp??row.hit.remainingHp;if(Number.isFinite(hitHp))assert(row.hp<=hitHp,'HP snapshot stale at attack ACK: '+JSON.stringify(row));}
});
