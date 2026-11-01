import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {parse} from '../perf-r11/tests/parser.mjs';
const require=createRequire(import.meta.url),{analyze}=require(process.env.COL_CORE511_SCOPE_MODULE??'/tmp/core511-build-deps/node_modules/eslint-scope');
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated'),hash=x=>createHash('sha256').update(x).digest('hex');
const baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==baseline)throw Error('Exact V510 required');
const manifest=JSON.parse(bytes),sources=[],slices=[],dependencies=[];
function read(file){const source=fs.readFileSync(path.join(root,file),'utf8');if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Native content mismatch '+file);sources.push({file,sha256:hash(source)});return source;}
const file='dist-vds/server/channel-runtime/index.mjs',source=read(file),ast=parse(source,{ecmaVersion:'latest',sourceType:'module',ranges:true}),scopes=analyze(ast,{ecmaVersion:2022,sourceType:'module'}),declarations=new Map(),imports=new Map();
for(const n of ast.body){if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')declarations.set(n.id.name,{node:n,text:source.slice(n.start,n.end)});if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')declarations.set(d.id.name,{node:d,text:n.kind+' '+source.slice(d.start,d.end)+';'});if(n.type==='ImportDeclaration')for(const s of n.specifiers)imports.set(s.local.name,{node:n,s});}
const selected=new Set(),selectedImports=new Set(),known=new Set(['db','nowSeconds$1']),moduleVars=new Set(scopes.scopes.find(s=>s.type==='module').variables),refs=scopes.scopes.flatMap(s=>s.references).filter(r=>moduleVars.has(r.resolved));
function include(name){if(known.has(name)||selected.has(name)||selectedImports.has(name))return;if(imports.has(name)){selectedImports.add(name);return;}const row=declarations.get(name);if(!row)throw Error('Unbound content dependency '+name);selected.add(name);for(const ref of refs)if(ref.identifier.start>=row.node.start&&ref.identifier.end<=row.node.end&&ref.resolved.name!==name)include(ref.resolved.name);}
include('seedWorld');
const rel=file=>JSON.stringify(path.relative(out,path.join(root,file))),lines=[];
for(const name of [...selectedImports].sort()){const {node,s}=imports.get(name);if(s.type!=='ImportSpecifier')throw Error('Unsupported content import');const target=path.normalize(path.join(path.dirname(file),node.source.value));read(target);lines.push('import {'+s.imported.name+(name!==s.imported.name?' as '+name:'')+'} from '+rel(target)+';');}
lines.push('export function createNativeContentRules(database,nowSeconds){const db=()=>database,nowSeconds$1=()=>nowSeconds;');
for(const name of [...selected].sort((a,b)=>declarations.get(a).node.start-declarations.get(b).node.start)){const row=declarations.get(name);lines.push(row.text);dependencies.push({name,start:row.node.start,end:row.node.end,sha256:hash(row.text)});}
lines.push('return {seedWorld};}\n');
function seedSlice(file,name,first,last){
 const source=read(file),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name===name)?.declaration,body=fn?.body.body.find(n=>n.type==='TryStatement')?.block.body;
 if(!body)throw Error('Native content function drift '+name);
 const start=body.findIndex(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===first));
 let end=start;while(end<body.length&&!last(body[end],source))end++;
 if(start<0||end===body.length)throw Error('Native content boundary drift '+name);
 const raw=source.slice(body[start].start,body[end].end);slices.push({file,name,start:body[start].start,end:body[end].end,sha256:hash(raw)});return raw;
}
const isLoop=n=>n.type==='ForStatement'||n.type==='ForOfStatement';
const rune=seedSlice('vds-server/src/runes.mjs','ensureRuneSchema','cfg',isLoop),rune2=seedSlice('vds-server/src/rune-v2.mjs','ensureRuneV2Schema','config',isLoop),ancient=seedSlice('vds-server/src/expansion65-schema.mjs','ensureExpansion65','insert',isLoop);
let afk=seedSlice('vds-server/src/afk-island-schema.mjs','ensureAfkIsland','insert',isLoop);
const profile="profile.run(`afk.${spawn.family}.normal`,spawn.family,spawn.hp,spawn.damage);";if(afk.split(profile).length!==2)throw Error('AFK profile boundary drift');afk=afk.replace(profile,'');
const stone=seedSlice('vds-server/src/stone-boss476.mjs','ensureStoneBoss476','settings',isLoop);
for(const [file,names]of [['lib/runes.mjs','RUNE_SPAWNS,validateRuneConfig'],['lib/rune-v2.mjs','RUNE_V2_SPAWNS,validateRuneV2Config'],['lib/expansion65.mjs','ANCIENT_SPAWNS'],['lib/afk-island.mjs','AFK_SPAWNS'],['vds-server/src/stone-boss476.mjs','STONE_BOSS_IDS476'],['vds-server/src/rune-v2-location484.mjs','migrateRuneV2BossLocation484']]){read(file);lines.push('import {'+names+'} from '+rel(file)+';');}
lines.push('export function seedNativeAdditionalContent(db){\n{'+ancient+'}\n{'+afk+'}\n{'+rune+'}\n{'+rune2+'\nmigrateRuneV2BossLocation484(db);}\n{'+stone+'}\n}\n');
const generated=lines.join('\n');parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'channel-content-rules.mjs'),generated);
fs.writeFileSync(path.join(out,'channel-content-proof.json'),JSON.stringify({baselineManifestSha256:baseline,sources,slices,dependencies,generatedSha256:hash(generated),edits:['Native world seed and complete dependency closure unchanged; used only on an empty private in-memory database','Native additional monster INSERT bodies unchanged; account/profile/schema migrations excluded','AFK profile INSERT omitted from monster-only seed slice','Native RuneV2 boss location migration retained on the private database','C3 template IDs/channel remap to C4 occurs only in the outer additive bootstrap']},null,2)+'\n');
