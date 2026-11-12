// Exact reversible writer-only adaptation. Native derivation body is untouched.
export const LOOT_PROFILE_EDITS_R61=Object.freeze([
 {from:'const ambient=globalThis;',to:"import {createLootProfileCacheR61} from '../loot-profile-cache-r61.mjs';\nconst ambient=globalThis;"},
 {from:'const env={CORE_RUNTIME:"vds"},realtime=null,timing={mark(){}};',to:'const lootProfileCacheR61=createLootProfileCacheR61();\nconst env={CORE_RUNTIME:"vds"},realtime=null,timing={mark(){}};'},
 {from:'function profileFromDefeat(defeat, fallbackKey, settings) {',to:'function profileFromDefeat(defeat, fallbackKey, settings) {\n if(!lootProfileCacheR61)return profileFromDefeatUncachedR61(defeat,fallbackKey,settings);\n return lootProfileCacheR61(defeat,fallbackKey,settings,()=>profileFromDefeatUncachedR61(defeat,fallbackKey,settings));\n}\nfunction profileFromDefeatUncachedR61(defeat, fallbackKey, settings) {'}
]);
const replace=(source,from,to)=>{if(source.split(from).length!==2)throw Error('R61 loot profile adapter anchor drift');return source.replace(from,to);};
export function adaptLootProfileCacheR61(source){if(source.includes('createLootProfileCacheR61'))throw Error('R61 loot profile adapter anchor already present');for(const {from,to} of LOOT_PROFILE_EDITS_R61)source=replace(source,from,to);return source;}
export function undoLootProfileCacheR61(source){for(const {from,to} of [...LOOT_PROFILE_EDITS_R61].reverse())source=replace(source,to,from);return source;}
