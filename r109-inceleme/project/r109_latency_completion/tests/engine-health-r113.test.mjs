import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {engineHealthR113} from '../working/core511-source/scripts/core511/engine-health-r113.mjs';
import {initializeCommittedResultsR113} from '../working/core511-source/scripts/core511/committed-result-r113.mjs';
test('engine health requires initialized schema and an acknowledged live writer worker',()=>{
 const sql=new DatabaseSync(':memory:'),worker={closed:false,slot:{readyAckR113:true,ended:false}},core={database:{sqlite:sql},writer:{rewardWorkerR533:worker}};
 try{
  assert.equal(engineHealthR113(core).engineReadyR113,false);initializeCommittedResultsR113(sql);
  assert.deepEqual(engineHealthR113(core),{engineRework:'R113_ENGINE1',engineReadyR113:true,runeForum:'R114_RUNE_FORUM1',sharedScope:'R115_SHARED_SCOPE1'});
  for(const [object,key,value]of [[worker,'closed',true],[worker.slot,'readyAckR113',false],[worker.slot,'ended',true],[worker.slot,'error',Error('worker crashed')]]){
   const old=object[key];object[key]=value;assert.equal(engineHealthR113(core).engineReadyR113,false);object[key]=old;
  }
  core.writer.rewardWorkerR533=null;assert.equal(engineHealthR113(core).engineReadyR113,false);
 }finally{sql.close();}
});
