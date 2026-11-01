import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,hash,temporary,BASE} from './helpers.mjs';
import {setupPvp,json,update} from './pvp-fixture.mjs';
import {createRewardServices} from '../generated/reward-services.mjs';
import {createQuestWriterHandler} from '../quest-writer.mjs';
import {serviceTransactionDatabase} from '../service-transaction.mjs';
import {attackRandom} from '../attack-writer.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
const tables=['players','player_items','quest_claims438','quest_receipts438','player_stones','dungeon_materials','premium_receipts'];
const capture=sql=>Object.fromEntries(tables.map(table=>[table,json(sql.prepare('SELECT * FROM '+table+' ORDER BY rowid').all())]));
const options=(s,authority)=>({globalsFor:()=>s.globals,assertOwnership:authority?(db,p,id,epoch)=>Boolean(authority.assertAdmitted(db,p,id,epoch)):()=>true,assertResources:()=>true,clock:()=>s.nowMs});
test('native reward service function bodies and provenance stay unchanged',()=>{
 const p=JSON.parse(fs.readFileSync(new URL('../generated/reward-services-proof.json',import.meta.url)));assert.equal(hash(fs.readFileSync(new URL('../generated/reward-services.mjs',import.meta.url))),p.generatedSha256);
 for(const m of p.modules){const source=fs.readFileSync(path.join(BASE,m.file),'utf8');assert.equal(hash(source),m.sha256);for(const d of m.declarations)assert.equal(hash(source.slice(d.start,d.end)),d.sha256);}
});
test('quest native class gear/XP/gems, progression and tutorial receipts equal ordered writer',async t=>{
 const s=await setupPvp(t);s.reset({area:'forest',actor:{quest_kills438:15,level:1,xp:0}});const {createQuests438}=await native('vds-server/src/quests438.mjs');
 for(const [questId,action,patch]of [['first_hunt','quest_claim',{}],['second_hunt','quest_claim',{quest_kills438:45}],['first_catch','quest_claim',{quest_fish438:1}],['market_lesson','quest_tutorial',{area:'bazaar'}]]){
  if(Object.keys(patch).length)update(s.sql,'players',s.id,patch);const input={action,questId,revision:s.sql.prepare('SELECT revision FROM quest_settings438 WHERE id=1').get().revision,requestId:'quest-native-'+questId};
  const seed=hash(s.seed+questId),nativeUuid=crypto.randomUUID;let expected,after;try{crypto.randomUUID=attackRandom(seed).uuid;syncBuiltinESMExports();s.sql.exec('SAVEPOINT quest_oracle');const old=createQuests438(serviceTransactionDatabase(s.sql),{random:attackRandom(seed).random,now:()=>s.nowMs});expected=old.command(s.id,input);after=capture(s.sql);s.sql.exec('ROLLBACK TO quest_oracle;RELEASE quest_oracle');}finally{crypto.randomUUID=nativeUuid;syncBuiltinESMExports();}
  const handler=createQuestWriterHandler(options(s)),payload={input,nowMs:s.nowMs,seed},actual=await s.f.database.atomic(sql=>handler(sql,payload,{actor:s.id}));assert.deepEqual(json(actual.result),json(expected));assert.deepEqual(capture(s.sql),after);
  const balances=capture(s.sql),replayed=await s.f.database.atomic(sql=>handler(sql,payload,{actor:s.id}));assert.equal(replayed.result.replayed,true);assert.deepEqual(capture(s.sql),balances);
 }
 assert.equal(s.sql.prepare('SELECT count(*) n FROM quest_claims438 WHERE player_id=?').get(s.id).n,4);
});
test('native nested service COMMIT never commits the outer economy receipt; failure rolls back all gifts',async t=>{
 const s=await setupPvp(t);s.reset({actor:{quest_kills438:15}});const before=capture(s.sql),handler=createQuestWriterHandler(options(s)),input={action:'quest_claim',questId:'first_hunt',revision:1,requestId:'quest-rollback-native'};
 await assert.rejects(s.f.database.atomic(sql=>{handler(sql,{input,nowMs:s.nowMs,seed:s.seed},{actor:s.id});assert(sql.isTransaction);throw Error('simulated receipt failure');}),/simulated receipt failure/);assert.deepEqual(capture(s.sql),before);
 const db=serviceTransactionDatabase(s.sql);assert.throws(()=>db.exec('BEGIN IMMEDIATE'),/service_requires_outer_atomic/);assert.throws(()=>db.exec('DELETE FROM players'),/service_exec_not_a_transaction/);
});
for(const phase of ['before','after'])test('actual quest class/XP/currency SIGKILL '+phase+' COMMIT replays once',async t=>{
 const s=await setupPvp(t);s.reset({actor:{quest_kills438:15}});const authority=new ChannelOwnership(s.f.database,{realmId:'quest-crash'});await authority.initialize();const peer={channel:1,incarnation:'quest-owner'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(s.id,peer,{sessionId:'quest-session',guard:()=>true});
 const request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'quest-crash-once',operation:'quest',payload:{nowMs:s.nowMs,seed:s.seed,input:{action:'quest_claim',questId:'first_hunt',revision:1,requestId:'quest-crash-native'}}};
 const dir=temporary(t),file=path.join(dir,'quest.sqlite'),input=path.join(dir,'input.json'),marker=path.join(dir,'phase.txt');s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(s.f.file,file);fs.writeFileSync(input,JSON.stringify({request,peer}));
 const child=spawn(process.execPath,[path.join(import.meta.dirname,'quest-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_quest':'durable_quest_before_ack');
 const {LocalDatabase}=await native('vds-server/src/database.mjs'),db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});t.after(()=>db.close());assert.equal(db.sqlite.prepare('SELECT count(*) n FROM quest_claims438 WHERE player_id=?').get(s.id).n,phase==='after'?1:0);const resumed=new ChannelOwnership(db,{realmId:'quest-crash'});await resumed.initialize();registerOwnedRule(resumed,'quest',createQuestWriterHandler(options(s,resumed)));
 const a=await resumed.command(peer,request),state=capture(db.sqlite),b=await resumed.command(peer,request);assert.deepEqual(json(a),json(b));assert.deepEqual(capture(db.sqlite),state);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM quest_claims438 WHERE player_id=?').get(s.id).n,1);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM player_items WHERE player_id=? AND rarity=?').get(s.id,'blue').n,1);
});
