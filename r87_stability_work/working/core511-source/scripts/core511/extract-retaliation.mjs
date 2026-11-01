import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {parse} from '../perf-r11/tests/parser.mjs';
const require=createRequire(import.meta.url),{analyze}=require(process.env.COL_CORE511_SCOPE_MODULE??'/tmp/core511-build-deps/node_modules/eslint-scope');
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated');
const hash=x=>createHash('sha256').update(x).digest('hex'),manifestBytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));
const baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
if(hash(manifestBytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(manifestBytes),file='dist-vds/server/channel-runtime/index.mjs',source=fs.readFileSync(path.join(root,file),'utf8');
if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Changed V510 retaliation rules');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',ranges:true}),scopes=analyze(ast,{ecmaVersion:2022,sourceType:'module'});
const vars=new Set(scopes.scopes.find(s=>s.type==='module').variables),refs=scopes.scopes.flatMap(s=>s.references).filter(r=>vars.has(r.resolved));
const declarations=new Map(),imports=new Map();
for(const n of ast.body){
 if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')declarations.set(n.id.name,{node:n,text:source.slice(n.start,n.end)});
 if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')declarations.set(d.id.name,{node:d,text:n.kind+' '+source.slice(d.start,d.end)+';'});
 if(n.type==='ImportDeclaration')for(const s of n.specifiers)imports.set(s.local.name,{node:n,s});
}
const selected=new Set(),selectedImports=new Set(),ports=new Set(['publishRealtimeRoomEvent','deliverRealtime']);
function include(name){
 if(selected.has(name)||selectedImports.has(name)||ports.has(name))return;
 if(imports.has(name)){selectedImports.add(name);return;}
 const row=declarations.get(name);if(!row)return;selected.add(name);
 for(const r of refs)if(r.identifier.start>=row.node.start&&r.identifier.end<=row.node.end&&r.resolved.name!==name)include(r.resolved.name);
}
for(const name of ['settlePveOne489','preparePveEngagement','pveAttackCadenceMs','pveEntries489','monsterCombatPosition'])include(name);
const runeTick=declarations.get('colTickRuneV2Boss484').node,runeDamage=runeTick.body.body[0].argument.arguments[1].properties.find(p=>p.key.name==='damage').value;
for(const r of refs)if(r.identifier.start>=runeDamage.start&&r.identifier.end<=runeDamage.end)include(r.resolved.name);
const original=declarations.get('settlePveOne489').text;
const replaceOnce=(value,from,to)=>{if(value.split(from).length!==2)throw Error('Native retaliation boundary changed: '+from.slice(0,80));return value.replace(from,to);};
let memory=replaceOnce(original,'async function settlePveOne489(database,','function retaliateMemory(port,');
memory=memory.replaceAll('await clearPveEntry489(database,playerId,engagement);','port.clear(playerId,engagement);');
const begin=memory.indexOf('\tconst commitPve = '),end=memory.indexOf('\n\tif (!result)',begin);
if(begin<0||end<0)throw Error('Native retaliation commit boundary missing');
const nativeCommit=memory.slice(begin,end);
memory=memory.slice(0,begin)+'\tconst result = port.hit({playerId,player,monster,engagement,damage,nowMs,nextHitAtMs,nextSkillAt,runeV2DeathPenalty483});'+memory.slice(end);
memory=replaceOnce(memory,'await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, pveHit, player.arena_match_id || void 0));','port.publish(player.world_cycle, player.channel, player.area, pveHit, player.arena_match_id || void 0);');
if(/\b(?:await|database)\b/.test(memory))throw Error('Unexpected database/async dependency in resident retaliation');
let writer=replaceOnce(original,'async function settlePveOne489(','function retaliateWriter(').replaceAll('await ','').replaceAll('clearPveEntry489(database,','clearWriter(database,');
const multiFile='vds-server/src/pve-multi489.mjs',multi=fs.readFileSync(path.join(root,multiFile),'utf8');
if(manifest.files.find(r=>r.path===multiFile)?.sha256!==hash(multi))throw Error('Changed V510 engagement rules');
const multiAst=parse(multi,{ecmaVersion:'latest',sourceType:'module'}),clear=multiAst.body.find(n=>n.declaration?.id?.name==='clearPveEntry489').declaration;
const clearWriter=multi.slice(clear.start,clear.end).replace('async function clearPveEntry489(','function clearWriter(');
const settle=declarations.get('settlePveEngagement').text;
const frameStart=settle.indexOf('const frameStatementsR18='),frameEnd=settle.indexOf('\n const [player,monsters489,armorItems]',frameStart);
if(frameStart<0||frameEnd<0)throw Error('Native retaliation hydration boundary changed');
const frame='function prepareFrame(database,playerId,entries489){\n'+settle.slice(frameStart,frameEnd)+'\nreturn frameStatementsR18;\n}';
const loopStart=settle.indexOf(' const byId489='),loopEnd=settle.lastIndexOf('\n}');
if(loopStart<0||loopEnd<=loopStart)throw Error('Native multi-retaliation loop changed');
const loop=settle.slice(loopStart,loopEnd);
const syncLine="  if(monster489&&database.combat?.enabled&&!database.channelCompute)database.combat.syncEntity('monsters',monster489.id);";
if(!loop.includes(syncLine))throw Error('Native retaliation sync boundary changed');
const memoryLoop=loop.replace(syncLine,'').replace('await settlePveOne489(database,','port.one(');
const allMemory='function settleAllMemory(port,playerId,settings,nowMs){const row489=port.row(playerId);if(!row489||row489.next_hit_at_ms>nowMs)return null;const entries489=pveEntries489(row489);const {player,monsters489,armorItems}=port.frame(playerId,entries489);'+memoryLoop+'\n}';
const allNative='async function settleAllNative(database,playerId,settings,nowMs){const row489=await database.prepare("SELECT * FROM pve_engagements WHERE player_id=? LIMIT 1").bind(playerId).first();if(!row489||row489.next_hit_at_ms>nowMs)return null;const entries489=pveEntries489(row489);const frame=prepareFrame(database,playerId,entries489);const [player,monsters489,armorItems]=await Promise.all([frame[0].first(),frame[1].all(),frame[2].all()]);'+loop+'\n}';
const allWriter=allNative.replace('async function settleAllNative(','function settleAllWriter(').replaceAll('await ','').replace('Promise.all([frame[0].first(),frame[1].all(),frame[2].all()])','[frame[0].first(),frame[1].all(),frame[2].all()]').replaceAll('settlePveOne489(database,','retaliateWriter(database,');
const lines=[];
for(const name of [...selectedImports].sort()){
 const {node,s}=imports.get(name),target=node.source.value;
 if(!target.startsWith('.'))throw Error('Unexpected external retaliation dependency '+target);
 const relative=path.relative(out,path.resolve(root,path.dirname(file),target));
 const imported=s.type==='ImportNamespaceSpecifier'?'* as '+name:s.type==='ImportDefaultSpecifier'?name:'{'+s.imported.name+(name==='isRuneV2Boss'?' as nativeRuneV2Boss':s.imported.name!==name?' as '+name:'')+'}';
 lines.push('import '+imported+' from '+JSON.stringify(relative.startsWith('.')?relative:'./'+relative)+';');
}
const ordered=[...selected].sort((a,b)=>declarations.get(a).node.start-declarations.get(b).node.start);
lines.push('const ambient=globalThis;');
lines.push('export function createRetaliationRules({random=Math.random,now=Date.now,globals=globalThis,fourChannels=false,publish=()=>{throw Error("retaliation_publish_unbound");}}={}) {');
lines.push('const globalThis=globals,Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date {static now(){return now();}};');
lines.push('const publishRealtimeRoomEvent=publish,deliverRealtime=value=>value;');
lines.push('const isRuneV2Boss=id=>nativeRuneV2Boss(id)||(fourChannels&&id==="rune-v2-boss-c4-1");');
for(const name of ordered){let text=declarations.get(name).text;if(name==='isBlackStoneBoss476')text=replaceOnce(text,"id==='stone-boss-black-c3'","id==='stone-boss-black-c3'||fourChannels&&id==='stone-boss-black-c4'");lines.push(text);}
lines.push(memory,writer,clearWriter,frame,allMemory,allNative,allWriter,'const runeBossDamage='+source.slice(runeDamage.start,runeDamage.end)+';');
lines.push('return Object.freeze({retaliateNative:settlePveOne489,retaliateMemory,retaliateWriter,settleAllMemory,settleAllNative,settleAllWriter,clearWriter,preparePveEngagement,pveAttackCadenceMs,prepareFrame,isRuneV2Boss,runeBossDamage,monsterCombatPosition});\n}');
// Retain the R19 ordinary-map adventure bindings when regenerating the native
// calculation. Stationary markers must clear old encounters as well as reject
// new ones, including writer settlement after an upgrade or ownership transfer.
function adventureRules(text){
 for(const [signature,body]of [
  ['function areaWorld(area) {','if(isAdventureArea(area))return adventureBounds(area);'],
  ['function isAreaWalkablePosition(area, x, y) {','if(isAdventureArea(area))return adventureWalkable(area,x,y);'],
  ['function pveAttackCadenceMs(monster) {','if(isAdventureArea(monster.area))return globalThis.__colAdventure?.profile(monster)?.cadence??2200;'],
  ['function pveAggroRange(monster) {','if(isAdventureArea(monster.area))return globalThis.__colAdventure?.profile(monster)?.stationary?0:(globalThis.__colAdventure?.profile(monster)?.range??320);'],
  ['function pveDamage(monster, armorPower, player, settings) {',"if(isAdventureArea(monster.area)){const p=globalThis.__colAdventure?.profile(monster);if(!p)throw Error('adventure_combat_profile_missing');const raw=monster.runeDamageOverride484??p.damage;if(!raw)return {raw:0,amount:0,blocked:0};monster={...monster,exact_hit_damage:raw};}"],
  ['function preparePveEngagement(database, player, monster, nowMs) {','if(isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary)return [];']
 ])text=replaceOnce(text,signature,signature+body);
 text=replaceOnce(text,'if (monster.is_stone || isFrozenWaterId(monster.id))','if (monster.is_stone || isFrozenWaterId(monster.id) || isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary)');
 const before='monster.hp <= 0 || monster.is_stone || monster.spawn_round !== engagement.spawn_round',after='monster.hp <= 0 || monster.is_stone || isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary || monster.spawn_round !== engagement.spawn_round';
 if(text.split(before).length!==4)throw Error('Retaliation stationary invalidation boundary changed');
 return text.replaceAll(before,after);
}
const generated="import {isAdventureArea,isMistArea,adventureBounds,adventureWalkable,adventureSegment,adventureMonsterId} from '../adventure-maps.mjs';\n"+adventureRules(lines.join('\n')+'\n');const generatedAst=parse(generated,{ecmaVersion:'latest',sourceType:'module'});
const factory=generatedAst.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='createRetaliationRules').declaration;
const adaptedNative=factory.body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='settlePveOne489');
fs.writeFileSync(path.join(out,'retaliation-rules.mjs'),generated);
fs.writeFileSync(path.join(out,'retaliation-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),sourceNativeMethodSha256:hash(original),nativeMethodSha256:hash(generated.slice(adaptedNative.start,adaptedNative.end)),runeDamage:{start:runeDamage.start,end:runeDamage.end,sha256:hash(source.slice(runeDamage.start,runeDamage.end))},nativeCommitSha256:hash(nativeCommit),generatedSha256:hash(generated),declarations:ordered.map(name=>({name,sha256:hash(declarations.get(name).text)})),edits:['memory: clear/hit/publish storage boundaries replaced; synchronous execution','writer: async/await removed inside existing atomic job; native SQL unchanged','terminal publication follows durable ACK; nonterminal memory hits remain transient','explicit fourChannels mode extends black/rune boss classifiers to channel4','R19 strict adventure geometry/profile bindings retained; stationary adventure encounters invalidate identically in native, resident and writer settlement'],channel4BossFamiliesComplete:true,fullAiIntegrationComplete:false},null,2)+'\n');
console.log(JSON.stringify({declarations:ordered.length,imports:selectedImports.size,bytes:Buffer.byteLength(generated)}));
