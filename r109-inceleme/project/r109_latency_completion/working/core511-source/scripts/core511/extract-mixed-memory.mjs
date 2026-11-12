// Explicit storage boundaries only. The source is the SHA-pinned V510 handler.
export function mixedSources({source,ast,parse,walk,synchronous,hash}){
 const names=['commitMixedBlack473','selectMixedMonsters473','prepareMixedPlayers473','runMixedBlack473'],functions=new Map(),constants=[];
 walk(ast,n=>{if(n.type==='FunctionDeclaration'&&names.includes(n.id.name)){if(functions.has(n.id.name))throw Error('Ambiguous mixed function');functions.set(n.id.name,source.slice(n.start,n.end));}
  if(n.type==='VariableDeclarator'&&['wallNowSql473','failure'].includes(n.id.name)){const code=source.slice(n.start,n.end);if(code.includes('mixed_')||n.id.name==='wallNowSql473'||code.includes('Object.assign(new Error(code)'))constants.push('const '+code+';');}});
 if(functions.size!==4||constants.length!==2)throw Error('Missing mixed native boundaries');
 const proof=[];
 function edit(code,replacements){const tree=parse(code,{ecmaVersion:'latest',sourceType:'module'}),edits=[];walk(tree,n=>{if(n.type==='VariableDeclarator'&&Object.hasOwn(replacements,n.id.name))edits.push([n.init.start,n.init.end,replacements[n.id.name],n.id.name]);});
  for(const [start,end,value,label]of edits.sort((a,b)=>b[0]-a[0])){proof.push({label,sha256:hash(code.slice(start,end))});code=code.slice(0,start)+value+code.slice(end);}return code;}
 function once(code,from,to){if(code.split(from).length!==2)throw Error('Mixed storage boundary changed: '+from.slice(0,90));proof.push({label:'storage',sha256:hash(from)});return code.replace(from,to);}
 let select=edit(functions.get('selectMixedMonsters473'),{all473:'port.monsters(player)',recent473:'{results:port.recentAttacks(player.id,nowMs-8000)}'});
 let players=edit(functions.get('prepareMixedPlayers473'),{rows473:'port.players(player,center472,nowMs)'});
 let run=functions.get('runMixedBlack473'),tree=parse(run,{ecmaVersion:'latest',sourceType:'module'}),hit;
 walk(tree,n=>{if(n.type==='VariableDeclarator'&&n.id.name==='prepareMonsterHit')hit=n;});if(!hit)throw Error('Missing mixed hit plan');
 const statements=hit.init.body.body.find(n=>n.type==='VariableDeclaration'&&n.declarations[0].id.name==='hitStatements');if(!statements)throw Error('Missing mixed SQL plan');
 const math=run.slice(hit.init.body.start+1,statements.start);
 run=run.slice(0,hit.init.start)+'(target,targetIndex,rolledHit465=null)=>{'+math+'return port.monsterPlan({target,targetIndex,directDamage,elemental,rolled,respawn,attackingPlayer,monster,ability,nowMs,now,targetsCount:targets.length});}'+run.slice(hit.init.end);
 run=once(run,'await settlePveEngagement(database,playerId,settings,nowMs)','port.retaliate(playerId,settings,nowMs)');
 run=once(run,'await commitMixedBlack473(database,','commitMixedMemory(');
 run=once(run,'await armPveEngagement(database,attackingPlayer,retaliating,nowMs)','port.arm(attackingPlayer,retaliating,nowMs)');
 const cleanupTree=parse(run,{ecmaVersion:'latest',sourceType:'module'}),cleanup=[];
 walk(cleanupTree,n=>{if(n.type==='AwaitExpression'&&run.slice(n.start,n.end).startsWith('await database.prepare('))cleanup.push(n);});
 if(cleanup.length!==1||!run.slice(cleanup[0].start,cleanup[0].end).includes('DELETE FROM pve_engagements'))throw Error('Mixed cleanup boundary changed');
 run=run.slice(0,cleanup[0].start)+'port.clearDeadEncounter(playerId,targets)'+run.slice(cleanup[0].end);
 run=once(run,'restoreStolenLife(database,','port.restoreLife(').replaceAll('spawnSinsiStoneWaves(database,','port.requiresWriter(').replaceAll('tryAwardPendingSinsiStoneRewards(database,','port.requiresWriter(');
 run=once(run,'colNotifyPvpGemLoss479(player,row479,row479.id,row479.hp_revision,nowMs)','port.nonlethalGems(row479)');
 run=once(run,'Promise.all(publishes473)','publishes473');
 const broadcasts=code=>code.replaceAll('for(const channel of [1,2,3])','for(const channel of (fourChannels?[1,2,3,4]:[1,2,3]))');
 const committer=functions.get('commitMixedBlack473'),cut=committer.indexOf(' const players=JSON.stringify(');if(cut<0)throw Error('Mixed plan validation boundary');
 const validation=committer.slice(0,cut).replace('async function commitMixedBlack473(database,','function commitMixedMemory(').replace("typeof database.combatHit!=='function'","typeof port.commit!=='function'")+'return port.commit({player,center,playerPlans,monsterPlans,cooldownAtMs,cooldownMs,nowMs,respawnSeconds});}';
 const memory=synchronous('function mixedMemory(port){const failure=code=>Object.assign(new Error(code),{code});'+[validation,select,players,broadcasts(run)].join('\n')+'return {selectMixedMonsters473,prepareMixedPlayers473,runMixedBlack473};}');
 if(/\b(?:database|await|async)\b/.test(memory))throw Error('Unconverted mixed storage');
 const native='function mixedNative(database){'+constants.join('\n')+[...functions.values()].map(broadcasts).join('\n')+'return {selectMixedMonsters473,prepareMixedPlayers473,runMixedBlack473:context=>{ports.beforeMixed?.(context);return runMixedBlack473(context);}};}';
 return {native,memory,proof:{functions:[...functions].map(([name,code])=>({name,sha256:hash(code)})),storage:proof}};
}
