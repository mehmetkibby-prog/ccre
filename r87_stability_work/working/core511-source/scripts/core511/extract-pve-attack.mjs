import fs from 'node:fs';
import {adaptRuneRespawnR89} from './adapt-rune-respawn-r89.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {parse} from '../perf-r11/tests/parser.mjs';
import {pvpMemorySource} from './extract-pvp-memory.mjs';
import {nativeLibraryClosure} from './extract-native-libraries.mjs';
import {mixedSources} from './extract-mixed-memory.mjs';
import {adaptAdventureAttack} from './adapt-adventure-attack.mjs';
import {adaptLootProfileCacheR61,LOOT_PROFILE_EDITS_R61} from './adapt-loot-profile-cache-r61.mjs';
const require=createRequire(import.meta.url),{analyze}=require(process.env.COL_CORE511_SCOPE_MODULE??'/tmp/core511-build-deps/node_modules/eslint-scope');
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=process.env.COL_CORE511_GENERATED_OUT??path.join(import.meta.dirname,'generated');
const hash=x=>createHash('sha256').update(x).digest('hex'),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
const manifestBytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));
if(hash(manifestBytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(manifestBytes),file='dist-vds/server/channel-runtime/index.mjs',source=fs.readFileSync(path.join(root,file),'utf8');
if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Changed V510 attack source');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',ranges:true}),scopes=analyze(ast,{ecmaVersion:2022,sourceType:'module'});
function walk(n,fn){if(!n||typeof n!=='object')return;fn(n);for(const [k,v]of Object.entries(n))if(k!=='range'){if(Array.isArray(v))for(const x of v)walk(x,fn);else if(v?.type)walk(v,fn);}}
const attack=[];walk(ast,n=>{if(n.type==='IfStatement'&&source.slice(n.test.start,n.test.end)==='payload.action === "attack"')attack.push(n.consequent);});
if(attack.length!==1)throw Error('Ambiguous native PvE branch');
const body=source.slice(attack[0].start+1,attack[0].end-1);
const pvp=[];walk(ast,n=>{if(n.type==='IfStatement'&&source.slice(n.test.start,n.test.end)==='payload.action === "pvp_attack"'&&n.consequent.type==='BlockStatement'&&source.slice(n.consequent.start,n.consequent.end).includes('const pvpRolls ='))pvp.push(n.consequent);});
if(pvp.length!==1)throw Error('Ambiguous native PvP branch');
const pvpBody=source.slice(pvp[0].start+1,pvp[0].end-1);
const actionNames=['claim_rewards','donate','respawn','collect','use_potion','guardian_dash','start_fishing','fishing_input','finish_fishing','cancel_fishing','sell_fish','arena_join_queue','arena_cancel_queue','arena_ack_result','invite_party','reject_party','accept_party','kick_party','leave_party'],actionBodies=new Map();
for(const name of actionNames){const matches=[];walk(ast,n=>{if(n.type==='IfStatement'&&source.slice(n.test.start,n.test.end)==='payload.action === '+JSON.stringify(name)&&n.consequent.type==='BlockStatement')matches.push(n.consequent);});if(matches.length!==1)throw Error('Ambiguous native action '+name);actionBodies.set(name,source.slice(matches[0].start+1,matches[0].end-1));}
// Keep V510 claim normalization, participant guards, caps, rate values and SQL.
// The authenticated WS writer already owns the settings snapshot; its durable
// rate adapter consumes the same account/category policy without HTTP-only
// loadlab request context (ordinary player traffic is unchanged).
const claimOriginal=actionBodies.get('claim_rewards');
const claimAdapters=[['await getGameSettings()','settings'],[', colLabHttpAuth.rateLimitContext(request, auth, "claim-rewards")','']];
let claimBody=claimOriginal;
for(const [from,to]of claimAdapters){if(claimBody.split(from).length!==2)throw Error('Native claim adapter boundary changed');claimBody=claimBody.replace(from,to);}
actionBodies.set('claim_rewards',claimBody);
const travelNames=['travel_event','travel_dragon','travel_rune_v2','travel_rune','travel_ancient','travel_afk','travel_market','travel_forest','travel_frozen','travel_fishing','travel_sanctum','travel_sinsi','travel_war','travel_black'];
const travelBranches=[];walk(ast,n=>{if(n.type==='IfStatement'&&n.test.type==='LogicalExpression'&&n.consequent.type==='BlockStatement'&&travelNames.every(name=>source.slice(n.test.start,n.test.end).includes('payload.action === '+JSON.stringify(name))))travelBranches.push(n.consequent);});
if(travelBranches.length!==1)throw Error('Ambiguous native travel branch');for(const name of travelNames)actionBodies.set(name,source.slice(travelBranches[0].start+1,travelBranches[0].end-1));
const declarations=new Map(),imports=new Map();
for(const n of ast.body){
 if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')declarations.set(n.id.name,{node:n,text:source.slice(n.start,n.end)});
 if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')declarations.set(d.id.name,{node:d,text:n.kind+' '+source.slice(d.start,d.end)+';'});
 if(n.type==='ImportDeclaration')for(const s of n.specifiers)imports.set(s.local.name,{node:n,s});
}
const free=code=>analyze(parse(code,{ecmaVersion:'latest',sourceType:'module',ranges:true}),{ecmaVersion:2022,sourceType:'module'}).globalScope.through.map(r=>r.identifier.name);
const context=['player','playerId','payload','settings','attackTargetId','preloadedAttackMonster','requestReceivedAtMs','now','auth'];
// These boundaries need explicit ownership-aware production adapters. Missing
// bindings throw when reached; no mechanic is silently replaced by a no-op.
const portNames=['settlePveEngagement','prepareMixedPlayers473','selectMixedMonsters473','runMixedBlack473','publishRealtimeRoomEvent','publishRealtimeRoomEventToChannels','deliverRealtime','scheduleRequestTask','startBackgroundTask','publishCommunityProgress','runRewardDelivery','publishRealtimePlayerEvent','publishRealtimeWorldEvent','pvpContinuity','releasePvpCommit','readActionSnapshot','enforceRateLimit'];
const selected=new Set(),selectedImports=new Set(),known=new Set([...context,...portNames,'database','timing','env','realtime','Math','Date','globalThis','crypto','Response','Object','Number','Array','Map','Set','Promise','JSON','String','Boolean','Infinity','undefined','console']);
known.add("Error");
known.add('Uint32Array');
known.add('fourChannels');
known.add('ports');
const vars=new Set(scopes.scopes.find(s=>s.type==='module').variables),refs=scopes.scopes.flatMap(s=>s.references).filter(r=>vars.has(r.resolved));
function include(name){
 if(known.has(name)||selected.has(name)||selectedImports.has(name))return;
 if(imports.has(name)){selectedImports.add(name);return;}
 const row=declarations.get(name);if(!row)throw Error('Unbound native attack dependency '+name);
 selected.add(name);for(const r of refs)if(r.identifier.start>=row.node.start&&r.identifier.end<=row.node.end&&r.resolved.name!==name)include(r.resolved.name);
}
for(const name of free('async function nativeAttack(){'+body+'}'))include(name);
for(const name of free('async function nativePvp(actionSnapshot,playerId,payload,requestReceivedAtMs){'+pvpBody+'}'))include(name);
for(const body of actionBodies.values())for(const name of free('async function nativeAction(){'+body+'}'))include(name);
const rewardRoots=['awardProfileNormalRewards','awardProfileBossRewards','awardProfileSinsiStoneRewards','awardPendingNormalRewards','awardPendingBossRewards','awardPendingSinsiStoneRewards'];
const heartbeatRoots=['tryCreateArenaMatch','tryFinishArenaForfeit','settleArenaMatch','tryAwardPendingSinsiStoneRewards','tryFinalizePendingDropEnchantments','isArenaMode','colLabIsPlayer'];
for(const name of [...rewardRoots,...heartbeatRoots,'colSupportCast456','dashGuardian'])include(name);
include('setSelectSql');
// The event boss profile lives in the pinned main bundle, not the old channel
// bundle. Reuse its exact body and resolve its helpers from the native module.
const mainFile='dist-vds/server/index.js',mainSource=fs.readFileSync(path.join(root,mainFile),'utf8');
if(manifest.files.find(r=>r.path===mainFile)?.sha256!==hash(mainSource))throw Error('Changed native event profile source');
const mainTree=parse(mainSource,{ecmaVersion:'latest',sourceType:'module'}),eventNode=mainTree.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='eventBossProfile444');
if(!eventNode)throw Error('Missing native event profile');const eventProfile=mainSource.slice(eventNode.start,eventNode.end);
for(const name of free(eventProfile))include(name);

const snapshot=declarations.get('readActionSnapshot'),snapshotBody=snapshot.node.body.body;
const snapshotDecl=name=>{const n=snapshotBody.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));if(!n)throw Error('Snapshot boundary missing '+name);return source.slice(n.start,n.end);};
const hydrate='function hydrateAttack(database,identity,attackTargetId){const identitySql="?",payload={action:"attack"};'+snapshotDecl('attackMonsterPromise').replaceAll('Promise.resolve(null)','null')+snapshotDecl('playerPromise')+'return {player:playerPromise,monster:attackMonsterPromise};}';
const hydratePvp='function hydratePvp(database,identity,targetPlayerId,nowSeconds){const identitySql="?",now=nowSeconds,payload={action:"pvp_attack",targetPlayerId};'+['playerPromise','pvpTargetId','pvpTargetPromise','pvpArenaPromise'].map(snapshotDecl).join('').replaceAll('Promise.resolve(null)','null')+'return {player:playerPromise,preloadedPvpTarget:pvpTargetPromise,preloadedPvpArena:pvpArenaPromise,pvpTargetId};}';
const targetDeclaration=snapshotBody.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='pvpTargetPromise')),targetQueries=[];walk(targetDeclaration,n=>{if(n.type==='CallExpression'&&n.callee.property?.name==='prepare')targetQueries.push(n.arguments[0]);});
if(targetQueries.length!==1)throw Error('Target admission SELECT changed');
const targetSql=source.slice(targetQueries[0].start,targetQueries[0].end),targetFrom=targetSql.indexOf('\n         FROM players WHERE');if(targetFrom<0)throw Error('Target admission columns changed');
// This is an internal cold admission projection, not a gameplay target lookup.
// Gameplay scope/liveness predicates remain in hydratePvp and PvpMemory.
const hydrateCombatTarget='function hydrateCombatTarget(database,identity){return database.prepare('+targetSql.slice(0,targetFrom)+' FROM players WHERE id=?`).bind(identity).first();}';
include('safeId');
const replaceOnce=(value,from,to)=>{if(value.split(from).length!==2)throw Error('Native attack boundary changed: '+from.slice(0,90));return value.replace(from,to);};
const synchronous=code=>{
 const tree=parse(code,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
 walk(tree,n=>{if(n.type==='AwaitExpression')edits.push([n.start,n.argument.start,'']);if(n.async){const fragment=code.slice(n.start,n.body.start),offset=fragment.indexOf('async');if(offset<0)throw Error('Missing async token');edits.push([n.start+offset,n.start+offset+5,'']);}});
 for(const [start,end,value]of edits.sort((a,b)=>b[0]-a[0]))code=code.slice(0,start)+value+code.slice(end);
 return code;
};
const pvpMemory=pvpMemorySource(pvpBody,{parse,walk,synchronous,hash});
const mixed=mixedSources({source,ast,parse,walk,synchronous,hash});
for(const name of free(mixed.native))include(name);
let dashActionMemory=actionBodies.get('guardian_dash');
dashActionMemory=replaceOnce(dashActionMemory,'await database.prepare("SELECT starts_at_ms,status FROM arena_matches WHERE id=?").bind(player.arena_match_id).first()','port.arena(player.arena_match_id)');
dashActionMemory=replaceOnce(dashActionMemory,'await dashGuardian(database,','port.dash(');
dashActionMemory=synchronous('async function dashActionMemory(port,context){const {player,playerId,payload,settings,requestReceivedAtMs}=context;'+dashActionMemory+'}');
if(/\b(?:database|await|async)\b/.test(dashActionMemory))throw Error('Dash action memory boundary');
const continuity=[];walk(ast,n=>{if(n.type==='VariableDeclarator'&&n.id.name==='pvpContinuity')continuity.push(n.init);});
if(continuity.length!==1)throw Error('Ambiguous native PvP continuity');
const nativeContinuity='async function nativeContinuity(database,originalPvpSnapshot,candidate)'+source.slice(continuity[0].body.start,continuity[0].body.end);
let memoryContinuity=nativeContinuity.replace('nativeContinuity(database,','memoryContinuity(port,');
const continuityTree=parse(memoryContinuity,{ecmaVersion:'latest',sourceType:'module'}),continuityCalls=[];walk(continuityTree,n=>{if(n.type==='AwaitExpression')continuityCalls.push(n);});
if(continuityCalls.length!==1)throw Error('PvP continuity storage changed');
const cc=continuityCalls[0];memoryContinuity=memoryContinuity.slice(0,cc.start)+'port.changedArenaLife(original,candidate)'+memoryContinuity.slice(cc.end);memoryContinuity=synchronous(memoryContinuity);
// Native preflight and damage expressions remain intact. Storage is replaced
// at explicit AST-sized boundaries, never by an SQL interpreter in the tick.
const branchAst=parse('async function attack(){'+body+'}',{ecmaVersion:'latest',sourceType:'module'}),localBody=branchAst.body[0].body.body;
const header='async function attack(){'.length;
const decl=name=>localBody.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));
const hitDecl=decl('prepareMonsterHit'),hitExpr=hitDecl.declarations[0].init;
const hitText=body.slice(hitDecl.start-header,hitDecl.end-header);
const hitBody=hitExpr.body.body,hitStatements=hitBody.find(n=>n.type==='VariableDeclaration'&&n.declarations[0].id.name==='hitStatements');
const hitMath=body.slice(hitExpr.body.start+1-header,hitStatements.start-header);
let memory=body.slice(0,hitDecl.start-header)+'const prepareMonsterHit=(target,targetIndex,rolledHit465=null)=>{'+hitMath+'\nreturn {target,targetIndex,directDamage,elemental,rolled,respawn};};\nreturn {accepted:true,player,attackingPlayer,monster,combatMonster,ability,intentId,attackPveHit,attackColumn,cooldownMs,cooldownAtMs,cooldownGraceMs,nowMs,branch456,critical,enchantmentTotals,targets,plans:targets.map(prepareMonsterHit),monsterPreviews,eventRates,foreignRealtimeChannels};';
memory=replaceOnce(memory,'await database.prepare("SELECT stun_until_ms,root_until_ms FROM players WHERE id=?").bind(playerId).first()','port.control(playerId)');
memory=replaceOnce(memory,'await database.prepare("SELECT day,used_ms,bonus_ms,active,tick_at_ms FROM afk_hunt_state WHERE player_id=?").bind(playerId).first()','port.afk(playerId)');
memory=replaceOnce(memory,'await settlePveEngagement(database, playerId, settings, Date.now())','port.retaliate(playerId,settings,Date.now())');
const guardBegin=memory.indexOf('\t\t\t\t\tconst guardedDatabase ='),guardEnd=memory.indexOf('\n\t\t\t\t\ttiming.mark("pve_validation");',guardBegin);
if(guardBegin<0||guardEnd<0)throw Error('Attack cooldown boundary missing');
memory=memory.slice(0,guardBegin)+`const nativeGuardedBatch=false,memoryCombat=true;
const cooldownAccepted=port.reservePreview({playerId,player:attackingPlayer,attackColumn,cooldownMs,cooldownAtMs,cooldownGraceMs,nowMs});
if(!cooldownAccepted){if(ability===0){deliverRealtime(publishMonsterAttackRejection());return rejectBasicAttackCadence(cooldownMs,attackPveHit);}return rejectMonsterAttack("Yetenek henüz hazır değil.",429);}`+memory.slice(guardEnd);
const monsterQuery='(await database.prepare("SELECT id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_round, area, channel, is_stone, wave_stage, summoned, parent_stone_id, root_until_ms, control_x, control_y FROM monsters WHERE hp > 0 AND area = ? AND (channel = 0 OR channel = ?)").bind(player.area, player.channel).all()).results'.replace('despawn_round','despawn_at, spawn_round');
memory=replaceOnce(memory,monsterQuery,'port.monsters(player)');
memory=replaceOnce(memory,'await database.prepare("SELECT target_id FROM combat_events WHERE created_at >= ? AND player_id = ?").bind(nowMs - 8e3, playerId).all()','{results:port.recentAttacks(playerId,nowMs-8e3)}');
memory=memory.replaceAll('database.combatHit','port.mixedAttack').replaceAll('await ','').replaceAll('async () =>','() =>').replaceAll('async (error, status) =>','(error, status) =>');
if(/\b(?:database|await|async)\b/.test(memory))throw Error('Unexpected resident attack dependency');
let executeMemory=body;
executeMemory=replaceOnce(executeMemory,'await database.prepare("SELECT stun_until_ms,root_until_ms FROM players WHERE id=?").bind(playerId).first()','port.control(playerId)');
executeMemory=replaceOnce(executeMemory,'await database.prepare("SELECT day,used_ms,bonus_ms,active,tick_at_ms FROM afk_hunt_state WHERE player_id=?").bind(playerId).first()','port.afk(playerId)');
executeMemory=replaceOnce(executeMemory,'await settlePveEngagement(database, playerId, settings, Date.now())','port.retaliate(playerId,settings,Date.now())');
const egBegin=executeMemory.indexOf('\t\t\t\t\tconst guardedDatabase ='),egEnd=executeMemory.indexOf('\n\t\t\t\t\tconst cooldownAccepted =',egBegin);
executeMemory=executeMemory.slice(0,egBegin)+'const memoryCombat=(guard,plans)=>port.commitHits(guard,plans),nativeGuardedBatch=null;const cooldownStatement={playerId,player:attackingPlayer,attackColumn,cooldownMs,cooldownAtMs,cooldownGraceMs,nowMs};'+executeMemory.slice(egEnd);
executeMemory=replaceOnce(executeMemory,monsterQuery,'port.monsters(player)');
executeMemory=replaceOnce(executeMemory,'await database.prepare("SELECT target_id FROM combat_events WHERE created_at >= ? AND player_id = ?").bind(nowMs - 8e3, playerId).all()','{results:port.recentAttacks(playerId,nowMs-8e3)}');
executeMemory=replaceOnce(executeMemory,hitText,'const prepareMonsterHit=(target,targetIndex,rolledHit465=null)=>{'+hitMath+'return port.hitPlan({target,targetIndex,directDamage,elemental,rolled,respawn,attackingPlayer,monster,ability,nowMs,now,targetsCount:targets.length});};');
executeMemory=replaceOnce(executeMemory,'await database.prepare("SELECT hp, spawn_round FROM monsters WHERE id = ?").bind(target.id).first()','port.currentMonster(target.id)');
executeMemory=replaceOnce(executeMemory,'colTrapImpact456(database,','port.trap(');
executeMemory=replaceOnce(executeMemory,'applyGuardianImpact(database,','port.guardian(');
executeMemory=replaceOnce(executeMemory,'await armPveEngagement(database, attackingPlayer, retaliatingMonster, nowMs)','port.arm(attackingPlayer,retaliatingMonster,nowMs)');
const cleanup='await database.prepare("DELETE FROM pve_engagements WHERE player_id = ? AND monster_id = ? AND spawn_round = ? AND NOT EXISTS (SELECT 1 FROM json_each(pve_engagements.attackers489) multi489 JOIN monsters live489 ON live489.id=multi489.key AND live489.spawn_round=json_extract(multi489.value,\'$.spawn_round\') WHERE live489.hp>0 AND live489.id<>pve_engagements.monster_id)").bind(playerId, monster.id, monster.spawn_round).run()';
executeMemory=replaceOnce(executeMemory,cleanup,'port.clearDeadEncounter(playerId,monster)');
executeMemory=replaceOnce(executeMemory,'await database.batch([database.prepare(`UPDATE players SET ${attackColumn} = ? WHERE id = ? AND ${attackColumn} = ?`).bind(reservedUntilMs - cooldownMs, playerId, reservedUntilMs), database.prepare("DELETE FROM combat_events WHERE player_id = ? AND target_id = ? AND ability = ? AND created_at = ?").bind(playerId, monster.id, ability, nowMs)])','port.undoEmptyAttack({playerId,attackColumn,reservedUntilMs,cooldownMs,monster,ability,nowMs})');
executeMemory=replaceOnce(executeMemory,'restoreStolenLife(database,','port.restoreLife(');
executeMemory=executeMemory.replaceAll('database.combatHit','port.mixedAttack').replaceAll('database.batch(plan.hitStatements)','port.forbiddenBatch()').replaceAll('database.batch(hitStatements)','port.forbiddenBatch()').replaceAll('spawnSinsiStoneWaves(database,','port.stoneWaves(').replaceAll('tryAwardPendingSinsiStoneRewards(database,','port.stoneRewards(');
executeMemory=synchronous('async function memoryAttack(port,context){const {'+context.join(',')+'}=context;'+executeMemory+'}');
executeMemory=executeMemory.replaceAll('Promise.all([...previewPublishes, ...resultPublishes])','[...previewPublishes,...resultPublishes]');
if(/\b(?:database|await|async)\b/.test(executeMemory))throw Error('Unexpected memory attack database dependency');
const controlProof=[];
function memoryControls(name,next,methods){
 let code=declarations.get(name).text,tree=parse(code,{ecmaVersion:'latest',sourceType:'module'}),calls=[];
 walk(tree,n=>{if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&n.callee.property.name==='first'&&n.callee.object.type==='CallExpression'&&n.callee.object.callee.property?.name==='bind')calls.push(n);});
 if(calls.length!==methods.length)throw Error('Changed control query count '+name);
 for(let i=calls.length-1;i>=0;i--){const n=calls[i],bind=n.callee.object,query=code.slice(n.start,n.end);controlProof.unshift({function:name,method:methods[i],querySha256:hash(query)});code=code.slice(0,n.start)+'port.'+methods[i]+'('+bind.arguments.map(a=>code.slice(a.start,a.end)).join(',')+(methods[i]==='targetPlayer'?',ability':'')+')'+code.slice(n.end);}
 code=code.replaceAll(name+'(',next+'(').replaceAll('database,','port,');return synchronous(code);
}
const guardianMemory=memoryControls('applyGuardianImpact','guardianMemory',['ownPlayer','targetPlayer','movePlayer','stunPlayer','controlMonster']);
const trapMemory=memoryControls('colTrapImpact456','trapMemory',['rootPlayer','rootMonster']);
const dashMemory=memoryControls('dashGuardian','dashMemory',['dashRead','dashMove']);
let supportMemory=declarations.get('colSupportCast456').text;
const supportTree=parse(supportMemory,{ecmaVersion:'latest',sourceType:'module'}),supportBinds=[];
walk(supportTree,n=>{if(n.type==='CallExpression'&&n.callee.property?.name==='bind'&&n.callee.object?.callee?.property?.name==='prepare')supportBinds.push(n);});
if(supportBinds.length!==3)throw Error('Support cast storage boundary changed');
for(let i=2;i>=0;i--){const n=supportBinds[i],args=n.arguments.map(a=>supportMemory.slice(a.start,a.end)).join(',');supportMemory=supportMemory.slice(0,n.start)+(i===0?'port.reserve(['+args+'])':i===1?'port.targets(player,time)':"port.healPlan(["+args+"],branch.effect==='heal')")+supportMemory.slice(n.end);}
supportMemory=supportMemory.replace('port.targets(player,time).all()','port.targets(player,time)').replace('database.guardedBatch(reserve,healStatements)','port.commitSupport(reserve,healStatements)').replace('Promise.all(updates)','updates').replace('colSupportCast456(database,','supportMemory(port,');
// Dead SQL-only fragments must not be allocated on the resident cast path.
const stripTree=parse(supportMemory,{ecmaVersion:'latest',sourceType:'module'}),strip=[];
walk(stripTree,n=>{if(n.type==='VariableDeclaration'&&n.declarations.length===1&&['arenaGuard','friendly','friendlyParams','targetFriendly','canHealOther'].includes(n.declarations[0].id.name))strip.push([n.start,n.end]);});
// friendlyParams is still needed in the bound native predicate arguments.
for(const [start,end]of strip.filter(([start,end])=>!supportMemory.slice(start,end).includes('const friendlyParams')).sort((a,b)=>b[0]-a[0]))supportMemory=supportMemory.slice(0,start)+supportMemory.slice(end);
supportMemory=synchronous(supportMemory);if(/\b(?:database|await|async|arenaGuard|targetFriendly|canHealOther)\b/.test(supportMemory))throw Error('Unbound support memory boundary');
// The fourth channel must retain boss winner eligibility and must not count its
// boss as a normal quest kill. Derive the same native SQL closure, only extend
// the finite channel-ID list. All account/bot/claim predicates are unchanged.
const rankingFile='lib/rune-v2-ranking.mjs',rankingSource=fs.readFileSync(path.join(root,rankingFile),'utf8');
if(manifest.files.find(r=>r.path===rankingFile)?.sha256!==hash(rankingSource))throw Error('Changed native rune ranking');
const rankingDeclarations=new Map();
for(let n of parse(rankingSource,{ecmaVersion:'latest',sourceType:'module'}).body){if(n.type==='ExportNamedDeclaration')n=n.declaration;if(!n)continue;if(n.type==='FunctionDeclaration')rankingDeclarations.set(n.id.name,rankingSource.slice(n.start,n.end));if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')rankingDeclarations.set(d.id.name,n.kind+' '+rankingSource.slice(d.start,d.end)+';');}
const rankingSelected=new Set();function rankingInclude(name){if(rankingSelected.has(name))return;const code=rankingDeclarations.get(name);if(!code)return;rankingSelected.add(name);for(const dep of free(code))rankingInclude(dep);}
rankingInclude('prepareRuneV2Winner483');
const rankingCode=[...rankingDeclarations].filter(([name])=>rankingSelected.has(name)).map(([name,code])=>{
 if(name==='RUNE_V2_IDS_SQL483')return code.slice(0,-1)+'+(fourChannels?",\'rune-v2-boss-c4-1\'":"");';
 if(name==='isRuneV2RankBoss483')return replaceOnce(code,'/^rune-v2-boss-c[1-3]-1$/.test(id)','(fourChannels?/^rune-v2-boss-c[1-4]-1$/:/^rune-v2-boss-c[1-3]-1$/).test(id)');
 if(name==='prepareRuneV2Winner483')return replaceOnce(code,'randomUUID()','crypto.randomUUID()');return code;
});
const libraries=nativeLibraryClosure({root,manifest,out,hash,parse,names:selectedImports});
const lines=[];
for(const [name,target]of libraries.imports)if(!selectedImports.has(name))lines.push('import {'+name+'} from '+JSON.stringify(target)+';');
for(const name of [...selectedImports].sort()){
 if(name==='prepareRuneV2Winner483'||libraries.selected.has(name))continue;
 const {node,s}=imports.get(name),target=node.source.value;
 if(!target.startsWith('.'))throw Error('Unexpected external attack dependency '+target);
 const relative=path.relative(out,path.resolve(root,path.dirname(file),target));
 const imported=s.type==='ImportNamespaceSpecifier'?'* as '+name:s.type==='ImportDefaultSpecifier'?name:'{'+s.imported.name+(name==='isRuneV2Boss'?' as nativeRuneV2Boss':name==='questMonsterEligible438'?' as nativeQuestMonsterEligible438':s.imported.name!==name?' as '+name:'')+'}';
 lines.push('import '+imported+' from '+JSON.stringify(relative.startsWith('.')?relative:'./'+relative)+';');
}
lines.push('const ambient=globalThis;');
lines.push('export function createAttackRules({random=Math.random,now=Date.now,globals,uuid=()=>ambient.crypto.randomUUID(),getRandomValues=array=>ambient.crypto.getRandomValues(array),fourChannels=false,ports={},response=ambient.Response}={}){');
lines.push('if(!globals)throw Error("attack_globals_required");const globalThis=globals,Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}},crypto={randomUUID:uuid,getRandomValues},Response=response;');
lines.push('const env={CORE_RUNTIME:"vds"},realtime=null,timing={mark(){}};');
for(const name of portNames)lines.push('const '+name+'=(...args)=>{if(typeof ports.'+name+'!=="function")throw Error("attack_port_unbound:'+name+'");return ports.'+name+'(...args);};');
lines.push('const isRuneV2Boss=id=>nativeRuneV2Boss(id)||(fourChannels&&id==="rune-v2-boss-c4-1");');
lines.push('const questMonsterEligible438=monster=>!(fourChannels&&(monster?.id??monster?.monster_id)==="rune-v2-boss-c4-1")&&nativeQuestMonsterEligible438(monster);');
lines.push(...libraries.bodies,eventProfile);
lines.push(...rankingCode);
const ordered=[...selected].sort((a,b)=>declarations.get(a).node.start-declarations.get(b).node.start);
for(const name of ordered){let text=declarations.get(name).text;if(name==='isBlackStoneBoss476')text=replaceOnce(text,"id==='stone-boss-black-c3'","id==='stone-boss-black-c3'||fourChannels&&id==='stone-boss-black-c4'");lines.push(text);}
const bindings='const {'+context.join(',')+'}=context;';
const fourBroadcasts=code=>code.replaceAll('{ length: 3 }','{ length: fourChannels ? 4 : 3 }');
const mixedBindings='const {selectMixedMonsters473,prepareMixedPlayers473,runMixedBlack473}=mixedNative(database);';
lines.push(mixed.native,mixed.memory);
lines.push('async function nativeAttack(database,context){'+bindings+mixedBindings+fourBroadcasts(body)+'}');
lines.push('async function nativePvp(database,context){const {actionSnapshot,playerId,payload,requestReceivedAtMs}=context;'+mixedBindings+pvpBody+'}',pvpMemory.code,nativeContinuity,memoryContinuity,hydratePvp);
const groupedActions=new Map();for(const [name,body]of actionBodies){if(!groupedActions.has(body))groupedActions.set(body,[]);groupedActions.get(body).push(name);}
lines.push('async function nativeAction(database,context){'+bindings+'switch(payload.action){'+[...groupedActions].map(([body,names])=>names.map(name=>'case '+JSON.stringify(name)+':').join('')+'{'+body+'}').join('\n')+'default:throw Error("native_action_unbound");}}');
lines.push('function planMemory(port,context){'+bindings+fourBroadcasts(memory)+'}');
lines.push(fourBroadcasts(executeMemory));
lines.push(guardianMemory,trapMemory,dashMemory,supportMemory,dashActionMemory);
lines.push(hydrate,hydrateCombatTarget);
// Original per-target plan, including all defeat/XP/quest/participant guards.
lines.push('function prepareHits(database,context,plan){'+bindings+'const {attackColumn,cooldownMs,cooldownAtMs,cooldownGraceMs,nowMs,attackingPlayer,monster,ability,critical,targets,eventRates}=plan;const {roleBase,wingAttack,multipliers,skillGrowth,stoneAttackPower,firePercent,icePercent,regionMultiplier}=plan;'+hitText+'return plan.plans.map(p=>prepareMonsterHit(p.target,p.targetIndex,p,true));}');
// Read-worker discovery reuses each original candidate-selection prefix. No
// reward, random draw, ID creation, arena reservation or mutation is reachable.
const heartbeatReaders=[];
for(const [name,next,stop,answer]of [
 ['awardPendingBossRewards','readPendingBoss511','if (!pending)','pending'],
 ['awardPendingNormalRewards','readPendingNormal511','if (!pending)','pending'],
 ['awardPendingSinsiStoneRewards','readPendingSinsi511','if (!pending)','pending'],
 ['finalizePendingDropEnchantments','readPendingDrops511','if (!rows.results.length)','rows.results'],
 ['tryCreateArenaMatch','readArenaSelection511','const selectedIds','selected']
]){const original=declarations.get(name).text,index=original.indexOf(stop);if(index<0)throw Error('Native heartbeat reader boundary changed '+name);lines.push(original.slice(0,index).replace('function '+name+'(','function '+next+'(')+'return '+answer+';}');heartbeatReaders.push(next);}
lines.push('return Object.freeze({mixedNative,mixedMemory,nativeAttack,nativeAction,memoryAttack,nativePvp,memoryPvp,nativeContinuity,memoryContinuity,hydratePvp,hydrateCombatTarget,planMemory,prepareHits,hydrateAttack,applyGuardianImpact,colTrapImpact456,guardianMemory,trapMemory,dashGuardian,dashMemory,dashActionMemory,colSupportCast456,supportMemory,guardianCastVisual,lifeStealAmount,restoreStolenLife,preparePveEngagement,prepareRuneV2Winner483,questMonsterEligible438,dungeonService,eventBossProfile444,eventKind444,runeMonsterKey,runeV2MonsterKey,prepareRuneDrops,'+[...new Set([...rewardRoots,...heartbeatRoots,...heartbeatReaders])].join(',')+'});\n}');
const extracted=lines.join('\n')+'\n',generated=adaptRuneRespawnR89(adaptAdventureAttack(extracted));parse(generated,{ecmaVersion:'latest',sourceType:'module'});
if(process.env.COL_CORE511_EMIT_V510_ORACLE==='1')fs.writeFileSync(path.join(out,'attack-rules-v510-oracle.mjs'),extracted);
fs.writeFileSync(path.join(out,'attack-rules.mjs'),generated);
let writer=synchronous(extracted).replace('export function createAttackRules(','export function createAttackWriterRules(');
writer=writer.replace('const env={CORE_RUNTIME:', 'const Promise={all:values=>values.map(syncValue),allSettled:values=>values.map(value=>({status:"fulfilled",value:syncValue(value)}))};function syncValue(value){if(value?.then)throw Error("async_native_attack_boundary");return value;}\nconst env={CORE_RUNTIME:');
const extractedWriterSha256=hash(writer);if(process.env.COL_CORE511_EMIT_V510_ORACLE==='1')fs.writeFileSync(path.join(out,'attack-writer-rules-v510-oracle.mjs'),writer);const beforeLootProfileR61=adaptAdventureAttack(writer,{writer:true});writer=adaptRuneRespawnR89(adaptLootProfileCacheR61(beforeLootProfileR61));
parse(writer,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'attack-writer-rules.mjs'),writer);
fs.writeFileSync(path.join(out,'loot-profile-cache-r61-proof.json'),JSON.stringify({version:1,beforeSha256:hash(beforeLootProfileR61),afterSha256:hash(writer),adapterSha256:hash(fs.readFileSync(new URL('./adapt-loot-profile-cache-r61.mjs',import.meta.url))),helperSha256:hash(fs.readFileSync(new URL('./loot-profile-cache-r61.mjs',import.meta.url))),scope:'Writer-only factory-local deterministic loot profile derivation; native body, SQL, RNG, claims and reward writes unchanged.',edits:LOOT_PROFILE_EDITS_R61},null,2)+'\n');
const generatedBody=name=>{let result;walk(parse(generated,{ecmaVersion:'latest',sourceType:'module'}),n=>{if(n.type==='FunctionDeclaration'&&n.id.name===name){if(result)throw Error('duplicate_generated_function:'+name);result=generated.slice(n.start,n.end);}});if(!result)throw Error('missing_generated_function:'+name);return result;};
fs.writeFileSync(path.join(out,'attack-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),nativeBodySha256:hash(body),nativeHitPlanSha256:hash(hitText),generatedSha256:hash(generated),writerSha256:hash(writer),extractedSha256:hash(extracted),extractedWriterSha256,lootProfileCacheR61AdapterSha256:hash(fs.readFileSync(new URL('./adapt-loot-profile-cache-r61.mjs',import.meta.url))),adventureAdapterSha256:hash(fs.readFileSync(new URL('./adapt-adventure-attack.mjs',import.meta.url))),rankingSourceSha256:hash(rankingSource),rankingDeclarations:[...rankingSelected],libraries:libraries.proof,eventProfile:{source:mainFile,sha256:hash(eventProfile)},controlProof,declarations:ordered.map(name=>({name,sha256:hash(declarations.get(name).text)})),ports:portNames,edits:['Resident planning replaces explicit storage boundaries only','Original per-target SQL reward plans run only in the durable writer','Channel4 boss classifiers, winner SQL ID list and quest exclusion are explicit opt-in; other native predicates unchanged','Native rune drop helper moved unchanged into operation RNG/UUID closure'],fullProductionIntegration:false},null,2)+'\n');
console.log(JSON.stringify({declarations:ordered.length,imports:selectedImports.size,bytes:Buffer.byteLength(generated)}));
fs.writeFileSync(path.join(out,'mixed-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),...mixed.proof,fullProductionIntegration:false},null,2)+'\n');
fs.writeFileSync(path.join(out,'pvp-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),nativeBodySha256:hash(pvpBody),memoryBodySha256:hash(generatedBody('memoryPvp')),extractedMemoryBodySha256:hash(pvpMemory.code.trim()),adventureAdapterSha256:hash(fs.readFileSync(new URL('./adapt-adventure-attack.mjs',import.meta.url))),storageEdits:pvpMemory.proof,nativeContinuitySha256:hash(nativeContinuity),fullProductionIntegration:false},null,2)+'\n');
fs.writeFileSync(path.join(out,'action-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),actions:[...actionBodies].map(([name,body])=>({name,sha256:hash(body)})),claim:{nativeBodySha256:hash(claimOriginal),adaptedBodySha256:hash(claimBody),adapters:claimAdapters,scope:'Exact native claim branch in ordered shared durable writer; original participant/receipt guards and 120/min rate policy retained'},fullProductionIntegration:false},null,2)+'\n');
fs.writeFileSync(path.join(out,'action-names.mjs'),"// Mechanically extracted native action dispatch catalogue.\nimport {ADVENTURE_ACTIONS} from '../adventure-maps.mjs';\nexport const NATIVE_ACTIONS=Object.freeze([...ADVENTURE_ACTIONS,..."+JSON.stringify([...actionBodies.keys()])+']);\n');
