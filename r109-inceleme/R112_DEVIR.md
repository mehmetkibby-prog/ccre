# R112 runtime flow — candidate, not confirmed installed

The last user-confirmed live version remains **R110_HANDOFF1**, on Efsane
and Akademi. R111_COMBAT1 was delivered locally; installation was not confirmed.
The active `project/r109_latency_completion/working` tree now contains R112.
Do not confuse either candidate with the installed release.

The new code-only installer is `project/r112_runtime_flow/delivery/r112-akis.zip`,
version **R112_FLOW1**. Its exact digest and target core identity are in
`project/r112_runtime_flow/evidence/package.json`. It accepts the exact pinned
R110_HANDOFF1 or R111_COMBAT1 source, including the retained R110 ingress/cache
files outside the core identity tree. The old R109, R110 and R111 ZIPs and
their digests are unchanged. No production deployment was performed here.

## Changes retained in the candidate

- Two bounded, read-only actor snapshot workers isolate cold actor reads from
  world/job/cursor reads. The global admission/backlog limit remains bounded.
- Actor snapshots are serialized and compressed in the reader; the main game
  process passes an opaque, size-limited envelope instead of rematerializing
  the whole graph. The owning channel validates and decodes it.
- Audited attack/claim holds cover the affected map, participants and the
  transitive party/guild/room recipients. Unknown scopes use the broad path.
  Parent and native reward worker both enforce the same pre/post-write scope.
- Unchanged actors can resume after the durable write audit; changed actors,
  borrowed holds, cross-player writes and the global lease remain fenced.
- Committed shared HP/death publication overlaps the source actor read. The
  final release waits for publication and all required actor refreshes. A
  failed publication triggers recovery; a replaced generation is never touched.
- A scoped-combat checkpoint race found during testing was corrected: an
  outstanding checkpoint must acknowledge before a new committed baseline is
  installed. Failure must not silently erase the pending checkpoint.
- R111 combat wake, chat continuity, bounded diagnostics and compact replay
  changes are included. R110 socket readStop/handoff and SQL cache fixes remain.

## Verification and limits

Use `validation/r112-candidate/summary.json` and its raw referenced files.
`pipeline-final/` is the final-code load/installer/native run. `comparisons/`
contains the earlier alternating R111/R112 comparison, including regressions;
`extras/` predates the final parallel-read change. Do not mix these revisions.

The workload uses synthetic data, real process/HTTP/WebSocket boundaries and a
4-core quota; it is not a sanitized production database or the 8-core live VDS.
Three 30-second windows are retained for each 30-player forest, 40-player mixed
and 30-player shared boss scenario. Additional 10/50/100 Efsane and 40 Akademi
runs are single checks. All pauses count; the control probe is not an excuse
to subtract them. The boss fixture has one boss death per window, so those
three observations cannot establish a reliable tail percentile.

Functional passes do **not** mean the zero-stutter performance target passed.
Inspect raw final-reply latency, visible-death latency, CPU/RSS and worst runs,
including regressions. The exact live two-second incident was not reproduced
or conclusively attributed. Do not claim it has been eliminated on the VDS.

The focused, native, captcha, R110 and R112 check groups were run. Native and
R112 installer/runtime checks were repeated after the final bridge change.
The release still requires both realms and all eight channels, reader health,
realtime handoff, exact code identity and rollback checks. SQLite commit,
ownership, receipts, reward/RNG semantics and persisted formats are preserved.

During development, `selected-attack-mixed.log` caught the corrected checkpoint
race. `pipeline-unit-fixture-syntax.log` records a corrected test fixture typo;
`comparisons/baseline-dependency-fixture-failure.log` records a relocated test
dependency link repaired without changing the R111 baseline code.
