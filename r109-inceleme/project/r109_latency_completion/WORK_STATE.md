# R109 — tested additional fixes; performance goal NOT met

12 November 2026. User requested remaining 30–40 player stalls fixed, based on
original R106_CAPTCHA1. READY1/swap/telemetry rejected. No live shell or DB;
nothing was installed live. No new agents were used in this continuation.

## Immutable delivery

- delivery/r109-gecikme.zip — 1,350,459 bytes.
- SHA256 1ba96d415891f8d474188edb64331b87b7bc12fdfb54733f49918a906e6ef068.
- Target R109_LATENCY2; exact accepted sources R105_PERF1 or R106_CAPTCHA1 only.
- 20 changed code files from R105; 13 runtime differences from R106.
- delivery/R109-olcum-raporu.md and delivery/R109-olcumler.csv.
- Includes R106 captcha and R108 fixes; do not install those separately.
- No schema/data migration, full DB scan/compression, Node flags, live telemetry,
  swap, balance or reward ownership rule changes. Maintenance/prereg preserved.
- Changed-code-only backup; one verified previous code rollback; both realms,
  eight channels and accounts checked before successful completion/cleanup.
- No R109 Drive URL yet. After upload use this SHA; short --check then --apply
  after normal maintenance countdown. No live installation claimed.

Immutable original R106 SHA:
6c8a931dfa7da3cdaf054d5c2c5715103abfa35024ff422402a9aaa734d22d2a.
Immutable original R108 SHA:
389147cca4bb7c4192c129bf51a1242628f06ccef43db11532b7be10d29d9588.

## Separate implementation commits

- a341b3c: bounded prepared-statement scope now covers reward-worker synchronous
  preflight/native fallback; ordering/durability/rollback retained.
- f5af57e: compile-only boss SQL boot pool, at most eight reserved handles;
  real SQL/boot order/schema/UDF invalidation tested. No cached rows.
- f8bc282: producer selects only one secondary death command; historical larger
  writer/replay protocol unchanged, later queue heads retained untouched.
- 5e13284: diagnostic tooling and actor/intent terminal-event test observer.

## Completed verification

evidence/release-validation.json binds exact executable bytes, file hashes,
14 passing stages and six native load runs. Final ZIP differs from the actual
installer/browser-tested ZIP only in its performance report document.

- 54 focused, 8 boss prewarm, 2 cold-worker, 29 native game, 20 captcha tests.
- 7 terminal observer/end-settlement checks.
- 26 installer/rollback tests, 2 relocated-runtime tests, two realms/8 channels.
- Exact installed JS/CSS: PC r1 and mobile r2 character/channel/live HUD.
- Three independent Chromium processes: all ten tower floors, no errors or
  stuck commands. Test reports preserved in evidence/*r109-latency/report.json.
- First installer test expected eight old R106 files; explicit allowed set
  updated for five intentional additions. All26 passed on rerun; failed log kept.

## Six final 60-second loads

Real TCP, four channel processes, separate bot process, 6,000 background mobs,
three classes/specializations, gear/enchants/pet/wings/inventory. Mixed maps:
normal/tower/Solo/Sis/black/rune. HTTP guild/market reads, quests/chat/potions;
market/guild mutation load NOT measured. No profiling in acceptance windows.
All commands, claims and pending deaths settled with no native faults.

| Run | Players | Tick p99 ms | Main >50ms/min | Channels >50ms/min sum |
|---|---:|---:|---:|---:|
| Efsane packed1 (25+15) | 40 | 29.40 | 0 | 0 |
| Efsane shared boss1 | 40 | 14.11 | 3 | 4 |
| Efsane balanced | 30 | 17.14 | 1 | 5 |
| Akademi 10/channel | 40 | 19.82 | 0 | 1 |
| Efsane packed2 | 40 | 30.13 | 1 | 0 |
| Efsane shared boss2 | 40 | 17.97 | 3 | 17 |

Worst channel pause186.9ms; main121.8ms. Isolated first-boss native write group
59.3ms did not overlap other-loop pauses; do not blame everything on host steal.
Boss max single command reply1,310ms; per-actor reply-p95 medians486/623ms.
Full report includes reply latency too, not just favorable tick/ELU values.

NO-STUTTER GOAL NOT MET. Do not say all remaining problems are fixed or guarantee
live30–40/100 capacity. Live8cores vs test4CPU quota/nonzero steal. Synthetic DB;
no anonymized live DB or observed live workload proportions; no GPU/FPS test.

## Preserved negatives and remaining focus

First r109-final-packed-1 failed on one unresolved202 predicted death. Oldbot
ignored terminal monster_result/reject. Original cause is UNPROVED because final
events were not recorded. Failedrun retained. Observer now correlates actor+
intent, claims only actualkills; missingfinalevents still fail. All six fresh
acceptance runs pass with this observer.

Other failed diagnostics: wrongscenario name (now validated beforestartup),
missing profileoutput directory (test-only fix +successful repeat). XP UPDATE
FROM experiment matched18 row/trigger pairs but small benefit insufficient to
justify reward SQL change; NOTadopted. Initial experiment exceeded capacity,
then corrected by four-channel admission without bypassing limits.

Remaining technical focus: synchronous native boss reward transaction and
command/barrier queues. Any future change must preserve atomic XP/loot/receipts,
shared-terminal ownership, durability, failure recovery and queue order. Do not
remove guards or split transactions without equivalence/failure tests. This
package does NOT fulfill eliminating every remaining latency problem.

## User installation decision

User accepted installing this exact R109 package and will supply a new61-second
profile afterward. Authorization is given; do not ask for installation approval
again. No production-access tool is available and no R109 Drive URL has been
received. Next step is the user's transfer/upload URL, then SHA-pinned short
curl/check and normal maintenance apply commands. Installation remains unconfirmed.

## Drive handoff

User supplied Drive file 1y3VzOvScmPOpJsFEzN2vR7MIf9ukYcXE and confirmed the
package should apply to Akademi too. Direct read from this workspace returned
HTTP403; remote bytes NOT verified here. Provide VDS curl plus exact SHA256
1ba96d415891f8d474188edb64331b87b7bc12fdfb54733f49918a906e6ef068 gate before
executing --check, then --apply after maintenance countdown. Neither installer
nor live state has been executed/observed in this turn. Await user's output.

## Live Efsane confirmed / six-player follow-up

Read-only r1 /api/vds-health on12November now confirms R109_LATENCY2,
R106_CAPTCHA1, four ready channels and six players at that query. Evidence:
../r109_postinstall_profile/evidence/live-r1-health.json. R1 installation is
therefore confirmed; do not advise repeating apply/recover. R2 fetch was denied
by the workspace proxy403, not evidence of an Akademi service failure.

User supplied main CPU profile df19d3d8 and answered population6. Realm and
activity were not specified in the answer. Read-only analysis/report is
../r109_postinstall_profile/RAPOR.md. 60.433s capture; first inspector sample
426.486ms; remaining sampled main non-idle21.962%. Native SQL3,024ms total,
prepare335ms, GC672.519ms total, longest contiguousGCsample span27.883ms.
These are sampled intervals, not precise event-loop/GC event timers. Previous
1-player103msGCsample span absent here, but unequalpopulations/actions prohibit
causal speedup or zero-lag/capacity claims. No runtime/config/code changed.
R109's remaining syntheticload failures are not invalidated by this profile.
