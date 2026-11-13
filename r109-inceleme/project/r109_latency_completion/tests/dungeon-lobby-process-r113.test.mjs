import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';

test('normal-map dungeon UI polls use a fresh owner-fenced read and never enter the reward writer',{timeout:60000},async t=>{
 const s=await setup(t,{shared:true}),{f,world,core,writer,http,connect,faults}=s;await world.stopJobs();
 const ticket=await http('character',{channel:1});assert.equal(ticket.status,200);const live=await connect(ticket);
 let dungeonWrites=0,actorReads=0,lobbyReads=0;const command=writer.command.bind(writer),query=s.reader.query.bind(s.reader);
 writer.command=(peer,q)=>{if(q.operation==='dungeon')dungeonWrites++;return command(peer,q);};
 s.reader.query=(name,...args)=>{if(name==='kernel511_actor_world')actorReads++;if(name==='kernel511_dungeon_lobby_r113')lobbyReads++;return query(name,...args);};
 const revisions=()=>f.sql.prepare('SELECT revision FROM kernel511_actor_revision_r113 WHERE actor=?').get(f.id)?.revision??0;
 const before=revisions();
 for(let sequence=1;sequence<=4;sequence++){
  live.ws.send(JSON.stringify({type:'input',sequence,payload:{action:'dungeon',command:{action:'sync'}}}));
  await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===sequence))||faults.length,6000);
  assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
  const result=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);
  assert.equal(result.type,'dungeon');assert.equal(result.run,null,JSON.stringify(result));assert(result.towerInfo?.catalog?.length);assert(result.solo?.settings);
 }
 assert.equal(dungeonWrites,0,'a read-only UI poll must not create a durable command');
 assert.equal(actorReads,0,'a UI poll must not reload the complete actor');assert.equal(lobbyReads,4);
 assert.equal(revisions(),before,'a read must not advance the committed actor revision');
 const send=async(sequence,payload)=>{
  live.ws.send(JSON.stringify({type:'input',sequence,payload}));
  await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===sequence))||faults.length,6000);
  assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
  return live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);
 };
 const ordinaryQuery=s.reader.query;
 s.reader.query=(name,...args)=>name==='kernel511_dungeon_lobby_r113'?Promise.reject(Object.assign(Error('injected read failure'),{code:'read_worker_closed'})):ordinaryQuery(name,...args);
 assert.equal((await send(5,{action:'dungeon',command:{action:'sync'}})).code,'dungeon_read_unavailable_r113');
 s.reader.query=ordinaryQuery;
 assert.equal((await send(6,{action:'dungeon',command:{action:'sync'}})).run,null,'the next poll recovers without reconnect');
 let release;const held=new Promise(r=>release=r);let late;
 s.reader.query=(name,...args)=>name==='kernel511_dungeon_lobby_r113'?(late=ordinaryQuery(name,...args),held):ordinaryQuery(name,...args);
 assert.equal((await send(7,{action:'dungeon',command:{action:'sync'}})).code,'dungeon_read_unavailable_r113');
 await send(8,{action:'heartbeat'}); // Combat input processing resumes while the read is still held.
 release(await late);await new Promise(r=>setTimeout(r,30));s.reader.query=ordinaryQuery;
 assert.equal(live.packets.flatMap(p=>p.results??[]).filter(r=>r.sequence===7).length,1,'late response must not replace the settled UI result');
 assert.equal((await send(9,{action:'dungeon',command:{action:'sync'}})).run,null);
 const peer=core.processes.get(ticket.channel).peer;
 await assert.rejects(core.route(peer,'read_dungeon_lobby_r113',{actor:f.id,epoch:ticket.epoch+1}),/fenced/);
 assert.equal(faults.length,0);
});
