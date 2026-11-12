import {memoryCombatR53,normalPlayerR53,normalMonsterR53} from './r53-options.mjs';
import {ordinaryRuneRewardR87} from './rune-reward-scope-r87.mjs';

// Rune shares the existing native potion transaction, never a separate writer.
// Its boss has is_boss=0, so only the explicit ordinary catalog is eligible.
const rune=memoryCombatR53&&process.env.CORE511_R89_RUNE_POTION!=='0';
export const potionPlayerR89=p=>normalPlayerR53(p)||Boolean(rune&&p?.area==='rune_v2'&&!p.arena_match_id&&!p.instance_id&&!p.instanceId);
export const potionMonsterR89=m=>normalMonsterR53(m)||Boolean(rune&&ordinaryRuneRewardR87(m));
