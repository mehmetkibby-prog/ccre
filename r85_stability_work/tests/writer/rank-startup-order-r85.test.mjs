import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {setupPvp} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {GameWriter} from '../../working/core511-source/scripts/core511/writer-runtime.mjs';
import {createRewardRankRefreshR85} from '../../working/core511-source/scripts/core511/reward-rank-refresh-r85.mjs';
import {prepareCombatStatementBootR61,statementBootPoolStatsR61} from '../../working/core511-source/scripts/core511/statement-boot-pool-r61.mjs';
import {preparedStatementsStats477} from '../../working/native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {sourceIdentity} from '../../working/core511-source/scripts/core511/source-identity.mjs';

const reports=[];
for(const early of [false,true])test('actual native rank cache startup '+(early?'before':'after')+' statement boot pool',async t=>{
 const f=await setupPvp(t),writer=new GameWriter(f.f.database,{realmId:'rank-startup-proof',clock:()=>f.nowMs,ports:{guard:()=>true}});await writer.initialize();
 const sql=f.sql,services=writer.services,initial=services.globals.__colRanks,events={functionCalls:[],exec:[],factory:[]};
 const register=sql.function;sql.function=function(...args){events.functionCalls.push(args[0]);return Reflect.apply(register,this,args);};
 const exec=sql.exec;sql.exec=function(...args){events.exec.push(args[0]);return Reflect.apply(exec,this,args);};
 const factory=services.modules.ranks.createRanks;services.modules.ranks.createRanks=function(...args){const start=performance.now();try{return Reflect.apply(factory,this,args);}finally{events.factory.push(performance.now()-start);}};
 const rankRefreshR85=createRewardRankRefreshR85(services);let initializedMs=null;
 if(early){const at=performance.now();services.globals.__colRanks=rankRefreshR85.refresh(services);initializedMs=performance.now()-at;assert.notEqual(services.globals.__colRanks,initial);}
 prepareCombatStatementBootR61(sql);const poolBefore=statementBootPoolStatsR61(sql),preparedBefore=preparedStatementsStats477(sql),beforeRank=services.globals.__colRanks;
 assert(poolBefore.compiled>0);assert.equal(poolBefore.invalidated,null);events.functionCalls.length=0;events.exec.length=0;events.factory.length=0;
 const start=performance.now();services.refresh({rankRefreshR85});const firstRefreshMs=performance.now()-start,firstRank=services.globals.__colRanks,poolAfter=statementBootPoolStatsR61(sql),preparedAfter=preparedStatementsStats477(sql);
 assert.equal(events.functionCalls.length,0,'no SQL function registration during rank/full service refresh');assert.deepEqual(events.exec,[],'no schema or transaction exec during refresh');
 assert.equal(poolAfter.invalidated,null);assert.equal(poolAfter.remaining,poolBefore.remaining,'rank refresh consumes none of the combat boot statements');assert.equal(preparedAfter.invalidations,preparedBefore.invalidations,'rank refresh does not invalidate native prepared cache');
 assert.equal(events.factory.length,early?0:1);assert.equal(firstRank===beforeRank,early);
 const report={early,initializedMs,firstRefreshMs,factoryMs:[...events.factory],functionCalls:[...events.functionCalls],execCalls:events.exec.length,poolBefore,poolAfter,preparedBefore,preparedAfter};
 const actual=firstRank.read(f.id),fresh=factory(services.database).read(f.id);assert.deepEqual(actual,fresh);
 const original=sql.prepare('SELECT config_json,revision FROM rank_settings WHERE id=1').get();sql.prepare('UPDATE rank_settings SET config_json=? WHERE id=1').run(original.config_json+' ');
 const changed=rankRefreshR85.refresh(services);assert.notEqual(changed,firstRank,'same revision config byte change still invalidates');services.globals.__colRanks=changed;
 assert.deepEqual(changed.read(f.id),factory(services.database).read(f.id));assert.equal(rankRefreshR85.refresh(services),changed);
 reports.push(report);
});
test.after(()=>{
 writeFileSync(new URL('../../evidence/rank-startup-order-r85.json',import.meta.url),JSON.stringify({coreSHA256:sourceIdentity().sha256,scope:'Focused current native GameWriter.initialize + exact rank factory/helper + actual statement boot pool/native prepared cache. No attack execution or dummy combat.',reports,conclusion:'First refresh does recreate ranks if cache was not initialized, but createRanks performs readonly metadata queries only: zero SQL functions,zero exec,zero prepared invalidations and combat pool unchanged. Early initialization moves only factory/setup cost; proposed implicit-reprepare mechanism is not supported.'},null,2)+'\n');
});
