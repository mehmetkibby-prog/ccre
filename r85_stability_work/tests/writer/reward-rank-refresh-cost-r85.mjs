import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {setupPvp} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {NativeGameServices} from '../../working/core511-source/scripts/core511/game-services.mjs';
import {createRewardRankRefreshR85} from '../../working/core511-source/scripts/core511/reward-rank-refresh-r85.mjs';
const cleanups=[];
try{
 const f=await setupPvp({after:fn=>cleanups.push(fn)}),services=new NativeGameServices(f.sql,{clock:()=>f.nowMs}),rankRefreshR85=createRewardRankRefreshR85(services);
 let phase=null;const schemaCalls={},prepare=f.sql.prepare;
 f.sql.prepare=function(query,...args){const statement=Reflect.apply(prepare,this,[query,...args]);if(query==='PRAGMA table_info(players)'){const all=statement.all;statement.all=function(...args){if(phase)schemaCalls[phase]=(schemaCalls[phase]??0)+1;return Reflect.apply(all,this,args);};}return statement;};
 services.refresh({rankRefreshR85});const stable=services.globals.__colRanks;
 for(let n=0;n<20;n++){services.modules.ranks.createRanks(services.database);assert.equal(rankRefreshR85.refresh(services),stable);}
 const results={factory:[],fullRefresh:[]};
 const run=(name,count,work)=>{phase=name;const at=performance.now();for(let n=0;n<count;n++)work();const ms=performance.now()-at;phase=null;return {count,totalMs:ms,perCallMs:ms/count};};
 for(let round=0;round<5;round++){
  const pair={};for(const kind of round%2?['cached','native']:['native','cached'])pair[kind]=run(kind+'Factory',100,kind==='native'?()=>services.modules.ranks.createRanks(services.database):()=>assert.equal(rankRefreshR85.refresh(services),stable));results.factory.push(pair);
 }
 for(let round=0;round<6;round++){
  const pair={};for(const kind of round%2?['cached','native']:['native','cached'])pair[kind]=run(kind+'FullRefresh',30,kind==='native'?()=>services.refresh():()=>services.refresh({rankRefreshR85}));results.fullRefresh.push(pair);
 }
 assert.equal(schemaCalls.nativeFactory,1500);assert.equal(schemaCalls.cachedFactory??0,0);
 assert.deepEqual(services.globals.__colRanks.read(f.id),services.modules.ranks.createRanks(services.database).read(f.id));
 const average=(kind,key)=>results[kind].reduce((n,row)=>n+row[key].totalMs,0)/results[kind].reduce((n,row)=>n+row[key].count,0);
 const files={};for(const name of ['reward-rank-refresh-r85.mjs','game-services.mjs','reward-worker-runtime-r533.mjs']){const bytes=readFileSync(new URL('../../working/core511-source/scripts/core511/'+name,import.meta.url));files[name]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}
 const report={purpose:'Bounded actual native factory/service refresh comparison, no crowd run',passed:true,node:process.version,execArgv:process.execArgv,results,schemaCalls,averageMs:{factory:{native:average('factory','native'),cached:average('factory','cached')},fullRefresh:{native:average('fullRefresh','native'),cached:average('fullRefresh','cached')}},files,limits:['Microbenchmark excludes reward execution, worker IPC and client scheduling.','Alternating order reduces warmup bias; GC and scheduling still affect elapsed wall.','Other dynamic service refreshes execute unchanged in both fullRefresh paths.']};
 writeFileSync(new URL('../../evidence/reward-rank-refresh-cost-r85.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,averageMs:report.averageMs,schemaCalls}));
}finally{for(const cleanup of cleanups.toReversed())await cleanup();}
