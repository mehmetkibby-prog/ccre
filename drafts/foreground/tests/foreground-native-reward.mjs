import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {schema,addPlayer,input,boss,stone,NOW} from './foreground-fixture.mjs';
import {LocalDatabase} from '../r80-work/native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {installRegistry} from '../r80-work/native510-bb3a6cc689c6/vds-server/src/loadlab/registry.mjs';
import {ChannelAuthority} from '../r80-work/core511-source/scripts/core511/receipt-authority.mjs';
import {PlayerWriteScope} from '../r80-work/core511-source/scripts/core511/player-write-scope.mjs';
import {createAttackWriterRules} from '../r80-work/core511-source/scripts/core511/generated/attack-writer-rules.mjs';
import {nativeAtomicStatements} from '../r80-work/core511-source/scripts/core511/retaliation-writer.mjs';
import {OperationRandom} from '../r80-work/core511-source/scripts/core511/operation-random.mjs';
import {foregroundClaimScopeR80} from '../r80-work/core511-source/scripts/core511/reward-actor-scope-r80.mjs';

// Actual native award SQL, PlayerWriteScope, receipt authority and file-backed
// LocalDatabase; this deliberately does not claim to boot the absent R79
// action-writer/game-services wrapper or a five-process production realm.
const settings={events_json:'{}',regular_item_drop_chance:0,boss_red_chance:0,boss_orange_chance:0,boss_blue_chance:0,boss_armor_chance:0,world_boss_purple_chance:0,world_boss_stone_book_chance:0,world_boss_stone_book_min:1,world_boss_stone_book_max:1,world_boss_evolution_scroll_chance:0,world_boss_evolution_scroll_min:1,world_boss_evolution_scroll_max:1,sinsi_stone_gear_drops:0,sinsi_stone_red_chance:0,sinsi_stone_orange_chance:0,sinsi_stone_blue_chance:0,sinsi_stone_armor_chance:0,sinsi_stone_dust_reward:1,sinsi_stone_essence_min:1,sinsi_stone_essence_max:1};
async function setup(t,kind='boss'){
 const dir=mkdtempSync(join(tmpdir(),'r80-foreground-')),db=new LocalDatabase(join(dir,'fixture.sqlite'),{create:true,groupWrites:true,asyncDurable:true});
 t.after(async()=>{await db.close();rmSync(dir,{recursive:true,force:true});});const sql=db.sqlite;schema(sql);installRegistry({now:()=>NOW});
 for(const [id,channel]of [['p1',1],['p2',1],['p4',2],['p7',2],['bystander',4]])addPlayer(sql,id,channel);
 sql.exec("INSERT INTO party_members VALUES('p1','party1'),('p2','party1'),('p4','party2'),('p7','party2')");
 const claim=kind==='boss'?input():input('sinsi-tasi-2-1');kind==='boss'?boss(sql,['p1','p4']):stone(sql,['p1','p4']);
 const authority=new ChannelAuthority(db,{realmId:'foreground-fixture',now:()=>NOW});await authority.initialize();
 for(const channel of [1,2,3,4])await authority.registerProcess(channel,'ch'+channel);
 for(const p of sql.prepare('SELECT id,channel FROM players').all())await authority.claim(p.id,p.channel,'ch'+p.channel);
 // Only admissions/simulation lookup is a fixture port. The actual persisted
 // owner epochs and sequence/receipt protocol are read by ChannelAuthority.
 authority.admission=id=>id==='p7'?null:{epoch:1,channel:authority.owner(id).channel};authority.simulation=()=>null;
 authority.assertSimulated=(_sql,peer,id,epoch)=>{const o=authority.owner(id);assert.equal(o.epoch,epoch);assert.equal(o.channel,peer.channel);assert.equal(o.incarnation,peer.incarnation);return o;};
 const scope=new PlayerWriteScope(authority);scope.initialize(sql);const selected=foregroundClaimScopeR80(sql,claim,'p1',1),peer={channel:1,incarnation:'ch1'};
 let calls=0,rollback=false;
 authority.operations.native_action={execute:(sqlite,{playerId,epoch,payload,operationId})=>{
  calls++;assert.deepEqual(foregroundClaimScopeR80(sqlite,payload.input,playerId,peer.channel),selected);
  const rng=new OperationRandom('7'.repeat(64)),rules=createAttackWriterRules({globals:{},now:()=>NOW,random:()=>rng.roll(),uuid:()=>rng.uuid(),fourChannels:true,ports:{runRewardDelivery:(_db,_key,work)=>work()}});
  const shared={assertWrite:()=>true,allows:id=>selected.actors.includes(id)};
  return scope.run(sqlite,payload,{actor:playerId,epoch,peer},'native_action',()=>{
   const native=nativeAtomicStatements(sqlite),value=kind==='boss'?rules.awardPendingBossRewards(native,settings,Math.floor(NOW/1000),7,playerId):rules.awardPendingSinsiStoneRewards(native,settings,Math.floor(NOW/1000),{id:'sinsi-tasi-2-1',spawn_round:7});
   if(rollback)throw Object.assign(Error('injected after native award'),{code:'test_rollback'});
   return {key:operationId,result:value};
  },{shared,afterWriteGuard:(_sql,ids)=>{assert(ids.every(id=>selected.actors.includes(id)));return true;}});
 }};
 const request={playerId:'p1',epoch:1,sequence:1,operationId:'claim-1',operation:'native_action',payload:{input:claim,sharedLease:'fixture-lease',resources:selected.actors.map(id=>'player:'+id)}};
 const snapshot=()=>JSON.stringify({players:sql.prepare('SELECT id,xp,gems FROM players ORDER BY id').all(),xp:sql.prepare('SELECT * FROM monster_xp_claims ORDER BY player_id').all(),drops:sql.prepare('SELECT * FROM world_drops ORDER BY id').all(),boss:sql.prepare('SELECT * FROM boss_reward_claims ORDER BY player_id').all(),stone:sql.prepare('SELECT * FROM sinsi_reward_claims ORDER BY player_id').all(),receipts:sql.prepare('SELECT * FROM kernel511_channel_receipts ORDER BY operation_id').all()});
 return {db,sql,authority,peer,request,selected,snapshot,calls:()=>calls,setRollback:value=>rollback=value};
}
for(const kind of ['boss','sinsi'])test(kind+': real SQL keeps cross-channel/offline XP, exactly-once native claims and durable receipt replay',async t=>{
 const s=await setup(t,kind),ack=await s.authority.command(s.peer,s.request);assert.equal(ack.result.awarded,true);
 const after=s.snapshot();assert.equal(s.sql.prepare('SELECT xp FROM players WHERE id=?').get('bystander').xp,0);
 for(const id of ['p1','p2','p4','p7'])assert(s.sql.prepare('SELECT xp FROM players WHERE id=?').get(id).xp>0,id);
 assert.deepEqual(await s.authority.command(s.peer,s.request),ack);assert.equal(s.snapshot(),after);assert.equal(s.calls(),1);
 const duplicate={...s.request,operationId:'claim-again',sequence:2};const again=await s.authority.command(s.peer,duplicate);assert.equal(again.result,null);
 assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM '+(kind==='boss'?'boss_reward_claims':'sinsi_reward_claims')).get().n,2);
 assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM monster_xp_claims').get().n,4);
});
test('native reward changes and receipt roll back together, then exact retry pays once',async t=>{
 const s=await setup(t),before=s.snapshot();s.setRollback(true);await assert.rejects(s.authority.command(s.peer,s.request),{code:'test_rollback'});assert.equal(s.snapshot(),before);assert.equal(s.authority.owner('p1').sequence,0);
 s.setRollback(false);const ack=await s.authority.command(s.peer,s.request);assert.equal(ack.result.awarded,true);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,1);
});
test('successful native award does not acknowledge before the original durableAfterCommit boundary',async t=>{
 const s=await setup(t),original=s.db.durableAfterCommit.bind(s.db);let release,entered,done=false;
 const gate=new Promise(r=>release=r),durableEntered=new Promise(r=>entered=r);
 s.db.durableAfterCommit=async()=>{await original();entered();await gate;};
 const pending=s.authority.command(s.peer,s.request).then(value=>{done=true;return value;});await durableEntered;
 assert.equal(done,false);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM boss_reward_claims').get().n,2);
 release();await pending;s.db.durableAfterCommit=original;assert.equal(done,true);
});
test('new command from a stale epoch cannot execute reward SQL or create a receipt',async t=>{
 const s=await setup(t),before=s.snapshot();await assert.rejects(s.authority.command(s.peer,{...s.request,epoch:2}),{code:'owner_epoch_fenced'});assert.equal(s.snapshot(),before);assert.equal(s.calls(),0);
});
