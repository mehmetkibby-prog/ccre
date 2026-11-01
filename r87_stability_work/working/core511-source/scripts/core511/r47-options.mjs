// One restart-scoped switch; 0 retains R46 presence and diagnostic behavior.
export const presenceStaleSkip=process.env.CORE511_PRESENCE_STALE_SKIP!=='0';
// The original R47 switch remains a master R46 fallback. This second switch
// can disable only the recovery extension while retaining presence isolation.
export const recoveryWatchdog=presenceStaleSkip&&process.env.CORE511_RECOVERY_WATCHDOG!=='0';
export const checkpointBatches=presenceStaleSkip&&process.env.CORE511_CHECKPOINT_BATCHES!=='0';
