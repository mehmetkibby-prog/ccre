import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {parse} from '../perf-r11/tests/parser.mjs';
import {patchNativeGuildAuth} from './patch-native-guild-auth.mjs';
const require=createRequire(import.meta.url),{analyze}=require(process.env.COL_CORE511_SCOPE_MODULE??'/tmp/core511-build-deps/node_modules/eslint-scope');
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=process.env.COL_CORE511_OUT??path.join(import.meta.dirname,'generated'),hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json')),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(bytes),file='dist-vds/server/channel-runtime/index.mjs',source=fs.readFileSync(path.join(root,file),'utf8');
if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Native entry source changed');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',ranges:true}),scopes=analyze(ast,{ecmaVersion:2022,sourceType:'module'}),nodes=[];
function walk(n,fn){if(!n||typeof n!=='object')return;if(n.type)fn(n);for(const [key,v]of Object.entries(n))if(key!=='range'){if(Array.isArray(v))v.forEach(x=>walk(x,fn));else if(v?.type)walk(v,fn);}}
walk(ast,n=>nodes.push(n));const text=n=>source.slice(n.start,n.end);
function one(predicate){const found=nodes.filter(predicate);if(found.length!==1)throw Error('Ambiguous native entry section '+found.length);return found[0];}
const join=one(n=>n.type==='IfStatement'&&text(n.test)==='payload.action === "join"');
const existing=one(n=>n.type==='IfStatement'&&n.start>join.start&&n.end<join.end&&text(n.test)==='auth.player');
let joinBody=text(existing.consequent).slice(1,-1);
// Only trusted EntryWriter supplies initialEntry after checking no admission,
// no simulation and at least the unchanged 40s offline/reconnect grace.
const initialEntryEdits=[
 ['if (existing.combat_lock_until_ms > requestReceivedAtMs)', 'if (!initialEntry && existing.combat_lock_until_ms > requestReceivedAtMs)'],
 ['AND (channel = ? OR combat_lock_until_ms <= ?)', 'AND (channel = ? OR combat_lock_until_ms <= ? OR ? = 1)'],
 ['requestedChannel, requestReceivedAtMs, requestedChannel, now - 30', 'requestedChannel, requestReceivedAtMs, initialEntry ? 1 : 0, requestedChannel, now - 30']
];
for(const [before,after] of initialEntryEdits){if(joinBody.split(before).length!==2)throw Error('native_initial_entry_anchor_changed');joinBody=joinBody.replace(before,after);}
const roots=['getGameSession','getGameSessionByHash','validateGameSession','requireGameSession','requireRealtimeGameSession','assertCsrf','assertSameOrigin','readJsonObject','authErrorResponse','noStoreHeaders','enforceRateLimit','ensureStarterWeapon','colRepairRuneV2Access','colRepairRuneAccess','repairAncientAccess','getGameSettings','AuthRequestError'];
const ports=['settlePveEngagement','selectEntry504'];
const known=new Set(['env','globalThis','Math','Date','crypto','Response','TextEncoder','TextDecoder','Uint8Array','URL','Headers','WeakMap','Map','Set','Object','Number','String','Boolean','Array','JSON','Error','Promise','Infinity','undefined','console','btoa',...ports,'channelCapacity510']);
const declarations=new Map(),imports=new Map();
for(const n of ast.body){if(['FunctionDeclaration','ClassDeclaration'].includes(n.type))declarations.set(n.id.name,{node:n,text:text(n)});if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')declarations.set(d.id.name,{node:d,text:n.kind+' '+text(d)+';'});if(n.type==='ImportDeclaration')for(const s of n.specifiers)imports.set(s.local.name,{node:n,s});}
const moduleVars=new Set(scopes.scopes.find(s=>s.type==='module').variables),refs=scopes.scopes.flatMap(s=>s.references).filter(r=>moduleVars.has(r.resolved));
const selected=new Set(),selectedImports=new Set();
function include(name){if(known.has(name)||selected.has(name)||selectedImports.has(name))return;if(imports.has(name)){selectedImports.add(name);return;}const row=declarations.get(name);if(!row)throw Error('Unbound native entry dependency '+name);selected.add(name);for(const ref of refs)if(ref.identifier.start>=row.node.start&&ref.identifier.end<=row.node.end&&ref.resolved.name!==name)include(ref.resolved.name);}
roots.forEach(include);
const wrapper='async function joinExisting(context){const {auth,database,now,requestReceivedAtMs,joinSettings,labAccount504,payload,automatic504,initialEntry=false}=context;let requestedChannel=context.requestedChannel;'+joinBody+'}';
const joinStatements=join.consequent.body,existingIndex=joinStatements.indexOf(existing);if(existingIndex<0)throw Error('Native creation branch missing');
const creation=[...joinStatements.slice(0,2),...joinStatements.slice(existingIndex+1)];
const createWrapper='async function createCharacter(context){const {auth,database,now,requestReceivedAtMs,joinSettings,payload,requestedChannel}=context;'+creation.map(text).join('\n')+'}';
const free=analyze(parse(wrapper+'\n'+createWrapper,{ecmaVersion:'latest',sourceType:'module',ranges:true}),{ecmaVersion:2022,sourceType:'module'}).globalScope.through;free.forEach(r=>include(r.identifier.name));
const ordered=[...selected].sort((a,b)=>declarations.get(a).node.start-declarations.get(b).node.start),lines=[];
for(const name of [...selectedImports].sort()){const {node,s}=imports.get(name),target=node.source.value;if(!target.startsWith('.'))throw Error('Unexpected native entry import '+target);const resolved=path.resolve(root,path.dirname(file),target),relative=path.relative(out,resolved),value=s.type==='ImportNamespaceSpecifier'?'* as '+name:s.type==='ImportDefaultSpecifier'?name:'{'+s.imported.name+(s.imported.name===name?'':' as '+name)+'}';lines.push('import '+value+' from '+JSON.stringify(relative)+';');}
// Dynamic guild access retains the original module and call order. Its own
// service globals are installed by the production host, exactly as in V510.
function remap(code){return code.replace('import("./assets/guild-village-runtime-Dke_G6YB.js")','import('+JSON.stringify(path.relative(out,path.join(root,path.dirname(file),'assets/guild-village-runtime-Dke_G6YB.js')))+')');}
function sync(code){const tree=parse(code,{ecmaVersion:'latest',sourceType:'module'}),edits=[];walk(tree,n=>{if(n.type==='AwaitExpression')edits.push([n.start,n.argument.start]);if(n.async){const offset=code.slice(n.start,n.body.start).indexOf('async');if(offset<0)throw Error('Native async token missing');edits.push([n.start+offset,n.start+offset+5]);}});for(const [a,b]of edits.sort((a,b)=>b[0]-a[0]))code=code.slice(0,a)+code.slice(b);return code;}
const guildAuthPatch=patchNativeGuildAuth(declarations.get('validateGameSession').text);
const bodies=ordered.map(name=>remap(declarations.get(name).text));
const prelude='const ambient=globalThis;\n';
const bindings='const globalThis=globals,env=environment,Date=class extends ambient.Date{static now(){return clock();}},crypto={...ambient.crypto,randomUUID:uuid,subtle:ambient.crypto.subtle},Response=response,channelCapacity510=()=>25;\n'+ports.map(name=>'const '+name+'=(...args)=>{if(typeof ports.'+name+'!=="function")throw Error("entry_port_unbound:'+name+'");return ports.'+name+'(...args);};').join('\n');
const options='{environment,globals=ambient,clock=ambient.Date.now,uuid=()=>ambient.crypto.randomUUID(),response=ambient.Response,ports={}}={}';
const asyncCode='export function createEntryRules('+options+'){\n'+bindings+'\n'+bodies.join('\n')+'\n'+wrapper+'\n'+createWrapper+'\nreturn {'+roots.join(',')+',joinExisting,createCharacter};\n}';
// Auth remains asynchronous. Only the original join/access-repair closure gets
// a synchronous facade for the already-open sole-writer transaction.
let synchronousCode=sync(asyncCode).replace('createEntryRules(','createEntryWriterRules(');
// The writer already owns a synchronous SQLite transaction. Keep the exact
// settings SELECTs/defaults/policy merge, but remove asynchronous cache plumbing.
const asyncSettings=declarations.get('getGameSettings').text;
synchronousCode=synchronousCode.replace(sync(asyncSettings),'function getGameSettings(){return readGameSettings(db());}');
const settingsRead=sync(declarations.get('readGameSettings').text);
const syncSettingsRead=settingsRead.replace('Promise.all([','[').replace(']);','];');
if(settingsRead===syncSettingsRead)throw Error('Native settings Promise.all anchor missing');
synchronousCode=synchronousCode.replace(settingsRead,syncSettingsRead);
const boundAsyncCode=asyncCode.replace(remap(declarations.get('validateGameSession').text),remap(guildAuthPatch.source));
if(boundAsyncCode===asyncCode)throw Error('Native auth ownership patch missing');
// Preserve the exact R19 ordinary-map extension when regenerating either
// asynchronous auth/entry or the synchronous writer copy from pinned V510.
const adventureEntryEdits=[
 ['function areaWorld(area) {','function areaWorld(area) {if(isAdventureArea(area))return adventureBounds(area);'],
 ['function isAreaWalkablePosition(area, x, y) {','function isAreaWalkablePosition(area, x, y) {if(isAdventureArea(area))return adventureWalkable(area,x,y);']
];
let generated=lines.join('\n')+'\n'+prelude+boundAsyncCode+'\n'+synchronousCode+'\n';
for(const [before,after]of adventureEntryEdits){if(generated.split(before).length!==3)throw Error('adventure_entry_anchor_changed');generated=generated.replaceAll(before,after);}
generated="import {isAdventureArea,isMistArea,adventureBounds,adventureWalkable,adventureSegment,adventureMonsterId} from '../adventure-maps.mjs';\n"+generated;
parse(generated,{ecmaVersion:'latest',sourceType:'module'});
fs.writeFileSync(path.join(out,'entry-rules.mjs'),generated);
const proof={baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),generatedSha256:hash(generated),join:{start:existing.consequent.start,end:existing.consequent.end,sha256:hash(text(existing.consequent))},creation:{slices:creation.map(n=>({start:n.start,end:n.end,sha256:hash(text(n))})),wrapperSha256:hash(createWrapper)},declarations:ordered.map(name=>({name,sha256:hash(declarations.get(name).text)})),imports:[...selectedImports],edits:['Native existing-character join/auth/CSRF/realm/bot rules extracted mechanically','Native creation registration gate, normalized name, role, capacity, spawn, starter ledger and weapon statements extracted mechanically','Writer facade removes await/async; native auth uses asynchronous facade','Writer reads original settings SELECTs/defaults/policy without asynchronous cache or Promise.all','Per-channel capacity is exactly25; coordinator supplies selected ownership channel','Guild dynamic import points to the identical manifest-pinned module'],productionBootstrapBound:false};
proof.adventureEntry={scope:'R19 strict adventure bounds and walkability preserved in both native copies; all other geometry remains pinned V510',edits:adventureEntryEdits};proof.initialEntry={scope:'Only first entry with no admission/simulation and authenticated last_seen at least40s old; active transfer and arena/damage guards unchanged',edits:initialEntryEdits};proof.guildAuth=guildAuthPatch.proof;proof.edits.push('Async auth binds its original guild repair and ejection calls to the current owner/durable outbox; every other native auth byte and guard order retained');
fs.writeFileSync(path.join(out,'entry-proof.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({declarations:ordered.length,imports:selectedImports.size,bytes:Buffer.byteLength(generated)}));
