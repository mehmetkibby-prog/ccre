import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {parse} from '../perf-r11/tests/parser.mjs';
const require=createRequire(import.meta.url),{analyze}=require('/tmp/core511-build-deps/node_modules/eslint-scope');
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated'),hash=x=>createHash('sha256').update(x).digest('hex');
const baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(bytes),file='dist-vds/server/channel-runtime/index.mjs',source=fs.readFileSync(path.join(root,file),'utf8');if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Native world source changed');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',ranges:true}),declarations=new Map(),imports=new Map();
for(const n of ast.body){if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')declarations.set(n.id.name,{node:n,text:source.slice(n.start,n.end)});if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')declarations.set(d.id.name,{node:d,text:n.kind+' '+source.slice(d.start,d.end)+';'});if(n.type==='ImportDeclaration')for(const s of n.specifiers)imports.set(s.local.name,{node:n,s});}
const rw=declarations.get('readWorld').node,body=rw.body.body.find(n=>n.type==='TryStatement').block.body;
const named=name=>body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));
const membership=named('membership'),respond=named('respond').declarations[0].init,viewer=named('viewer');
if(!membership||!respond||!viewer||body.at(-1).type!=='ReturnStatement')throw Error('Native full world boundary changed');
let full=source.slice(membership.start,body.at(-1).end);
const grant="playerId ? await globalThis.__colStarterReward?.grant(auth.account.id, playerId) ?? null : null";
if(full.split(grant).length!==2)throw Error('Native starter reward boundary changed');full=full.replace(grant,'starterReward');
// All mutations (starter grants and access/HP repairs) finish in the existing
// writer before this cold image is requested. No repair or subscription timer
// is executed in the read worker, and no reward is invented by this reader.
const respondBody=source.slice(respond.body.start+1,respond.body.end-1),stop=respondBody.indexOf('   observeR15("world_decorate"');if(stop<0)throw Error('Native decoration boundary changed');
const decorate=respondBody.slice(0,stop)+'\nreturn data;';
const header='async function readColdWorld(database,{auth,nowMs,starterReward}){const playerId=auth.player.id,now=Math.floor(nowMs/1000),requestStartedAtMs=nowMs,ownerOnly=false,compact=false,combat=false,internal465=false,mark=()=>{};const respond=async data=>{'+decorate+'};'+source.slice(viewer.start,named('regionalArea').end)+'\n';
const functionText=header+full+'\n}';
const free=code=>analyze(parse(code,{ecmaVersion:'latest',sourceType:'module',ranges:true}),{ecmaVersion:2022,sourceType:'module'}).globalScope.through.map(r=>r.identifier.name);
const known=new Set(['globalThis','Date','Math','performance','Object','Number','Array','Map','Set','JSON','String','Boolean','Infinity','undefined','Error','Promise','console','Uint8Array']);
const selected=new Set(),selectedImports=new Set();
function include(name){if(known.has(name)||selected.has(name)||selectedImports.has(name))return;if(imports.has(name)){selectedImports.add(name);return;}const d=declarations.get(name);if(!d)throw Error('Unbound cold world dependency '+name);selected.add(name);for(const dep of free(d.text))if(dep!==name)include(dep);}
for(const name of free(functionText))include(name);
const lines=[];
for(const [file,names]of [['vds-server/src/loadlab/registry.mjs','installRegistry,loadRuntimeConfig'],['vds-server/src/loadlab/realm-control.mjs','seedRegistryFrame'],['vds-server/src/loadlab/protocol.mjs','VERSION as LOADLAB_VERSION']]){const dependency=fs.readFileSync(path.join(root,file));if(manifest.files.find(r=>r.path===file)?.sha256!==hash(dependency))throw Error('Native registry dependency changed');lines.push('export {'+names+'} from '+JSON.stringify(path.relative(out,path.join(root,file)))+';');}
for(const name of selectedImports){const {node,s}=imports.get(name),target=node.source.value;if(!target.startsWith('.'))throw Error('Unexpected world dependency '+target);const relative=path.relative(out,path.resolve(root,path.dirname(file),target));const clause=s.type==='ImportNamespaceSpecifier'?'* as '+name:s.type==='ImportDefaultSpecifier'?name:'{'+s.imported.name+(s.imported.name===name?'':' as '+name)+'}';lines.push('import '+clause+' from '+JSON.stringify(relative)+';');}
lines.push('import {createWorldPlayerProjector} from '+JSON.stringify(path.relative(out,path.join(root,'vds-server/src/world-player-projection.mjs')))+';','export {createWorldPlayerProjector};','const ambient=globalThis;','export function createColdWorldRules({globals,now=Date.now}){const globalThis=globals,Date=class extends ambient.Date{static now(){return now();}};');
for(const name of [...selected].sort((a,b)=>declarations.get(a).node.start-declarations.get(b).node.start)){
 let text=declarations.get(name).text;
 // Same explicit channel-four extensions as the native mode/authority rules.
 text=text.replaceAll("'rune-v2-boss-c3-1'","'rune-v2-boss-c3-1','rune-v2-boss-c4-1'");
 lines.push(text);
}
lines.push(functionText.replaceAll("'rune-v2-boss-c3-1'","'rune-v2-boss-c3-1','rune-v2-boss-c4-1'"),'return {readColdWorld,readFriends487,arenaStatements,arenaPayloadFromResults,withRankPlayers};}');
const generated=lines.join('\n')+'\n';parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'cold-world-rules.mjs'),generated);
fs.writeFileSync(path.join(out,'cold-world-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),fullWorldBodySha256:hash(source.slice(membership.start,body.at(-1).end)),decorationSha256:hash(respondBody.slice(0,stop)),generatedSha256:hash(generated),declarations:[...selected].map(name=>({name,sha256:hash(declarations.get(name).text)})),edits:['Only original full snapshot query/projection/decorator bodies; no HTTP, authentication, repair, subscription or writer functions','Starter reward is an explicit already-committed admission value','Channel four included in original rune-boss private-puzzle exclusion'],productionAdmissionBound:false},null,2)+'\n');
console.log(JSON.stringify({bytes:Buffer.byteLength(generated),declarations:selected.size,imports:selectedImports.size}));
