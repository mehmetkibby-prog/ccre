# R106_CAPTCHA1 — tested package ready, not installed live

## Latest user selection — 12 November 2026
User explicitly declined R106_READY1 and selected this preceding package.
Their attached r106-captcha.zip was read and verified: byte-identical to the
immutable delivery below, CRC valid, target R106_CAPTCHA1. Use this package
for the next installation handoff. No new Drive link or live install yet.
Do not add READY1 minute metrics or swap changes; preserve both old ZIPs.

## Delivered files
- delivery/r106-captcha.zip — 1,222,952 bytes
- SHA256 6c8a931dfa7da3cdaf054d5c2c5715103abfa35024ff422402a9aaa734d22d2a
- Immutable artifact artifacts/R106_CAPTCHA_bcf4860b.zip
- delivery/r106-performans-raporu.md — tables and six-suggestion audit
- evidence/release-validation.json — exact package, functional/installer/runtime/browser evidence

Source ONLY R105_PERF1. User reported R105 installation complete; read-only
r1 health confirmed R105_PERF1/R105_TOWER2 with four channels. R2 live was not
queried. Do not reinstall R105 or earlier packages. R106 not installed live.
Source core bd3891da70f7827ebbe0b62e8a9edf10444a2a86cde6fa0629a5f3bc07085fdd
Target core d5cfeaa816588348f44a95e4418f06b7ac7e7c87612b87b3608870b7694b29ca
Namespace remains core511-1025c65a35480d96; no client/site/schema/data changes.
Eight server/native payload files plus installer identity update. Changed code
only backup, one previous version; both realms/eight channels checked.
Do NOT run inherited build/client.mjs. Old delivered ZIPs/hashes are immutable.

## Change
Implementation commit 0015970: real captcha PNG drawn in one bounded lazy
worker per service process outside SQLite AND coordinator lock. Two phase
reauthorization/required/old challenge checks before durable insert. Preserve
attempts, one-use, expiry, CSRF and same-IP independent registrations. No sync
fallback on worker failure. Queue128/10s bound; one worker with heap limit.
Existing game fields, format, access/auto attack/Academy policies unchanged.

## Verification completed
- 20 captcha/security/integration tests pass in captcha-release-tests.log.
- 23 install/recovery/retention tests pass in installer-fixture-corrected.log.
  Initial23 fixture errors were incorrect R105 assets directory; corrected to
  r105_performance_review/evidence/final-browser-assets, not production fixes.
- Exact installed relocated runtime: two realms, eight channels, large r1
  boot image, clean shutdown; real worker resolves imports and produces PNG.
  evidence/relocated-runtime.json, relocated-runtime.log (2 tests).
- Exact installed client assets graph57files/140edges. No JS/CSS fallbacks.
- PC/r1 and mobile/r2 actual entry, rendered HUD, tower stream recovery without
  F5/replayed attack. No missing assets/browser/native faults. Browser reports
  evidence/browser-r1-hud-captcha-final and browser-r2-hud-mobile-captcha-final.
  Native modules and core from exact staged package /tmp/r102-relocated-9xh1b2im/release.
- Archive bytes, all payload/modules/docs, manifest, source and target pinned
  and compared with tested source before copying delivery ZIP.

## Measurements and limits
60-second 10/50/100 paired R105/R106 tower loads completed, all functionalPASS;
200 never tested. Academy10 tested at unchanged10/channel capacity. Captcha
focused benchmark61draws each: first DB callback28.32->0.60ms; warm p957.46->0.15ms.
Cold response31->100ms, warm total CPU443->547ms, RSS extra~15MiB. Offloading,
not a total CPU reduction claim. Normal tower load does not create captchas.

GC/last six suggestions reviewed LAST. Local traceGC default old/default new/
semi32/allocation100 completed. Long182ms Scavenge in first R106,117.6ms old
trace. 32MB reduces minor count but does not eliminate>50ms; no live flag changed.
No live shell access, so NO live one-hour trace or live heap snapshot taken.
WAL/NORMAL with fsync-before-ACK verified native test; full fallback retained.
Existing8jobs/~3ms group, schema/rollback guards, SQL caches, IPC framing and
ACK order kept. No broad risky rewrites based on unsupported source attribution.
Allocation7.5MB profile showed bot clients dominating many allocations.
Moved bots to separate process/heap and reran10/50 plus paired old/new100:
R106 p95tick4.53/11.93/28.77ms; main>50ms0/1/18; channels4/0/60;
mainRSS386/541/661MiB. Main100max195ms. All commands/connections functioned.
100 tick<20 and zero>50ms NOT achieved. Report all tails; no capacity guarantee
or per-player linear CPU estimate. CPU quota4cores with observed throttling;
no pauses removed. Scripts+raw JSON/logs in evidence. Fifteen official60s runs
plus short isolated harness smoke; raw evidence preserves worse results.

User one-player live CPU profile analyzed separately in
../r105_postinstall_profile/RAPOR.md: sampled non-idle~2.88%, prepare25.16ms.
Different population from old10-player capture; don't claim percent improvement.
CPU file alone lacks exact tick/RAM/stall counts. Suspicious103ms GC sample span
is not exact event-loop pause or proof that drainWrites caused it.

## Next user handoff
Use real absolute links to delivery files. User uploads ZIP to Drive, then
provide short curl with NEW file ID and the SHA above, --check, and --apply
only after ordinary admin maintenance countdown. Do not repeat old package.
No need new approval: fixes authorized. Do not claim installed on live.
All local sessions finished. No active agent work or heavy tests remain.
