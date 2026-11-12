import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
import {createRequire} from 'node:module';
import {nativeLibraryClosure} from './extract-native-libraries.mjs';
const require=createRequire(import.meta.url);
const {analyze}=require(process.env.COL_CORE511_SCOPE_MODULE??'/tmp/core511-build-deps/node_modules/eslint-scope');
const ROOT=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6');
const HERE=path.dirname(new URL(import.meta.url).pathname);
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=fs.readFileSync(path.join(ROOT,'realm-package-manifest.json'));
if(sha(manifestBytes)!=='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b')throw Error('Exact V510 baseline required');
const name='dist-vds/server/channel-runtime/index.mjs',sourceBytes=fs.readFileSync(path.join(ROOT,name));
const manifest=JSON.parse(manifestBytes),row=manifest.files.find(r=>r.path===name);
if(sha(sourceBytes)!==row.sha256)throw Error('V510 rules differ');
const source=sourceBytes.toString(),ast=parse(source,{ecmaVersion:'latest',sourceType:'module',ranges:true});
const scopes=analyze(ast,{ecmaVersion:2022,sourceType:'module',optimistic:false});
const moduleScope=scopes.scopes.find(scope=>scope.type==='module');
const moduleVariables=new Set(moduleScope.variables);
const moduleReferences=scopes.scopes.flatMap(scope=>scope.references).filter(ref=>moduleVariables.has(ref.resolved));
const declarations=new Map(),imports=new Map();
for(const node of ast.body){
 if(node.type==='FunctionDeclaration'||node.type==='ClassDeclaration')declarations.set(node.id.name,{node,text:source.slice(node.start,node.end)});
 if(node.type==='VariableDeclaration')for(const d of node.declarations)if(d.id.type==='Identifier')declarations.set(d.id.name,{node:d,text:node.kind+' '+source.slice(d.start,d.end)+';'});
 if(node.type==='ImportDeclaration')for(const s of node.specifiers)imports.set(s.local.name,{node,s});
}
const selected=new Set(),selectedImports=new Set();
function references(node){
 return new Set(moduleReferences.filter(ref=>ref.identifier.start>=node.start&&ref.identifier.end<=node.end).map(ref=>ref.resolved.name));
}
function include(name){
 if(selected.has(name)||selectedImports.has(name))return;
 if(imports.has(name)){selectedImports.add(name);return;}
 const entry=declarations.get(name);if(!entry)return;
 selected.add(name);
 for(const ref of references(entry.node))if(ref!==name)include(ref);
}
const roots=['evaluateMovementBudget','movementPathDistance','isAreaWalkableSegment','validArea','armorDamageReduction','equipmentSetBonuses','calculateEquipmentStats','createEnchantmentTotals','effectiveAttackCooldownMs','attackIsBlocked','monsterCombatPosition','areaSkillPoint','monsterXpReward','pveDamage','lifeStealAmount','rollLootProfile','resolveLootItemName','rollLootPower','buildDefaultLootProfile','prepareProfileDrops','enforceLocalActionRate'];
for(const name of roots){if(!declarations.has(name))throw Error('Missing rule '+name);include(name);}
const ordered=[...selected].sort((a,b)=>declarations.get(a).node.start-declarations.get(b).node.start);
const outputDir=process.env.COL_CORE511_RULE_OUTPUT??path.join(HERE,'generated');fs.mkdirSync(outputDir,{recursive:true});
const libraries=nativeLibraryClosure({root:ROOT,manifest,out:outputDir,hash:sha,parse,names:selectedImports});
const lines=[];
for(const [name,target]of libraries.imports)if(!selectedImports.has(name))lines.push('import {'+name+'} from '+JSON.stringify(target)+';');
for(const name of [...selectedImports].sort()){
 if(libraries.selected.has(name))continue;
 const {node,s}=imports.get(name),target=node.source.value;
 if(!target.startsWith('.'))throw Error('Unexpected external rule dependency '+target);
 const resolved=path.resolve(ROOT,path.dirname('dist-vds/server/channel-runtime/index.mjs'),target);
 const relative=path.relative(outputDir,resolved);
 const imported=s.type==='ImportNamespaceSpecifier'?'* as '+name:s.type==='ImportDefaultSpecifier'?name:'{'+s.imported.name+(name==='isRuneV2Boss'?' as nativeRuneV2Boss':s.imported.name!==name?' as '+name:'')+'}';
 lines.push('import '+imported+' from '+JSON.stringify(relative.startsWith('.')?relative:'./'+relative)+';');
}
lines.push('const ambient=globalThis;');
lines.push('export function createRules({random=Math.random,now=Date.now,globals=globalThis,uuid=()=>ambient.crypto.randomUUID(),fourChannels=false}={}) {');
lines.push('const globalThis=globals,crypto={randomUUID:uuid};const Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date {static now(){return now();}};');
lines.push('const isRuneV2Boss=id=>nativeRuneV2Boss(id)||(fourChannels&&id==="rune-v2-boss-c4-1");',...libraries.bodies);
for(const name of ordered){let text=declarations.get(name).text;if(name==='isBlackStoneBoss476')text=text.replace("id==='stone-boss-black-c3'","id==='stone-boss-black-c3'||fourChannels&&id==='stone-boss-black-c4'");text=text.replaceAll('/^rune-v2-boss-c[1-3]-1$/','(fourChannels?/^rune-v2-boss-c[1-4]-1$/:/^rune-v2-boss-c[1-3]-1$/)');lines.push(text);}
lines.push('return Object.freeze({'+roots.join(',')+'});\n}');
const nativeOutput=lines.join('\n')+'\n';
// R19/R20 additions apply only to strict adventure map IDs. Keep the complete
// ordinary V510 declaration bodies unchanged and make rebuilds reproducible.
const adventurePatches=[
 ['function areaWorld(area) {', 'function areaWorld(area) {if(isAdventureArea(area))return adventureBounds(area);'],
 ['function isAreaWalkablePosition(area, x, y) {', 'function isAreaWalkablePosition(area, x, y) {if(isAdventureArea(area))return adventureWalkable(area,x,y);'],
 ['function isAreaWalkableSegment(area, fromX, fromY, toX, toY) {', 'function isAreaWalkableSegment(area, fromX, fromY, toX, toY) {if(isAdventureArea(area))return adventureSegment(area,fromX,fromY,toX,toY);'],
 ['function validArea(area) {','function validArea(area) {if(isAdventureArea(area))return true;'],
 ['if (monster.is_stone || isFrozenWaterId(monster.id)) return {','if (monster.is_stone || isFrozenWaterId(monster.id) || isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary) return {'],
 ['function monsterXpReward(target, settings) {','function monsterXpReward(target, settings) {if(isAdventureArea(target.area))return globalThis.__colAdventure?.profile(target)?.xp??0;'],
 ['function pveDamage(monster, armorPower, player, settings) {',"function pveDamage(monster, armorPower, player, settings) {if(isAdventureArea(monster.area)){const p=globalThis.__colAdventure?.profile(monster);if(!p)throw Error('adventure_combat_profile_missing');const raw=monster.runeDamageOverride484??p.damage;if(!raw)return {raw:0,amount:0,blocked:0};monster={...monster,exact_hit_damage:raw};}"]
];
let output=nativeOutput;
for(const [before,after] of adventurePatches){if(output.split(before).length!==2)throw Error('V510 adventure adapter anchor mismatch');output=output.replace(before,after);}
output="import {isAdventureArea,isMistArea,adventureBounds,adventureWalkable,adventureSegment,adventureMonsterId} from '../adventure-maps.mjs';\n"+output;

parse(output,{ecmaVersion:'latest',sourceType:'module'});
fs.writeFileSync(path.join(outputDir,'rules.mjs'),output);
const proof={baselineManifestSha256:sha(manifestBytes),baselineRuleBundleSha256:sha(sourceBytes),roots,
 declarations:ordered.map(name=>({name,sha256:sha(declarations.get(name).text),bytes:Buffer.byteLength(declarations.get(name).text)})),
 imports:[...selectedImports],libraries:libraries.proof,generatedSha256:sha(output),adventureAdapter:{version:'r21-reproducible-existing-r19-r20',nativeOutputSha256:sha(nativeOutput),checkedReplacementCount:adventurePatches.length,ordinaryMapRulesChanged:false},gameplayIntegrationComplete:false};
fs.writeFileSync(path.join(outputDir,'rules-proof.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({declarations:ordered.length,imports:selectedImports.size,bytes:Buffer.byteLength(output),roots:roots.length}));
