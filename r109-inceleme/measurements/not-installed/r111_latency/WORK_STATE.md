# R111 investigation complete — NOT a release

Latest user: R110 comparison is insufficient. Result agrees: candidate did not
prove an overall improvement. Do NOT recommend R110/R111 installation. R109
remains confirmed live source. No live write, service restart or deployment.
No new ZIP produced; old archives and SHA256 values unchanged. No subagents.

Branch r111-latency, starts R1109b849c8. Experimental changes:
-99ee1d6 bounds exact changed-column statements to64LRU; same columns/triggers,
 guards/bindings/transactions. Test511shapes,rollback,failedguard,eviction.
-66b3669 reuses pure attack/retaliation frame readers. Fresh rows/settings every
 call; per-operation damage/reward/RNG objects remain unchanged.
These are isolated experimental commits, not an approved payload.

Report: R111-INCELEME-RAPORU.md. Summary evidence/r111-load-summary.json;
final manifest evidence/r111-investigation-result.json. All diagnostics are
local-only. No live flags, GC tuning, data/schema or game rule change.

Five40player60s R110 feature ablations: correctness passed. No individual
feature explains all regression; control-b hoststeal9.1% had maxattack2.418s
and tickp99=82.1ms. Keep this unfavorable result in reports.
Sequential40player180s R110→candidate:
tickp99 27.95→27.14ms; main>50 pauses10→7/3min; channel sum22→24;
maxattack520.08→540.71ms; maxmainRSS554.13→580.29MiB;
mainELU19.99→19.77%; hoststeal3.75→3.20%.
Shape retention24→76 baseline;26→64 candidate. This bounds one map, not all
memory or proof of its causal contribution. RSS increased in candidate.
Four of7candidate main pauses align>=75% with world+all4channels;3also reader.
This suggests shared scheduling, not proof every stall is host rather than code.

Two additional stage diagnostic runs passed correctness. First60s flag was
stripped by pinned runner (recorded disabled); second30s sets flag in harness
before imports and enabled it. No CPU/SQL/allocation sampling in these runs.
Atomic attackmax44.66ms; commitmax1.27ms; refresh and shared hold waits remain.
Column fallback reasons are movement/position revision/root changes: never
remove these ownership/state guards just to lower timings. Worker623ms startup
stat includes initial startup; not a new measured-window freeze.

6validation phases passed:78focused,29native,20captcha +boss prewarm/coldworker.
No R111 exact installer/browser/relocated tests: no package selected/produced.
4CPU quota,synthetic6kmonsters,equippedmixed40,notlive8CPU/database/workload.
No live DB or live action ratios. No zero-lag/capacity guarantee. No approval
question pending. No active test sessions remain at handoff.

If continuing, preserve evidence and source versions. Need stronger workload
and hardware matching plus matched attack queue/atomic/refresh attribution
before selecting another release. Do not turn experimental changes into a
performance recommendation based only on one slightly better p99.
