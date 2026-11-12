# Güncel canlı teyit — 11 Kasım
Kullanıcı R105 kurulumunu tamamladı. r105_postinstall_profile/evidence/live-r1-health.json R105_PERF1/R105_TOWER2 ve 4 hazır kanal doğruladı; r2 ayrıca sorgulanmadı. Eski ZIP yeniden kurulmaz. Yeni çalışma ../r106_captcha_worker/WORK_STATE.md. Aşağıdaki önceki teslim notu tarihseldir.

# R105 tower, Discord and performance delivery — 11 November 2026

## Current delivery

Authoritative worktree: /workspace/ccre/r105_performance_review, isolated
branch r105-performance. Historical sources and ZIPs remain unchanged.

- Source R104_AKADEMI4; target R105_PERF1, retains R105_TOWER2 health marker.
- ZIP: delivery/r105-kule-performans.zip (2,254,045 bytes).
- SHA256: 1f3d315f6f75a1854bcad7c72946471f6f817dd4bb74feaec97eb7e3e5472ba9
- Immutable original: artifacts/R105_KULE_PERFORMANS_b977ae38.zip
- Report: delivery/r105-performans-raporu.md; checksum beside ZIP.
- Namespace: core511-1025c65a35480d96.
- Source core: 646daf2e6fdcdddf2dec52765e0ff7fce876d5ff4273922b40970acc199e0169
- Target core: bd3891da70f7827ebbe0b62e8a9edf10444a2a86cde6fa0629a5f3bc07085fdd

Use absolute workspace download links. /mnt/data is not writable here;
verified delivery files are in the workspace, not /mnt/data.
No production installation or SSH access. Final read-only r1 health still
shows R104_AKADEMI4 / R104_BOOT1, four ready channels and no R105 marker.
R2 production was not independently queried. Never bypass blocked access.

When user supplies the uploaded Drive link, give a short download + exact
SHA256 + python3 /root/r105-kule-performans.zip --check command. Apply with
python3 /root/r105-kule-performans.zip --apply after maintenance countdown.
Do not advise installing older R105 checkpoint packages separately.

## Scope and cause

Tower diagnosis reproduced attack_frame_conflict in three independent
Chromium processes under normal combat, without injected network faults.
Refreshing player/adventure SQL data could overwrite current resident monster
HP. A native two-monster scenario reproduced HP 85 -> 55 -> stale 85 after a
neighbour kill. The fix only seeds unseen monsters from snapshots; explicit
committed combat results still apply. All three actors now keep HP 55.
Connection recovery includes bounded request/body waits, silent stream loss
recovery, sleeping-tab grace and receipt replay without double dispatch.

Discord on the main site, portal, Academy and game now points to
https://discord.gg/pBywtjhTN. New namespace has zero old invite occurrences;
five client assets and four main-site links were checked.

Performance was done last, after the tower/Discord checkpoint. Each of the
ten recommendations has its own commit, including justified decisions to
retain correctness guards. Changes: opt-in detailed SQL attribution, existing
bounded prepared-query reuse, immutable durable world image reuse fenced by
revision/schema, and reuse of IPC serialization within one send. SAVEPOINT,
fsync, schema invalidation, presence/ownership and replay rules are retained.
EXPLAIN verified existing retaliation indexes; no new index migration.

18 changed code files and one marketing HTML file. No DB/schema migration,
full DB scan or compression, world balance/reset, Academy launch policy,
Caddy/DNS or IP auto-attack limit change. Native source is a real local copy,
not the historical symlink. Exact prior native hashes, source/site identities,
two realms/eight ready channels and independent rollback remain required.

## Verification

- Exact ZIP payload, installer modules and three embedded documents match the
  tested working files; delivery digest verified. See evidence/package.json
  and evidence/release-validation.json.
- 48 unique Node regression cases: 33 performance/native correctness cases,
  13 tower/recovery cases and two further IPC transfer cases. One initial test
  file could not load a temporary eslint-scope dependency; after restoring
  the pinned dependency its three tests passed. Original logs are retained.
- 20 installer scenarios passed across the full suite and one focused rerun.
  Symlink was correctly rejected earlier by containment validation; only its
  expected message needed adjustment. Two media apply/rollback cases also pass.
- Actual relocated runtime-entry opens both realms/eight channels and shuts
  down cleanly, including an r1 fixture with 15,000 monsters.
- Exact installer asset graph: 57 JS files, 140 import edges.
- Exact packaged PC/r1 and mobile/r2 browser entry, visible HUD, forced stream
  loss recovery into floor 2 and Discord target checks passed.
- Three independent Chromium processes/same IP/three accounts/shared group
  completed all ten tower floors with zero command errors, native faults or
  spontaneous disconnects. Initial report failed only on three missing fixture
  floor images. Images were matched byte-for-byte to live R104 assets; exact
  installer asset_updates then carried them and real Chromium decoded all
  three. Original report remains, plus transparent combined validation at
  evidence/three-browser-combined-validation.json.

## Performance results and limits

User explicitly changed load tests to 10, 50, 100 players only; NO 200.
Each measured run: 10 s warmup + 60 s, real native SQLite/HTTP, four channel
processes and protocol bots on the same four-CPU-quota host. These are isolated
local comparisons, not production capacity or browser FPS measurements.
Baseline is tower-fixed R105_TOWER2, isolating performance changes.

Efsane natural capacity is 25/channel: measured 10, 50 and 100 before/after.
Academy natural capacity is 10/channel: separately measured 10. A temporary
fixture capacity override was rejected before measurement and removed; no
production or package capacity changes. Never claim r2 ran 50/100.

Main ELU at 50 players: 39.4% -> 31.7%; at 100: 68.5% -> 57.0%.
100-player worst-channel tick p95: 28.61 -> 27.72 ms; p99: 42.06 -> 48.86 ms.
Thus tick below 20 ms and zero pauses above 50 ms were NOT achieved.
Do not claim every latency or memory metric improved or zero-lag capacity.

Initial 10-player candidate had an unexplained 1,223.69 ms timer pause.
Both sources were repeated: baseline main max 259.05 ms, candidate 74.38 ms;
candidate long spike did not recur. First run is retained in the full table;
do not attribute it definitively to GC, host or the code changes. Repeat main
GC maximum 21.87 -> 8.02 ms. Academy 10-player main max 48.92 ms, but channel
pauses over 50 ms still occurred. All completed load runs passed correctness.

Full tables and methods: PERFORMANS_RAPORU.md; raw data/digests indexed by
evidence/load-comparison.json. Final runs: baseline-10/50/100,
candidate-10/50/100, verify-base-10, verify-candidate-10, academy-final-10.
Older before-/confirm-/smoke files are retained fixture history, not final
successful measurements. Do not rerun broad tests without a new concern.

Supplied CPU profile was independently analyzed: 60.993 s with 990 ms inspector
startup; sampled non-idle after startup about 21.88%, not linear per-player CPU.
SQL wrapper self ~543 ms versus native SQL leaves ~2,845 ms; prepare ~515 ms.
Profile alone cannot establish 134 stalls or a 325 ms GC cause. Evidence and
reproducible analysis script are preserved.
