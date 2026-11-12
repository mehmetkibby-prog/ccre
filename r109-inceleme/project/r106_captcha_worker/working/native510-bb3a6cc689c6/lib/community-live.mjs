// Absolute, server-confirmed counters only. HTTP and both realtime transports
// may arrive twice or out of order; none of them may undo earned progress.
const count = value => Number.isSafeInteger(value) && value >= 0;
export function applyCommunityProgress(current, patch) {
  if (!current || !patch || typeof patch.id !== 'string' || !count(patch.total)) return current;
  let changed = false;
  const runs = current.runs.map(run => {
    if (run.id !== patch.id) return run;
    const total = Math.max(run.total, patch.total);
    const personal = count(patch.personal) ? Math.max(run.personal, patch.personal) : run.personal;
    const completedAt = run.completedAt || (count(patch.completedAt) ? patch.completedAt : 0);
    if (total === run.total && personal === run.personal && completedAt === run.completedAt) return run;
    changed = true;
    return {...run, total, personal, completedAt};
  });
  return changed ? {...current, runs} : current;
}
export function mergeCommunitySnapshot(current, incoming) {
  if (!incoming) return current;
  if (!current) return incoming;
  // Only a newer full snapshot owns list membership (including cancellation).
  const newest = (incoming.sampledAtMs ?? incoming.serverTime * 1000) > (current.sampledAtMs ?? current.serverTime * 1000);
  const other = new Map((newest ? current : incoming).runs.map(run => [run.id, run]));
  const base = newest ? incoming : current;
  return {...base, runs:base.runs.map(run => {
    const old = other.get(run.id);
    if (!old) return run;
    const config = old.revision > run.revision ? old : run;
    return {...config, total:Math.max(run.total,old.total), personal:Math.max(run.personal,old.personal),
      completedAt:run.completedAt || old.completedAt,
      claimed:[...new Set([...run.claimed,...old.claimed])].sort((a,b)=>a-b)};
  })};
}
