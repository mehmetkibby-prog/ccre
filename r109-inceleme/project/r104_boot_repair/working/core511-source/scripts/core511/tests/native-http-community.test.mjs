import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';

async function seed(s){const id=randomUUID(),now=Math.floor(Date.now()/1000),config={title:'Isolated community test',minimum:2,stages:[1,2,3].map(target=>({target,rewards:[{kind:'potions',amount:1},{kind:'gems',amount:7},{kind:'essence',amount:3}]}))};await s.host.database.atomic(()=>{put(s.f.sql,'community_runs',{id,config_json:JSON.stringify(config),start_at:now-60,end_at:now+3600,published:1,total:3,completed_at:now,revision:1,created_at:now});put(s.f.sql,'community_progress',{event_id:id,account_id:s.f.account.id,kills:2});});return id;}
const player=s=>s.f.sql.prepare('SELECT * FROM players WHERE id=?').get(s.f.id);
const call=(s,id,stage=0)=>s.module.default(s.f.request({path:'/api/community-event',body:{id,stage}}));
const claim=(s,id)=>s.f.sql.prepare('SELECT * FROM community_claims WHERE event_id=? AND account_id=? AND stage=0').get(id,s.f.account.id);

test('native community reward drains accepted potion, refreshes current resources and keeps account-scoped replay',{timeout:35000},async t=>{
 const s=await httpActionFixture(t),id=await seed(s),{f,core,writer}=s;await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=1 WHERE id=?').run(f.id));const before=player(s),command=writer.command.bind(writer);let accepted=false,answered=false,release;const gate=new Promise(r=>release=r);
 writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===f.id&&request.operation==='native_action'&&!accepted){accepted=true;await gate;}return ack;};
 try{s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>accepted,7000);const pending=call(s,id).finally(()=>answered=true);await until(()=>core.permanent.entries.get(f.id)?.phase==='freezing',5000);assert.equal(answered,false);assert.equal(claim(s,id),undefined);release();const r=await pending;assert.equal(r.status,200,await r.text());}finally{release();writer.command=command;}
 const after=player(s);assert.equal(after.potions,before.potions);assert.equal(after.gems,before.gems+7);assert.equal(after.essence,before.essence+3);assert.equal((await s.view()).potions,after.potions);assert.equal((await s.view()).essence,after.essence);assert.equal((await s.resources(f.id)).gems,after.gems);const receipt=claim(s,id);assert(receipt);
 const replay=await call(s,id);assert.equal(replay.status,200);assert.equal((await replay.json()).alreadyClaimed,true);assert.deepEqual(claim(s,id),receipt);assert.deepEqual(player(s),after);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0);
});

test('native community personal/global targets, integer stage, expiry and resource caps reject without grant or receipt',{timeout:35000},async t=>{
 const s=await httpActionFixture(t),id=await seed(s),{f,core}=s,sql=f.sql;
 for(const scenario of ['personal','total','expired','cap','stage']){
  await core.permanentPlayers([f.id],()=>{sql.prepare('UPDATE community_progress SET kills=? WHERE event_id=?').run(scenario==='personal'?0:2,id);sql.prepare('UPDATE community_runs SET total=?,end_at=? WHERE id=?').run(scenario==='total'?0:3,Math.floor(Date.now()/1000)+(scenario==='expired'?-72*3600:3600),id);sql.prepare('UPDATE players SET gems=? WHERE id=?').run(scenario==='cap'?2147483647:1000,f.id);});
  const before=player(s),r=await call(s,id,scenario==='stage'?'0':0);assert.equal(r.status,409,scenario+':'+await r.text());assert.deepEqual(player(s),before);assert.equal(claim(s,id),undefined);assert.equal((await s.resources(f.id)).gems,before.gems);
 }
 assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0);
});

for(const phase of ['before','after'])test('native community source SIGKILL '+phase+' COMMIT never doubles account reward',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),id=await seed(s),{host,supervisor,ticket,core,f}=s,source=supervisor.rows.get(ticket.channel),others=[s.world.row,...supervisor.rows.values()].filter(r=>r!==source),sql=f.sql,exec=sql.exec.bind(sql),durable=host.database.durableAfterCommit.bind(host.database),before=player(s);let killed=false;
 sql.exec=text=>{if(phase==='before'&&!killed&&text==='COMMIT'&&claim(s,id)){killed=true;source.child.kill('SIGKILL');throw Error('community_before_commit');}return exec(text);};
 host.database.durableAfterCommit=()=>{const result=durable();if(phase==='after'&&!killed&&claim(s,id)){killed=true;return Promise.resolve(result).then(()=>{source.child.kill('SIGKILL');throw Error('community_after_commit');});}return result;};
 try{assert.notEqual((await call(s,id)).status,200);}finally{sql.exec=exec;host.database.durableAfterCommit=durable;}
 assert(killed);assert.equal(Boolean(claim(s,id)),phase==='after');assert.equal(player(s).gems,before.gems+(phase==='after'?7:0));await until(()=>source.exited&&supervisor.rows.get(ticket.channel)!==source&&supervisor.rows.get(ticket.channel)?.state==='running'&&!core.permanent.entries.has(f.id),20000);assert(others.every(r=>!r.exited));const ticket2=await s.http('ticket');assert.equal(ticket2.status,200,JSON.stringify(ticket2));await s.connect(ticket2);const r=await call(s,id);assert.equal(r.status,200);assert.equal((await r.json()).alreadyClaimed,phase==='after');assert.equal(player(s).gems,before.gems+7);assert.equal(player(s).potions,before.potions+1);assert.equal((await s.resources(f.id)).gems,before.gems+7);
});
