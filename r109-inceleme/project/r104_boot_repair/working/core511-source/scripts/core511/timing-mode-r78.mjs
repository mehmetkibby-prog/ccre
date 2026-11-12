// Only callers which discard per-query detail use this opt-in. LocalDatabase's
// queue/job/commit/fsync durations and all explicit SQL diagnostics stay intact.
export function stageOnlyTimingR78(){return {[Symbol.for('coreoflife.writerStageOnly.r78')]:true};}
