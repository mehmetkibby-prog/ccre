import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),pin='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',manifest=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(manifest)!==pin)throw Error('Exact V510 required');
const file='vds-server/src/realm-runtime.mjs',source=fs.readFileSync(path.join(root,file),'utf8');if(JSON.parse(manifest).files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Native realm runtime changed');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
for(const n of ast.body.filter(n=>n.type==='ImportDeclaration'&&n.source.value.startsWith('./'))){
 if(n.source.value==='./maintenance-realtime491.mjs')edits.push({start:n.start,end:n.end,original:source.slice(n.start,n.end),replacement:'// Maintenance delivery belongs to the current four channel owners.'});
 else edits.push({start:n.source.start,end:n.source.end,original:source.slice(n.source.start,n.source.end),replacement:JSON.stringify(n.source.value==='./realm-admission.mjs'?'./native-realm-admission.mjs':n.source.value==='./realm-manifest.mjs'?'./native-realm-manifest.mjs':'../../../../native510-bb3a6cc689c6/vds-server/src/'+n.source.value.slice(2))});
}
const anchor='attachRealtimeMaintenance491(runtime);',at=source.indexOf(anchor);if(at<0||source.indexOf(anchor,at+1)>=0)throw Error('Native maintenance attachment changed');edits.push({start:at,end:at+anchor.length,original:anchor,replacement:'database.core511RealmStartup.capture(runtime);'});
// The exact private endpoint guards and bodies stay native. Track their
// asynchronous work even if the client closes before maintenance/loadtest ends.
const guard=ast.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='installRealmRouteGuard')?.declaration,privateCalls=[];
function walk(n){if(!n||typeof n!=='object')return;if(n.type==='UnaryExpression'&&n.operator==='void')privateCalls.push(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v?.type)walk(v);}walk(guard);
if(privateCalls.length!==2||!source.slice(privateCalls[0].argument.start,privateCalls[0].argument.end).startsWith('acceptMaintenance438(')||!source.slice(privateCalls[1].argument.start,privateCalls[1].argument.end).startsWith('loadtestEntry('))throw Error('Native private HTTP dispatch changed');
for(const n of privateCalls)edits.push({start:n.start,end:n.end,original:source.slice(n.start,n.end),replacement:"void globalThis[Symbol.for('coreoflife.core511.httpBindings')].privateRequest(req,res,()=>"+source.slice(n.argument.start,n.argument.end)+')'});
let generated=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))generated=generated.slice(0,e.start)+e.replacement+generated.slice(e.end);parse(generated,{ecmaVersion:'latest',sourceType:'module'});
const out=path.join(import.meta.dirname,'generated');fs.writeFileSync(path.join(out,'native-realm-runtime.mjs'),generated);fs.writeFileSync(path.join(out,'native-realm-runtime-proof.json'),JSON.stringify({baselineManifestSha256:pin,file,sourceSha256:hash(source),generatedSha256:hash(generated),edits,scope:'Original signed calls, startup retry/identity checks, security gate, surviving-session revalidation and private endpoint checks/bodies unchanged. Rebase imports, bind candidate RealmAdmission, replace legacy maintenance attachment with locked-host capture and track two private HTTP operations through shutdown. Candidate manifest adds explicit CORE511 four-channel metadata while preserving legacy three-channel realms; central account deployment still requires the matching manifest module.'},null,2)+'\n');console.log(JSON.stringify({bytes:Buffer.byteLength(generated),edits:edits.length}));
