import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLocalLoad,validateInstallLoad} from '../acceptance.mjs';
import {synthetic,syntheticInputs,syntheticMixInputs,sha} from './load-report-fixture.mjs';
test('complete game local and VDS require all periodic potions plus exactly100 boss potions within2s',()=>{
 for(const transport of ['message-channel','websocket']){
  const check=transport==='websocket'?validateInstallLoad:validateLocalLoad;
  const exact=synthetic(transport);exact.inputResponses=syntheticMixInputs({normalP99:150,normalMax:400,bossP99:250,bossMax:500});assert(check(exact,sha).passed);
  for(const inputs of [syntheticInputs(),syntheticMixInputs({normalP99:150.001,normalMax:151}),syntheticMixInputs({normalMax:400.001}),syntheticMixInputs({bossP99:250.001,bossMax:251}),syntheticMixInputs({bossMax:500.001})]){const r=synthetic(transport);r.inputResponses=inputs;assert(!check(r,sha).passed);}
  for(const change of [r=>r.writer.potions.actors[0].remaining--,r=>r.writer.potions.actors[0].consumed++,r=>r.inputResponses.observations.pop(),r=>r.inputResponses.observations[0][6]='bossPotion',r=>r.inputResponses.observations[8][3]+=3000,r=>r.inputResponses.observations[1][3]+=10001]){const r=synthetic(transport);change(r);assert(!check(r,sha).passed);}
 }
});
