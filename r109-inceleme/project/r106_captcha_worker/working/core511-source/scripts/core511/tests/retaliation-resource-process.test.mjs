import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import {createRetaliationRules} from '../generated/retaliation-rules.mjs';

async function localDeath(t){
 const s=await setup(t,{shared:true,localCombat:{id:'rune-v2-tide-c4-1',hp:1000000,area:'rune_v2'}}),{f,core,world,http,connect}=s;await world.stopJobs();assert.equal((await http('ticket')).status,200);const ticket=await http('transfer',{channel:4});assert.equal(ticket.status,200);const live=await connect(ticket),mid='rune-v2-tide-c4-1';
 const arm=()=>core.permanentPlayers([f.id],()=>{
  f.sql.prepare("UPDATE players SET role='avci',area='rune_v2',x=2700,y=2025,hp=1,max_hp=1000,gems=103,loadlab_run_id='',respawn_at_ms=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(f.id);f.sql.prepare('DELETE FROM player_items WHERE player_id=?').run(f.id);
  assert(s.writer.services.globals.__colRuneV2.monster(f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(mid)).damage>0);const rules=createRetaliationRules({globals:s.writer.services.globals,now:f.clock});f.db.batch(rules.preparePveEngagement(f.db,f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id),f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(mid),f.clock()-5000));
 });
 const inspect=()=>({...f.sql.prepare('SELECT hp,gems FROM players WHERE id=?').get(f.id),receipts:f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'retaliation:%'").get().n});
 return {...s,ticket,live,mid,arm,inspect};
}

test('actual local C4 native lethal hit carries its held monster lane through durable ACK',{timeout:35000},async t=>{
 const s=await localDeath(t),{f,writer,world,supervisor,mid,arm,inspect,faults}=s,command=writer.command.bind(writer),old=[world.row,...supervisor.rows.values()];let release,acknowledged=false,payload;const gate=new Promise(r=>release=r);
 writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='retaliation_death'){payload=request.payload;acknowledged=true;await gate;}return ack;};
 try{
  await arm();await until(()=>acknowledged||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert(acknowledged);assert.deepEqual(inspect(),{hp:0,gems:98,receipts:1});assert(payload.resources.includes('player:'+f.id)&&payload.resources.includes('monster:'+mid));assert.equal(payload.sharedLease,undefined);
  const state=await combatState(supervisor.rows.get(4)),actor=state.players.find(p=>p.id===f.id);assert.equal(actor.hp,1);assert(actor.barrier);assert(state.lanes.includes('monster:'+mid));assert(!world.combat.busy);
  release();let final;for(let i=0;i<200;i++){final=await combatState(supervisor.rows.get(4));if(!final.lanes.includes('monster:'+mid))break;await new Promise(r=>setTimeout(r,10));}assert(!final.lanes.includes('monster:'+mid));assert.equal(final.players.find(p=>p.id===f.id).hp,0);assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.equal(faults.length,0);
 }finally{release();}
});

for(const phase of ['before','after'])test('actual local lethal '+phase+' COMMIT source SIGKILL keeps one native gem penalty on CURRENT DB',{timeout:40000},async t=>{
 const s=await localDeath(t),{writer,core,world,supervisor,arm,inspect,http,faults}=s,source=supervisor.rows.get(4),healthy=[world.row,...[1,2,3].map(c=>supervisor.rows.get(c))],execute=writer.authority.operations.retaliation_death.execute,command=writer.command.bind(writer);let killed=false,observed=null;
 writer.authority.operations.retaliation_death.execute=(...args)=>{const value=execute(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('retaliation_before_commit'),{code:'retaliation_before_commit'});}return value;};
 writer.command=async(peer,request)=>{try{const ack=await command(peer,request);if(request.operation==='retaliation_death'&&phase==='after'&&!killed){killed=true;observed=inspect();source.child.kill('SIGKILL');throw Object.assign(Error('retaliation_ack_lost'),{code:'retaliation_ack_lost'});}return ack;}catch(error){if(error.code==='retaliation_before_commit')observed=inspect();throw error;}};
 await arm();await until(()=>observed,8000);assert.deepEqual(observed,phase==='before'?{hp:1,gems:103,receipts:0}:{hp:0,gems:98,receipts:1});
 await until(()=>supervisor.rows.get(4)!==source&&supervisor.rows.get(4)?.state==='running'&&inspect().hp===0,18000);assert(source.exited);assert.equal(source.child.signalCode,'SIGKILL');assert.deepEqual(inspect(),{hp:0,gems:98,receipts:1});assert.deepEqual([world.row,...[1,2,3].map(c=>supervisor.rows.get(c))],healthy);assert(!core.recoveringWorld);assert(!faults.some(f=>f.recovery||f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
 const ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,4);assert.deepEqual(inspect(),{hp:0,gems:98,receipts:1});
});
