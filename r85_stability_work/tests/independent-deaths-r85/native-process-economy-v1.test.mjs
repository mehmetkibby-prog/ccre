import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {nativeHttpHost} from '../../working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {extraPlayer} from '../../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {put} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {until} from '../../working/core511-source/scripts/core511/tests/helpers.mjs';
import {sourceIdentity} from '../../working/core511-source/scripts/core511/source-identity.mjs';
import {readReceipt,replayValue} from '../../working/core511-source/scripts/core511/compact-receipt.mjs';
const candidate=process.env.R85_DEATH_BATCH_CANDIDATE==='1';
const control=(row,pause)=>new Promise((resolve,reject)=>{const request=randomUUID(),timer=setTimeout(()=>{row.child.off('message',listener);reject(Error('test-control-timeout'));},5000),listener=m=>{if(m?.type==='test-death-control'&&m.request===request){clearTimeout(timer);row.child.off('message',listener);resolve(m.snapshot);}};row.child.on('message',listener);row.child.send({type:'test-death-control',request,...(pause===undefined?{}:{pause})});});

test('five native independent lethal heads keep economy, all replies and one exact durable batch replay',{timeout:50000},async t=>{
 let release; t.after(()=>release?.());
 const base=sourceIdentity().sha256;assert.equal(base,'82a974b7e7ff1f0e1d657d553f34bc4cdd51ab589eb8ec34254b425e48e07ed4');
 const s=await nativeHttpHost(t,{channelEntry:new URL('./channel.mjs',import.meta.url).pathname,realmSetup:async(host)=>{const now=Date.now();for(let i=0;i<5;i++)put(host.database.sqlite,'monsters',{id:'golge-independent-r85-'+i,name:'Gölge',area:'forest',channel:1,x:2720+i*10,y:2025,hp:1,max_hp:1,spawn_round:17,last_damaged_at_ms:now,last_regen_at_ms:now});}});await s.world.stopJobs();const {f,host,writer,core,supervisor}=s,sql=f.sql;
 const actors=[{id:f.id,http:s.http},...Array.from({length:4},(_,i)=>extraPlayer(s,801+i))],now=Date.now();
 await host.database.atomic(()=>{
  for(const [i,p]of actors.entries()){
   sql.prepare("UPDATE players SET area='forest',channel=1,level=40,xp=0,x=?,y=2025,hp=100000,max_hp=100000,rank_tier=0,rank_xp=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,last_seen=? WHERE id=?").run(2700+i*10,Math.floor(now/1000),p.id);
   globalThis.__colLaunch.grant(sql.prepare('SELECT account_id FROM players WHERE id=?').get(p.id).account_id,true);
   p.target='golge-independent-r85-'+i;
  }
 });
 for(const p of actors){const ticket=await p.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));p.live=await s.connect(ticket);p.epoch=writer.authority.owner(p.id).epoch;}
 const row=supervisor.rows.get(1);await control(row,true);
 const captured=[],nativeCommand=writer.command.bind(writer);let held=false;
 const gate=new Promise(resolve=>release=resolve);
 writer.command=async(peer,request)=>{const ack=await nativeCommand(peer,request);if(request.operation==='attack'){captured.push({peer,request,ack});if(!held){held=true;await gate;}}return ack;};
 for(const p of actors)p.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:p.target,spawnRound:17,ability:0}}));
 let paused;for(let i=0;i<100;i++){paused=await control(row);if(paused.players.filter(p=>actors.some(a=>a.id===p.id)).every(p=>p.queue===1))break;await new Promise(resolve=>setTimeout(resolve,5));}
 assert(paused.players.filter(p=>actors.some(a=>a.id===p.id)).every(p=>p.queue===1));await control(row,false);
 await until(()=>held||s.faults.length,12000).catch(async error=>{fs.writeFileSync(new URL('../../evidence/independent-deaths-r85-debug.json',import.meta.url),JSON.stringify({paused,current:await control(row),packets:actors.map(p=>({id:p.id,packets:p.live.packets})),captured,faults:s.faults},null,2));throw error;});assert.equal(s.faults.length,0,s.faults.map(x=>x.error?.stack).join('\n'));
 const during=await control(row);assert(during.players.filter(p=>actors.some(a=>a.id===p.id)).every(p=>candidate?p.barrier:true));
 if(candidate){assert.equal(captured.length,1);assert.equal(captured[0].request.payload.batchAttacksR57.length,4);assert.equal(captured[0].ack.result.batchResultsR57.length,4);}
 for(const p of candidate?actors:[actors[0]])assert(!p.live.packets.some(packet=>packet.results?.some(r=>r.sequence===1&&r.body?.hits?.some(h=>h.killed))),'terminal reply before outer ACK delivery');
 release();await until(()=>actors.every(p=>p.live.packets.some(packet=>packet.results?.some(r=>r.sequence===1)))||s.faults.length,12000);
 assert.equal(s.faults.length,0,s.faults.map(x=>x.error?.stack).join('\n'));
 for(const p of actors){const replies=p.live.packets.flatMap(packet=>packet.results??[]).filter(r=>r.sequence===1);assert.equal(replies.length,1);assert.equal(replies[0].status,200,JSON.stringify(replies));assert(replies[0].body.hits.some(h=>h.id===p.target&&h.killed));}
 assert.equal(captured.length,candidate?1:5);
 const idJson=JSON.stringify(actors.map(p=>p.id)),targetJson=JSON.stringify(actors.map(p=>p.target));
 const snapshot=()=>({players:sql.prepare('SELECT id,xp,rank_xp,gems,quest_kills438,daily_monster_kills FROM players WHERE id IN(SELECT value FROM json_each(?)) ORDER BY id').all(idJson),monsters:sql.prepare('SELECT id,hp,spawn_round FROM monsters WHERE id IN(SELECT value FROM json_each(?)) ORDER BY id').all(targetJson),xp:sql.prepare('SELECT monster_id,spawn_round,player_id FROM monster_xp_claims WHERE monster_id IN(SELECT value FROM json_each(?)) ORDER BY monster_id,player_id').all(targetJson),claims:sql.prepare('SELECT monster_id,spawn_round,player_id FROM normal_reward_claims WHERE monster_id IN(SELECT value FROM json_each(?)) ORDER BY monster_id,player_id').all(targetJson),drops:sql.prepare('SELECT id,owner_id,monster_id,kind,item_name,rarity,power,amount,enchantments FROM world_drops WHERE monster_id IN(SELECT value FROM json_each(?)) ORDER BY id').all(targetJson)});
 const economic=snapshot();assert(economic.players.every(p=>p.xp>0));assert(economic.monsters.every(m=>m.hp===0));assert.equal(economic.xp.length,5);assert.equal(economic.claims.length,5);
 for(const entry of captured){const stored=readReceipt(sql,sql.prepare('SELECT response FROM kernel511_channel_receipts WHERE operation_id=?').get(entry.request.operationId).response),replay=await nativeCommand(entry.peer,entry.request);assert.deepEqual(replay,stored);assert.deepEqual(replay,JSON.parse(JSON.stringify(replayValue(entry.ack))));}assert.deepEqual(snapshot(),economic);
 const after=await control(row);assert(after.players.filter(p=>actors.some(a=>a.id===p.id)).every(p=>!p.barrier&&!p.suspended&&p.applied===1&&p.epoch===actors.find(a=>a.id===p.id).epoch));
 for(const p of actors)p.live.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'move',x:2700+actors.indexOf(p)*10,y:2025}}));
 await until(()=>actors.every(p=>p.live.packets.some(packet=>packet.results?.some(r=>r.sequence===2)))||s.faults.length,12000);assert.equal(s.faults.length,0);
 const report={passed:true,candidate,baseCore:base,sourceUnchanged:sourceIdentity().sha256===base,writerCommands:captured.length,attacks:5,metrics:after.metrics,economic,scope:'Five arranged native independent actors over actual WS/5 OS owners. Controlled queue admission; functional command-count proof, not a capacity or latency claim.'};
 fs.writeFileSync(new URL('../../evidence/independent-deaths-r85-'+(candidate?'candidate':'baseline')+'.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
});
