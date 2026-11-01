import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';

const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated');
const hash=s=>createHash('sha256').update(s).digest('hex'),pin='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
const bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==pin)throw Error('Exact V510 required');const manifest=JSON.parse(bytes);
const file='vds-server/src/channel-native-services.mjs',source=fs.readFileSync(path.join(root,file),'utf8');if(hash(source)!==manifest.files.find(r=>r.path===file)?.sha256)throw Error('Native service initializer changed');
const operationFile='vds-server/src/channel-native-operations.mjs',operationSource=fs.readFileSync(path.join(root,operationFile),'utf8');if(hash(operationSource)!==manifest.files.find(r=>r.path===operationFile)?.sha256)throw Error('Native inventory dispatcher changed');
const tree=parse(source,{ecmaVersion:'latest',sourceType:'module'}),body=tree.body.find(n=>n.type==='ExportNamedDeclaration')?.declaration;
if(body?.id?.name!=='initializeChannelNativeServices'||tree.body.some(n=>!['ImportDeclaration','ExportNamedDeclaration'].includes(n.type)))throw Error('Native initializer declarations changed');
const overrides={createProgressionSettings:'progression',createCommunityEvent:'community',createEvolutionQuest:'evolution',createRanks:'ranks',createQuests438:'quests',createBattlePass:'battlePass',createCauldron488:'cauldron',createStatus:'status',createRunes:'runes',createRuneV2:'runeV2',createEventIsland444:'events',createArenaMarket:'arena',createDragonBoss:'dragon',createGuildVillage:'guildVillage',PremiumEngine:'premium',createGuildSkill:'guildSkill'};
const imports=[],bindings=[],globals=new Set(),used=new Set();
for(const node of tree.body.filter(n=>n.type==='ImportDeclaration')){
 const name='native'+imports.length,relative=path.relative(out,path.resolve(root,path.dirname(file),node.source.value));imports.push('import * as '+name+' from '+JSON.stringify(relative)+';');
 for(const s of node.specifiers){if(s.type!=='ImportSpecifier')throw Error('Native initializer import changed');const key=s.imported.name,group=overrides[key];if(group)used.add(key);bindings.push('const '+s.local.name+'='+(group?'services.'+group:name)+'.'+key+';');}
}
if(used.size!==Object.keys(overrides).length)throw Error('Native initializer override changed');
function walk(n){if(!n||typeof n!=='object')return;if(n.type==='AssignmentExpression'&&n.left.type==='MemberExpression'&&n.left.object.name==='globalThis'&&!n.left.computed)globals.add(n.left.property.name);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v?.type)walk(v);}walk(body);
const original=source.slice(body.start,body.end);
const generated=imports.join('\n')+"\nimport {createRewardServices} from './reward-services.mjs';\nconst ambient=globalThis;\nexport const NATIVE_HTTP_GLOBALS=Object.freeze("+JSON.stringify([...globals])+');\nexport function createNativeHttpServices(sqlite,{database,realmRuntime=null,globals=ambient}={}){\nconst globalThis=globals,services=createRewardServices({globals,fourChannels:true});\n'+bindings.join('\n')+'\n'+original+'\ninitializeChannelNativeServices(sqlite,{database,realmRuntime,coordinatorOnly:true});\nreturn Object.fromEntries(NATIVE_HTTP_GLOBALS.map(key=>[key,globals[key]]));\n}\n';
const inventory='import {ChannelNativeOperations} from '+JSON.stringify(path.relative(out,path.join(root,operationFile)))+';\nexport const createNativeHttpOperations=database=>new ChannelNativeOperations(database);\n';
parse(generated+inventory,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'native-http-services.mjs'),generated+inventory);
fs.writeFileSync(path.join(out,'native-http-services-proof.json'),JSON.stringify({baselineManifestSha256:pin,source:file,sourceSha256:hash(source),declaration:{start:body.start,end:body.end,sha256:hash(original)},generatedSha256:hash(generated+inventory),inventory:{source:operationFile,sourceSha256:hash(operationSource)},factoryBindings:overrides,globals:[...globals],changes:['Original initializer declaration byte-identical; native imports retained','Existing manifest-derived four-channel factories share raw sole SQLite and real clock/RNG','coordinatorOnly is mandatory; no DungeonEngine simulation or timers started','Exact native inventory dispatcher; HTTP scope separately restricts entry to expansion456.act/brokenCore464.act'],fullHttpIntegration:false},null,2)+'\n');
console.log(JSON.stringify({globals:globals.size,bytes:Buffer.byteLength(generated)}));
