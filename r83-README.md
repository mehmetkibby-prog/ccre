# Core of Life R83: release movement after completed heartbeat work

R82 can leave an actor's durable barrier active solely for the background
heartbeat scheduling RPC, after the native ACK, authoritative refresh, events,
and resource release have completed. Its client does not pipeline movement
behind heartbeat; once the unchanged 600 ms prediction budget fills, the
character visibly stops.

The R83 delta consists of exactly three existing server files:

- `heartbeat-loop.mjs`: detach the already tracked, non-durable scheduling
  promise after the real gameplay completion.
- `shared-combat-channel.mjs`: make the shared heartbeat's after callback
  schedule the same tracked background task without extending the actor barrier.
- `native-http-bindings.mjs`: update only the health version literal to R83.

The maintenance descriptor is captured under the same owner and epoch. It
remains in `HeartbeatLoop.pending`; lifecycle drains still await it. Writer,
refresh, shared completion, ownership, durable outcome and resource guards
remain unchanged. No client prediction limit, command ordering, database schema,
HP, reward logic or native SQL is changed.

## Validation

- 22 actual server-class behavior tests.
- 3 unchanged-client transport/prediction integration tests.
- 68 actual installer tests: 34 lifecycle/recovery and 34 scope/gate tests.
- Syntax checks of all three production JavaScript files.
- Exact byte equality between tested patch substitutions, staged payload and
  the R83 work tree; complete R82 source identity is pinned by its shipped ZIP.

The controlled integration holds only background scheduling for 900 ms. R82
then has 300 ms stationary presentation; R83 has none in each of the three
tested heartbeat paths. This is not a live VDS, native movement physics or FPS
benchmark, and does not establish the reported 13:45:36 incident's cause.

Run the relevant tests with the pinned Node directly:

```bash
r79-audit/runtime/node-v22.23.4-linux-x64/bin/node r83-tests/server-heartbeat-tail.test.mjs
r79-audit/runtime/node-v22.23.4-linux-x64/bin/node r83-tests/client-heartbeat-wait.test.mjs
python3 r83-tests/installer-run.py
python3 r83-build.py --plan-only
python3 r83-build.py
```

The full server cannot be run from this recovered tree because 42 exact current
modules are unavailable. No older versions were substituted. Relevant actual
classes are tested with explicit controlled writer/refresh/scheduling ports;
two pure helper exports are extracted byte-for-byte to avoid unavailable
transitive writer imports. The installer tests use real files, SQLite/WAL,
locks, backups, journals and atomic replacement; system services and account
HTTP are controlled fixtures.

## Excluded reader optimization

`r83-investigation/periodic` contains an **unshipped** 8 ms snapshot-batch
candidate and its investigation evidence. Although it can reply to an early
actor sooner, actual `ColdReadCache` plus SQLite write-heavy fixtures showed
roughly 1.97–2.48 times the total work duration through repeated cache resets.
The original R82 reader queue remains byte-identical in production. Reader
candidate tests and review tests do not count toward the 93 R83 production
validation tests. Do not package that candidate without resolving the measured
regression and validating missing current NativeGameServices dependencies.

## Installation and persistence

The self-contained archive accepts exact R82 only. It preserves maintenance or
registration policy, requires empty actors, uses the correct daily-backup lock,
backs up with SQLite's API, validates quick_check and file identities, and
supports interrupted update recovery. Rollback uses R82 code with the **current
database**. Accounts and the pinned Node/SQLite runtime are preserved.

R82 source core: `7c5ae6d88decda07ae8ab6ad1dca23c16d105a2242ba21ef95172efdd9b15bc7`.

R83 target core: `dddf16515a7061a88b9aa1543b3c692fcc5383f09602e34e31c04c8c7625d172`.

Unchanged R82 HTTP: `286e89f0b37a46ef79c5b7fead2b20341fac9025ae79a9a814e2049208f07662`.

This work produces a reviewable package and source branch. It does not deploy
the game or claim the user's live lag and persistent dead character are fully
resolved. Authenticated incident diagnostics and the read-only durable death
snapshot requested earlier have not been returned.
