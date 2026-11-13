import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';
import {readDungeonLobbyR113} from '../working/core511-source/scripts/core511/dungeon-lobby-client-r113.mjs';

test('a held HTTP dungeon read does not hold the actor, writer or heartbeat; auth and epoch remain required',{timeout:60000},async t=>{
 const s=await setup(t,{shared:true}),{world,core,writer,http,connect,faults}=s;await world.stopJobs();
 const ticket=await http('character',{channel:1}),live=await connect(ticket);assert.equal(ticket.status,200);
 const body={epoch:ticket.epoch,channel:ticket.channel};
 let writes=0;const command=writer.command.bind(writer);writer.command=(peer,q)=>{if(q.operation==='dungeon')writes++;return command(peer,q);};
 const query=s.reader.query.bind(s.reader);let release,started=false;const held=new Promise(r=>release=r);
 s.reader.query=(name,...args)=>{if(name!=='kernel511_dungeon_lobby_r113')return query(name,...args);started=true;return held.then(()=>query(name,...args));};
 const read=http('dungeon-lobby',body);await until(()=>started,6000);
 const duplicate=await http('dungeon-lobby',body);assert.equal(duplicate.status,429);
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'heartbeat'}}));
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,6000);
 assert.equal(faults.length,0);assert.equal(writes,0);
 release();const answer=await read;assert.equal(answer.status,200,JSON.stringify(answer));assert.equal(answer.body.run,null);assert(answer.body.towerInfo.catalog.length);
 assert.equal((await http('dungeon-lobby',{...body,epoch:body.epoch+1})).status,503);
 const request=s.f.request({path:'/api/realtime/core511-dungeon-lobby',body:{protocol:'coreoflife-kernel-v1',...body}});
 const headers=new Headers(request.headers);headers.delete('cookie');
 const unauthorized=await core.http(new Request(request.url,{method:'POST',headers,body:await request.text()}));assert.notEqual(unauthorized.status,200);
 assert.equal(writes,0);assert.equal(faults.length,0);
});

function client(){let resolve;const pending=new Promise(r=>resolve=r);let calls=0;const events=[];return {resolve,events,get calls(){return calls;},c:{connection:1,epoch:2,world:{channel:1},ready:true,origin:'https://fixture.invalid',headers:()=>({}),assertAvailable(){},emit:(...a)=>events.push(a),fetch:()=>{calls++;return pending;}}};}
const reply=body=>Response.json({protocol:'coreoflife-kernel-v1',epoch:2,channel:1,body});
test('concurrent UI reads coalesce without touching combat state',async()=>{
 const x=client(),p=readDungeonLobbyR113(x.c),q=readDungeonLobbyR113(x.c);assert.equal(p,q);assert.equal(x.calls,1);
 assert.equal(x.c.active,undefined);x.resolve(reply({run:null,solo:{available:true}}));assert.equal((await p).run,null);assert.equal(x.events.length,1);assert.equal(x.c.lobbyReadR113,null);
});
test('a late lobby response cannot overwrite a newer room push or a replacement connection',async()=>{
 const x=client(),p=readDungeonLobbyR113(x.c),run={run:{id:'new-room'}};x.c.dungeonRevisionR113=1;x.c.dungeon=run;x.resolve(reply({run:null}));assert.equal(await p,run);assert.equal(x.events.length,0);
 const y=client(),q=readDungeonLobbyR113(y.c);y.c.connection=2;y.resolve(reply({run:null}));await assert.rejects(q,/owner_changed/);assert.equal(y.events.length,0);
});
test('only an authoritative active-room response selects the existing resident command',async()=>{
 const x=client(),p=readDungeonLobbyR113(x.c);x.resolve(Response.json({resident:true},{status:409}));assert.equal(await p,null);
 const y=client(),q=readDungeonLobbyR113(y.c);y.resolve(Response.json({code:'reader_failed'},{status:503}));await assert.rejects(q,/reader_failed/);assert.equal(y.c.halted,undefined);assert.equal(y.events.length,0);
});
test('an expired UI read ignores even a late response from a fetch that ignores abort',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const x=client(),p=readDungeonLobbyR113(x.c);t.mock.timers.tick(5001);await assert.rejects(p,/read_timeout/);x.resolve(reply({run:null}));await new Promise(r=>setImmediate(r));assert.equal(x.c.dungeon,undefined);assert.equal(x.events.length,0);assert.equal(x.c.lobbyReadR113,null);
});
