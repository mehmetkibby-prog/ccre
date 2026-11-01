import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put,update,json} from './pvp-fixture.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {readAttackFrame,attackRandom} from '../attack-writer.mjs';
import {createAttackRules} from '../generated/attack-rules.mjs';

async function setup(t,{shared=false,extra=false}={}){
 const s=await setupPvp(t);s.reset({area:'forest'});s.sql.exec("UPDATE monsters SET hp=0 WHERE area='forest'");
 const targets=['golge-scope-main',...(extra?['golge-scope-extra']:[])];
 for(const [i,id]of targets.entries())put(s.sql,'monsters',{id,name:'Native write scope',x:1000+i*100,y:1000,hp:1000000,max_hp:1000000,respawn_at:0,variant:'normal',is_boss:0,despawn_at:0,spawn_round:1,area:'forest',channel:shared?0:1,is_stone:0,wave_stage:0,summoned:0,parent_stone_id:''});
 const writer=new GameWriter(s.f.database,{realmId:'monster-write-test',clock:()=>s.nowMs,ports:{guard:()=>true,assertResources:()=>true}});await writer.initialize();
 const peer={channel:1,incarnation:'monster-write-owner'};await writer.register(peer);const owner=await writer.admit(s.id,peer,{sessionId:'monster-write-session',guard:()=>true});
 const input={action:'attack',targetId:targets[0],spawnRound:1,ability:extra?2:0,intentId:'monster-write-scope'},frame=readAttackFrame(s.sql,s.id,targets[0],writer.services.globals);
 const payload={input,nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:s.seed,resources:['player:'+s.id,...(shared?[]:['monster:'+targets[0]])],expected:{...frame,settings:s.settings}},request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'scope-native-attack',operation:'attack',payload};
 const capture=()=>json(Object.fromEntries(['players','monsters','monster_participants','boss_participants','combat_events','pve_engagements','kernel511_channel_receipts'].map(table=>[table,s.sql.prepare('SELECT * FROM '+table).all()])));
 return {...s,writer,peer,owner,targets,payload,request,capture};
}

test('native shared attack cannot hide its C0 target by omitting the monster resource key',async t=>{
 const s=await setup(t,{shared:true}),before=s.capture();
 await assert.rejects(s.writer.command(s.peer,s.request),{code:'monster_write_unlocked'});assert.deepEqual(s.capture(),before);
});

test('native forest multi-target attack rolls back every hit and receipt when its second target is undeclared',async t=>{
 const s=await setup(t,{extra:true}),before=s.capture();
 await assert.rejects(s.writer.command(s.peer,s.request),{code:'monster_write_unlocked'});assert.deepEqual(s.capture(),before);
});

test('native forest multi-target attack with all resources retains both hits and exact replay',async t=>{
 const s=await setup(t,{extra:true});s.payload.resources.push('monster:'+s.targets[1]);
 const ack=await s.writer.command(s.peer,s.request);assert.equal(ack.result.result.status,200);assert.deepEqual(ack.result.result.body.hits.map(h=>h.id).sort(),s.targets.toSorted());
 for(const id of s.targets)assert(s.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(id).hp<1000000);
 const after=s.capture();assert.deepEqual(json(await s.writer.command(s.peer,s.request)),json(ack));assert.deepEqual(s.capture(),after);
});

test('native local AoE and Sinsi child creation retain original full-row and result parity',async t=>{
 for(const stone of [false,true]){
  const s=await setup(t,{extra:!stone});if(!stone)s.payload.resources.push('monster:'+s.targets[1]);
  if(stone){
   update(s.sql,'players',s.id,{area:'sinsi'});update(s.sql,'monsters',s.targets[0],{area:'sinsi',is_stone:1,hp:750001,max_hp:1000000,wave_stage:0});
   s.payload.expected={...readAttackFrame(s.sql,s.id,s.targets[0],s.writer.services.globals),settings:s.settings};
  }
  const pending=[],noop=()=>{},rules=createAttackRules({...attackRandom(s.seed),globals:s.writer.services.globals,now:()=>s.nowMs,response:{json:(body,{status=200}={})=>({body,status})},ports:{settlePveEngagement:()=>null,publishRealtimeRoomEvent:noop,publishRealtimeRoomEventToChannels:noop,publishRealtimePlayerEvent:noop,publishRealtimeWorldEvent:noop,deliverRealtime:v=>v,startBackgroundTask:fn=>{const p=fn();pending.push(p);return p;},scheduleRequestTask:()=>false,runRewardDelivery:(_,key,fn)=>fn()}});
  const context={player:s.payload.expected.player,playerId:s.id,payload:s.payload.input,settings:s.settings,attackTargetId:s.targets[0],preloadedAttackMonster:s.payload.expected.monster,requestReceivedAtMs:s.nowMs,now:Math.floor(s.nowMs/1000),auth:{account:{id:s.payload.expected.player.account_id}}};
  s.sql.exec('SAVEPOINT monster_scope_oracle');const expected=await rules.nativeAttack(s.db,json(context));await Promise.all(pending);const saved=s.capture();s.sql.exec('ROLLBACK TO monster_scope_oracle;RELEASE monster_scope_oracle');
  const ack=await s.writer.command(s.peer,s.request),actual=s.capture();assert.deepEqual(json(ack.result.result),json(expected));delete actual.kernel511_channel_receipts;delete saved.kernel511_channel_receipts;assert.deepEqual(actual,saved);
  if(stone){const children=s.sql.prepare('SELECT id FROM monsters WHERE parent_stone_id=? ORDER BY id').all(s.targets[0]);assert(children.length>0);assert(children.every(c=>ack.result.monsters.some(m=>m.id===c.id)));}
 }
});

test('actual native trigger cannot move combat writes into another channel even with a declared key',async t=>{
 const s=await setup(t),foreign='golge-scope-foreign';put(s.sql,'monsters',{...s.sql.prepare('SELECT * FROM monsters WHERE id=?').get(s.targets[0]),id:foreign,name:'Foreign',channel:2});s.payload.resources.push('monster:'+foreign);
 s.sql.exec(`CREATE TEMP TRIGGER test_foreign_monster AFTER UPDATE OF hp ON main.monsters WHEN NEW.id='golge-scope-main' BEGIN UPDATE monsters SET hp=hp-17 WHERE id='golge-scope-foreign'; END`);
 const before=s.capture();await assert.rejects(s.writer.command(s.peer,s.request),{code:'monster_write_foreign_owner'});assert.deepEqual(s.capture(),before);
});

test('monster scope follows savepoints and changes(), preserves ignored inserts and clears every operation',async t=>{
 const s=await setup(t,{extra:true}),scope=s.writer.monsterWrites,context={actor:s.id,peer:s.peer,epoch:s.owner.epoch};
 await s.f.database.atomic(sql=>scope.run(sql,s.payload,context,()=>{
  sql.exec('SAVEPOINT rejected_native_hit');sql.prepare('UPDATE monsters SET hp=hp-7 WHERE id=?').run(s.targets[1]);assert(scope.ids().includes(s.targets[1]));sql.exec('ROLLBACK TO rejected_native_hit;RELEASE rejected_native_hit');assert.deepEqual(scope.ids(),[]);
  const ignored=sql.prepare('INSERT OR IGNORE INTO monsters SELECT * FROM monsters WHERE id=?').run(s.targets[1]);assert.equal(ignored.changes,0);assert.deepEqual(scope.ids(),[]);
  for(let i=0;i<3;i++){assert.equal(sql.prepare('UPDATE monsters SET hp=hp-1 WHERE id=?').run(s.targets[0]).changes,1);assert.equal(sql.prepare('SELECT changes() n').get().n,1);}
  assert.deepEqual(scope.ids(),[s.targets[0]]);return {ok:true};
 }));
 const before=s.capture();await assert.rejects(s.f.database.atomic(sql=>scope.run(sql,s.payload,context,()=>{sql.prepare('DELETE FROM monsters WHERE id=?').run(s.targets[1]);return {ok:true};})),{code:'monster_write_unlocked'});assert.deepEqual(s.capture(),before);
 assert.equal(scope.active,false);assert.equal(s.sql.prepare('SELECT enabled FROM temp.kernel511_monster_write_enabled').get().enabled,0);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM temp.kernel511_monster_write_set').get().n,0);assert.equal(s.sql.prepare("SELECT COUNT(*) n FROM main.sqlite_master WHERE name LIKE 'kernel511_monster_write_%'").get().n,0);
});

test('fresh stone child permission cannot cover an existing unheld life or an ownership change',async t=>{
 const s=await setup(t,{extra:true}),scope=s.writer.monsterWrites,context={actor:s.id,peer:s.peer,epoch:s.owner.epoch};update(s.sql,'monsters',s.targets[0],{area:'sinsi',is_stone:1});update(s.sql,'monsters',s.targets[1],{area:'sinsi',summoned:1,parent_stone_id:s.targets[0]});
 const before=s.capture(),row=s.sql.prepare('SELECT * FROM monsters WHERE id=?').get(s.targets[1]),insert=sql=>put(sql,'monsters',row);
 for(const work of [sql=>{sql.prepare('DELETE FROM monsters WHERE id=?').run(row.id);insert(sql);},sql=>{sql.prepare('INSERT OR REPLACE INTO monsters SELECT * FROM monsters WHERE id=?').run(row.id);}]){
  await assert.rejects(s.f.database.atomic(sql=>scope.run(sql,s.payload,context,()=>{work(sql);return {ok:true};})),{code:'monster_write_unlocked'});assert.deepEqual(s.capture(),before);
 }
 await assert.rejects(s.f.database.atomic(sql=>scope.run(sql,s.payload,context,()=>{update(sql,'monsters',s.targets[0],{spawn_round:2});return {ok:true};})),{code:'monster_write_scope_changed'});assert.deepEqual(s.capture(),before);
 s.sql.exec('PRAGMA reverse_unordered_selects=ON');
 await s.f.database.atomic(sql=>scope.run(sql,s.payload,context,()=>{put(sql,'monsters',{...row,id:'golge-scope-fresh'});assert.equal(sql.prepare("INSERT OR IGNORE INTO monsters SELECT * FROM monsters WHERE id='golge-scope-fresh'").run().changes,0);return {ok:true};}));
});
