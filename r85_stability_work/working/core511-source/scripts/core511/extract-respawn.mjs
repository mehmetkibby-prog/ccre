import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {parse} from '../perf-r11/tests/parser.mjs';
const require=createRequire(import.meta.url),{analyze}=require(process.env.COL_CORE511_SCOPE_MODULE??'/tmp/core511-build-deps/node_modules/eslint-scope');
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated'),hash=x=>createHash('sha256').update(x).digest('hex');
const baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==baseline)throw Error('Exact V510 required');
const manifest=JSON.parse(bytes),file='dist-vds/server/channel-runtime/index.mjs',source=fs.readFileSync(path.join(root,file),'utf8');if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Native respawn changed');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',ranges:true}),scopes=analyze(ast,{ecmaVersion:2022,sourceType:'module'}),declarations=new Map(),imports=new Map();
for(const n of ast.body){if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')declarations.set(n.id.name,{node:n,text:source.slice(n.start,n.end)});if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')declarations.set(d.id.name,{node:d,text:n.kind+' '+source.slice(d.start,d.end)+';'});if(n.type==='ImportDeclaration')for(const s of n.specifiers)imports.set(s.local.name,{node:n,s});}
const tick=declarations.get('runWorldTick').node,respawns=tick.body.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='respawns'));
if(!respawns)throw Error('Native respawn plan missing');
const repair=tick.body.body.find(n=>n.type==='IfStatement'&&source.slice(n.test.start,n.test.end).includes('loop.needsRepair')).consequent.expression.argument.arguments[0].arguments[0];
const tickResults=tick.body.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='tickResults')).declarations[0].init.argument.arguments[0];
const despawn=tickResults.elements.find(n=>n.type==='SpreadElement'&&n.argument.test&&source.slice(n.argument.test.start,n.argument.test.end).includes('loop.needsDespawn')).argument.consequent;
if(repair.type!=='ArrayExpression'||despawn.type!=='ArrayExpression')throw Error('Native repair/despawn boundary drift');
const body=source.slice(respawns.start,respawns.end),selected=new Set(),selectedImports=new Set(),known=new Set(['database','settings','due','now','Math','Date','globalThis','Object','Number','Array','Map','Set','String','Boolean','Error','undefined']);
const moduleVars=new Set(scopes.scopes.find(s=>s.type==='module').variables),refs=scopes.scopes.flatMap(s=>s.references).filter(r=>moduleVars.has(r.resolved));
function include(name){if(known.has(name)||selected.has(name)||selectedImports.has(name))return;if(imports.has(name)){selectedImports.add(name);return;}const row=declarations.get(name);if(!row)throw Error('Unbound respawn dependency '+name);selected.add(name);for(const ref of refs)if(ref.identifier.start>=row.node.start&&ref.identifier.end<=row.node.end&&ref.resolved.name!==name)include(ref.resolved.name);}
const free=analyze(parse('function plan(){'+body+'}',{ecmaVersion:'latest',sourceType:'module',ranges:true}),{ecmaVersion:2022,sourceType:'module'}).globalScope.through;
for(const ref of free)include(ref.identifier.name);include('DEFAULT_SETTINGS');
for(const node of [repair,despawn])for(const ref of analyze(parse('function plan(){return '+source.slice(node.start,node.end)+'}',{ecmaVersion:'latest',sourceType:'module',ranges:true}),{ecmaVersion:2022,sourceType:'module'}).globalScope.through)include(ref.identifier.name);
const lines=[],proof=[];
for(const name of [...selectedImports].sort()){
 const {node,s}=imports.get(name),relative=path.relative(out,path.resolve(root,path.dirname(file),node.source.value));if(s.type!=='ImportSpecifier')throw Error('Unexpected respawn import');
 lines.push('import {'+s.imported.name+(name==='isRuneV2Boss'?' as nativeRuneV2Boss':name!==s.imported.name?' as '+name:'')+'} from '+JSON.stringify(relative.startsWith('.')?relative:'./'+relative)+';');
}
lines.push('const ambient=globalThis;\nexport function createRespawnRules({globals,random=ambient.Math.random,fourChannels=true}){\nconst globalThis=globals,Math=Object.create(ambient.Math);Math.random=random;\nconst isRuneV2Boss=id=>nativeRuneV2Boss(id)||(fourChannels&&id==="rune-v2-boss-c4-1");');
for(const name of [...selected].sort((a,b)=>declarations.get(a).node.start-declarations.get(b).node.start)){
 const {node,text}=declarations.get(name);let next=text;
 if(name==='isBlackStoneBoss476')next=next.replace("id==='stone-boss-black-c3'","id==='stone-boss-black-c3'||fourChannels&&id==='stone-boss-black-c4'");
 if(name==='monsterBalanceKeyFor')next=next.replace('/^(?:golge|curuk|yutan)(?:-pack[23])?-black-c[1-3]-([1-8])$/','(fourChannels?/^(?:golge|curuk|yutan)(?:-pack[23])?-black-c[1-4]-([1-8])$/:/^(?:golge|curuk|yutan)(?:-pack[23])?-black-c[1-3]-([1-8])$/)');
 proof.push({name,start:node.start,end:node.end,nativeSha256:hash(text),generatedSha256:hash(next)});lines.push(next);
}
const repairBody=source.slice(repair.start,repair.end),despawnBody=source.slice(despawn.start,despawn.end);
lines.push('function plan(database,settings,monsters,now){const due={results:monsters};'+body+'\nreturn respawns;}');
lines.push('function repairPlan(database,now){return '+repairBody+';}\nfunction despawnPlan(database,settings,now){return '+despawnBody+';}');
lines.push('function scoped(database,statements,channel,ids){return statements.filter(s=>/^(UPDATE|DELETE FROM) monsters/i.test(s.sql.trim())).map(s=>{const sql=fourChannels?s.sql.replaceAll("\'stone-boss-black-c1\',\'stone-boss-black-c2\',\'stone-boss-black-c3\'","\'stone-boss-black-c1\',\'stone-boss-black-c2\',\'stone-boss-black-c3\',\'stone-boss-black-c4\'"):s.sql;return database.prepare(sql+" AND monsters.channel=? AND monsters.id IN ("+ids.map(()=>"?").join(",")+")").bind(...s.params,channel,...ids);});}\nreturn {plan,repairPlan,despawnPlan,scoped,defaults:DEFAULT_SETTINGS};\n}\n');
const generated=lines.join('\n');parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'respawn-rules.mjs'),generated);fs.writeFileSync(path.join(out,'respawn-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),plan:{start:respawns.start,end:respawns.end,sha256:hash(body)},repair:{start:repair.start,end:repair.end,sha256:hash(repairBody)},despawn:{start:despawn.start,end:despawn.end,sha256:hash(despawnBody)},dependencies:proof,generatedSha256:hash(generated),edits:['native respawn,repair,despawn SQL planners unchanged','explicit operation RNG and native service globals','fourth-channel boss and black-slot profile identifiers','monster repair/despawn adapter adds only channel and leased-id predicates; market housekeeping is a separate world job']},null,2)+'\n');
