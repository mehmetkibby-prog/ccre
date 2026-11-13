# R113 engine work — active, not released

Latest state (13 Nov, 12:33 UTC): final runtime commit `8caf54d`, core
`41fb08d699eafa8d8e0f3a1da64b2d8c465f7fc7fce4b1b90f4d71569972ce94`.
Exactly50-player boss/mixed confirmation passed all six functional runs.
Latency target remains PARTIAL, not zero-lag. See the final continuation below;
older measurements and their unfinished-stage notes are historical, not current.

User authorization: 13 November 2026. Implement all four structural areas from
`/workspace/coreoflife-mimari-analiz.md`, preserving gameplay and durable ownership.
Branch: `codex/r113-engine-rework`; start: `66af613` (R112 candidate).
Last confirmed production version: R110_HANDOFF1, both realms.
Existing release archives and unrelated untracked evidence are immutable.

## Completion checklist

- [x] Complete versioned committed results, including deletes and trigger effects;
  eliminate routine full actor/world reload from combat completion. Shadow compare
  with authoritative reads; admission, gaps and recovery retain snapshots.
- [x] Independent map/shared-arena ownership and independent adventure run queues
  in bounded existing process resources. Preserve shared damage, AoE and transitions.
- [x] One explicit persistence boundary produces transaction, receipt and complete
  result; separate derived publication without weakening COMMIT or reward guarantees.
- [x] Independent client read/social traffic, bounded ordered gameplay inputs,
  immediate cosmetic response with authoritative damage and rewards.
- [x] Crash/replay/epoch/multi-browser/transfer tests, both realms; required
  suites and synthetic offered/completed-load measurements. Latest user scope
  is ONLY50 players; older10/30/40/100 results are historical. Final package
  checks are recorded below as they complete.
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

13 Nov, continuation (HEAD f01ef17; no R113 delivery):
- Worker boundary now covers scoped attacks and existing solo/group dungeon
  commands/checkpoints, plus ordered adventure_step through the same exclusive
  writer FIFO. Native ownership/resource/RNG/receipt checks run in the worker;
  before/after-COMMIT crashes prove rollback/exact replay (4 process cases).
- Complete committed private actor images are encoded once by the writer;
  parent caches/receipts retain text, owner channel decodes and validates it.
  11 image/parity/death/crash tests pass. Large images still use the atomic
  owner-fenced store. Scope changes and unknown tables retain snapshot recovery.
- Serialized RPC command replies replace resolved object graphs after the
  existing wire serialization. No second getter evaluation, no replay execution,
  identical sequence/fingerprint/retirement; 15 IPC tests pass.
- Negotiated two-combat input window keeps execution order and durable barriers;
  independent social/read requests proceed. 53 client/server ordering, rate,
  reconnect and legacy tests pass. Archived R20/R21 fixtures were already failing
  before this change (baseline log retained): old capability list, missing state
  read adapter, old prediction timing and double-sent movement were corrected.
- Committed public action replies can publish between ticks; no extra AI,
  movement or RNG tick. Later pending actions cannot hold earlier final replies;
  quiescence waits actual socket enqueue. 4 targeted + 7 process/latency checks pass.
- Rebuilt only transport and rewired the exact current game/portal; old R102+
  HUD, skills, account/entry changes remain. New immutable asset namespace.
  Actual Chromium game + production socket handoff + lost tower stream recovery
  passed (4 checks) on r1. First browser attempts exposed missing Chromium path,
  double namespace in the test stager, and forest fixture lacking bazaar entry;
  fixed fixture/stager, failures retained. r2/mobile remains to run.

Performance evidence (single 30s, 4-CPU quota, synthetic, not acceptance):
- review-20261113043851-40: worker expansion initially REGRESSED mixed40 to
  tick p99 37.18ms, final death p99 392.05ms, main >50ms 9, channel 30.
- review-20261113045159-40: cached SQL + system worker: tick32.38ms,
  final death462.46ms, main >50ms6, channel11. Failed.
- review-20261113050621-40: encoded images, forest40: tick17.77ms,
  final death361.23ms, main >50ms1, channel2. Failed final-death target.
- review-20261113050853-40: wire retention mixed40: tick25.56ms,
  final death287.52ms/max534.54ms, main >50ms1, channel4, ELU31.28%.
- review-20261113051154-40: stage-instrumented mixed40: tick21.77ms,
  final death239.57ms, main >50ms3, channel0; diagnostic run, not acceptance.
  Main COMMIT p99<1ms, actor-checkpoint queue p99~76ms; worker job p50~20ms,
  p99~55ms. Final result publishing between ticks added after this measurement.
No zero-lag claim, no installer built, no live deployment. Required full suites,
real two-map adversarial concurrency, 3x representative runs, 100/admission-safe
r2 tests, arrival/backlog observations, longer soak, migration/rollback remain.


## Continuation through 13 Nov 06:10 UTC

HEAD f0fd639 plus new UNCOMMITTED R113 migration drafts. All live archives remain immutable.
- Full npm test 57, native 29, captcha20, R110 installer/runtime3 passed BEFORE latest worker+codec changes. Rerun appropriate full suites on final runtime. `npm run test:r113` added (new engine cases + transport/settlement/wire).
- Open independent 950ms combat offers now record slots/offered/dispatched/completed/backpressure, and use authoritative skill cooldownRemainingMs without slowing offer clock. Unit2 passes. Strict 429>2s was retained as failure; two skill rejections in earlier staged measurement remain recorded, harness fixed to respect native execution-based skill cooldown.
- aae8c64 moved bounded claims and potions on supported combat maps to sole worker. First mixed test caught `settlement_monster_unlocked`: parent preflight checked OLD encounter before joined journal CAS. 2d4a2c0 corrected exact native ordering (native worker join still validates ALL retaliation resources after CAS). New actual stale-journal test returns safe409, consumes no potion, no unknown outcome. Failed run retained review-20261113054005-40.json and open40-private-worker.log.
- 9f22112: actual two-map/four-process test holds forest lease while frozen death commits, then forest completes, both XP/receipts replay exactly once. Passed. Older settlement test fixtures needed current tower/adventure/content/bag schema and transient event replay expectation; all original guard/trigger checks still asserted. Combined11 pass (worker-and-maps-final.log).
- fc30cdb: one-time bounded actor image compression inside writer; opaque through parent, decoded only owning channel. z1 byte length + SHA256 + deflate level1, <=1MiB expanded; plain JSON fallback/backward compatibility. Indirect-store uses same self-contained image. Corruption/inflation/parity/crash10 pass. No weakened receipts or reward checks.

Latest measurements synthetic4CPU quota, no live DB, no concurrent heavy work:
- review-20261113053317-40 open mixed30s before private-worker: tick99 22.94; final death99 229.62/max265.47; main>50=1, channels=1; ELU27.16%; no errors.
- review-20261113055023-40 open mixed30s after fixed private-worker: tick99 18.26,max29.26; final death99 304.34/max372.15 (2 black/rune shared deaths); main>50=1,ch0; ELU21.22%; no errors. GCmajor26.7/control13.6.
- review-20261113055651-40 diagnostic STAGES enabled + packed images: tick99 29.76; death99 175.82/max178.89, BUT two invalid skill cooldown offers (failed run). Canary92ms and GC38ms. Do not count as accepted.
- review-20261113060032-40 open mixed60s after cooldown harness fix: passed/no errors; tick99 18.98/max41.87; final death99 178.82/max229.59; main>50=2,ch2; ELU25.20%; control54.95. Not full acceptance (rare pauses remain).
- review-20261113060335-30 open forest60s: no errors, tick99 18.5,death99 227.6; main>50=12,ch10; ELU15.14; control64.42/one>50; GC21.4/23.1 major; main_write_group max90.3; NO cgroup throttling, host aggregate CPU steal increased1804 ticks. Most stalls first10s but raw whole window retained.
- review-20261113060503-50 open mixed60s: no errors,tick99 24.8,death99 278.5; main>50=6,ch10; ELU36.33; control76.15; GC23.4. FAIL pause objective.
- review-20261113060633-100 open mixed60s: no errors,tick99 46.1,death99 741.6; main>50=39,ch15; ELU69.37; control67.04; GC87.6/34.0. NOT accepted capacity.

Active matrix session30322 now finishing r2 40mixed60s (first three30/50/100 finished). No other heavy job. Runtime frozen during measurement. Next: profile current main/SQL scheduling to locate residual long stalls; do not blame host solely or declare completion. Repeated runs/long soak, full tests and r2 mobile browser still pending.

Packaging drafts: copied R112 deployment/modules into project/r113_engine; these STILL HAVE R112 constants/contract and MUST NOT BUILD/RUN as R113 yet. New derived-migration.mjs and tests/derived-migration.test.mjs are drafted but UNTESTED. Two additive derived tables only; consistent scoped SQLite backup checked with same Node engine, hashes, file identity, strict schema; original player tables never copied/restored. R110 rollback must RETAIN compatible derived tables, not restore stale progress. Must integrate journal/backups/validate_record/asset graph/newhealth/newbuilder and tests. Old code-only installer is NOT suitable unchanged.


## Continuation through 13 Nov 06:52 UTC

HEAD f24cbd3 (plus uncommitted browser-test/harness changes). Runtime core identity
82003e4f54b57051ad5393997ff497dd0615dea64ad3b8a211eeadf14af2e48e.
Still NOT live, NOT performance-accepted. R113 candidate ZIP now exists under
project/r113_engine/artifacts; current exact path/hash in evidence/package.json.
No old ZIP modified. Do not call it production ready yet.

New independent commits:
- e11df8f: reconnect replay of compact+compressed monster rows now passes actual
  expanded wire byte count to the existing bounded decoder; 14 tests passed.
- c2d2962: generic IPC reply compression uses bounded async libuv deflate (4 jobs,
  2 MiB outstanding, plain bounded frame under pressure/failure). Immutable JSON
  replay saved before awaiting; no sync compression on main reply path. 19 pass.
- 1789107: R113 health requires schema initialized and live acknowledged worker;
  reports engineRework/engineReadyR113. 7 schema/health tests passed.
- 8dd5f05: additive two-table migration with consistent scoped backup, same Node
  SQLite integrity verification, file identity, before/after-COMMIT crash tests.
- 0fe9c70: map fixture moved to target area BEFORE admission; earlier full run
  caught its raw SQL teleport retaining old forest encounters (encounter_scope).
  Guard preserved, corrected fixture passes. Soak summary supports 200k samples.
- f24cbd3: R113 installer/build/rollback. Exact R110 source only. New frontend
  namespace includes admin as well as game, bridge and portal. Backup covers
  derived tables and changed code. Rollback retains derived tables/actual player
  progress. 8 installer + 3 real relocated runtime/handoff checks passed. Two
  real realms/eight channels expose engineReadyR113. R2 mobile tower browser
  passed (4 checks), log browser-r2-mobile.log.

Full checks after current runtime: npm test60, native29, captcha20, R1103,
R1123 pass (plus each installer suite). R113 first run108/109 due invalid
fixture above; corrected full repeat109/109 passes. Raw failure retained.
Logs final-test*.log, final-test-r113-repeat.log. Do not hide first failure.

Last runtime measurements (async compression, before health metadata only):
review-20261113062130-40.json open mixed60s, no errors: tick99 16.86ms;
finaldeath99 192.70ms/max294.26; main>50=2, channels0; ELU25.20%; control31ms,
main GC major44.8ms. NOT full pause/terminal acceptance.
review-20261113062539-40.json diagnostic STAGES60s: tick99 23.08,death99
279.58, main>508/ch6, control96.7. Preflight p9953ms includes wall. No claim
that control coincidence proves game work is innocent.

Current active: browser test session15851, log browser-three-transports.log.
Original three-full-portals attempt failed because synthetic extra account
redirected through accounts realm bootstrap; retained browser-three-accounts.log.
New test keeps primary real portal/HUD and two separate actual Chromium storage
contexts running exact distributed browser transport; three distinct accounts,
same IP, separate tower runs. Synthetic identity fixture only. Verifies other
two floors advance while first drops inbound messages, then first recovers.
No runtime changes from these browser tests. Changes in tower-browser.mjs and
new tower-browser-multi-r113.mjs uncommitted. Check result before commit.

population-load.mjs now tolerates absent committed-result metrics on R110 to
allow a controlled baseline (uncommitted). Current staged baseline paths:
R110 /tmp/r110-installed-z6bx_n2g/release; R112 /tmp/r112-installed-23x4mty8/release.
Use STUTTER_TREE and CLIENT_TREE overrides via run.py. No performance run active.
Next: verify multi-browser; controlled R110 vs R113 same offered load; repeat
30/40/50 at least3 each; 10/100/r2/boss; sustained forest soak30min. No heavy
parallel jobs during measurement. Core frozen for accepted measurement.
Then finalize evidence/installer acceptance only if justified. No fabricated
zero-lag/live guarantee. No live DB or SSH available, local CPU quota4 vs live8.

06:55 continuation: all functional test jobs finished, including corrected full
R113109/109. HEAD acea64e after3cafb56 real three-browser success. Three distinct
Chromium cookie/storage contexts now ALL use full portal/HUD, same IP and normal
manual combat. First browser drops inbound messages, other two tower runs advance,
first recovers without replay/F5. Log browser-three-valid.log, actual report
browser-r1-hud-engine-r113-three-browsers-valid/report.json. Earlier failures were
fixture session hashes (hex vs required base64url) and an incorrectly pre-seeded
presence instance; fixed fixtures, no runtime access rule changed.
Active baseline test session92177: R11010mixed60s open/control. Overrides
STUTTER_TREE=/tmp/r110-installed-z6bx_n2g/release and CLIENT_TREE same.
Log r110-open10-first.log. Wait result then proceed sequential performance matrix.

07:00: the full valid three-portal/HUD browser run passed5 checks. Current active
performance matrix session57217, log validation/r113-engine/performance-matrix.log.
Runner project/r113_engine/tests/performance-matrix.py sequentially measures paired
R110/R113 mixed40/10/50/100 three repetitions, R113 forest30/40 three repetitions,
r2 mixed40, shared boss10, then40forest30min soak. Index and raw results copied to
project/r113_engine/evidence/matrix/. No other heavy tasks or runtime edits during
matrix. This is ~80minutes; keep user informed with concrete results everyminute.
R11010mixed60s preliminary succeeded: review-20261113065446-10.json tick99 9.06,
terminaldeath99 151.49, main>50=1,ch4. Same current offered-load harness works on
exact R110 source. A successful load process is not a latency acceptance pass.
Runner stops on R113 functional failures; inspect/fix before resume. Preserve ALL
raw failures. No deployments performed. Latest code HEAD acea64e; new matrix
script and WORK_STATE updates uncommitted. Must still decide acceptance using
actual data; do not present current candidate as ready by default.


## 2026-11-13: remaining writer delay investigation after user status question

The initial matrix was paused after two complete 40-player R110/R113 pairs and the first mixed 10/50/100 pairs + forest30/40. The current child completed normally; its raw result was copied into matrix/index.json before the stopped parent was terminated. No candidate acceptance claim. Full first matrix remains under evidence/matrix (12 runs; pause.json records why). Second mixed40: R110 death p99 350.8ms vs R113 236.6ms; R113 main pauses6, still outside target. First mixed100 R113 death p99 1132ms vs R110770ms is a retained regression.

Worker-specific diagnostic added in commit51e78e2 using NodeWorker inspector attachment. It profiles the EXISTING worker; no production IPC or handler altered. Raw: project/r109_latency_completion/evidence/r113-writer-forest40-40.writer.{cpuprofile,heapprofile}. In ~30s worker sampled work ~5s; committed capture inclusive2.71s, encoding346ms self/70.39MB allocation, dungeon wire223ms/35.25MB, synchronous zlib235ms. Main-only profiles had hidden this serial writer cost. First attempted profile through scripts/load.py had profiling forcedOFF by that wrapper; its raw remains review-20261113071610-40.json and must NOT be called a sampled profile. The later direct-run diagnostic is r113-remaining-forest40-40.*.

9f4cfa0: capture shared dungeon settings once per outcome (same SQL transaction), compact encode once, consumer reinjects into complete actor images. Original11tests + party recipient test passed. First nonprofile forest40 raw review-20261113072813-40.json: passed, tick99~16ms/death99~248.6ms/main>50=6/controlmax104.3ms; NOT acceptance and not a speedup claim.

cb00741: versioned immutable configuration point. Compare complete current SQL rows (game/combat/dungeon/tower) inside caller transaction, normalize only on exact row change, immutable content SHA256 reference. Actor outcomes carry only reference. Resident channel retains its full configuration from boot/full snapshots; mismatch/missingref returns false before any actor mutation and uses existing authoritative cold refresh. ResidentDungeon avoids repeated clone for same exact validated settings digest. Same revision changes and SQL rollback tested. Cold/full snapshot format unchanged. ReadActorBundle includeDungeonSettings flag defaultsTRUE; only committed publication omits it. This is additive internal receipt metadata; no gameplay reward logic changes.

Settings-ref tests:10runtime/committed tests passed on first run; 2 new small unit tests initially failed because their synthetic tower config was invalid `{}`. Fixed fixture to use actualTOWER_DEFAULTS; both pass. Original tower validation unchanged. Logs settings-ref-tests.log (retained failures) and settings-ref-fixture-corrected.log (pass). Full suites must rerun after this change.

IMPORTANT: existing R113 artifacts/package.json describe the PREVIOUS core hash82003e4... and are now stale. Do not deliver them. Candidate must rebuild with reviewed dungeon-runtime and dungeon-settings-point module, new proof/hash and new immutable ZIP after validation. Current runtime commitcb00741. Worker after profile is running as settings-ref-writer40 (session65895); no other heavy jobs.

Worker profile after cb00741 completed: r113-settings-ref-writer40-40.*. Functionally passed. Before/after diagnostic sampled worker work5054→4618ms/30s; committed capture2711→2300ms; sampled allocation472.9→392.6MB; jobmedian38.8→32.1ms. Deathp99 regressed231.4→280.4ms while independentcontrol22.1→91.5ms; retainboth, NOend-to-end acceptance claim. Full R113suite now running (session uses full-after-config-ref.log). Original initialmatrix has12complete rows.

cb00741 fullR113suite113/113passed (full-after-config-ref.log). An actual synthetic image sample (/tmp/r113-synthetic-actor-image.json) then exposed TWO remaining identical towerInfo.config copies:11.7KBof25.8KB/actor. c887a77 makes readAdventureBundle skip only current towerInfo.config for committed publication; channel restores it from SAME verified configuration reference in both private bundle and public adventure511. Run-specific stored run.config and inventory remain intact. Focused12/12pass (tower-catalog-ref-tests.log).
Workerafterprofile r113-tower-ref-writer40-40.*: functionaltrue; sampledworker3874ms vsinitial5054ms(~23%less), capture1771vs2711ms, allocation328.8vs472.9MB(~30%less),231vs239jobs. Jobmedian30.9vs38.8ms; diagnosticdeathp99215.2vs231.4ms; main>50=2,control38.9ms. Profile instrumentation still enabled: NOT acceptance. No-profileforest40/60s nowrunning tower-ref-forest40.log. No heavyworkinparallel.
performance-matrix.py now supports --output, --primary-only, and STOP file checkedbetweenruns. Originalpartialresultsremainuntouched. Primary-onlydoes3pairedR110/R113mixed40plusR113forest30/40 (12runs). Latestsourcec887a77;no rebuiltZIPyet.

Latest unprofiled forest40 run (c887a77) completed: raw review-20261113074557-40.json,
60s, functional=true, tickp99=14.37ms, finaldeath p50=73.45/p95=144.86/p99=172.18ms,
max211.52ms, 149 deaths, main>50=2, controlmax51.3ms. No acceptance claim.
Full contract/build/installer sequence is session22129; log
validation/r113-engine/final-contract-checks-corrected.log. focused/native/captcha/
r110 passed; r112 currently running. The initial command used unknown check group
`test`; corrected to `focused` (npm test mapping); initial failure retained.
No performance matrix active. Next browser checks then fresh matrix-c887a77.

Session29467 is queued behind22129 (waits PID266555 exit AND requires log ending
INSTALLER END0). It then runs actual three full Chromium portal/HUD contexts on
r1 and mobile r2 using current core and unchanged staged assets, then starts NEW
primary-only matrix-c887a77 (12 runs). Logs browser-and-primary-sequence.log,
browser-current-r1/r2.log. Source identities are now frozen in matrix manifest;
helper committed18a387d. No runtime changes sincec887a77. Do not run any extra
heavy task while this sequence reaches the performance matrix.

22129 finished: all six contract groups pass; R113113/113, installer8/8,
actual relocated runtime3/3. New immutable artifactR113_ENGINE_9b8cf7052cdc.zip,
sha25627ebf093166b62ff3b9c8ad4a457c2a21fe49c76e43c6ce15266fbea19e57b14,
core51cb40ab2d8cccd69d4e7b9b05350337d80934aa042086cfc19aa8772505a044.
code_contract committeded2d89d. Package still acceptancepending/notdeployed.
Queued29467 stopped at first browser: assert(instance) fired after HUD shell
visibility but before successful join had been recorded; report afterward shows
same user joined200, no native/client errors. Fixture now explicitly awaits
recorded200admission up to10s (no runtime bypass); commit0840cbe. Originalfailure
retained browser-current-r1.log/report. New sequential browser+primary launched
in browser-and-primary-repeat.log, different preview/report names.

Browser repeat succeeded: r1threecontexts5checks, r2mobile4checks. Primarymatrix
was deliberately stopped BEFORE first run (STOP file) to first probe rapid
farming: standardforest has ~615attacks/60s among40 and many no-target slots.
Existing POPULATION_FARM_STRESS fixture gives each actor a separate low-HP pocket
without cadence/reward/AI/respawn bypass. Matrixhelper6c846fb adds --farm-probe;
R110/R113farm40pair now running validation/r113-engine/farm-probe.log, output
evidence/farm-c887a77. Primarydirhasmanifestbutnoindexyet; removeSTOP and resume
aftercheckingfarmresults. No source/perf changes sincec887a77.

Farm40probe completed, both functionaltrue. R110541deaths/p99268.63ms/main>50=5;
R113543deaths/p99215.07ms/main>50=2. Control56.8vs12.6ms; retain rawresults.
Candidate main GC49.9ms coincided with one >50pause; other76mspause not GC.
Diagnosis-only densefarm30s (r113-dense-farm-diagnostic-40.*) main+workerCPU/
allocation profilescompleted, functionaltrue. Main sampledallocation~570MB,
worker~952MB. Workerjobmedian15.7ms/p9959ms; mainRPC JSON/fingerprints/replay +
SQL read result allocation scattered; no justified new runtime change fromthis
measurement. NO diagnostic result usedasacceptance. Runtime stillc887a77.
STOP removed frommatrix-c887a77; full sequential matrix (same frozen runtime)
nowstarted in validation/r113-engine/matrix-current.log, including bothversions
10/40/50/100x3, forest30/40x3, r2,sharedboss and30minsoak. No otherheavyjobs.

Current active full matrix session18462. Candidate core51cb40ab... frozen, HEAD
6c846fb (only harness/build/test commits since runtimec887a77). First R110mixed40
completed: deathp99290.52ms,tickp9925.65ms,main>50=2,control66.16ms,functionaltrue.
NextR113mixed40running. Do not run other heavy work or alter runtime. Matrix now
will take ~80min including30minsoak unless real failure/new concern justifiesSTOP
at boundary. Latest build and both browser checks passed, only earlier browser
fixture race was fixed. No deploy or delivery yet; performanceacceptancepending.

Readonly review duringmatrix found small cleanup omission: ResidentChannel
commitRevisionsR113 map is set on applyBundle but not deleted in detach(id) or
retirement path aroundresident-channel.mjs:131. Owner checks prevent staleapply,
and admission overwritesrevision, but retainment across unlimiteduniqueplayers
shouldbe fixed afterfrozenmeasurements (notduring). Add focusedleave/rejoin test,
commitseparately and rebuildnewimmutableartifact; donotforget. Not a measured
30/40hotpathbottleneck and not an explanation for currentlatency.

Firstcompletepairedmixedruns oncurrentcandidate: 40deathp99290.5→139.9ms,
tick25.6→16.0,main>502→2; 10death158→96,tick9.23→9.36,main>501→0;
50death472.5→218.2,tick25.1→23.1,main>503→3;
100death860.1→582.1,max2109.7→1003.1,tick56.0→42.7,main>5012→11.
Allfunctionaltrue; NOTzero-lagor100capacityacceptance. MainELU10064.0→59.2%.
Forest30/40andremainingtwo repetitionsnowcontinue in18462.

CRITICAL: fullmatrix18462STOPPEDAUTOMATICALLY on18thrun, R113mixed100repeat2
functionalfalse. errors: actor81solo chat HTTP500 permanent_actor_fenced. No
nativefaults; allsettled. p991241ms,main>5054; cgroup52throttledperiods/1.49s,
control82.9ms. Prior17runsretained. No workloadcurrentlyrunning.
Root: NativeHttpAction.chat continuity path c.serial→reauthorize→
c.permanent.assertAvailable([actor]) races independent background permanent
holds (likely solo phase). Existingchat tests nevercover temporary permanent
entry. MUSTfix via bounded pre-execution wait OUTSIDE c.serial, reauthorize
freshafterwait; NEVERretry native operation afteritstarts or relaxownership.
Unknown/stale/closedfencesmustremainblocked. NeeddeterministicrealHTTPtest.

USER NEW STEERING duringthisfailure: 'Yagu sabah6tan beri... Daha büyük...'
then 'Oyun gerekirse baştan sona değişsin veya çok uzun sürsün ... tümkuralları
unut ... netiş'. Broadarchitecturalauthorizationreaffirmed, NOrepeatpermission.
Userstillwantsrealrootfix; do not interpretfrustration aslicense to corrupt
rewards/data/removeguards. Responded: improvementnotgoal; fullcharacterdata
stillrebuiltpercommit andmainprocess relays it. Promised implement truechanged-
data publication and moreindependentpersistence path, fixchatfirst. Longmatrix
alreadyhalted; DO NOTrestart80minmatrix onknownout-of-targetcandidate. Source
stillc887a77runtime, HEAD6c846fbharness. ExistingR113ZIPcandidate NOTready.
Needdeeperimplementationbeforefreshacceptance. Useracceptsnecessarylongtime.

2026-11-13 continuation after user reauthorized deep rewrite:
- 4f664ef chat temporary freeze waits OUTSIDE c.serial with reauthorization,
  native callback never replayed. Before regression failed; after chat5/5 and
  permanent-control8/8 passed. Extra old native-permanent-process fixture failed
  missing adventure schema, explicit channel selection, then missing archived
  guild-village bundle. Those incidental native test edits were restored, no
  fake pass. Raw logs chat-freeze-after/native-permanent-* retained. Required
  adapted native suite remains to run on this new candidate.
- 977e1d6 shared process fixtures now bootstrap adventure schema as production.
- c79e1b1 persistence only globally falls back during actual frozen native
  SQL/durability or unknown state, not freeze/refresh/release network waits.
  Real two-actor/process test proves other actor uses worker during both phases,
  original actor remains fenced, and native callback waits for in-flight worker.
  Before timed out waiting for worker (fell back main), after test passes.
- 81efda8 resident actor revision entries are dropped on retirement/detach.
- 09b6423 version2 durable delta protocol for audited ordinary local deaths/
  claims, including non-stat weapon evolution counters. Reuses exact native
  table/column/inventory proof (R52/R57), stores scope+bounded committed snapshot
  INSIDE durable receipt and increments revision atomically. Consumer validates
  epoch/process/base, applies synchronously or falls back to full authoritative
  snapshot before mutation. No RNG/reward re-execution. Complex equipment/shared
  bosses/tower etc retain full version1 images. Avoids full combat/owner/adventure
  construction for eligible deaths, not a diff after building full image.
  Delta-counter tests6/6; delta atomic/full result11/11. First ordinary death
  failed version2 expectation due actual evolution counter write; added existing
  exact counter validator, then real death proves0coldreads and persisted replay.
- 01b01dd whitelist + r113 suite includes isolation/chat cases.
NOW: one unprofiled open-arrival mixed40/r1 60s load session96417,
validation/r113-engine/delta-mixed40-first.log. Runtime frozen at01b01dd forthisrun.
No other heavy jobs; no runtime edits until completes. No new artifact built,
previous27ebf093...candidate is stale, never deploy it as current. No livechanges.
Potential further diagnostic: v2 currently carries ordinary nested patch objects;
may need opaque encoded small delta to avoid parent IPC graph/string duplication.
Evaluate real measurements first, don't edit during them.

Post-delta preliminary timed runs (one each, NOT three-run acceptance):
review-20261113090848-40.json mixed40 functionaltrue; tick99 15.87ms,
mainELU21.23%, main>50=1/max62.72ms; control41.81ms. Deathp99237.34/max313.40,
visibleDeathp99180.53. Main fullcaptures55 (earliermixed40had193); main delta21.
review-20261113091056-40.json forest40 functionaltrue; tick99 10.77ms,
mainELU11.69%, main>50=3/max61.37ms, channel>50=4/max70.78,
control56.00ms. Deathp99159.96/max194.16, no>200/no>1000. No latency guarantee.
Source runtime09b6423+81efda8+c79e1b1; harness01b01dd.
New a3b9916 harness retains channel delta/section counters AFTER timing.
ACTIVE30209: sequential required focused/native/captcha/r110/r113 tests in
validation/r113-engine/delta-contracts.log. Focused+native passed asof09:17UTC;
captcha stillrunning. No performance currently. Afterpasses buildnewartifact,
installer/relocation andbrowser, thenfreshperformance matrix onfrozen core.
Need include packed40forest case (up to25actorssamechannel) aswellasbalanced.
No newruntimeedits planned untilevidence; noexisting ZIPoverwrite orlivewrite.

2026-11-13 09:30 UTC continuation:
- delta-contracts.log complete: focused60/native29/captcha20/r110 all pass;
  R113121/121 pass, before guild binding edit. No performance run concurrent.
- packed40forest60s raw review-20261113092255-40.json passed: tick99 10.64ms,
  mainELU9.96%, main>50=2, channel>50=5, death99/max202.31ms/72kills,
  authoritative visible death99/max169.72ms. Control had68.89ms same-timegap
  with all4channels; retain raw pauses, no exclusions. Main GC max7.43ms.
- 33bd5ac fixes genuinely removed guild dynamic-import dependency in generated
  async entry auth via trusted guildRuntimeR113 port resolved from bound
  NativeGuildAuth. Original auth guard order/repair/outbox unchanged. Sync
  writer has no auth port (fails closed). Extractor and generated proof updated.
  Historical permanent fixture brought to actual explicit channel entry and
  bound guild adapter. Before2 shows missing-module, after2 all7 tests pass,
  including SIGKILL before/after donation COMMIT and exactly-once replay.
  Required r113 suite now includes those7. No production data involved.
- b8738e0 performance matrix adds packed40forest per repetition. Final runtime
  now differs from09b6423 only guild auth binding; prior numbers remain preliminary.
- Current build session39532 writing new immutable artifact, logdelta-package.
  Next run installer/relocated/handoff and browser, then fresh matrix. Old
  R113_ENGINE_9b8cf7052cdc.zip STALE, never overwrite/deliver it as current.

2026-11-13 09:38 UTC:
- Immutable current ZIP artifacts/R113_ENGINE_cbd3b732c174.zip, SHA256
  f153f0377b6a39050f634bab9dd4287e307edd5dac946d07a75baa05c097e430,
  targetCore d10db978d85f378e0ef0fd3286abf3a096c19778a431825715bf0e1cbb459dfe,
  88 changed files. 446bc0e binds installer contract. Acceptance still pending.
- delta-release-checks: focused60/native29 pass, installer8 + relocated/handoff3
  pass. First r1 browser failure: inputlog proves attack never sent, prior dungeon
  sync ACK was dropped by test before attack queue admission. Not a server kill.
- ea814b3 fixes browser fault injection to drop replies AT attack send, preserving
  actual durable receipt test. Separate r1 threecontexts5checks and r2 mobile4checks
  pass in delta-browsers2; raw failure retained, no runtime edits for this case.
- ACTIVE72965 full sequential matrix at evidence/matrix-d10db978 and
  validation/r113-engine/delta-matrix.log. Paired R110/R113 mixed40/10/50/100x3,
  R113 forest30/40 + packed40 x3, r2mixed40, sharedboss10, 300s forest40soak.
  Frozen core; NO runtime edits, heavy tests, builds, browsers or concurrent load.
  Baseline /tmp/r110-installed-z6bx_n2g/release. STOP file halts only next boundary.
  No live modifications or zero-lag/100-capacity promise. Analyze raw throughput,
  pauses/control/cgroup/GC and latency, do not equate functionalpass withtargets.

2026-11-13 09:48 UTC:
- Matrix-d10db978 STOPPED at boundary with4 raw runs retained (session72965exit1
  STOP, no functional failures). First R113mixed40 had adverse death99 3328.87ms,
  max3485.07, mainmaxpause1592.79/control731.38, cgroup+12throttles/1.60s,
  mainGCmax30.24ms. All results retained; no environment excuse/acceptance claim.
  Samewindow SQL authselect85ms andmaingrouptotal871ms, channels pause up1266ms.
  R110mixed40 death99580.61/control80.48; R11010death99151.69;R11310death99331.15.
  Need distinguish shared-hostdeschedule from game work; donot discard anyoutlier.
- Found meaningful workload omission comparing actual browserinputtrace: bot did
  not send5s heartbeat and5s dungeonGET. b207e5c adds exact clienttransport poll
  cadence, independentofattack, maxonependingpertype, includestaildrain. Both
  R110andR113 get same traffic, harness hash frozen alongsidecoreinnewmatrix.
  No productionruntimeedited. OriginalmatrixhasNOPOLLS, cannotmix newnumbers.
- First standaloneUIpoll40: review-20261113094603-40.json passed, 480heartbeats+
  480dungeonGETs/60s, 271deaths, p99194.67/max282.73ms, tick99 24.54ms,
  mainELU28.85%, main>50=3/max97.52ms,control80.61. Notfulltargetacceptance.
- ACTIVE33379 full newmatrix evidence/matrix-d10-ui; logvalidation/r113-engine/
  ui-matrix.log. Samepairedplanasabove, nowactualUIpolls. Runtime targetcore
  d10db978... frozen. NOheavyparallelwork orruntime/harnessedits. Priorfailures
  retained. Artifact cbd3b732c174 remains pending/notdeployed, functional+installer
  +browserchecks passed but performancegoalsnotyetshownconsistently.

2026-11-13 10:17 UTC continuation:
- User now requests ONLY50-player load, no10/30/40/100. 11206d7 changes
  matrix accordingly; r2actual40cap mustnotbypass, functional/browser stillboth.
- matrix-d10-ui stopped at runboundary with13raw results, session33379exit1STOP.
  R11340repeat2 death99 270ms/tick99 17ms/main>50=1; R11040repeat2death99435ms.
  Discovered actual5s lobbyGET causes fullactorcapture+durablecommand even when
  not in dungeon. Realprocess beforetest4queries=>4writes, failed expected0.
- New uncommitted dungeon-lobby read uses original native snapshot in query-only
  readworker+currentWALownerchecks, no receipt/capture/checkpoint. Existingactor
  inputlease preserved, pure UIquery250msbudget; late result discarded and
  max1outstanding/actor. No room/create/attack/collect intercepted.
- afterprocesspoll1/1pass; new unitparity + failure/timeout2/2pass; realdeath
  exactly-once1pass. Broader old dungeon-native/channel suite11FAIL retained
  lobby-contracts.log: historical fixture missing kadim_tower_settings and
  pre-existingV510prototype drift. Those tests use unchanged ResidentDungeon
  (no readLobby port); do not count as new regression or silently delete.
- ACTIVE80983 full required R113suite nowincludesnew3lobbytests;
  validation/r113-engine/lobby-required-r113.log. No performancecurrently.
  CurrentZIP cbd3b732c174 STALE afterlobbycode, mustbuildnewimmutableartifact.
  Need required focused/native/captcha/r110, package/installer/relocation and
  bothbrowser, then new frozen 50-only matrix (14runs including5minsoak).
  Nothingdeployed; no zero-lagguarantee.

10:22 UTC: 40cd4f1 commits read-onlylobbyprotocol, 6bc993e pinsnewartifact.
R113131/131, focused60/60, preparednative29/29 PASS. RawarchivedV510failures
above were running tests without existing prepare-native-regression.py; correct
npm test:native uses documentedR106fixture+prototype baseline and passesall29
without any new testweakenings/fixtureedits. Newrealprocess3lobbycasespassincl
heldquery/readfailure/nextpoll + heartbeatprogress + onceonlylateinputresult.
Current immutable ZIP R113_ENGINE_44122505701f.zip SHA256
42be6f405264e470b2a7b6867fc01833405b284c59c26e9a2bec7235f1fbe96f
91files, targetcore2edb6c0deee9d71cf541ba2b6a51c8ff39efc126183006d40f2e96534c482c14.
Installer/performancepending/notdeployed. Session1946 sequentialrequiredtests
nowcaptcha thenr110. Need r113installerandbothbrowsers, thenONLY50matrix.

10:29 UTC: 1946allrequired focused60/native29/captcha20/r110 PASSED.
85571 r113installer8 + actualrelocated/handoff3 PASSED; newZIP startsbothrealms
with8channels. 46465 r1browser3contexts5checks andr2mobile4checks PASSED.
CURRENT ACTIVE52209 sequential matrix-2edb-50, loglobby-matrix-50.log.
Only50players perlatestuser: 3pairedmixedR110/R113,3forestR113,3packedforest
R113,1sharedbossR113,1forest300ssoak. Runtimeandharnessfrozen.
NOparalleltest/build/browser/profileor editsuntilmatrixends. Source2edb6c0...
Artifact44122505701f/SHA42be6f...current, performancepending, no liveinstall.
Userestimate45-60minat10:11; lastsaid50matrixabout25minat10:29. Needactual
results notsolefunctionalpass. No new100or30/40populations, r2capnotbypassed.


## 13 Nov 10:53 UTC continuation — exactly 50-player load only

Latest user scope overrides older matrices: no10/30/40/100 runs; exactly50.
The frozen2edb matrix stopped automatically on forest50r1 functional failure:
3 dungeon UI read timeouts, no game faults or unsettled rewards. Main GCmajor
1368.2ms, deathp99608/max1951ms, control224ms. Raw matrix-2edb-50 retained.
A separate50forest CPU/allocation diagnostic passed (not acceptance): GCmajor80ms,
~849MB sampled main allocations/minute, including repeated IPC frame/replay data.
No live profile or process flags changed.

f85b0f9 separates negotiated dungeon lobby presentation reads from the combat
input queue. Authenticated/CSRF-validated HTTP uses the query-only WAL worker,
then reads small current resident notice/membership metadata and revalidates
session/epoch/admission. Active rooms and gameplay commands retain the existing
resident command path. No actor lease, receipt, checkpoint or reward write is
created by this HTTP read. One pending read per actor/client; a5s UI deadline
does not close the game socket or reject attacks. Late responses cannot replace
a newer room push or a replacement connection. No gameplay guard removed.

5new tests passed, including holding the actual read while heartbeat completes,
CSRF/auth/epoch checks, duplicate bound, timeout and late response. R113full suite
135/136: the single failure was an exact legacy capability-array assertion.
Corrected negotiation (only advertise to clients requesting the capability),
without changing that test. Related31tests pass. Source frozen5091216b633d0f363e8d057a683e289175e96de6b2d555e97a7018289c534186.

First unprofiled50forest after this change: review-20261113104814-50.json,
functionaltrue,600heartbeats/600dungeon reads, no errors/faults, all settled.
Tickp9918.12ms,max58.36; deathp99268.52/max534.60; main>50=12/max209.45;
GCmax35.56; controlmax60.46. NOT pause-target acceptance. Retain adverse pauses.

Immutable candidate artifacts/R113_ENGINE_aab319972d6d.zip,2942406bytes,
SHA256fe3dd7537460419e64f0333036f43fb50fe12870e05bcf092e7ba975c5b85e8f.
SourceexactR110_HANDOFF1,96changedfiles,namespacecore511-199da85de83c998f.
No installation/push/delivery yet. OlderZIPs untouched.

Sequential final checks currently session24597, orchestrator/tmp/r113-final-checks.py,
logvalidation/r113-engine/independent-final-checks.log: focused60passed, native
running then captcha,R110,R113installer,r1multiChromium/r2mobile. Browser harness
now uses installed/usr/bin/chromium ifREVIEW_CHROMIUM absent (194b5ac).
After checks run the sequential50-only matrix3pairedmixed+forest/packed repeats,
sharedboss and300ssoak. No concurrent work or source changes during load.

11:08 UTC: current frozen5091216b checks completed. focused60, captcha20,
R110installer/relocated/handoff3, R113installer8+relocated/handoff3 passed.
Native first run28/29 failed because archived dungeon fixture did not await the
now bounded/yielding kernel tick. f5da398 fixes ONLY the regression adapter;
production overlapping_tick guard stays intact. Repeat native29/29passed.
Browser initial attempts retained failures from stale R105 assetRoot and absent
TOWER=1 fixture setup; no runtime change. Staged current template and all90
installed assets into /tmp/r113-independent-browser-assets, hash matched each.
Correct run TOWER=1 AUDIT_ASSETS=/tmp/r113-independent-browser-assets:
r1 three Chromium contexts5checks and r2 mobile4checks passed. Logs
independent-verified-browser-{r1,r2}.log. No new runtime edits since509probe.
Next14runs frozen matrix-5091-50 uses EXACTLY50 players. All raw unfavorable
results remain part of assessment. Functional success is not pause acceptance.

11:38 UTC: matrix-5091-50 finished14runs, last300s forest FAILED. Prior13runs
functionalpassed. Threepairedmixed medians deathp99471.9(R110)->202.5(R113),
tickp9931.58->24.31, ELU40.16%->30.11%. Retain adverse packed3main629.7ms,
control562.6ms overlap allchannels; GCmax16ms, cgroup11throttles/1.66saggregate.
No exclusion or zero-lag claim. Soak failure is an actual candidate BUG:
reward_worker_guard on native_action caused unknown outcome and channel4
restart after60s. The single-actor worker incorrectly accepted batchPotionsR61.
The native batch calls its guard independently for each nested actor/payload;
worker intentionally binds only the original actor/payload. Never loosen it.
A deterministic real-channel2actor potion burst reproduced the exact guard
failure (potion-batch-before.log), then fixed by retaining multi-actor potions
in their unchanged native guarded sole-writer FIFO. Batch stays atomic, each
actor validated, receipt and replay unchanged. Singles still use worker.
Regression checks real2actorbatch, consumesoneeach, replaynoextra, laterheartbeat
both actors. private-persistence5/5passed afterfix (potion-batch-after.log).
Old candidate R113_ENGINE_aab319972d6d.zip is REJECTED; do not deliver it.
No runtime source change after this fix while new50-only load runs. Need repeat
soak and mixed50, requiredchecks and fresh immutablepackage. PreviousZIPshashes
unchanged. No deployment or push. Current user scope remains EXACTLY50.


12:17 UTC continuation: current user load scope remains EXACTLY 50 players.
fe1422c fixed multi-actor potion fallback, and its deterministic real two-actor
regression passed5/5. matrix-potion-50 long300s forest passed (730deaths), but
third mixed50 found one genuine HTTPchat503 while a world terminal started
DURING async reauthorization. Before-race test reproduced it. 2df92be now waits
for the actual shared terminal outside c.serial, then reauthorizes; no native
callback replay or guard removal. Six chat tests passed.

Frozen core e000d80de480f24d0a2c7493d859657a70a46dab0fdd94df6d37b52f066644c7:
matrix-chat-50 six runs ALL functional true,1839 total deaths, zero faults/errors.
forest300s:719deaths,death99=207.4/max316.6ms,tick99=14.73,main>50=13/5min.
mixed50 three repeats: tick99=26.11/20.62/30.87,death99=259.59/267.08/332.58,
main>50=6/3/9 (vs oldR1103/1/5; retain the regression), ELU31.99/31.36/35.05%.
Packedforest50passed,tick99=12.58,deathmax187.75. Sharedboss50passed3deaths,
tick99=16.25,deathmax539.42,mainpause286.8ms. No zero-lag/SLA claim.
Main mixed median R110->R113: death99 471.88->267.08, tick31.58->26.11,
ELU40.16->31.99%, but raw>50 pauses3->6/min. Synthetic4CPUquota, no liveDB.

Existing slow-work recorder clearly attributes boss pauses to main_write_group:
286.4/196.7ms,245.1/162.3ms,247.8/218.8ms pairs around three deaths. These are
NOT just host pauses. Canonical sanctuary boss + subsequent claim still excluded
by reward worker candidate/safeScope (sanctum and is_boss). Investigating a
strict canonical-boss delegation through SAME native writer, global lease,
resource/owner checks and sole FIFO. Do not remove any barrier or loosen guards.
New UNCOMMITTED boss-persistence-r113.test.mjs expects worker dispatch and
once-only defeat/claim/receipt, but NOT RUN YET; runtime unchanged since2df92be.
Need baseline failure, then safe implementation+crash tests and fresh50boss load.
Current archive aab319972d6d remains REJECTED. No new ZIP or delivery/deploy.

Current sequential checks session53060, parent /tmp/r113-confirmed-final-checks.py
PID320572: focused60/native29/captcha20/R110installer+runtime3 passed. R113 full
suite is RUNNING on e000d80 (aroundtest49 at12:16). Do not edit runtime or run
another heavy test until it completes. Parent briefly SIGSTOP then CONT; it is
RUNNING normally. Logs confirmed-final-*.log; results JSON confirmed-final-checks.
No performance load active (67596 completed). Afterwards run new boss test old
code once, retain failure, implement narrow audited worker admission, rerun.


12:34 UTC: general checks on e000d80 all PASS: focused60, native29,captcha20,
R110installer+runtime3, fullR113138. New boss regression initially timed out
because fixture hp1/maxhp18000 regenerated during startup; corrected ONLY fixture
maxhp and boss_hp to1. Before actual code change the test then failed at the
expected assertion: canonical terminal executed on main instead of worker.
8caf54d delegates ONLY signed canonical sanctuary dunya-bosu-1 attack/claim to
the existing sole writer. Requires actual global terminal frozen with same proof;
all shared leases, actor owners, native resource guards, native handlers, full
COMMIT, RNG and receipts remain. Other bosses/world-ending/unsupported targets
retain the original fallback. Four tests PASS incl scope exclusions, once-only
kill/claim replay, actual worker exit before and after COMMIT; four channels and
world survive proven recovery. No broad guard removed, no kill result fabricated.

matrix-boss-worker-50 (1ce9aec runner, core41fb08...) six FUNCTIONAL passes;
all exactly50,3boss+3mixed,1056 total deaths. Same frozen harness as R110baseline.
Mixed medians R110->R113: tick99 31.575->22.109ms,death99 471.881->234.208ms,
ELU40.162->30.561%,main>50 pauses3->3/min. All three tick99 under30; pauses3/4/1
so <=1/min objective NOT met overall. Boss main max85.46/142.04/91.36ms vs prior
candidate single-run286.79ms, but boss deathmax471/635/498ms (retain regression
versus prior539ms max). Previous failed runs and rejected artifacts untouched.
Final-50-summary.json preserves exact source identities, metrics and limits.

Active7265 is focused/native revalidation on final boss code. No load active.
Need build NEW ZIP (old aab archive REJECTED), update code_contract, run final
installer8 + real relocated bothrealm/handoff3. Current frontend unchanged from
verified browser tests; decide fresh browser if useful. No live install/push yet.


12:38 UTC: final source focused60/native29 PASS again (boss-final-* logs).
NEW immutable artifact artifacts/R113_ENGINE_76cd8cd4c40f.zip,2943869bytes,
SHA2564399dfe08550ebf04bd4c8ea7fbab8cedcdb804fd851495dd17847a0eabbcbc3,
core41fb08...,96changedcodefiles,sourceR110_HANDOFF1. Old ZIPs untouched.
Installer8/8 and actual relocated both-realm/handoff3/3 PASS on this exact ZIP,
staged at /tmp/r113-installed-12zsrsmc/release. All87 installed namespace browser
assets hash match the verified staged preview. Actual Chromium checks now running
session49008, orchestrator/tmp/r113-final-browser-checks.py, logs boss-final-browser-
r1/r2.log; r1threecontexts thenr2mobile. No load or other heavy task active.
Package is a controlled candidate, performance target explicitly partial. No
live deployment, no GitHub push. Need final browser result, package metadata,
short handoff, commit exact contract/docs/evidence and deliver this new ZIP only.

12:40 UTC FINAL VALIDATION: exactZIP installer8 + actualbothrealm/handoff3 PASS;
fresh browserr1threecontexts5 andr2mobile4 PASS (boss-final-browser-* logs).
All87 installed namespace asset hashes match preview. package.json marks
functional/install/browser verified but performanceAccepted=false. Nozero-lag
claim. Delivery copy /workspace/r113-motor-76cd8cd4c40f.zip is byte-identical to
artifact SHA4399dfe...; sidecar SHA256 created. No live install or push.
Latest load remains exactly50 only; next work must retain remaining>50ms pauses
and synthetic4CPU/liveDB limits. Do not rerun old100/30/40 matrices by default.
