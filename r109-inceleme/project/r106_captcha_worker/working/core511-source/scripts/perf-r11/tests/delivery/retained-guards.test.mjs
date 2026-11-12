import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parse} from '../parser.mjs';
import {sources,ROOT,hash} from './fixture.mjs';
const functions=s=>new Map(parse(s,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,s.slice(n.start,n.end)]));
const livePriorBytes=await readFile(path.join(ROOT,'scripts/video-20261007/r10/outputs/delivery-preparation/live/update.mjs'));
const testPriorBytes=await readFile(path.join(ROOT,'scripts/perf-r10/outputs/delivery-preparation/test/update.mjs'));
assert.equal(hash(livePriorBytes),'24c856dd84c353aa52496024fcd6c4a5b61d62f305170d7b5f323d99c97bb37f');
assert.equal(hash(testPriorBytes),'8bbbde1e76b83154ae5166057a25374b42f9d977b14b4f71c5f39dcda95c4299');
const livePrior=functions(livePriorBytes.toString()),testPrior=functions(testPriorBytes.toString());
for(const branch of ['live-r10','live-r10-video']){
 const f=sources[branch].functions;
 test(branch+': every inherited exact historical authentication helper remains byte-identical',()=>{let checked=0;for(const [name,body] of livePrior)if(name.startsWith('authenticate')&&name!=='authenticateHistory'&&name!=='authenticateNative'){assert.equal(f.get(name),body,name);checked++;}assert.ok(checked>=8);});
 test(branch+': native/controller verification, receipt, fsync, rollback and staging functions remain unchanged',()=>{for(const name of ['recover','receiptState','validateMetadata','newMetadata','restoreMetadata','writerInstallationIdentity','nextReceipts','changedInventory','validateCumulative','pinnedChanges']){assert.ok(livePrior.has(name),name);const actual=f.get(name).replace('  await restoreFeatureFile(tx);\n','').replace('  nextOuter.performanceUpdate.featureContractSha256 = FEATURE_CONTRACT.sha256;\n','');assert.equal(actual,livePrior.get(name),name);}});
 test(branch+': cumulative payload and controller size bounds remain guarded',()=>{assert.match(f.get('changedInventory'),/rows.length <= 256/);assert.match(f.get('validateCumulative'),/patch.files.length <= 256/);});
}
test('test-r10: inherited exact test authentication and rollback safety remain byte-identical',()=>{const f=sources['test-r10'].functions;for(const [name,body] of testPrior)if(name.startsWith('authenticate')||['revert','preserved','cold','quiescePanel','verifyPackage','noOverrides'].includes(name)){assert.equal(f.get(name),body,name);}});
