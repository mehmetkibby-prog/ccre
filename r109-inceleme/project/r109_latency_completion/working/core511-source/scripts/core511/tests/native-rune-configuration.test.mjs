import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeAdminSource,adminHandlers,adminRequest} from './native-admin-fixture.mjs';
import {patchNativeRuneConfiguration} from '../patch-native-rune-configuration.mjs';

test('Rune V2 hook patch preserves native guards, original service and every other bundle byte',async()=>{
 const {source,proof}=patchNativeRuneConfiguration(nativeAdminSource);assert.equal(proof.edits.length,2);
 let restored=source;for(const edit of proof.edits)restored=restored.replace(edit.replacement,edit.original);assert.equal(restored,nativeAdminSource);
 assert.throws(()=>patchNativeRuneConfiguration(source),/native_rune_configuration_hook_count/);
 assert.throws(()=>patchNativeRuneConfiguration(nativeAdminSource.replace('__colRuneV2HealthSave485(payload.config,payload.revision)','__colRuneV2HealthSave485(payload.config,payload.other)')),/native_rune_configuration_hook_changed/);
 let called=0;const options={database:{},services:{ensureWorldSeed:async()=>{},nowSeconds$1:()=>1,__colRuneV2:{save:()=>{called++;}}}};
 const original=await adminHandlers({...options,source:nativeAdminSource}).post(adminRequest({method:'POST',body:{action:'save_runes_v2',config:{},revision:1}})),candidate=await adminHandlers({...options,source}).post(adminRequest({method:'POST',body:{action:'save_runes_v2',config:{},revision:1}}));
 assert.equal(original.status,503);assert.equal(candidate.status,original.status);assert.deepEqual(await candidate.json(),await original.json());assert.equal(called,0);
});
