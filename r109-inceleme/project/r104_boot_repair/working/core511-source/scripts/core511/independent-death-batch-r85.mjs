// A larger bound is available only to independent basic attacks. This is a
// shape/scope predicate, never ownership: all original native guards still run
// for every actor and target in the one held transaction.
export const INDEPENDENT_DEATH_EXTRA_LIMIT_R85=9;
const ordinary=new Set(['forest','frozen','ancient']);
const basic=input=>input?.action==='attack'&&Math.min(3,Math.max(0,Math.floor(Number(input.ability)||0)))===0;
const life=t=>t&&typeof t.id==='string'&&t.id.length>0&&t.id.length<=256&&Number.isSafeInteger(t.spawnRound)&&t.spawnRound>=0;
export function independentDeathBatchPayloadR85(payload,actor){
 const batch=payload?.batchAttacksR57,scope=payload?.localScope,player=payload?.expected?.player,first=payload?.expected?.monster;
 if(payload?.sharedLease||scope?.kind!=='kill'||!ordinary.has(player?.area)||!Number.isInteger(player.channel)||player.channel<1||player.channel>4||!basic(payload.input)||!Array.isArray(batch)||batch.length<1||batch.length>INDEPENDENT_DEATH_EXTRA_LIMIT_R85||!Array.isArray(scope.targets)||scope.targets.length!==batch.length+1||scope.targets.length>10||!scope.targets.every(life)||new Set(scope.targets.map(t=>t.id)).size!==scope.targets.length)return false;
 const inputs=[payload.input,...batch.map(e=>e?.input)],actors=[actor,...batch.map(e=>e?.actor)],resources=payload.resources;
 if(actors.some(id=>typeof id!=='string'||!id)||new Set(actors).size!==actors.length||!inputs.every(basic)||new Set(inputs.map(input=>input.targetId)).size!==inputs.length||inputs.some(input=>!scope.targets.some(t=>t.id===input.targetId&&t.spawnRound===input.spawnRound)))return false;
 if(!first||first.id!==payload.input.targetId||first.spawn_round!==payload.input.spawnRound||first.area!==player.area||first.channel!==player.channel||first.is_boss||first.is_stone)return false;
 if(!Array.isArray(resources)||resources.some(key=>typeof key!=='string'||!key.startsWith('player:')&&!key.startsWith('monster:'))||new Set(resources).size!==resources.length)return false;
 const heldActors=resources.filter(key=>key.startsWith('player:')),heldTargets=resources.filter(key=>key.startsWith('monster:'));
 return heldActors.length<=25&&actors.every(id=>heldActors.includes('player:'+id))&&heldTargets.length===scope.targets.length&&scope.targets.every(t=>heldTargets.includes('monster:'+t.id))&&Buffer.byteLength(JSON.stringify(batch))<=65536;
}
export function independentDeathBatchProofR85(payload,actor){
 if(!independentDeathBatchPayloadR85(payload,actor))return null;
 return {version:1,actors:[actor,...payload.batchAttacksR57.map(e=>e.actor)],sequences:payload.batchAttacksR57.map(e=>e.sequence),targets:payload.localScope.targets.map(t=>({id:t.id,spawnRound:t.spawnRound}))};
}
// A receipt-bound, writer-produced classification permits the larger section
// vector only. It grants no lease and skips no per-actor refresh validation.
export function independentDeathBatchResultR85(result){
 const proof=result?.independentDeathBatchR85,answers=result?.batchResultsR57;
 if(!proof||Object.keys(proof).sort().join(',')!=='actors,sequences,targets,version'||proof.version!==1||!Array.isArray(answers)||answers.length<1||answers.length>INDEPENDENT_DEATH_EXTRA_LIMIT_R85||!Array.isArray(proof.actors)||proof.actors.length!==answers.length+1||proof.actors.some(id=>typeof id!=='string'||!id)||new Set(proof.actors).size!==proof.actors.length||!Array.isArray(proof.sequences)||proof.sequences.length!==answers.length||!Array.isArray(proof.targets)||proof.targets.length!==proof.actors.length||!proof.targets.every(life)||new Set(proof.targets.map(t=>t.id)).size!==proof.targets.length)return false;
 return proof.actors[0]===result.actorSectionsR52?.actor&&answers.every((answer,i)=>answer?.actor===proof.actors[i+1]&&answer.sequence===proof.sequences[i]&&Number.isSafeInteger(answer.sequence)&&answer.sequence>0);
}
