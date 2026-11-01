import test from 'node:test';
import assert from 'node:assert/strict';
import {controlled} from './settlement-process-fixture.mjs';
import {extraPlayer,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import {localSettlement,localJoin} from './cold-local-settlement-fixture.mjs';

test('fresh native join rebalance after logout reads the current shared control before its original combat rejection',{timeout:30000},async t=>{
 const s=await controlled(t,{beforeCombat:async s=>{
  const other=extraPlayer(s,64);await s.core.permanentPlayers([other.id],()=>s.f.sql.prepare("UPDATE players SET area='bazaar',combat_lock_until_ms=0 WHERE id=?").run(other.id));const first=await other.http();assert.equal(first.status,200,JSON.stringify(first));const ticket=first.channel===s.ticket.channel?first:await other.http('transfer',{channel:s.ticket.channel});assert.equal(ticket.status,200,JSON.stringify(ticket));await s.connect(ticket);
 }}),{f,core,writer,http,ticket,world,release,checkpointPending,controlled:control,mid,faults}=s;let result,error;
 try{
  assert.equal((await http('logout')).status,200);assert.equal(writer.authority.admission(f.id),null);assert.notEqual(writer.authority.emptiest(),ticket.channel,'fixture requires the existing fresh-login rebalance');
  const pending=http('ticket').then(v=>result=v,e=>error=e);await until(()=>result||error||checkpointPending()||faults.length,7000);release();await pending;assert.ifError(error);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
  assert.equal(result.status,409,JSON.stringify(result));assert.equal(result.error,'Savaş sürerken kanal değiştiremezsin.');assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,500,'native stunned shared monster cannot hit during rejected fresh admission');assert.equal(f.sql.prepare('SELECT stun_until_ms FROM monsters WHERE id=?').get(mid).stun_until_ms,control.stun_until_ms);assert.equal(writer.authority.admission(f.id),null);assert(!world.combat.busy);assert(!core.sessions.has(f.id));
 }finally{release();}
});

test('fresh join reads a local guardian control applied after its old resident logged out',{timeout:30000},async t=>{
 const {f,writer,http,world,release,checkpointPending,stun,faults}=await localSettlement(t);let result,error;
 try{assert.equal((await http('logout')).status,200);assert.equal(writer.authority.admission(f.id),null);await stun();const pending=http('ticket').then(v=>result=v,e=>error=e);await until(()=>result||error||checkpointPending()||faults.length,7000);release();await pending;assert.ifError(error);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(result.status,409,JSON.stringify(result));assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,500,'local control changed after logout must precede original incoming settlement');assert.equal(writer.authority.admission(f.id),null);assert(!world.combat.busy);}finally{release();}
});

test('local transfer reads guardian control applied by another resident after the source freeze drained',{timeout:30000},async t=>{
 const {f,core,http,release,checkpointPending,stun,faults}=await localSettlement(t),control=core.processes.get(4).control,request=control.request.bind(control);let frozen=false,releaseFreeze,result,error;const gate=new Promise(r=>releaseFreeze=r);
 control.request=async(method,payload,...options)=>{const ack=await request(method,payload,...options);if(method==='freeze'&&payload.id===f.id&&!frozen){frozen=true;await gate;}return ack;};
 try{const pending=http('transfer',{channel:2}).then(v=>result=v,e=>error=e);await until(()=>frozen||faults.length,7000);assert(frozen);await stun();releaseFreeze();await until(()=>result||error||checkpointPending()||faults.length,7000);release();await pending;assert.ifError(error);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(result.status,409,JSON.stringify(result));assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,500,'local monster must stay current between actor freeze and native transfer SQL');assert.equal(core.transferGroups.size,0);}finally{releaseFreeze();release();}
});

test('native fresh join keeps local control locked through durable admission and the actual resident installation ACK',{timeout:30000},async t=>{
 const s=await localJoin(t),{f,core,writer,http,supervisor,world,guest,mid,release,checkpointPending,faults}=s,admit=writer.admit.bind(writer);let committed=false,releaseCommit,installed=false,releaseInstall,result,error;
 const commitGate=new Promise(r=>releaseCommit=r),installGate=new Promise(r=>releaseInstall=r),target=core.processes.get(writer.authority.emptiest()),request=target.control.request.bind(target.control);
 writer.admit=async(...args)=>{const ack=await admit(...args);if(args[0]===f.id&&ack.accepted!==false){committed=true;await commitGate;}return ack;};
 target.control.request=async(method,payload,...options)=>{const ack=await request(method,payload,...options);if(method==='admit'&&payload.identity.actor===f.id){installed=true;await installGate;}return ack;};
 try{
  const pending=http('ticket').then(v=>result=v,e=>error=e);await until(()=>checkpointPending()||result||error||faults.length,7000);assert(checkpointPending());assert.equal(writer.authority.admission(f.id),null);assert.equal(core.sessions.has(f.id),false);release();await until(()=>committed||result||error||faults.length,7000);assert(committed);assert(!result);assert(world.combat.busy);assert.equal(core.sessions.has(f.id),false);
  const row=[...world.combat.requests.values()].find(r=>r.coldGroup);assert(row);assert.throws(()=>world.combat.entry(row.source,{id:row.id,actor:f.id,epoch:row.source.epoch,proof:row.proof}),{code:'shared_bridge_lease_fenced'},'parent read cannot become a gameplay command');
  guest.live.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'attack',targetId:mid,spawnRound:17,ability:0,intentId:'after-local-read'}}));let state;const deadline=Date.now()+5000;for(;;){state=await combatState(supervisor.rows.get(4));if(state.players.find(p=>p.id===guest.id)?.accepted===2)break;assert(Date.now()<deadline,'guest input was not accepted');await new Promise(r=>setTimeout(r,5));}assert(state.lanes.includes('monster:'+mid));assert(state.players.find(p=>p.id===guest.id).applied<2);
  releaseCommit();await until(()=>installed||result||error||faults.length,7000);assert(installed);assert(!result);assert(world.combat.busy);assert((await combatState(supervisor.rows.get(4))).lanes.includes('monster:'+mid));releaseInstall();await pending;assert.ifError(error);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.channel,target.peer.channel);assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,500);assert(!world.combat.busy);assert.equal(core.entryReads.size,0);
  await until(()=>guest.live.packets.some(p=>p.results?.some(r=>r.sequence===2))||faults.length,7000);assert.equal(guest.live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===2)?.status,200);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 }finally{release();releaseCommit();releaseInstall();}
});
