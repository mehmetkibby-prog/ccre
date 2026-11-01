// Flags are independent. With both zero the delivered R52 routes are retained.
export const memoryCombatR53=process.env.CORE511_MEMORY_COMBAT!=='0';
export const rewardGroupCommitR53=process.env.CORE511_REWARD_GROUP_COMMIT!=='0';
export const eagerNormalRewardsR53=memoryCombatR53&&rewardGroupCommitR53;
export const nativeEngagementR53=memoryCombatR53&&process.env.CORE511_NATIVE_ENGAGEMENT!=='0';
export const attackIndexR53=memoryCombatR53&&process.env.CORE511_ATTACK_INDEX!=='0';
export const tickSlicesR53=memoryCombatR53&&process.env.CORE511_TICK_SLICES!=='0';
export const controlCoalesceR53=memoryCombatR53&&process.env.CORE511_CONTROL_COALESCE!=='0';
export const boundedClaimR53=memoryCombatR53&&process.env.CORE511_BOUNDED_CLAIM_R53!=='0';
export const R53_CHECKPOINT_START_MS=1500;
export const R53_MEMORY_WINDOW_MS=2000;
const ordinaryAreasR53=new Set(['forest','frozen','black','ancient','sanctum']);
export const normalPlayerR53=p=>Boolean(memoryCombatR53&&p&&ordinaryAreasR53.has(p.area)&&!p.arena_match_id&&!p.instance_id&&!p.instanceId);
export const normalMonsterR53=m=>Boolean(memoryCombatR53&&m&&ordinaryAreasR53.has(m.area)&&m.channel>0&&!m.is_boss&&!m.is_stone);
