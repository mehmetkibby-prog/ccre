import test from 'node:test';
import assert from 'node:assert/strict';
import {liveGuildCombat,extraPlayer,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';

test('PvP accepted against a cold frozen guild target waits for current combat hydration and then finishes once',{timeout:35000},async t=>{
 const s=await liveGuildCombat(t,61),{f,core,writer,world,supervisor,other,live,ticket,attack,inspect,old,faults}=s,bystander=extraPlayer(s,62,'borrow-guild-bystander511');
 f.sql.prepare("UPDATE players SET area='bazaar',arena_match_id='',respawn_at_ms=0 WHERE id=?").run(bystander.id);const joined=await bystander.http();assert.equal(joined.status,200);assert.notEqual(joined.channel,ticket.channel);await s.connect(joined);
 const endpoint=core.processes.get(joined.channel).control,request=endpoint.request.bind(endpoint);let release,blocked=false,done=false,error,value;
 const wait=new Promise(resolve=>release=resolve);endpoint.request=async(method,payload)=>{const ack=await request(method,payload);if(method==='freeze'&&payload.id===bystander.id){blocked=true;await wait;}return ack;};
 const potions=f.sql.prepare('SELECT potions FROM players WHERE id=?').get(other.id).potions,pending=core.permanentPlayers([other.id,bystander.id],()=>{assert.equal(inspect().wins,0);f.sql.prepare('UPDATE players SET potions=potions+1 WHERE id=?').run(other.id);return 'native-cold-operation';}).then(v=>{value=v;done=true;},e=>{error=e;done=true;});
 try{
  await until(()=>blocked&&core.permanent.entries.get(other.id)?.needsFreeze===false,7000);assert.equal(core.permanent.entries.get(other.id).phase,'freezing');attack(live);
  let state;const deadline=performance.now()+7000;do{state=await combatState(supervisor.rows.get(ticket.channel));if(state.players.find(p=>p.id===f.id)?.accepted===1||faults.length)break;await new Promise(resolve=>setTimeout(resolve,5));}while(performance.now()<deadline);assert.equal(state.players.find(p=>p.id===f.id)?.accepted,1);
  assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(done,false);assert.equal(inspect().wins,0);assert.equal(state.players.find(p=>p.id===other.id)?.suspended,true);assert(!live.packets.some(p=>p.results?.some(r=>r.sequence===1)));release();await pending;assert.ifError(error);
  await until(()=>inspect().wins===1&&!world.combat.busy||faults.length,10000);assert.equal(value,'native-cold-operation');assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(other.id).potions,potions+1);assert.equal(core.permanent.entries.size,0);assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.equal(inspect().receipts,1);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(writer.authority.owner(other.id).channel,4);
 }finally{release();}
});
