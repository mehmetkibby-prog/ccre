// Independent switches. Diagnostics are opt-in; flag 0 retains the R50 path.
export const stageTimingR51=process.env.CORE511_STAGE_TIMING==='1';
export const largeLocalAoeR51=process.env.CORE511_LARGE_LOCAL_AOE!=='0';
export const attackRowBatchR51=process.env.CORE511_ATTACK_ROW_BATCH!=='0';
export const aggroScopeCacheR51=process.env.CORE511_AGGRO_SCOPE_CACHE!=='0';
export const inputWorkBudgetR51=process.env.CORE511_INPUT_WORK_BUDGET!=='0';
export const combatSizeAccountingR51=process.env.CORE511_COMBAT_SIZE_ACCOUNTING!=='0';
export const localDeathBatchR51=process.env.CORE511_LOCAL_DEATH_BATCH!=='0';
export const claimHistoryR51=process.env.CORE511_CLAIM_HISTORY!=='0';
export const coldRowCopyR51=process.env.CORE511_COLD_ROW_COPY!=='0';
export const mixedParticipantIndexR51=process.env.CORE511_MIXED_PARTICIPANT_INDEX!=='0';
export const localMixedTargetLimitR51=largeLocalAoeR51?2023:1024;
