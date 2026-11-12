import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put,update,json,response} from './pvp-fixture.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {readAttackFrame} from '../attack-writer.mjs';
import {createAttackRules} from '../generated/attack-rules.mjs';
import {actionRandom} from '../action-writer.mjs';

async function setup(t){
 const s=await setupPvp(t);s.reset({area:'forest',actor:{essence:13,essence_until:s.nowMs+3600000,essence_bonus_remainder:4},victim:{area:'black',essence:17,essence_until:s.nowMs+3600000,essence_bonus_remainder:3}});
 update(s.sql,'players',s.targetId,{channel:2});
 const writer=new GameWriter(s.f.database,{realmId:'player-write-test',clock:()=>s.nowMs,ports:{guard:()=>true,assertResources:()=>true}});await writer.initialize();
 const peer={channel:1,incarnation:'player-write-owner'},foreign={channel:2,incarnation:'player-write-foreign'};await writer.register(peer);await writer.register(foreign);
 const owner=await writer.admit(s.id,peer,{sessionId:'player-write-session',guard:()=>true}),target=await writer.admit(s.targetId,foreign,{sessionId:'player-write-target',guard:()=>true});
 put(s.sql,'parties',{id:'scope-party',leader_id:s.id,created_at:1});for(const [i,id]of [s.id,s.targetId].entries())put(s.sql,'party_members',{party_id:'scope-party',player_id:id,joined_at:i+1});
 put(s.sql,'world_drops',{id:'scope-drop',owner_id:s.id,monster_id:'golge-scope',kind:'essence',item_name:'Scope essence',rarity:'white',power:0,amount:11,role:'avci',enchantments:'[]',x:1000,y:1000,expires_at:Math.floor(s.nowMs/1000)+120,collectible_at:Math.floor(s.nowMs/1000)});
 const payload={input:{action:'collect',targetId:'scope-drop'},nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:s.seed,resources:['player:'+s.id],expected:{player:readAttackFrame(s.sql,s.id,'',writer.services.globals).player,settings:s.settings}},request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'scope-native-collect',operation:'native_action',payload};
 const capture=()=>json({players:s.sql.prepare('SELECT * FROM players ORDER BY id').all(),drops:s.sql.prepare('SELECT * FROM world_drops ORDER BY id').all(),rewards:s.sql.prepare('SELECT * FROM guild_essence_rewards ORDER BY id').all(),receipts:s.sql.prepare('SELECT * FROM kernel511_channel_receipts ORDER BY operation_id').all()});
 return {...s,writer,peer,foreign,owner,target,payload,request,capture};
}

test('native cross-channel party write rolls back drop, reward triggers and receipt unless the foreign owner is frozen',async t=>{
 const s=await setup(t),before=s.capture();
 await assert.rejects(s.writer.command(s.peer,s.request),{code:'player_write_unlocked_actor'});assert.deepEqual(s.capture(),before);
 await assert.rejects(s.writer.command(s.peer,{...s.request,payload:{...s.payload,resources:[...s.payload.resources,'player:'+s.targetId]}}),{code:'player_write_foreign_owner'});assert.deepEqual(s.capture(),before);
 await assert.rejects(s.writer.command(s.peer,{...s.request,payload:{...s.payload,sharedLease:'forged',resources:[...s.payload.resources,'player:'+s.targetId]}}),{code:'player_write_shared_authority'});assert.deepEqual(s.capture(),before);
 assert.equal(s.writer.playerWrites.active,false);assert.equal(s.sql.prepare('SELECT enabled FROM temp.kernel511_player_write_enabled').get().enabled,0);
});

test('offline party native trigger rewards and changes() match original and all actually changed players enter the durable result',async t=>{
 const s=await setup(t);await s.writer.logout(s.targetId,s.foreign,{epoch:s.target.epoch,sessionId:'player-write-target',finalSequence:0});
 const original=createAttackRules({globals:s.writer.services.globals,...actionRandom(s.seed),now:()=>s.nowMs,response,ports:{settlePveEngagement:()=>null,publishRealtimeRoomEvent:()=>{},publishRealtimePlayerEvent:()=>{},publishRealtimeWorldEvent:()=>{},deliverRealtime:v=>v}});
 s.sql.exec('SAVEPOINT scope_oracle');const expected=await original.nativeAction(s.db,{player:s.payload.expected.player,playerId:s.id,payload:s.payload.input,settings:s.settings,requestReceivedAtMs:s.nowMs,now:Math.floor(s.nowMs/1000),auth:{account:{id:s.sql.prepare('SELECT account_id FROM players WHERE id=?').get(s.id).account_id}}}),after=s.capture();s.sql.exec('ROLLBACK TO scope_oracle;RELEASE scope_oracle');
 const ack=await s.writer.command(s.peer,s.request),actual=s.capture();assert.deepEqual(json(ack.result.result),json(expected));assert.deepEqual(actual.players,after.players);assert.deepEqual(actual.drops,after.drops);assert.deepEqual(actual.rewards,after.rewards);assert.equal(actual.receipts.length,1);assert.deepEqual(ack.result.players.map(p=>p.id).sort(),[s.id,s.targetId].sort());assert.deepEqual(json(await s.writer.command(s.peer,s.request)),json(ack));assert.deepEqual(s.capture(),actual);
 assert.equal(s.sql.prepare("SELECT COUNT(*) n FROM main.sqlite_master WHERE name LIKE 'kernel511_player_write_%'").get().n,0);
});

test('actual offline write set is checked against a concurrent permanent guard before COMMIT',async t=>{
 const s=await setup(t);await s.writer.logout(s.targetId,s.foreign,{epoch:s.target.epoch,sessionId:'player-write-target',finalSequence:0});const before=s.capture();let actual=false;
 s.writer.authority.commandGuard=(sql,peer,request)=>{if(request.payload.resources.includes('player:'+s.targetId)){actual=true;throw Object.assign(Error('offline permanent operation in progress'),{code:'offline_permanent_held'});}return true;};
 await assert.rejects(s.writer.command(s.peer,s.request),{code:'offline_permanent_held'});assert(actual);assert.deepEqual(s.capture(),before);
});

test('player write tracking follows native trigger, savepoint and repeated same-row semantics without leaking to another operation',async t=>{
 const s=await setup(t),scope=s.writer.playerWrites,context={peer:s.peer,actor:s.id,epoch:s.owner.epoch};
 await s.f.database.atomic(sql=>scope.run(sql,{resources:['player:'+s.id]},context,'native_action',()=>{
  sql.exec('SAVEPOINT native_rejected');update(sql,'players',s.targetId,{gems:42});assert(scope.ids().includes(s.targetId));sql.exec('ROLLBACK TO native_rejected;RELEASE native_rejected');assert.deepEqual(scope.ids(),[]);
  for(let i=0;i<3;i++){const result=sql.prepare('UPDATE players SET gems=gems+1 WHERE id=?').run(s.id);assert.equal(result.changes,1);assert.equal(sql.prepare('SELECT changes() n').get().n,1);}
  assert.deepEqual(scope.ids(),[s.id]);return {ok:true};
 }));
 await s.f.database.atomic(sql=>scope.run(sql,{},context,'actor_checkpoint',()=>{assert.deepEqual(scope.ids(),[]);return {ok:true};}));
 assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM temp.kernel511_player_write_set').get().n,0);
});
