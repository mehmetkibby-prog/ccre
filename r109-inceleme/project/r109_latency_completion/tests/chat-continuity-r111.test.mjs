import test from 'node:test';
import assert from 'node:assert/strict';
const core=process.env.STUTTER_TREE+'/core511-source/scripts/core511';
const {httpActionFixture}=await import(core+'/tests/native-http-action-fixture.mjs');
const {until}=await import(core+'/tests/helpers.mjs');
const call=(s,body,headers={})=>s.module.default(s.f.request({path:'/api/chat',body,headers}));

test('plain world chat does not freeze or refresh a fighting actor while its earlier durable ACK is delayed',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),{core:c,f}=s;
 await c.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=1 WHERE id=?').run(f.id));
 const command=s.writer.command.bind(s.writer);let accepted=false,release;
 const hold=new Promise(r=>release=r);
 s.writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===f.id&&request.operation==='native_action'&&!accepted){accepted=true;await hold;}return ack;};
 let settled=false,response;
 try{
  s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));
  await until(()=>accepted,7000);
  const sending=call(s,{body:'Dunya sohbeti savasi durdurmasin',scope:'world'}).then(r=>{response=r;settled=true;});
  await until(()=>settled,5000);
  assert.equal(c.permanent.entries.size,0,'chat must not install a permanent combat freeze');
  assert.equal(response.status,200);const body=await response.json();
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM messages WHERE id=?').get(body.message.id).n,1);
  release();await sending;
  await until(()=>s.live.packets.some(p=>p.results?.some(r=>r.sequence===1)),5000);
  assert.equal((await s.view()).potions,1);
 }finally{release();s.writer.command=command;}
 assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('plain chat keeps CSRF, cooldown, durable ACK and event delivery',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),{core:c,f}=s;
 assert.equal((await call(s,{body:'Invalid csrf',scope:'world'},{'X-CSRF-Token':'bad'})).status,403);
 const durable=c.database.durableAfterCommit.bind(c.database);let release,entered=false,answered=false;
 const hold=new Promise(r=>release=r);
 c.database.durableAfterCommit=async()=>{await durable();entered=true;await hold;};
 let response;
 try{
  const sending=call(s,{body:'Kalici sohbet',scope:'world'}).then(r=>{response=r;answered=true;});
  await until(()=>entered,5000);assert.equal(answered,false);
  assert.equal(c.permanent.entries.size,0);
  release();await sending;
 }finally{release();c.database.durableAfterCommit=durable;}
 assert.equal(response.status,200);const body=await response.json();
 await until(()=>s.live.packets.some(p=>p.type==='event'&&p.payload?.event?.message?.id===body.message.id),5000);
 const second=await call(s,{body:'Cooldown preserved',scope:'world'});assert.equal(second.status,429);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM messages WHERE player_id=? AND body IN ('Kalici sohbet','Cooldown preserved')").get(f.id).n,1);
 assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('a slow chat filter/delivery never holds a simulation owner or its accepted commands',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),{core:c,f}=s;
 await c.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=1 WHERE id=?').run(f.id));
 const gate=c.nativeHttpAction,chat=gate.chat.bind(gate);let release,entered=false,answered=false;
 const hold=new Promise(r=>release=r);
 gate.chat=(session,payload,reauthorize,operation)=>chat(session,payload,reauthorize,async()=>{entered=true;await hold;return operation();});
 try{
  const sending=call(s,{body:'Yavas sohbet islemi',scope:'world'}).then(r=>{answered=true;return r;});
  await until(()=>entered,5000);assert.equal(c.permanent.entries.size,0);
  s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));
  await until(()=>s.live.packets.some(p=>p.results?.some(r=>r.sequence===1)),5000);
  assert.equal(s.live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1).status,200);
  assert.equal(answered,false);assert.equal((await s.view()).potions,1);
  release();assert.equal((await sending).status,200);
 }finally{release();gate.chat=chat;}
 assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('chat waits outside the coordinator for a background actor freeze, reauthorizes, and sends once',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),{core:c,f}=s,gate=c.nativeHttpAction,original=gate.chat.bind(gate);
 let release,entered=false,answered=false,reauthorizations=0,operations=0;
 const hold=new Promise(r=>release=r);
 // Background maintenance/solo transitions can hold an actor independently
 // of c.serial. A normal HTTP action through permanentPlayers would hide this race.
 const transition=c.permanent.durablePlayers([f.id],async()=>{entered=true;await hold;return null;});
 gate.chat=(session,payload,reauthorize,operation)=>original(session,payload,async()=>{reauthorizations++;return reauthorize();},async()=>{operations++;return operation();});
 let sending;
 try{
  await until(()=>entered,5000);
  sending=call(s,{body:'Gecisten sonra bir kez',scope:'world'}).then(r=>{answered=true;return r;});
  await until(()=>reauthorizations>0,5000);
  await new Promise(r=>setTimeout(r,100));assert.equal(answered,false,'temporary freeze must not become a chat HTTP500');assert.equal(operations,0);
  let free=false;const independent=c.serial(()=>{free=true;});await until(()=>free,1000);await independent;
  release();await transition;const response=await sending;assert.equal(response.status,200);await response.json();
  assert(reauthorizations>=2,'waiting cannot retain stale session authorization');assert.equal(operations,1);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM messages WHERE player_id=? AND body=?').get(f.id,'Gecisten sonra bir kez').n,1);
 }finally{release();await transition;await sending;gate.chat=original;}
 assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('a fenced error after native chat starts is never retried',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),gate=s.core.nativeHttpAction,original=gate.chat.bind(gate);let operations=0;
 gate.chat=(session,payload,reauthorize)=>original(session,payload,reauthorize,async()=>{operations++;throw Object.assign(Error('permanent_actor_fenced'),{code:'permanent_actor_fenced'});});
 try{assert.equal((await call(s,{body:'Islem yeniden oynatilmasin',scope:'world'})).status,500);assert.equal(operations,1);}
 finally{gate.chat=original;}
});
