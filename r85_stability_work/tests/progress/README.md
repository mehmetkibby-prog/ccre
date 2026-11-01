The R85 progress refresh change addresses a reproduced unnecessary full cold reload after an ordinary rank or battle-pass progress update. It changes `actor-section-reuse-r52.mjs` and adds `actor-progress-refresh-r85.mjs`. No schema, reward calculation, ownership, receipt, checkpoint, or durability boundary changes.

The existing bounded actor-section proof still validates the entire recipient group before applying any change. The new helper accepts only finite, bounded, monotonic rank XP and rank quest counters, and same-season battle-pass XP. It updates nested owner rank fields along with the authoritative player row. Tier, level, equipment, stat, unlock, cosmetics, season, unknown-column and unknown-table changes retain the complete reload. Missing or stale projection data also retains that path.

The earlier R82 draft was excluded because the exact Adventure source was missing. R85 uses the recovered exact Adventure implementation. The native differential test now reads the complete actor-world bundle through a real read-only SQLite worker, changes all six progress fields under the native schema and triggers, and compares every cold field. The test includes nonempty Adventure inventory and a portal, checks the exact Adventure functions through a player-property proxy, and verifies that a native rank-tier promotion refuses the fast path. This also caught the separate dungeon raw player mirror. The production change refreshes that mirror from the same committed row through the existing synchronous `DungeonChannel.refreshActor` method.

Hydration consumer review: `CombatFrames.frame` overlays raw player fields from `c.view`; its rank bonus cache keys are level/tier/unlocks/cosmetics. `ResidentServices` stores only guild and Adventure profile inputs. Adventure stores the unchanged bundle by actor ID; Castle stores guild membership; maintenance stores account/actor IDs; AFK and mounts read the current `c.view` player. Membership, fishing, gear, premium state, guild state, materials and Adventure output are unchanged in the full native comparison. The new patch changes no rank-derived stats.

Commands, from the work root:

```sh
python3 tests/runtime/run.py --test tests/progress/progress-refresh.test.mjs tests/progress/native-progress.test.mjs
python3 tests/runtime/run.py --import ./tests/progress/register-progress.mjs tests/progress/native-progress-ack.mjs
R85_PROGRESS_CANDIDATE=1 python3 tests/runtime/run.py --import ./tests/progress/register-progress.mjs tests/progress/native-progress-ack.mjs
```

The last two runs use the pinned R84 baseline tree. A local fixture loader applies only the two progress modules for the candidate and exposes a read-only child snapshot. The supervisor clears CLI exec arguments, so this fixture explicitly propagates its loader through `NODE_OPTIONS`; production does not use this loader. Both runs use real SQLite, the native writer, four OS channel processes plus world, and actual WebSocket framing over the isolated OS IPC stream.

Evidence: `evidence/progress-tests-r85.tap` contains 18 passing checks. `progress-native-differential-r85.json` records complete cold projection coverage. `progress-native-ack-r84.json` and `progress-native-ack-r85.json` each contain six real ranked kills followed immediately by movement. The baseline issued six actor-world reads; the candidate issued zero. Both credited 34 rank XP exactly once per kill and ended at 304, with resident player, owner nested rank, and dungeon player matching SQL. There were no faults. Attack input ACKs are provisional 202 replies; the script separately measures the following movement ACK while completion remains pending.

Observed movement ACK median/max was 69.49/98.56 ms for baseline and 46.19/86.34 ms for the candidate. These small shared-machine runs establish the removed reads and preserved behavior, not a capacity claim or the live server's root cause. Crowded final load testing is intentionally left to the combined final candidate. No VDS, live database or browser was used. The production file hashes and complete limits are pinned in `evidence/progress-summary-r85.json`.
# Material reward mirror regression

The additional R85 review reproduced a ranked kill that grants materials and
uses the progress fast path: SQL and `dungeonMaterials` became 10, while public
Adventure, resident Adventure and Dungeon material inventories stayed 7. The
isolated native test installs a direct-material award trigger in its temporary
database so the actual reward worker executes the grant with a real lethal
hit. The new complete material mirror helper updates all four views after the
durable ACK. All recipients are validated before any state changes.

`native-material-progress.test.mjs` compares the full readonly native actor
bundle for both rank+material and rank+material+portal commits. Portal closures
apply before the material pass, which merges current bundles and preserves the
new raw and public portal lists. A missing later recipient's material mirror
retains the complete group fallback without partially updating earlier actors.

```sh
python3 tests/runtime/run.py --test tests/progress/progress-refresh.test.mjs tests/progress/native-progress.test.mjs tests/progress/native-material-progress.test.mjs tests/collect/native-collect.test.mjs
R85_PROGRESS_CANDIDATE=1 R85_PROGRESS_MATERIAL=1 R85_PROGRESS_LABEL=r85-material-after python3 tests/runtime/run.py --import ./tests/progress/register-progress.mjs tests/progress/native-progress-ack.mjs
```

The before/after real-channel reports are
`evidence/progress-native-ack-r85-material-before.json` and
`evidence/progress-native-ack-r85-material-after.json`; the before report is an
intentional failing reproduction. No live server is involved.

