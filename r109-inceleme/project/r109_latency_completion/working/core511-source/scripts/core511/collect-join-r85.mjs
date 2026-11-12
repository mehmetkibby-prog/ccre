import {normalPlayerR53} from './r53-options.mjs';
import {UPGRADE_MATERIAL_KINDS} from '../../../native510-bb3a6cc689c6/lib/progression-materials.mjs';
import {RUNE_TYPES} from '../../../native510-bb3a6cc689c6/lib/runes.mjs';
const materialKinds=new Set([...UPGRADE_MATERIAL_KINDS,...Object.keys(RUNE_TYPES),'weathered_iron','wing','infinite','pet','halloween_pumpkin','witch_wand','halloween_candy']);

// Reuse the existing one-actor checkpoint join only for a known solo drop
// scope. Party, shared, mode and unfamiliar scopes retain their old drains.
// This admits no extra resources and changes no native collect predicates.
const scopeKeys=new Set(['kind','owner','target','monster','dropKind','party','members','absent']);
export function soloCollectJoinR85({id,input,scope,resources,sharedLease,player,channel}){
 return process.env.CORE511_COLLECT_ACTOR_JOIN_R85!=='0'&&process.env.CORE511_COLLECT_SCOPED_DRAIN_R79!=='0'&&normalPlayerR53(player)&&player.hp>0&&player.channel===channel&&!player.arenaMatchId&&!sharedLease&&input?.action==='collect'&&scope?.kind==='collect'&&scope.owner===id&&scope.target===input.targetId&&scope.absent===false&&typeof scope.monster==='string'&&scope.monster.length>0&&materialKinds.has(scope.dropKind)&&scope.party===null&&Array.isArray(scope.members)&&scope.members.length===1&&scope.members[0]===id&&Object.keys(scope).every(k=>scopeKeys.has(k))&&Array.isArray(resources)&&resources.length===1&&resources[0]==='player:'+id;
}

// Missing targets keep native404. Every live target must still be the exact
// native material row, with a positive safe quantity and no pending finalizer.
export function validCollectMaterialDropR85(drop,scope){
 return !drop||drop.owner_id===scope.owner&&drop.monster_id===scope.monster&&drop.kind===scope.dropKind&&materialKinds.has(drop.kind)&&drop.amount_type==='integer'&&Number.isSafeInteger(drop.amount)&&drop.amount>0&&drop.stored_type==='integer'&&Number.isSafeInteger(drop.stored_amount)&&drop.stored_amount>=0&&Number.isSafeInteger(drop.stored_amount+drop.amount)&&drop.enchantments==='[]';
}
