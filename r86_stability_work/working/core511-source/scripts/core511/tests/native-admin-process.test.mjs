import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './process-fixture.mjs';
import {adminHandlers,adminRequest} from './native-admin-fixture.mjs';
import {until} from './helpers.mjs';

// Actual native route bodies/guards plus all five real OS owners. The upstream
// ChatGPT user provider and browser transport are isolated fixtures, not a
// deployed admin session or real-network acceptance.
test('authorized native HTTP diagnostics reach five OS owners and fence a captured world after actual SIGKILL',{timeout:40000},async t=>{
 const {f,writer,core,world,supervisor,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();core.start();const api=adminHandlers({database:writer.database});let ticket=await http('ticket');assert.equal(ticket.status,200);ticket=await http('transfer',{channel:4});assert.equal(ticket.status,200);const live=await connect(ticket),old=[world.row,...supervisor.rows.values()],before=Date.now();
 const started=await api.post(adminRequest({method:'POST',body:{action:'cpu_profile507',target:'world'}})),after=Date.now();assert.equal(started.status,200);const profile=await started.json();assert.equal(profile.state,'recording');assert.equal(profile.target,'world');assert(profile.startedAtMs>=before&&profile.startedAtMs<=after);assert(profile.endsAtMs>=profile.startedAtMs+60000&&profile.endsAtMs<=after+60000);
 const busy=await api.post(adminRequest({method:'POST',body:{action:'cpu_profile507',target:'channel-4'}}));assert.equal(busy.status,409);assert.equal((await busy.json()).code,'profile_busy');
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'heartbeat'}}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1)?.status,200);
 // Original native sampling interval; real numbers, no synthetic load claim.
 await new Promise(resolve=>setTimeout(resolve,2100));const response=await api.get(adminRequest({query:'?load=1'}));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const measured=await response.json();assert.equal(measured.rows.length,6);assert(measured.rows.every(row=>row.status==='live'));assert.equal(measured.rows.find(row=>row.key==='channel-4').online504.count,1);assert(measured.rows.filter(row=>row.key!=='main').every(row=>row.kernel511.ticks>0&&row.kernel511.slowest.length<=10));assert(!JSON.stringify(measured).includes(f.id));
 api.setUser(null);assert.equal((await api.get(adminRequest({query:'?load=1'}))).status,403);assert.equal((await api.get(adminRequest({query:'?cpu_profile507=download&id='+profile.id}))).status,403);api.setUser({id:'admin-fixture',email:'admin@fixture.invalid'});
 assert.equal(world.combat.busy,false);assert.equal(world.global.held,null);old[0].child.kill('SIGKILL');await until(()=>world.row!==old[0]&&world.row?.state==='running',15000);assert(old[0].exited);assert(old.slice(1).every(row=>!row.exited&&supervisor.rows.get(row.peer.channel)===row));await world.stopJobs();const status=await api.get(adminRequest({query:'?cpu_profile507=status'}));assert.equal((await status.json()).state,'failed');assert.equal((await http('ticket')).channel,4);assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});
