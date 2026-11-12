// Dedicated equipment enhancement, evolution and conversion ingredients only.
// A configurable recipe can also consume coins/gear/chests; that does not make
// those unrelated rewards exempt from their existing level policy.
export const MATERIAL_LEVEL_KINDS498=Object.freeze([
 'forge_ember491','strong_branch','strong_crystal','desert_plant','master_scroll','weathered_iron',
 'pearl','pearls','stone_dust','stone_book','book','evolution_scroll',
 'wing','infinite','pet','rune_attack','rune_defense','rune_hp',
 'mastery_seal492','mastery_seals492'
]);
const kinds=new Set(MATERIAL_LEVEL_KINDS498);
export function materialLevelItem498(item){
 if(typeof item==='string')return kinds.has(item);
 if(!item||!['resource','material','stone','premium'].includes(item.type))return false;
 return kinds.has(item.kind??item.column);
}
// Only newly frozen defeats opt in. Older pending rewards keep the exact
// policy they earned; no historical rows or claims are rewritten.
export const materialLevelPolicy498=rates=>rates?.highLevelBalance487?.materialLevel498===1;
