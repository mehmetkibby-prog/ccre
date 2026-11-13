# R113 engine work — active, not released

User authorization: 13 November 2026. Implement all four structural areas from
`/workspace/coreoflife-mimari-analiz.md`, preserving gameplay and durable ownership.
Branch: `codex/r113-engine-rework`; start: `66af613` (R112 candidate).
Last confirmed production version: R110_HANDOFF1, both realms.
Existing release archives and unrelated untracked evidence are immutable.

## Completion checklist

- [ ] Complete versioned committed results, including deletes and trigger effects;
  eliminate routine full actor/world reload from combat completion. Shadow compare
  with authoritative reads; admission, gaps and recovery retain snapshots.
- [ ] Independent map/shared-arena ownership and independent adventure run queues
  in bounded existing process resources. Preserve shared damage, AoE and transitions.
- [ ] One explicit persistence boundary produces transaction, receipt and complete
  result; separate derived publication without weakening COMMIT or reward guarantees.
- [ ] Independent client read/social traffic, bounded ordered gameplay inputs,
  immediate cosmetic response with authoritative damage and rewards.
- [ ] Crash/replay/epoch/multi-browser/transfer tests, both realms; required full
  suites and realistic offered/completed-load measurements at 10/30/40/50/100.
- [ ] Three repeated representative runs and longer soak; queue age, tick, terminal
  latency, event-loop, GC, RSS and CPU quota recorded, regressions retained.
- [ ] Versioned migration/compatibility/rollback and new immutable installer if
  runtime acceptance is met. Never report a partial implementation as complete.

## Invariants

One authoritative writer; no second RNG draw. Durable commit precedes final ACK.
Idempotent receipts, epochs, access, rewards, inventory and ownership remain checked.
R110 socket readStop/handoff and SQL schema/TEMP invalidations are preserved.
Four public channels and admission limits remain. No live data or credentials in git.
Each independent change has a separate commit.

## Evidence limits

Local machine has a four-CPU quota; live VDS reportedly has eight cores. No live
database or live SSH access is available. Synthetic fixtures cannot establish a
production zero-lag guarantee; these limitations do not stop local implementation.

## Current work

Branch created. Inspecting writer result, resident state, ownership and projection
contracts before implementing the normal-kill vertical slice. No R113 runtime
change or R113 performance result yet.
