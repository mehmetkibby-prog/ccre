import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setup,extraPlayer,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import {sourceIdentity} from '../source-identity.mjs';

test('100 actors: 200 potion/heartbeat inputs collide with real boss death; CH4 early release never closes a channel',{timeout:120000},async t=>{
 const identity=sourceIdentity();
 const s=await setup(t,{shared:true,sharedCombat:{hp:1,boss:true}}),{f,world,writer,core,supervisor,http,connect,faults}=s;await world.stopJobs();for(const row of supervisor.rows.values())row.child.setMaxListeners(128);
 f.sql.exec('UPDATE players SET last_seen=0');
 const people=[{id:f.id,http:()=>http('ticket')}],clients=[];
 f.sql.prepare('UPDATE players SET hp=50000,max_hp=100000,potions=20,level=65 WHERE id=?').run(f.id);
 for(let i=0;i<100;i++){const p=i===0?people[0]:extraPlayer(s,i+2,undefined,{offline:true});if(i>0){people.push(p);f.sql.prepare('UPDATE players SET hp=50000,max_hp=100000,potions=20,level=65 WHERE id=?').run(p.id);}const ticket=await p.http();assert.equal(ticket.status,200,JSON.stringify({actor:p.id,ticket}));clients.push({...p,ticket,...await connect(ticket)});}
 assert.deepEqual([...writer.authority.counts()].sort(),[[1,25],[2,25],[3,25],[4,25]]);
 const old=[world.row,...supervisor.rows.values()],closed=[];for(const c of clients)c.ws.on('close',(code,reason)=>closed.push({id:c.id,code,reason:String(reason)}));
 const bridge=world.combat,prepare=bridge.prepare.bind(bridge),operations=[];let release,queued=false,resumed4=false,lockedSnapshot;
 const gate=new Promise(resolve=>release=resolve);t.after(()=>release());
 for(const row of core.processes.values()){
  const request=row.control.request.bind(row.control);
  row.control.request=async(method,payload,...rest)=>{const ack=await request(method,payload,...rest);if(method==='shared_release'){if(row.peer.channel===4)resumed4=true;else await gate;}return ack;};
 }
 const command=writer.command.bind(writer);writer.command=async(peer,request)=>{const held=bridge.blocking(peer,request);if(request.operation==='native_action')operations.push({key:request.operationId,actor:request.playerId,operation:request.operation,action:request.payload.input.action,phase:bridge.terminal?.phase??null,blocked:Boolean(held)});return command(peer,request);};
 bridge.prepare=async(...args)=>{const ack=await prepare(...args);if(queued)return ack;assert.equal(bridge.terminal.phase,'frozen');
  lockedSnapshot=await Promise.all([...supervisor.rows.values()].map(combatState));
  for(const c of clients){const first=c===clients[0]?2:1;c.first=first;c.ws.send(JSON.stringify({type:'input',sequence:first,payload:{action:'use_potion'}}));c.ws.send(JSON.stringify({type:'input',sequence:first+1,payload:{action:'heartbeat'}}));}
  queued=true;return ack;
 };
 clients[0].ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'shared-process511',spawnRound:1,ability:0,intentId:'terminal-collision-200'}}));
 try{
  await until(()=>bridge.actorConflicts.some(r=>r.channel===4&&r.phase==='refreshing')||faults.length,15000);assert.equal(faults.length,0,JSON.stringify(faults.map(x=>({code:x.error?.code,message:x.error?.message}))));assert(queued&&resumed4);assert(bridge.actorConflicts.some(r=>r.channel===4&&r.phase==='refreshing'));assert(!operations.some(r=>r.blocked));release();await world.startJobs();
  await until(()=>clients.every(c=>c.packets.flatMap(p=>p.results??[]).some(r=>r.sequence===c.first+1))||faults.length,20000);
  assert.equal(faults.length,0,JSON.stringify(faults.map(x=>({code:x.error?.code,message:x.error?.message}))));assert.equal(closed.length,0);assert.deepEqual([world.row,...supervisor.rows.values()],old);
  const results=clients.flatMap(c=>[c.first,c.first+1].map(seq=>({actor:c.id,sequence:seq,result:c.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===seq)})));
  assert.equal(results.length,200);assert(results.every(r=>r.result?.status===200),JSON.stringify(results.filter(r=>r.result?.status!==200)));
  await until(()=>f.sql.prepare('SELECT COUNT(*) n FROM boss_reward_claims WHERE boss_round=1 AND player_id=?').get(f.id).n===1||faults.length,10000);
  const receipts=f.sql.prepare("SELECT operation_id,response FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").all(),death=clients[0].packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(death.status,200);assert.equal(death.body.hits[0].hp,0);const deathReceipts=receipts.filter(r=>JSON.parse(r.response).result?.result?.body?.hits?.some(h=>h.id==='shared-process511'&&h.killed));assert.equal(deathReceipts.length,1);const bossDefeats=f.sql.prepare('SELECT COUNT(*) n FROM boss_defeats WHERE boss_round=1').get().n,bossClaims=f.sql.prepare('SELECT COUNT(*) n FROM boss_reward_claims WHERE boss_round=1 AND player_id=?').get(f.id).n;assert.equal(bossDefeats,1);assert.equal(bossClaims,1);assert.equal(f.sql.prepare("SELECT hp FROM monsters WHERE id='shared-process511'").get().hp,0);
  const potionJobs=operations.filter(r=>r.action==='use_potion');assert.equal(potionJobs.length,100);assert.equal(new Set(potionJobs.map(r=>r.key)).size,100);for(const job of potionJobs){const receipt=f.sql.prepare('SELECT response FROM kernel511_channel_receipts WHERE operation_id=?').get(job.key);assert.equal(JSON.parse(receipt.response).result.result.status,200);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(job.actor).potions,19);}
  const report={passed:true,sourceSha256:identity.sha256,sourceUnchanged:sourceIdentity().sha256===identity.sha256,players:100,channels:[25,25,25,25],collisions:200,potions:100,otherOperations:100,unacknowledged:0,channelClosures:closed.length,faults:0,terminalReceipts:deathReceipts.length,bossDefeats,bossClaims,terminalInput:death,actorWaits:bridge.actorWaits,actorRejections:bridge.actorRejections,conflicts:bridge.actorConflicts,lockedActors:lockedSnapshot.map(s=>s.players.filter(p=>p.external).length),unauthorizedWrites:operations.filter(r=>r.blocked).length,transport:'real HTTP Upgrade and WebSocket frames over private process IPC; not TCP'};
  fs.writeFileSync(new URL('../evidence/terminal-collision-200.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 }catch(error){const details={error:error.message,terminal:bridge.terminal?.phase,conflicts:bridge.actorConflicts,closed,faults:faults.map(f=>({code:f.error?.code,message:f.error?.message})),states:await Promise.all([...supervisor.rows.values()].map(r=>combatState(r).catch(e=>({error:e.message})))),clients:clients.map(c=>({id:c.id,channel:c.ticket.channel,first:c.first,results:c.packets.flatMap(p=>p.results??[]),other:c.packets.filter(p=>!['frame','event'].includes(p.type))}))};fs.writeFileSync(new URL('../evidence/terminal-collision-failure-r12.json',import.meta.url),JSON.stringify(details,null,2));throw error;}finally{release();}
});
