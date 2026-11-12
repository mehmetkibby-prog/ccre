import { createPerfR13Features } from './feature-settings-r13.mjs';

// Frozen at the R13 release boundary. Installer explicitly enables verified
// features; absence of an R13 configuration preserves the prior behavior.
export const PERF_R13_DEFINITIONS = Object.freeze([
  { name: 'asyncCombatPending', environment: 'COL_PERF_R13_ASYNC_COMBAT_PENDING', default: false },
  { name: 'cteWriteMetadata', environment: 'COL_PERF_R13_CTE_WRITE_METADATA', default: false },
  { name: 'generatorHttpQueue', environment: 'COL_PERF_R13_GENERATOR_HTTP_QUEUE', default: false },
  { name: 'generatorSnapshotReuse', environment: 'COL_PERF_R13_GENERATOR_SNAPSHOT_REUSE', default: false },
  { name: 'loadlabEmptyReplay', environment: 'COL_PERF_R13_LOADLAB_EMPTY_REPLAY', default: false },
  { name: 'loadlabMonsterRead', environment: 'COL_PERF_R13_LOADLAB_MONSTER_READ', default: false },
  { name: 'loadlabRollbackReads', environment: 'COL_PERF_R13_LOADLAB_ROLLBACK_READS', default: false },
  { name: 'nonlethalRewardElision', environment: 'COL_PERF_R13_NONLETHAL_REWARD_ELISION', default: false },
]);
export const perfR13Features = createPerfR13Features(PERF_R13_DEFINITIONS);
