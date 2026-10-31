# R82: checkpoint waits and player respawn lifecycle

This reviewed delta applies only to the exact shipped R81_GAMEPLAY base. It has not been deployed to the user's VDS by this workspace. The live game was last observed running R81. The user's report of a dead character persisting after a full page reload remains an unresolved live diagnosis until the requested read-only death-state snapshot is available.

## Reviewed behavior

- A local monster death no longer awaits an immutable checkpoint for a known disjoint target set. Same-target, unknown-scope, actor-checkpoint and own durable ACK ordering remain enforced. Journal failure is checked before reservation, capture and committed finish.
- The automatic player respawn effect owns its cleanup token, checks the actual transport/player/epoch and death lifecycle, refreshes after stale or skipped responses, and retries only the same authoritative dead state. Already accepted transport commands are not replayed after the HTTP observer times out.
- Initial respawn timing uses the existing snapshot-based server clock, preserving native server deadlines and arena rules. No client HP, revision or coordinates are synthesized from incomplete responses.
- A misleading provisional generic notice is omitted without changing status 202, pending flags, authoritative HP, death or reward semantics.
- Authenticated admin load JSON gains bounded local-monster-death callback timings for checkpoint preparation, writer ACK and committed refresh. Missing/stale metrics stay null; no identifiers, SQL, new timers or storage writes are added.

## Exact client delivery

The old R79 game asset remains byte-identical. One effect changes in the new hashed game bundle; its inverse proof restores the old source exactly. HTTP changes only by 351 namespace and 2 game-name substitutions. The immutable asset graph is derived from verified live release rows and included in the in-place crash/rollback journal. A page reload is required after installation or rollback.

## Verification

147 named tests pass: 32 checkpoint, 4 native player-respawn, 9 timing, 2 notice, 27 client effect/transport, and 73 installer/recovery tests. The Node suites are invoked directly with the pinned Node 22.23.4 binary. Actual SQLite/WAL and receipt tests use shipped storage components; the terminal test award is a narrow fixture, not full native loot. Client tests use exact shipped function bodies with controlled hooks/clock and actual transport paths. Installer tests use real files, SQLite, backups, locks, journal and atomic operations with controlled service/HTTP ports.

The partial local checkout lacks 42 exact-current modules, including adventure-service.mjs and nonlethal-rewards-r56.mjs. Missing modules were not replaced by older versions. Full gameplay/server/browser integration and live capacity are not claimed. All 1164 baseline source identities are retained and verified on the VDS before any change; the target has 1166 source rows.

The speculative actor-progress refresh remains outside the release because the missing current adventure projection prevents a complete cache-invalidation proof. Its draft and limits are retained under r82-investigation/progress-draft and excluded from release test counts.

## Reproduction and packaging

The current package, manifest and evidence are under r82-package. The exact game-effect builder and tests are under r82-tests. Tests expect the pinned r81-work/r82-work trees and the existing r79-audit runtime recovered from verified source artifacts.

```bash
r79-audit/runtime/node-v22.23.4-linux-x64/bin/node r82-tests/respawn-client.test.mjs
r79-audit/runtime/node-v22.23.4-linux-x64/bin/node r82-tests/checkpoint-reservation.test.mjs
r79-audit/runtime/node-v22.23.4-linux-x64/bin/node r82-tests/checkpoint-batches.test.mjs
r79-audit/runtime/node-v22.23.4-linux-x64/bin/node r82-tests/checkpoint-sqlite.test.mjs
r79-audit/runtime/node-v22.23.4-linux-x64/bin/node r82-tests/checkpoint-player-respawn-native.test.mjs
r79-audit/runtime/node-v22.23.4-linux-x64/bin/node r82-tests/death-latency.test.mjs
r79-audit/runtime/node-v22.23.4-linux-x64/bin/node r82-tests/reward-notice.test.mjs
python3 r82-build.py --plan-only
python3 r82-tests/installer-run.py
python3 r82-build.py
```

The final build requires evidence/R82_KANIT.json with productionFiles exactly matching the plan. It validates all staged bytes, creates CORE511_R82_TOPLU.zip plus its SHA-256 file, and opens the ZIP with the real installer loader.

## Pending live diagnosis

The original scope/revision races and device-clock delay have reproducible failures. They do not establish the current character's exact cause. A native respawn still rejects a zero/missing timer, an undued deadline, and intentional arena restrictions; an accepted unresolved command still requires authoritative server recovery. The read-only diagnostic under r82-tests/checkpoint-respawn-readonly.py helps distinguish durable death states. Do not clear actor fences, change HP or invent a server-side forced revive based only on the screenshot.
