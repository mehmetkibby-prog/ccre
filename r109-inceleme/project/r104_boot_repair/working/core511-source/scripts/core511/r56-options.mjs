// Experimental R56 performance switches. Default off until acceptance.
// Zero preserves the delivered R55 scheduling and gameplay behaviour.
export const refreshReadPipelineR56=process.env.CORE511_R56_REFRESH_READ_PIPELINE==='1';
export const auditGateR56=process.env.CORE511_R56_AUDIT_GATE==='1';
export const nonlethalRewardsR56=process.env.CORE511_R56_NONLETHAL_REWARDS==='1';
export const rewardSliceR56=process.env.CORE511_R56_REWARD_SLICE==='1';
export const bulkHitsR56=process.env.CORE511_R56_BULK_HITS==='1';
export const resourceBatchR56=process.env.CORE511_R56_RESOURCE_BATCH==='1';
export const xpGroupR56=process.env.CORE511_R56_XP_GROUP==='1';
export const rewardWarmupR56=process.env.CORE511_R56_REWARD_WARMUP==='1';
export const claimScopedDrainR56=process.env.CORE511_R56_CLAIM_SCOPED_DRAIN==='1';
export const claimActorJoinR56=process.env.CORE511_R56_CLAIM_ACTOR_JOIN==='1';
export const completedClaimR56=process.env.CORE511_R56_COMPLETED_CLAIM==='1';
export const smallGroupEagerR56=process.env.CORE511_R56_SMALL_GROUP_EAGER==='1';
export const workerWindowR56=process.env.CORE511_R56_WORKER_WINDOW==='1';
export const rewardReadCacheR56=process.env.CORE511_R56_REWARD_READ_CACHE==='1';
export const mistConfigCacheR56=process.env.CORE511_R56_MIST_CONFIG_CACHE==='1';
export const potionActorJoinR56=process.env.CORE511_R56_POTION_ACTOR_JOIN==='1';
export const sectionReadGroupR56=process.env.CORE511_R56_SECTION_READ_GROUP==='1';
export const shortWriteWindowR56=process.env.CORE511_R56_SHORT_WRITE_WINDOW==='1';
export const smallRewardCompleteR56=process.env.CORE511_R56_SMALL_REWARD_COMPLETE==='1';
