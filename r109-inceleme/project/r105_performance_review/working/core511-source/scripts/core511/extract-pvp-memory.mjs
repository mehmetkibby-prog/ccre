// Storage-only transformation of the pinned native PvP branch. Damage,
// cooldown, rejection, control and response expressions remain native text.
export function pvpMemorySource(body,{parse,walk,synchronous,hash}){
 const wrapper='async function memoryPvp(port,context){const {actionSnapshot,playerId,payload,requestReceivedAtMs}=context;',source=wrapper+body+'}',tree=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[],proof=[];
 const replacements={
  control:'port.control(playerId,pvpTargetId)',
  areaRows472:'port.targets(player,target,nowMs,arenaMatchId)',
  pvpCooldownStatement:'port.reservePlan({player,attackColumn,cooldownAtMs,cooldownMs,cooldownGraceMs,nowMs})',
  defenderDragon:'port.dragon(target.id)',
  areaGuard472:'port.areaPlan({player,target,plans:plans472,attackRange,cooldownAtMs,cooldownMs,nowMs})',
  targetUpdates472:'port.damagePlan(plans472,{player,nowMs,isArena,arenaMatchId})',
  eventInserts472:'port.eventsPlan(plans472,{player,ability,nowMs})',
  arenaScoreWrites:'[]',warEconomyWrites:'[]',
  targetUpdate:'port.damagePlan([{target,totalDamage}],{player,nowMs,isArena,arenaMatchId})',
  eventInsert:'port.eventsPlan([{target,totalDamage}],{player,ability,nowMs})',
  committed472:'port.guardedBatch(areaGuard472,statements472)',
  batchWrites:'port.batch(wouldKill ? mutationStatements : [pvpCooldownStatement,...mutationStatements])',
  wouldKill:'port.predictNonlethal(target,totalDamage)'
 };
 const cutTests=new Set(['claimIds472.length','scoredMatch472',"scoredMatch472?.status==='finished'",'scoredMatch&&scoredMatch.status!=="finished"&&!arenaMatchId.startsWith("guild-")','killed && isArena && scoredMatch']);
 walk(tree,n=>{
  if(n.type==='VariableDeclarator'&&n.id.type==='Identifier'&&replacements[n.id.name])edits.push([n.init.start,n.init.end,replacements[n.id.name],n.id.name]);
  if(n.type==='IfStatement'&&cutTests.has(source.slice(n.test.start,n.test.end)))edits.push([n.start,n.end,'if('+source.slice(n.test.start,n.test.end)+')port.requiresWriter();','terminal-only-arena']);
 });
 // Inner SQL nodes in an already replaced statement are intentionally covered
 // by that statement; record only non-overlapping edits.
 const outer=edits.filter(a=>!edits.some(b=>b!==a&&b[0]<=a[0]&&b[1]>=a[1]));let code=source;
 for(const [start,end,value,label]of outer.sort((a,b)=>b[0]-a[0])){proof.push({label,sourceSha256:hash(source.slice(start,end))});code=code.slice(0,start)+value+code.slice(end);}
 const once=(from,to)=>{if(code.split(from).length!==2)throw Error('Changed PvP boundary '+from.slice(0,70));proof.push({label:'boundary',sourceSha256:hash(from)});code=code.replace(from,to);};
 once('await database.prepare(`UPDATE players SET ${attackColumn} = ? WHERE id = ? AND ${attackColumn} = ?`).bind(reservedUntilMs - cooldownMs, playerId, reservedUntilMs).run()','port.undoCooldown(playerId,attackColumn,reservedUntilMs,cooldownMs)');
 once('(await database.prepare("SELECT kind FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind=\'starter\' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped=1 LIMIT 1").bind(playerId).first())?.kind ?? null','port.pet(playerId)');
 code=code.replaceAll('database.combatHit','port.mixedAttack').replaceAll('readActionSnapshot(database,','port.snapshot(').replaceAll('colTrapImpact456(database,','port.trap(').replaceAll('applyGuardianImpact(database,','port.guardian(').replaceAll('restoreStolenLife(database,','port.restoreLife(');
 code=synchronous(code);
 if(/\b(?:database|await|async)\b/.test(code))throw Error('Unconverted PvP resident storage boundary: '+code.match(/.{0,50}\b(?:database|await|async)\b.{0,180}/g)?.join('\n'));
 return {code,proof};
}
