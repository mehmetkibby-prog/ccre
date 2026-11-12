// Each flag independently restores the delivered R51 path when set to 0.
export const nativeRewardWorksetR52=process.env.CORE511_NATIVE_REWARD_WORKSET!=='0';
export const actorSectionReuseR52=process.env.CORE511_ACTOR_SECTION_REUSE!=='0';
export const rewardRecoverySchedulerR52=process.env.CORE511_REWARD_RECOVERY_SCHEDULER!=='0';
export const compactCombatIpcR52=process.env.CORE511_COMPACT_COMBAT_IPC!=='0';
export const retaliationDueQueueR52=process.env.CORE511_RETALIATION_DUE_QUEUE!=='0';
export const aggroSpatialIndexR52=process.env.CORE511_AGGRO_SPATIAL_INDEX!=='0';
export const mixedParticipantFastpathR52=process.env.CORE511_MIXED_PARTICIPANT_FASTPATH!=='0';
