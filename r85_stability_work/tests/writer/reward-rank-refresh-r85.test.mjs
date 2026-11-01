import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {NativeGameServices} from '../../working/core511-source/scripts/core511/game-services.mjs';
import {createRewardRankRefreshR85} from '../../working/core511-source/scripts/core511/reward-rank-refresh-r85.mjs';
import {ChannelAuthority} from '../../working/core511-source/scripts/core511/receipt-authority.mjs';
import {CommandFailureScope} from '../../working/core511-source/scripts/core511/command-failure-scope.mjs';

async function setup(t,{nativeAdminSave=false}={}){
 const f=await setupPvp(t),services=new NativeGameServices(f.sql,{clock:()=>f.nowMs});
 if(nativeAdminSave){
  // Reward workers cannot call the native admin save: their production adapter
  // rejects its dynamic SQL batch. This fixture permits only that actual native
  // batch to prove save's private-cache behavior under a real outer rollback;
  // existing nested transaction savepoints and every SQL statement still run.
  const database=services.database;services.database=new Proxy(database,{get(target,key){
   if(key==='exec')return source=>{if(source.startsWith('UPDATE players SET rank_forest=rank_forest WHERE level>=65 AND rank_tier=0;'))return f.sql.exec(source);return database.exec(source);};
   return Reflect.get(target,key,target);
  }});
 }
 const rankRefreshR85=createRewardRankRefreshR85(services);
 const refresh=()=>{services.refresh({rankRefreshR85});return services.globals.__colRanks;};
 const fresh=()=>services.modules.ranks.createRanks(services.database);
 const payload={nowMs:f.nowMs,seed:'7'.repeat(64)};
 const native=work=>services.run(payload,work);
 const rollback=work=>{f.sql.exec('BEGIN IMMEDIATE');try{return work();}finally{f.sql.exec('ROLLBACK');}};
 return {...f,services,rankRefreshR85,refresh,fresh,native,rollback};
}

test('native rank reads/bonuses reuse only the exact durable schema and config; other services still refresh',async t=>{
 const f=await setup(t);let eventRefreshes=0,progressionRefreshes=0;
 for(const [name,inc] of [['__colEventIsland444',()=>eventRefreshes++],['__colProgression',()=>progressionRefreshes++]]){const service=f.services.globals[name],old=service.refresh;service.refresh=function(...args){inc();return Reflect.apply(old,this,args);};}
 const first=f.refresh(),reference=f.fresh();
 for(let n=0;n<5;n++){assert.equal(f.refresh(),first);assert.deepEqual(first.read(f.id),reference.read(f.id));assert.deepEqual(first.bonuses(f.id),reference.bonuses(f.id));}
 assert.equal(eventRefreshes,6);assert.equal(progressionRefreshes,6);
 f.services.refresh();assert.notEqual(f.services.globals.__colRanks,first,'ordinary main/cold refresh stays uncached');
 const replaced=f.services.globals.__colRanks;assert.notEqual(f.refresh(),replaced,'foreign service identity cannot inherit prior stamp');
 const alteredSettings=f.refresh();alteredSettings.settings=()=>({revision:-1});assert.notEqual(f.refresh(),alteredSettings);
 const alteredSave=f.refresh();alteredSave.save=()=>{throw Error('foreign save');};assert.notEqual(f.refresh(),alteredSave);
});

test('same revision changed config bytes and changed schema force native rank reconstruction',async t=>{
 const f=await setup(t),first=f.refresh(),original=f.sql.prepare('SELECT * FROM rank_settings WHERE id=1').get();
 f.sql.prepare('UPDATE rank_settings SET config_json=? WHERE id=1').run(original.config_json+' ');
 const whitespace=f.refresh();assert.notEqual(whitespace,first);assert.deepEqual(whitespace.read(f.id),f.fresh().read(f.id));
 f.sql.prepare('UPDATE rank_settings SET revision=revision+1 WHERE id=1').run();
 const revision=f.refresh();assert.notEqual(revision,whitespace);assert.deepEqual(revision.settings(),f.fresh().settings());
 const schema=f.sql.prepare('PRAGMA schema_version').get().schema_version;
 f.sql.exec('ALTER TABLE players ADD COLUMN r85_schema_probe INTEGER NOT NULL DEFAULT 0');
 f.sql.exec('PRAGMA schema_version='+schema); // Deliberately defeat version-only guards.
 const changed=f.refresh();assert.notEqual(changed,revision);assert.deepEqual(changed.bonuses(f.id),f.fresh().bonuses(f.id));
 f.sql.exec('ALTER TABLE players DROP COLUMN r85_schema_probe');assert.notEqual(f.refresh(),changed);
});

test('native save followed by outer rollback cannot reuse its mutated private settings cache',async t=>{
 const f=await setup(t,{nativeAdminSave:true}),before=f.refresh(),initial=structuredClone(before.settings()),original=f.sql.prepare('SELECT config_json,revision FROM rank_settings WHERE id=1').get(),config=structuredClone(initial.config);
 config.requirements.forest++;
 f.rollback(()=>{const saved=f.native(()=>before.save(config,initial.revision));assert.equal(saved.revision,initial.revision+1);assert.notDeepEqual(before.settings(),initial);});
 assert.deepEqual(f.sql.prepare('SELECT config_json,revision FROM rank_settings WHERE id=1').get(),original);
 const after=f.refresh();assert.notEqual(after,before);assert.deepEqual(after.settings(),initial);assert.deepEqual(after.read(f.id),f.fresh().read(f.id));
 // A rejected save invalidates as well, even though its native cache/SQL did
 // not change. A later exact same row is not enough to bypass reconstruction.
 f.rollback(()=>assert.throws(()=>f.native(()=>after.save(config,initial.revision+10))));
 assert.notEqual(f.refresh(),after);
});

test('committed native config save, rollback return, explicit invalidation and foreign service reject stale cache',async t=>{
 const f=await setup(t,{nativeAdminSave:true}),first=f.refresh(),initial=structuredClone(first.settings()),next=structuredClone(initial.config);next.requirements.forest++;
 await f.f.database.atomic(()=>f.native(()=>first.save(next,initial.revision)));
 const saved=f.refresh();assert.notEqual(saved,first);assert.deepEqual(saved.settings(),f.fresh().settings());
 f.sql.prepare('UPDATE rank_settings SET config_json=?,revision=? WHERE id=1').run(JSON.stringify(initial.config),initial.revision);
 const returned=f.refresh();assert.notEqual(returned,saved);assert.deepEqual(returned.settings(),initial);
 f.rankRefreshR85.invalidate();assert.notEqual(f.refresh(),returned);
 assert.throws(()=>f.rankRefreshR85.refresh({...f.services}),{code:'reward_rank_refresh_context'});
 f.rollback(()=>assert.throws(()=>f.refresh(),{code:'reward_rank_refresh_context'}));
});

test('cached native grant matches a fresh native rank factory, including player effects and bonuses',async t=>{
 const f=await setup(t);f.sql.prepare('UPDATE players SET level=65,rank_tier=1,rank_xp=0 WHERE id=?').run(f.id);
 const cached=f.refresh();assert.equal(f.refresh(),cached);
 const apply=rank=>f.rollback(()=>f.native(()=>{const result=rank.grant(f.id,2,1,'fixture-admin');return {result,player:f.sql.prepare('SELECT rank_tier,rank_xp,max_hp,hp,hp_revision,rank_unlocked FROM players WHERE id=?').get(f.id),read:rank.read(f.id),bonuses:rank.bonuses(f.id)};}));
 assert.deepEqual(apply(cached),apply(f.fresh()));
 assert.equal(f.refresh(),cached,'player-only native grant does not invalidate immutable configuration');
});

test('actual negative receipt after SQL rollback invalidates an uncommitted lazy rank settings read',async t=>{
 const f=await setup(t),rank=f.refresh(),original=f.sql.prepare('SELECT config_json,revision FROM rank_settings WHERE id=1').get(),next=JSON.parse(original.config_json);next.requirements.forest++;
 const authority=new ChannelAuthority(f.f.database,{realmId:'rank-cache-proof'});await authority.initialize();
 const peer={channel:1,incarnation:'rank-worker-proof'};await authority.registerProcess(peer.channel,peer.incarnation);await authority.claim(f.id,peer.channel,peer.incarnation);const owner=authority.owner(f.id);
 const scope=new CommandFailureScope(f.sql,{diagnostic:()=>{}});let calls=0;
 authority.operations.attack={execute:(sql,request)=>({key:request.operationId,result:scope.run('attack',request.payload,{actor:f.id,epoch:request.epoch,key:request.operationId,peer,realm:'rank-cache-proof'},()=>{
  calls++;sql.prepare('UPDATE rank_settings SET config_json=?,revision=revision+1 WHERE id=1').run(JSON.stringify(next));
  assert.equal(rank.settings().revision,original.revision+1);
  sql.prepare('SELECT * FROM r85_missing_rank_rollback_probe').get();
 })})};
 const request={playerId:f.id,epoch:owner.epoch,sequence:1,operationId:'rank-negative-proof',operation:'attack',payload:{checkpointR53:{}}};
 const ack=await authority.command(peer,request);assert.equal(ack.result.result.status,409);assert.equal(ack.result.result.body.code,'command_sql_rolled_back');
 assert.deepEqual(f.sql.prepare('SELECT config_json,revision FROM rank_settings WHERE id=1').get(),original);
 assert.equal(rank.settings().revision,original.revision+1,'private native cache still holds rolled-back row before invalidation');
 assert.equal(authority.owner(f.id).sequence,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId).n,1);
 f.rankRefreshR85.afterCommand(ack);const clean=f.refresh();assert.notEqual(clean,rank);assert.deepEqual(clean.settings(),f.fresh().settings());
 assert.deepEqual(await authority.command(peer,request),JSON.parse(JSON.stringify(ack)));assert.equal(calls,1,'negative receipt replay never reruns native mutation');
 f.rankRefreshR85.afterCommand({result:{result:{status:200,body:{}}}});assert.equal(f.refresh(),clean);
 f.rankRefreshR85.afterCommand({result:{result:{status:200,body:{not_executed:true}}}});assert.notEqual(f.refresh(),clean);
});
