import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './process-fixture.mjs';
import {configurationSource,configurationHandlers,configurationRequest,configurationServices,configurationSnapshot} from './native-configuration-fixture.mjs';
import {createRewardServices} from '../generated/reward-services.mjs';
import {patchNativeRuneConfiguration} from '../patch-native-rune-configuration.mjs';
import {until} from './helpers.mjs';
const source=patchNativeRuneConfiguration(configurationSource).source;

test('native admin Rune V2 health save reaches all four owners and preserves the exact living boss fraction',{timeout:35000},async t=>{
 const {f,core,world,writer,supervisor,faults}=await setup(t,{shared:true,content:true});await world.stopJobs();
 const old=[world.row,...supervisor.rows.values()],g=configurationServices(f),m=createRewardServices({globals:g,now:f.clock,fourChannels:true});g.__colRuneV2=m.runeV2.createRuneV2(f.sql);
 await core.nativeConfiguration.run([],()=>{for(const channel of [1,2,3,4])f.sql.prepare('UPDATE monsters SET hp=?,max_hp=300 WHERE id=?').run(channel===3?0:100,'rune-v2-boss-c'+channel+'-1');});
 const before=g.__colRuneV2.settings(),config=structuredClone(before.config);config.monsters.boss.hp+=1;
 const life=f.sql.prepare("SELECT id,spawn_round FROM monsters WHERE id LIKE 'rune-v2-boss-c%' ORDER BY id").all(),cycle=writer.worldState.current.world.cycle,routes=configurationHandlers(f,g,source);
 const save=g.__colRuneV2.save,control=world.row.control,request=control.request.bind(control);let frozen,held=false,release;const gate=new Promise(r=>release=r);
 g.__colRuneV2.save=(...args)=>{frozen=new Map(f.sql.prepare("SELECT id,hp,max_hp FROM monsters WHERE id LIKE 'rune-v2-boss-c%'").all().map(r=>[r.id,r]));return save(...args);};
 control.request=async(method,...args)=>{const answer=await request(method,...args);if(method==='configuration_resume'&&!held){held=true;await gate;}return answer;};
 try{
  const pending=routes.post(configurationRequest({action:'save_runes_v2',config,revision:before.revision}));void pending.catch(()=>{});await until(()=>held,7000);
  for(const channel of [1,2,3,4]){const id='rune-v2-boss-c'+channel+'-1',prior=frozen.get(id),row=f.sql.prepare('SELECT hp,max_hp FROM monsters WHERE id=?').get(id),view=await configurationSnapshot(supervisor.rows.get(channel),id);assert.equal(row.hp,prior.hp===0?0:Math.ceil(prior.hp*config.monsters.boss.hp/prior.max_hp));assert.equal(row.max_hp,prior.hp===0?prior.max_hp:config.monsters.boss.hp);assert.equal(view.monster.hp,row.hp);assert.equal(view.monster.max_hp,row.max_hp);assert.equal(view.cycle,cycle);}
  release();const response=await pending;assert.equal(response.status,200,await response.text());
 }finally{release();}
 assert.equal(writer.services.globals.__colRuneV2.settings().revision,before.revision+1);assert.deepEqual(f.sql.prepare("SELECT id,spawn_round FROM monsters WHERE id LIKE 'rune-v2-boss-c%' ORDER BY id").all(),life);assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 const stale=await routes.post(configurationRequest({action:'save_runes_v2',config,revision:before.revision}));assert.equal(stale.status,500);assert.equal(core.globalWorld.held,null);assert.equal(g.__colRuneV2.settings().revision,before.revision+1);
});

for(const phase of ['before','after'])test('native Rune V2 '+phase+' COMMIT loss never repeats the settings or health mutation',{timeout:45000},async t=>{
 const {f,core,world,writer,supervisor,http,connect,faults}=await setup(t,{shared:true,content:true});await world.stopJobs();const ticket=await http('ticket');await connect(ticket);
 const old=[world.row,...supervisor.rows.values()],channel=supervisor.rows.get(ticket.channel),g=configurationServices(f),m=createRewardServices({globals:g,now:f.clock,fourChannels:true});g.__colRuneV2=m.runeV2.createRuneV2(f.sql);
 await core.nativeConfiguration.run([],()=>f.sql.prepare("UPDATE monsters SET hp=100,max_hp=300 WHERE id LIKE 'rune-v2-boss-c%'").run());
 const before=g.__colRuneV2.settings(),config=structuredClone(before.config);config.monsters.boss.hp+=1;const save=g.__colRuneV2.save,exec=f.sql.exec.bind(f.sql),durable=writer.durableExternal.bind(writer);let calls=0,killed=false,armed=false;
 g.__colRuneV2.save=(...args)=>{calls++;armed=true;try{return save(...args);}finally{armed=false;}};
 if(phase==='before')f.sql.exec=sql=>{if(armed&&sql==='COMMIT'&&!killed){killed=true;channel.child.kill('SIGKILL');throw Error('rune_configuration_before_commit');}return exec(sql);};
 if(phase==='after')writer.durableExternal=async()=>{await durable();if(!killed){killed=true;channel.child.kill('SIGKILL');throw Error('rune_configuration_after_commit');}};
 try{
  const response=await configurationHandlers(f,g,source).post(configurationRequest({action:'save_runes_v2',config,revision:before.revision}));assert.equal(response.status,500);assert(killed);
  await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r)),22000);
  assert(old.every(r=>r.exited));assert.equal(calls,1);assert.equal(f.sql.prepare('SELECT revision FROM rune_v2_settings WHERE id=1').get().revision,before.revision+(phase==='after'?1:0));
  for(const ch of [1,2,3,4]){const id='rune-v2-boss-c'+ch+'-1',view=await configurationSnapshot(supervisor.rows.get(ch),id);assert.equal(f.sql.prepare('SELECT max_hp FROM monsters WHERE id=?').get(id).max_hp,phase==='after'?config.monsters.boss.hp:300);assert.equal(view.monster.max_hp,phase==='after'?config.monsters.boss.hp:300);}
  const next=await http('ticket');assert.equal(next.status,200);assert.equal(next.channel,ticket.channel);assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
 }finally{f.sql.exec=exec;}
});
