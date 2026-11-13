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

Normal-kill vertical slice implemented. Durable revision + complete private
replacement sections travel in the existing receipt-backed result. The native
reward/RNG handler remains authoritative. Full cold reads recover version gaps
and unknown effects. Initial scope: attack/PvP/retaliation/reward; extending all
relevant paths and independent ownership remains outstanding.

Checks: 3 focused committed-result tests pass (full snapshot parity including
rank, gear and deletes; transaction rollback; revision-gap rejection). A real
four-channel process test passes: ordinary death needs zero cold actor reads,
resident XP matches SQL, retry has one receipt and no second reward.

Fixture failures retained in validation/r113-engine: archived channel fixture
lacked kadim_tower_settings; first process fixture lacked adventure_monsters.
The new test uses explicit schema setup and character selection, and awaits the
final killed event, not the already-existing speculative 202 response. No R113
performance claim yet.

Independent adventure scheduling now permits four disjoint run transitions per
channel, with per-run ownership and actor-specific drains. Native tower/mist
rules and committed-death process checks pass (7 tests); scheduling isolation
and eligibility parity pass (6 tests). The first parity run failed because a
refused scheduled portal continued into room scanning; original refusal ordering
was restored. This does not yet partition the global shared-combat owner.

Preliminary 10-player forest run (15 s, four-CPU quota): tick p99 9.11 ms,
no main/channel pauses over 50 ms, confirmed death p99 188.33 ms (17 kills).
This small single run does not meet or establish the final 40-player target.

Second committed-result slice: owner-fenced immutable image storage for large
fan-out, in the same SQLite transaction as rewards and revision. Command receipts
remain below their original 256 KiB ceiling. Images expire through bounded idle
maintenance; missing images recover through snapshots without replaying rewards.
Foreign shared recipients consume committed images; shared HP/contribution images
can also bypass post-COMMIT world boot reads. Native actions/adventure steps now
enter the audited producer. Scope/area changes and unknown tables still recover.
The main loop no longer imports the producer via the consumer module. Atomic
image rollback, ownership fencing, retention and size tests pass; real ordinary
death, shared release and maintenance regressions pass. Cross-map integration
and realistic load gates remain outstanding.

Shared map ownership now uses bounded per-area native signed authorities and
parent relation reservations. Different maps can progress together; overlapping
party/guild/recipient sets remain ordered. World-ending boss/global operations
retain an exclusive all-map barrier. Channel holds are keyed by token and checked
for actor overlap. Scoped reloads/checkpoints preserve other maps' dirty HP and
contributions; respawn and regeneration operate on unlocked targets. Unknown
outcomes retain leases until actual owner recovery. 14 existing shared tests,
5 partition/process tests, and the later 15-test catalog/partition/respawn set
pass. No final architecture acceptance claim yet.

First 40-player mixed 30 s run passed gameplay invariants, but FAILED latency
acceptance: tick p99 22.73 ms; final death p99 258.51 ms (143 kills), max 263.94;
main >50 ms pauses 3, channel 2; main ELU 39.20%, total RSS 1.59 GB. This improves
death delivery versus R112's three-run median 371.41 ms, but ELU regresses from
25.09%. Single-run comparison only. Full catalog reads in committed capture were
removed after this measurement; the first catalog test incorrectly disallowed
bounded profile joins as well, then was narrowed to the actual full SELECT.
Main-thread result construction still needs measured offload/optimization.
