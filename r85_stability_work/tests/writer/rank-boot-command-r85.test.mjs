import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {setupPvp,put} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {GameWriter} from '../../working/core511-source/scripts/core511/writer-runtime.mjs';
import {createRewardRankRefreshR85} from '../../working/core511-source/scripts/core511/reward-rank-refresh-r85.mjs';
import {prepareCombatStatementBootR61,statementBootPoolStatsR61} from '../../working/core511-source/scripts/core511/statement-boot-pool-r61.mjs';
import {preparedStatementsStats477} from '../../working/native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {readAttackFrame} from '../../working/core511-source/scripts/core511/attack-writer.mjs';
import {sourceIdentity} from '../../working/core511-source/scripts/core511/source-identity.mjs';

test('first real native lethal commands retain boot statements and prepared cache',async t=>{
 const f=await setupPvp(t);let now=f.nowMs;
 f.sql.prepare("UPDATE players SET area='forest',channel=1,x=1000,y=1000,hp=10000,max_hp=10000,level=40,rank_tier=0,rank_xp=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,last_seen=? WHERE id=?").run(Math.floor(now/1000),f.id);
 for(let i=0;i<3;i++)put(f.sql,'monsters',{id:'golge-boot-proof-'+i,name:'Gölge',area:'forest',channel:1,x:1000,y:1000,hp:1,max_hp:1,spawn_round:17,last_damaged_at_ms:now,last_regen_at_ms:now});
 const writer=new GameWriter(f.f.database,{realmId:'boot-command-proof',clock:()=>now,ports:{guard:()=>true}});await writer.initialize();const peer={channel:1,incarnation:'boot-command-owner'};await writer.register(peer);const owner=await writer.admit(f.id,peer,{sessionId:'boot-command-session',guard:()=>true});
 const rankRefreshR85=createRewardRankRefreshR85(writer.services),sql=f.sql;
 const payload=i=>({nowMs:now,receivedAtMs:now,seed:String(i+1).repeat(64),input:{action:'attack',targetId:'golge-boot-proof-'+i,spawnRound:17,ability:0,intentId:'boot-proof-'+i},expected:{...readAttackFrame(sql,f.id,'golge-boot-proof-'+i,writer.services.globals),settings:writer.settingsCache.read(sql)},resources:['player:'+f.id,'monster:golge-boot-proof-'+i],localScope:{kind:'kill',targets:[{id:'golge-boot-proof-'+i,spawnRound:17}]}});
 const first=payload(0); // Pre-built fixture input; this is not a cold performance benchmark.
 prepareCombatStatementBootR61(sql);const rows=[],registrations=[],schemaExec=[],register=sql.function,exec=sql.exec;
 sql.function=function(...args){registrations.push(args[0]);return Reflect.apply(register,this,args);};
 sql.exec=function(...args){if(/\b(?:CREATE|ALTER|DROP|ATTACH|DETACH|VACUUM|REINDEX)\b/i.test(args[0]))schemaExec.push(args[0]);return Reflect.apply(exec,this,args);};
 const snapshot=phase=>rows.push({phase,pool:statementBootPoolStatsR61(sql),prepared:preparedStatementsStats477(sql),registrations:[...registrations],schemaExecCount:schemaExec.length});snapshot('ready-equivalent');
 for(let i=0;i<3;i++){
  const input=i===0?first:payload(i);writer.refreshOwners();writer.services.refresh({rankRefreshR85});writer.services.globals.__colAdventure.profileCache.clear();snapshot('before-command-'+i);
  const ack=await writer.command(peer,{playerId:f.id,epoch:owner.epoch,sequence:i+1,operationId:'boot-proof-'+i,operation:'attack',payload:input});rankRefreshR85.afterCommand(ack);snapshot('after-command-'+i);
  assert.equal(ack.result.result.status,200);assert(ack.result.result.body.hits.some(h=>h.killed&&h.id==='golge-boot-proof-'+i));assert.equal(sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get('boot-proof-'+i).n,1);now+=3000;
 }
 assert.deepEqual(registrations,[]);assert.deepEqual(schemaExec,[]);assert(rows.every(r=>r.pool.invalidated===null));assert(rows.every(r=>r.prepared.invalidations===rows[0].prepared.invalidations));
 const report={coreSHA256:sourceIdentity().sha256,scope:'Small current native GameWriter fixture, actual owners/epochs/resources,3 ordinary lethal commits and exact receipts. Pre-built first input; no joined checkpoint and no cold-performance claim. External worker boot/refresh initialization order reproduced. No native functions/schema registered after boot.',passed:true,rows};
 writeFileSync(new URL('../../evidence/rank-boot-command-r85.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
});
