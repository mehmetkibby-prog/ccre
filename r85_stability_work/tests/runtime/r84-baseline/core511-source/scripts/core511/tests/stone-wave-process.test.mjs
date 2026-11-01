import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setup} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import {json} from './pvp-fixture.mjs';

function inspect(row,id){
 const request=randomUUID();return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{row.child.off('message',listener);reject(Error('stone_snapshot_timeout'));},4000),listener=m=>{if(m.type==='test-shared-snapshot'&&m.request===request){clearTimeout(timer);row.child.off('message',listener);resolve(m.snapshot);}};
  row.child.on('message',listener);row.child.send({type:'test-shared-snapshot',request,id});
 });
}
async function fixture(t,channel=4){
 const s=await setup(t,{shared:true,stoneWave:{channel}}),{f,core,world,http,connect}=s;await world.stopJobs();assert.equal((await http('ticket')).status,200);const ticket=await http('transfer',{channel:4});assert.equal(ticket.status,200);const live=await connect(ticket);
 await core.permanentPlayers([f.id],()=>f.sql.prepare("UPDATE players SET role='avci',area='sinsi',x=1000,y=1000,hp=100000,max_hp=100000,level=40,skill_one=5,skill_two=5,skill_three=5,combat_lock_until_ms=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(f.id));
 const parent='sinsi-process-wave511',children=()=>json(f.sql.prepare('SELECT * FROM monsters WHERE parent_stone_id=? ORDER BY id').all(parent)),send=(client=live)=>client.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:parent,spawnRound:17,ability:0,intentId:'stone-wave511'}}));
 return {...s,ticket,live,parent,children,send,old:[world.row,...s.supervisor.rows.values()]};
}

for(const channel of [4,0])test('native C'+channel+' Sinsi children enter owner, projection and combat journal only after durable ACK',{timeout:35000},async t=>{
 const s=await fixture(t,channel),{writer,supervisor,world,live,children,send,faults}=s,command=writer.command.bind(writer);let committed=false,release;const gate=new Promise(resolve=>release=resolve);t.after(()=>release());
 writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='attack'&&!committed){committed=true;await gate;}return ack;};
 send();await until(()=>committed||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const created=children();assert(created.length>0);
 const source=supervisor.rows.get(4);for(const child of created){const held=await inspect(source,child.id);assert.equal(held.monster.id,undefined);assert.equal(held.projected.id,undefined);}assert(!live.packets.some(p=>p.results?.some(r=>r.sequence===1)));
 release();await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))&&!world.combat.busy||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1).status,200);
 for(const child of created){const current=await inspect(source,child.id);assert.equal(current.monster.id,child.id);assert.equal(current.projected.id,child.id);assert.equal(current.monster.hp,child.hp);if(channel===0)assert.equal(world.monsters.get(child.id)?.hp,child.hp);}
 // A real subsequent hit must find the new journal base without a cold replay.
 const child=created[0];live.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'attack',targetId:child.id,spawnRound:17,ability:1,intentId:'stone-child511'}}));
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===2))||faults.length,9000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const hit=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===2);assert.equal(hit.status,200,JSON.stringify(hit));assert(hit.body.hits.some(h=>h.id===child.id&&h.hp<child.hp));assert.equal(children().length,created.length);
});

for(const phase of ['before','after'])test('C4 Sinsi source SIGKILL '+phase+' COMMIT recovers one complete native wave from CURRENT DB',{timeout:45000},async t=>{
 const s=await fixture(t),{f,writer,world,core,supervisor,ticket,old,send,http,connect,children,parent,faults}=s,source=supervisor.rows.get(ticket.channel),execute=writer.authority.operations.attack.execute,command=writer.command.bind(writer);let killed=false,observed;
 const read=()=>({children:children().map(m=>({id:m.id,channel:m.channel,parent:m.parent_stone_id,round:m.spawn_round})),stage:f.sql.prepare('SELECT wave_stage FROM monsters WHERE id=?').get(parent).wave_stage,receipts:f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n}),before=read();
 writer.authority.operations.attack.execute=(...args)=>{const value=execute(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('stone_wave_before_commit'),{code:'stone_wave_before_commit'});}return value;};
 writer.command=async(peer,request)=>{try{const ack=await command(peer,request);if(request.operation==='attack'&&phase==='after'&&!killed){killed=true;observed=read();source.child.kill('SIGKILL');throw Object.assign(Error('stone_wave_lost_ack'),{code:'stone_wave_lost_ack'});}return ack;}catch(error){if(killed&&phase==='before')observed=read();throw error;}};
 send();await until(()=>observed!==undefined,10000);if(phase==='before')assert.deepEqual(observed,before);else{assert(observed.children.length>0);assert.equal(observed.stage,1);assert.equal(observed.receipts,1);}
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(row=>row.state==='running'&&!old.includes(row)),20000);await world.stopJobs();assert(old.every(row=>row.exited));assert.equal(source.child.signalCode,'SIGKILL');
 const fresh=await http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));assert.equal(fresh.channel,4);const live=await connect(fresh);
 if(phase==='before'){send(live);await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))&&!world.combat.busy||faults.some(f=>f.globalRecovery),10000);assert.equal(live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1)?.status,200,JSON.stringify(live.packets.filter(p=>p.results?.length||p.type==='retry')));}
 const after=read();assert(after.children.length>0);assert.equal(after.stage,1);assert.equal(after.receipts,1);if(phase==='after')assert.deepEqual(after,observed);
 for(const child of after.children){const snapshot=await inspect(supervisor.rows.get(4),child.id);assert.equal(snapshot.monster.id,child.id);assert.equal(snapshot.projected.id,child.id);}assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});
