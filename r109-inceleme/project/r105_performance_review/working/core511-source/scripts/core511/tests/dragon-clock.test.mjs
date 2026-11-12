import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary,until} from './helpers.mjs';
import {setupPvp,update,json} from './pvp-fixture.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter,OrderedSystemClient} from '../system-writer.mjs';
import {createDragonTickHandler,repairBase,MonsterLifecycle} from '../monster-lifecycle.mjs';
import {serviceTransactionDatabase} from '../service-transaction.mjs';
import {SharedWorldMemory} from '../shared-world.mjs';
import {WorldClock} from '../world-clock.mjs';
import {CombatCheckpoints} from '../combat-checkpoint.mjs';
import {ResourceLanes} from '../resource-lanes.mjs';
const {createDragonBoss}=await native('vds-server/src/dragon-boss.mjs'),id='dragon-world-1',seed='d'.repeat(64);
const config=(f,patch={})=>{const row=f.sql.prepare('SELECT * FROM dragon_settings WHERE id=1').get();const cfg={...JSON.parse(row.config_json),...patch};f.sql.prepare('UPDATE dragon_settings SET config_json=? WHERE id=1').run(JSON.stringify(cfg));return cfg;};
async function setup(t){
 const f=await setupPvp(t),authority=new ChannelOwnership(f.f.database,{realmId:'dragon-clock'});await authority.initialize();const writer=new SystemWriter(f.f.database,{realmId:'dragon-clock',authority}),services=new NativeGameServices(f.sql,{clock:()=>f.nowMs}),peer={realm:'dragon-clock',channel:0,role:'world',incarnation:'dragon-clock-world'};await writer.initialize();await writer.register(peer);writer.add('dragon_tick',createDragonTickHandler({services,clock:()=>f.nowMs}));return {...f,authority,writer,services,peer};
}
const read=f=>({...f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(id)});
const request=f=>({epoch:f.writer.owner('world').epoch,sequence:f.writer.owner('world').sequence+1,key:'dragon-'+(f.writer.owner('world').sequence+1),kind:'dragon_tick',payload:{nowMs:f.nowMs,seed,monsters:[repairBase(read(f))]}});
test('dragon clock matches the unchanged native service across disabled, lootless, scheduled and live states',async t=>{
 const f=await setup(t),initial=read(f),now=Math.floor(f.nowMs/1000),original=createDragonBoss(serviceTransactionDatabase(f.sql),{now:()=>f.nowMs});let cases=0;
 const lives=[{hp:100,despawn_at:now-1,respawn_at:0},{hp:100,despawn_at:0,respawn_at:0},{hp:0,despawn_at:0,respawn_at:0},{hp:0,despawn_at:0,respawn_at:now-1},{hp:0,despawn_at:0,respawn_at:now+20}];
 for(const enabled of [false,true])for(const chance of [0,100])for(const life of lives){
  config(f,{enabled,hp:24680,interval:10800,loot:[{itemId:'resource:gems',chance,min:1,max:1}]});const {id:_,...patch}=initial;update(f.sql,'monsters',id,{...patch,...life,spawn_round:17});const before=read(f);
  await f.f.database.atomic(()=>original.tick({cleanup:false}));const expected=read(f);const {id:ignored,...restore}=before;update(f.sql,'monsters',id,restore);
  const command=request(f),ack=await f.writer.command(f.peer,command);assert.deepEqual(read(f),expected);assert.deepEqual(json(ack.result.monsters[0]),json(expected));assert.deepEqual(json(await f.writer.command(f.peer,command)),json(ack));cases++;
 }
 assert.equal(cases,20);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_admissions').get().n,0);
 const channel={realm:f.peer.realm,channel:1,incarnation:'local'};await f.authority.registerProcess(1,channel.incarnation);await f.writer.register(channel);await assert.rejects(f.writer.command(channel,{...request(f),epoch:1,sequence:1}),/dragon_tick_owner/);
 const stale=request(f);update(f.sql,'monsters',id,{spawn_round:18});await assert.rejects(f.writer.command(f.peer,stale),/dragon_tick_snapshot_conflict/);
});
test('dragon life remains leased until fsync and only its independent world schedules the native tick',async t=>{
 const f=await setup(t);config(f,{enabled:true,hp:24680,loot:[{itemId:'resource:gems',chance:100,min:1,max:1}]});update(f.sql,'monsters',id,{hp:0,respawn_at:Math.floor(f.nowMs/1000)-1,spawn_round:17});const row=read(f),view=new SharedWorldMemory(),lanes=new ResourceLanes();view.setMonster(row);
 const client=new OrderedSystemClient({owner:f.writer.owner('world'),request:r=>f.writer.command(f.peer,r)}),journal=new CombatCheckpoints({submit:e=>client.submit(e)});journal.hydrate('monsters',[row]);const clock=new WorldClock({view,owns:m=>m.channel===0,blocked:key=>lanes.busy(['monster:'+key]),changed:c=>journal.changed(c),clock:()=>f.nowMs});clock.config.set('dragon_settings',f.sql.prepare('SELECT * FROM dragon_settings WHERE id=1').get());
 const lifecycle=new MonsterLifecycle({clock,settings:()=>f.settings,view,lanes,journal,submit:e=>client.submit(e),committed:r=>r.monsters.forEach(m=>view.setMonster(m))}),durable=f.f.database.durableAfterCommit.bind(f.f.database);let release;const hold=new Promise(r=>release=r);f.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>hold);
 try{lifecycle.tick(f.nowMs);const pending=lifecycle.pending;assert(pending);await until(()=>read(f).spawn_round===18);assert.equal(view.monster(id).hp,0);assert(lanes.busy(['monster:'+id]));lifecycle.tick(f.nowMs+2000);assert.equal(lifecycle.pending,pending);release();await pending;assert.equal(view.monster(id).spawn_round,18);assert.equal(view.monster(id).hp,24680);assert(!lanes.busy(['monster:'+id]));assert.equal(client.sequence,1);assert.equal(clock.dragonDue(),false);
  const local=new WorldClock({view,owns:m=>m.channel===1,blocked:()=>false,changed:()=>{},clock:()=>f.nowMs});local.config=clock.config;assert.equal(local.dragonDue(),false);
 }finally{release();f.f.database.durableAfterCommit=durable;await lifecycle.drain();}
});
test('actual SIGKILL before and after dragon spawn COMMIT retains one life and one process receipt',async t=>{
 const f=await setup(t);config(f,{enabled:true,hp:24680,loot:[{itemId:'resource:gems',chance:100,min:1,max:1}]});update(f.sql,'monsters',id,{hp:0,respawn_at:Math.floor(f.nowMs/1000)-1,spawn_round:17});const initial=read(f),dir=temporary(t),command=request(f),input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify({peer:f.peer,request:command}));f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(f.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'dragon-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null,stderr);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_dragon':'durable_dragon_before_ack');
  const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{const current=()=>({...db.sqlite.prepare('SELECT * FROM monsters WHERE id=?').get(id)}),count=()=>db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n;assert.equal(count(),phase==='before'?0:1);assert.equal(current().spawn_round,phase==='before'?17:18);if(phase==='before')assert.deepEqual(current(),initial);else assert.equal(current().hp,24680);
   const authority=new ChannelOwnership(db,{realmId:f.peer.realm}),writer=new SystemWriter(db,{realmId:f.peer.realm,authority}),services=new NativeGameServices(db.sqlite,{clock:()=>f.nowMs});writer.add('dragon_tick',createDragonTickHandler({services,clock:()=>f.nowMs}));const ack=await writer.command(f.peer,command),onceState=current();assert.deepEqual(json(await writer.command(f.peer,command)),json(ack));assert.deepEqual(current(),onceState);assert.equal(current().spawn_round,18);assert.equal(count(),1);
  }finally{db.close();}
 }
});
