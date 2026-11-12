import test from 'node:test';
import assert from 'node:assert/strict';
import {localJoin} from './cold-local-settlement-fixture.mjs';
import {until} from './helpers.mjs';

async function recovered(s){const {core,world,supervisor,old,faults}=s;await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r)),20000);assert(old.every(r=>r.exited));assert.equal(core.entryReads.size,0);assert.equal(core.transitions.size,0);assert(!world.combat.busy);assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));}

for(const phase of ['before','after'])test('actual target SIGKILL '+phase+' native fresh admission COMMIT recovers zero or one current-DB admission',{timeout:40000},async t=>{
 const s=await localJoin(t),{f,core,writer,http,supervisor,release,checkpointPending}=s,channel=writer.authority.emptiest(),target=supervisor.rows.get(channel),prepare=core.entry.prepare.bind(core.entry),admit=writer.admit.bind(writer);let killed=false,durable,result,error;
 const crash=()=>{killed=true;durable=writer.authority.admission(f.id);target.child.kill('SIGKILL');throw Object.assign(Error('entry_settlement_'+phase+'_commit'),{code:'entry_settlement_'+phase+'_commit'});};
 core.entry.prepare=(...args)=>{const value=prepare(...args);if(phase==='before'&&!killed){assert(value.accepted);crash();}return value;};
 writer.admit=async(...args)=>{const value=await admit(...args);if(phase==='after'&&!killed&&args[0]===f.id){assert(value.accepted!==false);crash();}return value;};
 try{const pending=http('ticket').then(v=>result=v,e=>error=e);await until(()=>checkpointPending()||result||error,7000);release();await pending;assert.ifError(error);assert(killed);assert.notEqual(result.status,200);assert.equal(Boolean(durable),phase==='after');await recovered(s);assert.equal(target.child.signalCode,'SIGKILL');assert.equal(Boolean(writer.authority.admission(f.id)),phase==='after');assert.equal(f.sql.prepare('SELECT channel,hp FROM players WHERE id=?').get(f.id).channel,phase==='after'?channel:4);assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,500);if(phase==='after'){assert(core.sessions.has(f.id));const ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,channel);}}finally{release();}
});

for(const method of ['settlement_freeze','settlement_resume','admit'])test('lost '+method+' ACK with actual owner SIGKILL retires all five processes during native fresh join',{timeout:40000},async t=>{
 const s=await localJoin(t),{f,core,writer,http,supervisor,release,checkpointPending}=s,channel=writer.authority.emptiest(),target=supervisor.rows.get(method==='admit'?channel:4),control=core.processes.get(target.peer.channel).control,request=control.request.bind(control);let killed=false,result,error;
 control.request=async(kind,payload,...options)=>{const ack=await request(kind,payload,...options);if(kind===method&&!killed){killed=true;target.child.kill('SIGKILL');throw Object.assign(Error('entry_read_'+method+'_ack_lost'),{code:'entry_read_'+method+'_ack_lost'});}return ack;};
 try{const pending=http('ticket').then(v=>result=v,e=>error=e);await until(()=>checkpointPending()||result||error,7000);release();await pending;assert.ifError(error);assert(killed);assert.notEqual(result.status,200);await recovered(s);assert.equal(target.child.signalCode,'SIGKILL');assert.equal(Boolean(writer.authority.admission(f.id)),method!=='settlement_freeze');assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,500);if(method!=='settlement_freeze')assert(core.sessions.has(f.id));}finally{release();}
});
