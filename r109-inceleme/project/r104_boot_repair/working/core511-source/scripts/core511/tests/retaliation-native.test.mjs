import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {BASE,SHA,native,seeded,hash,until,temporary} from './helpers.mjs';
import {createRetaliationRules} from '../generated/retaliation-rules.mjs';
import {AggroMemory} from '../aggro-memory.mjs';
import {RetaliationMemory} from '../retaliation-memory.mjs';
import {nativeAtomicStatements,readRetaliationFrame,createRetaliationWriterHandler} from '../retaliation-writer.mjs';
import {ChannelOwnership,OrderedWriterClient,registerOwnedRule} from '../ownership.mjs';
import {OperationRandom} from '../operation-random.mjs';
import {ResidentState} from '../resident-state.mjs';
import {FixedLoop} from '../fixed-loop.mjs';
import {ActorCheckpoints,createActorCheckpointHandler} from '../actor-checkpoint.mjs';
import {EncounterCheckpoints,writeEncounterCheckpoint} from '../encounter-checkpoint.mjs';
import {RetaliationLoop} from '../retaliation-loop.mjs';
import {ResourceLanes} from '../resource-lanes.mjs';
process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {fixture}=await import('../../perf-r11/tests/reward/fixture.mjs');
const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');
const {pveEntries489}=await native('vds-server/src/pve-multi489.mjs');
const json=value=>JSON.parse(JSON.stringify(value)),seed=n=>n.toString(16).padStart(64,'0');
const randomFor=n=>seeded(Math.imul(n,782341)+59319);
const id='real-1',monsterId='golge-core511-retaliation';
const settingsFor=sql=>({...sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()});
const globals={__colRanks:{bonuses:()=>({defense:7})},__colRunes:{factor:()=>1,monster:()=>({damage:8})},__colRuneV2:{monster:()=>({damage:11})}};
function put(sql,table,row){const keys=Object.keys(row);sql.prepare('INSERT INTO '+table+' ('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...Object.values(row));}
function update(sql,table,row,id){const keys=Object.keys(row);sql.prepare('UPDATE '+table+' SET '+keys.map(k=>k+'=?').join(',')+' WHERE id=?').run(...Object.values(row),id);}
async function scenario(t){
 const f=await fixture();t.after(()=>f.close());installRegistry({now:()=>100000});
 const sql=f.database.sqlite,db=nativeAtomicStatements(sql),settings=settingsFor(sql),now=100000;
 put(sql,'monsters',{id:monsterId,name:'Native rule fixture',x:100,y:100,hp:100,max_hp:100,respawn_at:0,variant:'normal',is_boss:0,despawn_at:0,spawn_round:1,area:'forest',channel:1,is_stone:0,summoned:0,parent_stone_id:''});
 const reset=(number=0,patch={})=>{
  sql.prepare('DELETE FROM pve_engagements WHERE player_id=?').run(id);
  update(sql,'players',{area:'forest',channel:1,x:100,y:100,hp:1000,max_hp:1000,hp_revision:2,respawn_at_ms:0,combat_lock_until_ms:0,last_seen:100,last_monster_hit_at:0,gems:103,role:'avci',special_guard_until_ms:0,...patch},id);
  update(sql,'monsters',{area:patch.area??'forest',channel:1,x:100,y:100,hp:100,max_hp:100,spawn_round:1,is_stone:0,stun_until_ms:0,is_boss:0,variant:['normal','agresif','katil'][number%3]},monsterId);
  const oldEvents=[],rules=createRetaliationRules({globals,now:()=>now,random:randomFor(number),publish:(...v)=>oldEvents.push(v)});
  const player=sql.prepare('SELECT * FROM players WHERE id=?').get(id),monster=sql.prepare('SELECT * FROM monsters WHERE id=?').get(monsterId);
  db.batch(rules.preparePveEngagement(db,player,monster,now-5000));
  const row=sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id),entry=pveEntries489(row)[0];
  const hydration=readRetaliationFrame(sql,id,[entry]),frame={player:hydration.player,monster:hydration.monsters[0],armorItems:hydration.armorItems};
  const view=new AggroMemory({channel:1,cycle:1,now:()=>now});view.setPlayer(sql.prepare('SELECT * FROM players WHERE id=?').get(id));view.setMonster(monster);view.setEngagement(id,row);
  const events=[],memory=new RetaliationMemory({view,globals,publish:(...v)=>events.push(v)});
  return {player,monster,row,entry,frame,view,memory,rules,events,oldEvents};
 };
 return {f,sql,db,settings,now,reset};
}
test('native retaliation formulas and SQL retain pinned source identities',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/retaliation-proof.json',import.meta.url))),rules=createRetaliationRules();
 assert.equal(hash(rules.retaliateNative.toString()),proof.nativeMethodSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/retaliation-rules.mjs',import.meta.url))),proof.generatedSha256);
 assert(!/\b(?:database|await)\b/.test(rules.retaliateMemory.toString()));
});
test('resident monster damage, block, stun, clear and timers equal native SQLite for seeded cases',async t=>{
 const s=await scenario(t),rng=seeded(118),fields=['hp','max_hp','hp_revision','respawn_at_ms','last_monster_hit_at','last_seen','combat_lock_until_ms','gems'];let hits=0,clears=0,blocked=0;
 for(let n=0;n<160;n++){
  const c=s.reset(n,{x:n%11===0?900:100,role:n%3===0?'muhafiz':'avci'});
  if(n%7===0){update(s.sql,'monsters',{stun_until_ms:s.now+1},monsterId);c.frame.monster.stun_until_ms=s.now+1;c.view.setMonster({...c.monster,stun_until_ms:s.now+1});}
  if(n%13===0){update(s.sql,'monsters',{hp:0},monsterId);c.frame.monster.hp=0;c.view.setMonster({...c.monster,hp:0});}
  c.frame.armorItems.results=[{kind:'armor',power:Math.floor(rng()*100),enchantments:JSON.stringify([{kind:'attack_block',value:n%4?0:15}]),equipped:1}];
  const expected=await c.rules.retaliateNative(s.db,id,s.settings,s.now,{...c.row,...c.entry},c.frame);
  const actual=c.memory.step({playerId:id,settings:s.settings,nowMs:s.now,engagement:{...c.row,...c.entry},frame:c.frame,random:randomFor(n)});
  assert.equal(actual.durable,false);assert.deepEqual(json(actual.result),json(expected),'seed '+n);assert.deepEqual(json(c.events),json(c.oldEvents));
  const saved=s.sql.prepare('SELECT * FROM players WHERE id=?').get(id);for(const field of fields)assert.equal(c.view.player(id)[field],saved[field],field+' seed '+n);
  assert.deepEqual(json(c.view.engagements.get(id)??null),json(s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id)??null));
  hits+=actual.result?1:0;clears+=c.memory.metrics.clears;blocked+=actual.result?.attackBlocked?1:0;
 }
 assert(hits>100);assert(clears>10);assert(blocked>0);
});
test('resident engagement acquisition preserves original 32-capacity, same-round clocks and scope guards',async t=>{
 const s=await scenario(t),c=s.reset();s.sql.prepare('DELETE FROM pve_engagements WHERE player_id=?').run(id);c.view.setEngagement(id,null);
 for(let n=0;n<38;n++){
  const monster={...c.monster,id:monsterId+'-'+n};put(s.sql,'monsters',monster);c.view.setMonster(monster);
  s.db.batch(c.rules.preparePveEngagement(s.db,c.player,monster,s.now+n));c.memory.arm(c.player,monster,s.now+n);
  assert.deepEqual(json(c.view.engagements.get(id)),json(s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id)));
 }
 const m=c.view.monster(monsterId+'-0');s.db.batch(c.rules.preparePveEngagement(s.db,c.player,m,s.now+400));c.memory.arm(c.player,m,s.now+400);
 assert.deepEqual(json(c.view.engagements.get(id)),json(s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id)));
 assert.equal(Object.keys(JSON.parse(c.view.engagements.get(id).attackers489)).length,32);
 // Repeated arming, an existing monster's new round, an expired head, and a
 // same-timestamp batch must remain exact native SQL/player results.
 for(let i=0;i<12;i++){
  const target=c.view.monster(monsterId+'-'+(i%3)),time=s.now+(i<6?450:9500+i);
  const next=i===4?{...target,spawn_round:target.spawn_round+1}:target;
  if(i===4){update(s.sql,'monsters',{spawn_round:next.spawn_round},next.id);c.view.setMonster(next);}
  s.db.batch(c.rules.preparePveEngagement(s.db,c.player,next,time));c.memory.arm(c.player,next,time);
  assert.deepEqual(json(c.view.engagements.get(id)),json(s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id)));
  assert.equal(c.view.player(id).combat_lock_until_ms,s.sql.prepare('SELECT combat_lock_until_ms FROM players WHERE id=?').get(id).combat_lock_until_ms);
 }
 const mismatched={...c.player,realtime_scope_version:c.player.realtime_scope_version+1},before=json(c.view.engagements.get(id));
 s.db.batch(c.rules.preparePveEngagement(s.db,mismatched,m,s.now+500));c.memory.arm(mismatched,m,s.now+500);assert.deepEqual(json(c.view.engagements.get(id)),before);
});

test('native boss fire timing and channel4 classification retain original damage behavior',async t=>{
 const s=await scenario(t),original=s.reset();
 for(const [boss,area,channel]of [['dunya-bosu-1','sanctum',1],['dragon-world-1','dragon',1],['stone-boss-black-c4','black',4]]){
  s.sql.prepare('DELETE FROM pve_engagements WHERE player_id=?').run(id);
  const monster={...original.monster,id:boss,area,channel,is_boss:1};
  if(s.sql.prepare('SELECT id FROM monsters WHERE id=?').get(boss))update(s.sql,'monsters',Object.fromEntries(Object.entries(monster).filter(([k])=>k!=='id')),boss);else put(s.sql,'monsters',monster);
  update(s.sql,'players',{hp:1000,hp_revision:2,area,channel},id);const player=s.sql.prepare('SELECT * FROM players WHERE id=?').get(id);
  const oldEvents=[],rules=createRetaliationRules({globals,fourChannels:true,now:()=>s.now,random:()=>.99,publish:(...a)=>oldEvents.push(a)});
  s.db.batch(rules.preparePveEngagement(s.db,player,monster,s.now-15000));const row=s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id),entry=pveEntries489(row)[0],all=readRetaliationFrame(s.sql,id,[entry]);
  const frame={player:all.player,monster:all.monsters[0],armorItems:all.armorItems},view=new AggroMemory({channel,cycle:1,now:()=>s.now}),events=[];view.setPlayer(s.sql.prepare('SELECT * FROM players WHERE id=?').get(id));view.setMonster(monster);view.setEngagement(id,row);
  const memory=new RetaliationMemory({view,globals,publish:(...a)=>events.push(a)}),expected=await rules.retaliateNative(s.db,id,s.settings,s.now,{...row,...entry},frame),actual=memory.step({playerId:id,settings:s.settings,nowMs:s.now,engagement:{...row,...entry},frame,random:()=>.99});
  assert(!actual.durable);assert.deepEqual(json(actual.result),json(expected));assert.deepEqual(json(events),json(oldEvents));assert.equal(actual.result.pveHit.ability,boss.startsWith('stone-')?'basic':'boss_fire');
 }
 const rules=createRetaliationRules({fourChannels:true});assert(rules.isRuneV2Boss('rune-v2-boss-c4-1'));assert.equal(createRetaliationRules().isRuneV2Boss('rune-v2-boss-c4-1'),false);
});
test('lethal rune damage and gem penalty wait for writer fsync and replay only once',async t=>{
 const s=await scenario(t),c=s.reset(0,{area:'rune_v2',hp:1});const before=json(c.view.player(id));
 const step=c.memory.step({playerId:id,settings:s.settings,nowMs:s.now,engagement:{...c.row,...c.entry},frame:c.frame,random:()=>.99});
 assert.equal(step.durable,true);assert.deepEqual(json(c.view.player(id)),before);assert.equal(c.events.length,0);
 const authority=new ChannelOwnership(s.f.database,{realmId:'retaliation'});await authority.initialize();const peer={channel:1,incarnation:'retaliation-owner'};await authority.registerProcess(1,peer.incarnation);
 const owner=await authority.admit(id,peer,{sessionId:'retaliation-session',guard:()=>true});
 const handler=createRetaliationWriterHandler({assertResources:()=>true,globalsFor:()=>globals,settingsFor,clock:()=>s.now,assertOwnership:(db,p,actor,epoch)=>Boolean(authority.assertAdmitted(db,p,actor,epoch))});registerOwnedRule(authority,'retaliation_death',handler);
 const client=new OrderedWriterClient({peer,owner:()=>owner,request:(p,r)=>authority.command(p,r)});client.seed(id,owner.epoch,0);
 const event={actor:id,key:'native-retaliation-death',kind:'retaliation_death',payload:{resources:['player:'+id,'monster:'+monsterId],nowMs:s.now,seed:seed(194),engagement:{...c.row,...c.entry},row:c.row,frame:c.frame,settings:s.settings}};
 const durable=s.f.database.durableAfterCommit.bind(s.f.database);let release;const held=new Promise(r=>release=r);s.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>held);
 let returned=false;const pending=client.submit(event).then(ack=>{returned=true;return ack;});await until(()=>s.sql.prepare('SELECT hp FROM players WHERE id=?').get(id).hp===0);
 assert.equal(returned,false);assert.equal(c.view.player(id).hp,1);assert.equal(c.events.length,0);release();const ack=await pending;s.f.database.durableAfterCommit=durable;
 assert.equal(ack.result.result.dead,true);assert.equal(ack.result.player.gems,98);assert.equal(ack.result.engagement,null);assert.equal(ack.result.events.length,1);
 const request={playerId:id,epoch:owner.epoch,sequence:1,operationId:event.key,operation:event.kind,payload:event.payload};const replay=await authority.command(peer,request);assert.deepEqual(json(replay),json(ack));assert.equal(authority.stats.replays,1);
 assert.equal(s.sql.prepare('SELECT gems FROM players WHERE id=?').get(id).gems,98);assert.equal(authority.owner(id).sequence,1);
});

test('20 Hz native AI drains resident damage and encounter clocks before durable death',async t=>{
 const s=await scenario(t),c=s.reset(7,{area:'rune_v2',hp:11}),state=new ResidentState(1),view=c.view;
 const authority=new ChannelOwnership(s.f.database,{realmId:'retaliation-loop'});await authority.initialize();const peer={channel:1,incarnation:'retaliation-loop-owner'};await authority.registerProcess(1,peer.incarnation);
 const owner=await authority.admit(id,peer,{sessionId:'loop-session',guard:()=>true});state.put('players',{...view.player(id),cycle:1});state.claim(id,owner.epoch);
 c.memory.playerChanged=row=>state.put('players',{...row,cycle:1});
 registerOwnedRule(authority,'actor_checkpoint',createActorCheckpointHandler());
 registerOwnedRule(authority,'retaliation_death',createRetaliationWriterHandler({assertResources:()=>true,globalsFor:()=>globals,settingsFor,clock:()=>time,assertOwnership:(db,p,actor,epoch)=>Boolean(authority.assertAdmitted(db,p,actor,epoch))}));
 const client=new OrderedWriterClient({peer,owner:()=>owner,request:(p,r)=>authority.command(p,r)});client.seed(id,owner.epoch,0);
 let time=s.now;const encounters=new EncounterCheckpoints(p=>view.engagements.get(p)??null);encounters.hydrate(id,c.row);
 const checkpoints=new ActorCheckpoints({state,encounters,submit:e=>client.submit(e),clock:()=>time});checkpoints.hydrate(view.player(id));
 const frameFor=()=>({player:Object.fromEntries(Object.keys(c.frame.player).map(k=>[k,Object.hasOwn(view.player(id),k)?view.player(id)[k]:c.frame.player[k]])),monster:c.frame.monster,armorItems:c.frame.armorItems});
 const bridge=new RetaliationLoop({lanes:new ResourceLanes(),combatCheckpoints:{drain:async()=>{}},memory:c.memory,checkpoints,submit:e=>client.submit(e),frameFor,settings:()=>s.settings,publish:(...args)=>c.events.push(args),committed:value=>{view.setPlayer(value.player);view.setEngagement(id,value.engagement);state.put('players',{...value.player,cycle:1});}});
 const kernel=new FixedLoop({state,wall:()=>time,send:()=>{},rules:{movement:()=>({ok:true}),combat:()=>({ok:true}),ai:ctx=>bridge.tick(ctx),respawn:()=>{},project:()=>null}});t.after(()=>kernel.stop());kernel.admit(id,owner.epoch);kernel.stopped=false;
 kernel.tick();assert.equal(view.player(id).hp,1);assert.equal(s.sql.prepare('SELECT hp FROM players WHERE id=?').get(id).hp,11);assert.equal(c.events.length,1);
 time+=5000;const durable=s.f.database.durableAfterCommit.bind(s.f.database);let release;const hold=new Promise(r=>release=r);s.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>hold);
 kernel.tick();const barrier=kernel.players.get(id).barrier;assert(barrier);await until(()=>s.sql.prepare('SELECT hp FROM players WHERE id=?').get(id).hp===1);
 assert.equal(view.player(id).hp,1);assert.equal(c.events.length,1);assert(kernel.state.owners.get(id).pending>0);release();await barrier;s.f.database.durableAfterCommit=durable;await Promise.resolve();
 assert.equal(kernel.failure,null);assert.equal(view.player(id).hp,0);assert.equal(view.player(id).gems,98);assert.equal(c.events.length,2);assert.equal(c.events.at(-1)[3].dead,true);
 assert.equal(client.finalSequence(id),2);assert.equal(state.owners.get(id).pending,0);assert.equal(encounters.changed(id),false);assert.equal(checkpoints.changed(id),false);
});

for(const phase of ['before','after'])test('native rune death survives SIGKILL '+phase+' COMMIT with one gem penalty',async t=>{
 const s=await scenario(t),c=s.reset(0,{area:'rune_v2',hp:1}),dir=temporary(t),file=path.join(dir,'retaliation.sqlite'),input=path.join(dir,'input.json'),marker=path.join(dir,'phase.txt');
 const sourceAuthority=new ChannelOwnership(s.f.database,{realmId:'retaliation-crash'});await sourceAuthority.initialize();const peer={channel:1,incarnation:'retaliation-surviving-channel'};await sourceAuthority.registerProcess(1,peer.incarnation);
 const owner=await sourceAuthority.admit(id,peer,{sessionId:'retaliation-crash-session',guard:()=>true});
 const request={playerId:id,epoch:owner.epoch,sequence:1,operationId:'retaliation-crash-once',operation:'retaliation_death',payload:{resources:['player:'+id,'monster:'+monsterId],nowMs:s.now,seed:seed(194),engagement:{...c.row,...c.entry},row:c.row,frame:c.frame,settings:s.settings}};
 s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(s.f.file,file);fs.writeFileSync(input,JSON.stringify({request,peer}));
 const child=spawn(process.execPath,[path.join(import.meta.dirname,'retaliation-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');
 assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_native_death':'durable_native_death_before_ack');
 const {LocalDatabase}=await native('vds-server/src/database.mjs'),db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});t.after(()=>db.close());
 assert.equal(db.sqlite.prepare('SELECT gems FROM players WHERE id=?').get(id).gems,phase==='after'?98:103);
 const authority=new ChannelOwnership(db,{realmId:'retaliation-crash'});await authority.initialize();registerOwnedRule(authority,'retaliation_death',createRetaliationWriterHandler({assertResources:()=>true,clock:()=>s.now,globalsFor:()=>globals,settingsFor,assertOwnership:(sql,p,actor,epoch)=>Boolean(authority.assertAdmitted(sql,p,actor,epoch))}));
 const first=await authority.command(peer,request),second=await authority.command(peer,request);assert.deepEqual(json(first),json(second));
 assert.equal(db.sqlite.prepare('SELECT hp,gems,hp_revision FROM players WHERE id=?').get(id).gems,98);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM kernel511_channel_receipts').get().n,1);assert.equal(authority.owner(id).sequence,1);
});


test('native clear and new encounter reset survive one checkpoint without changing V510 outcomes',async t=>{
 const s=await scenario(t),c=s.reset(0,{x:900});
 s.sql.prepare('UPDATE pve_engagements SET hit_sequence=654 WHERE player_id=?').run(id);
 const base={...s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id)};c.view.setEngagement(id,base);
 const checkpoints=new EncounterCheckpoints(pid=>c.view.engagements.get(pid)??null);checkpoints.hydrate(id,base);
 const set=c.view.setEngagement.bind(c.view);c.view.setEngagement=(pid,row)=>{checkpoints.observe(pid,c.view.engagements.get(pid)??null,row);set(pid,row);};
 const expected=await c.rules.retaliateNative(s.db,id,s.settings,s.now,{...base,...c.entry},c.frame);
 const actual=c.memory.step({playerId:id,settings:s.settings,nowMs:s.now,engagement:{...base,...c.entry},frame:c.frame,random:randomFor(0)});
 assert.deepEqual(json(actual.result),json(expected));assert.equal(c.view.engagements.get(id),undefined);assert.equal(s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id),undefined);
 const next={...c.monster,id:monsterId+'-new',x:900};put(s.sql,'monsters',next);c.view.setMonster(next);
 s.db.batch(c.rules.preparePveEngagement(s.db,c.view.player(id),next,s.now+1));c.memory.arm(c.view.player(id),next,s.now+1);
 const nativeRow={...s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id)};
 assert.equal(nativeRow.hit_sequence,0);assert.deepEqual(json(c.view.engagements.get(id)),nativeRow);assert.deepEqual(json(c.events),json(c.oldEvents));
 const snapshot=checkpoints.snapshot(id);assert.equal(snapshot.transitions.length,2);
 // Replay from the exact old durable row, as a real periodic checkpoint does.
 s.sql.prepare('DELETE FROM pve_engagements WHERE player_id=?').run(id);put(s.sql,'pve_engagements',base);
 await s.f.database.atomic(()=>{const saved=writeEncounterCheckpoint(s.sql,snapshot,{actor:id});assert.deepEqual(saved,nativeRow);});
 assert.deepEqual({...s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id)},nativeRow);
 checkpoints.acknowledged(id,snapshot,nativeRow);assert.equal(checkpoints.changed(id),false);
});
