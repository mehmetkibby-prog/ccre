import test from 'node:test';
import assert from 'node:assert/strict';
import {party} from './dungeon-process-fixture.mjs';
import {setup,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import {configurationServices,configurationSnapshot} from './native-configuration-fixture.mjs';

test('global native configuration preserves the existing room and passive dungeon owner',{timeout:35000},async t=>{
 const {f,core,writer,world,supervisor,actors,action,old,faults}=await party(t,{together:true}),passive=actors[2];assert.equal((await passive.http('logout')).status,200);assert.equal((await action(actors[0],{action:'create'})).ok,true);const run=f.sql.prepare('SELECT id,status FROM dungeon_runs').get(),members=f.sql.prepare('SELECT player_id,run_id FROM dungeon_members ORDER BY player_id').all(),owners=actors.map(p=>{const o=writer.authority.owner(p.id);return {id:p.id,epoch:o.epoch,channel:o.channel,incarnation:o.incarnation};}),g=configurationServices(f),status=g.__colStatus.settings();assert(writer.authority.simulation(passive.id));
 await core.nativeConfiguration.run([],()=>g.__colStatus.save({...status.config,attack:status.config.attack+1},status.revision));
 assert.deepEqual(f.sql.prepare('SELECT id,status FROM dungeon_runs').get(),run);assert.deepEqual(f.sql.prepare('SELECT player_id,run_id FROM dungeon_members ORDER BY player_id').all(),members);assert.equal(writer.authority.admission(passive.id),null);assert.equal(writer.authority.simulation(passive.id).run_id,run.id);
 for(const owner of owners){const actual=writer.authority.owner(owner.id);for(const field of ['epoch','channel','incarnation'])assert.equal(actual[field],owner[field]);}assert((await configurationSnapshot(supervisor.rows.get(actors[0].ticket.channel))).dungeon.includes(run.id));assert.equal((await action(actors[1],{action:'ready',ready:true})).ok,true);assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
});

test('lost final configuration resume ACK rejects a queued shared lease and recovers only after all old owners exit',{timeout:40000},async t=>{
 const {f,core,world,writer,supervisor,http,connect,faults}=await setup(t,{shared:true,sharedCombat:{hp:1000000,playerHp:1000}});await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),old=[world.row,...supervisor.rows.values()],control=core.processes.get(ticket.channel).control,request=control.request.bind(control);let held=false,release,calls=0;const gate=new Promise(r=>release=r);
 control.request=async(method,payload,...rest)=>{const ack=await request(method,payload,...rest);if(method==='global_resume'&&core.globalWorld.held?.mode==='configuration'){held=true;await gate;old[0].child.kill('SIGKILL');throw Error('configuration_final_ack_lost');}return ack;};
 const pending=core.nativeConfiguration.run([],()=>{calls++;return true;});void pending.catch(()=>{});
 try{
  await until(()=>held,7000);live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'shared-process511',spawnRound:1,ability:0,intentId:'configuration-unknown-resume'}}));let state;for(let i=0;i<200;i++){state=await combatState(supervisor.rows.get(ticket.channel));if(state.players.find(p=>p.id===f.id)?.barrier)break;await new Promise(r=>setTimeout(r,10));}assert(state.players.find(p=>p.id===f.id)?.barrier);assert.equal(world.combat.busy,false);release();await assert.rejects(pending);
  await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r)),20000);assert(old.every(r=>r.exited));assert.equal(calls,1);assert.equal(world.monsters.get('shared-process511').hp,1000000);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n,0);const fresh=await http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));assert.equal(fresh.channel,ticket.channel);await connect(fresh);assert.equal(writer.authority.admission(f.id).channel,ticket.channel);assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
 }finally{release();}
});
