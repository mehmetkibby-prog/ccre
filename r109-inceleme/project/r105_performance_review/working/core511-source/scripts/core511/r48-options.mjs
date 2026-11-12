import {recoveryWatchdog} from './r47-options.mjs';
// Restart-scoped. Disabled preserves the delivered R47 recovery behavior.
export const lateRecoveryProof=recoveryWatchdog&&process.env.CORE511_LATE_RECOVERY_PROOF!=='0';
// Actor-scoped faults never authorize ignoring an unknown durable outcome.
// Disabled retains the R47 actor error propagation paths.
export const actorFaultIsolation=process.env.CORE511_ACTOR_FAULT_ISOLATION!=='0';
