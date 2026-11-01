import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createAttackWriterRules} from '../working/core511-source/scripts/core511/generated/attack-writer-rules.mjs';
import {beltBonusSql} from '../working/core511-source/scripts/core511/belt-statistics.mjs';
const source=fs.readFileSync(new URL('../working/core511-source/scripts/core511/generated/attack-writer-rules.mjs',import.meta.url),'utf8');
const set=source.slice(source.indexOf('function setSelectSql()'),source.indexOf('function fishingEventRewardMutation(',source.indexOf('function setSelectSql()')));
const hydrate=source.slice(source.indexOf('function hydrateAttack('),source.indexOf('function hydrateCombatTarget(',source.indexOf('function hydrateAttack(')));
const standalone=new Function('beltBonusSql','return function(database,identity,target,globals){const globalThis=globals;'+set+hydrate+'return hydrateAttack(database,identity,target);}')(beltBonusSql);
function fakeDB(){const queries=[];return {queries,prepare(sql){queries.push(sql);return {bind(...args){return {first(){return null;}};}};}};}
const globals={__colEquipmentSets:{enabled:true}};
for(const enabled of [undefined,false,true,{},null]){
 const g={__colEquipmentSets:enabled},a=fakeDB(),b=fakeDB();
 assert.deepEqual(createAttackWriterRules({globals:g}).hydrateAttack(a,'actor','target'),standalone(b,'actor','target',g));assert.deepEqual(a.queries,b.queries);
}
const database={prepare(){return {bind(){return {first(){return null;}};}};}};
const old=()=>createAttackWriterRules({globals}).hydrateAttack(database,'actor','target');
const next=()=>standalone(database,'actor','target',globals);
const time=(fn,count)=>{const start=performance.now();for(let i=0;i<count;i++)fn();return performance.now()-start;};
const rounds=[];
for(let round=0;round<20;round++){let beforeMs,afterMs;if(round%2){afterMs=time(next,100);beforeMs=time(old,100);}else{beforeMs=time(old,100);afterMs=time(next,100);}rounds.push({beforeMs,afterMs,savedMsPerTen:(beforeMs-afterMs)/10});}
const sorted=rounds.map(r=>r.savedMsPerTen).sort((a,b)=>a-b);
const result={scope:'No production mutation; fake SQL sink, constructor/hydration allocation-only comparison under release Node flags. Exact generated hydrate/setSelectSql source reused with globals retained. Not a load test or end-to-end speed claim.',sameQueriesForEquipmentSetStates:true,medianSavedMsPerTen:(sorted[9]+sorted[10])/2,rounds};
fs.writeFileSync(new URL('../evidence/hydrate-factory-measurement.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({medianSavedMsPerTen:result.medianSavedMsPerTen}));
