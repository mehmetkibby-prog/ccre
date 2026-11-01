# R85 committed material collection refresh

The 30-player diagnostic showed two synchronized material collection waves
causing 30 complete `kernel511_actor_world` reads each. The existing local
collection fast path rejected the `dungeon_materials` table. The SQLite commit
was already fast; the resulting actor reads held the command lanes longer.

The production change is limited to `collect-light.mjs` and the new
`collect-materials-r85.mjs`. It captures the complete material inventory inside
the existing native transaction and applies it only after the existing durable
ACK. The native collection SQL, ownership, party routing, receipt, bag rules,
and action epochs are unchanged. The additional TEMP audit rejects material
changes belonging to another actor. Unknown tables, player shape changes,
missing resident mirrors, malformed amounts, and inventories exceeding 128
rows retain the full actor read.

All material consumers are updated together: projected `dungeonMaterials`,
projected Adventure tower inventory, the resident Adventure bundle, and the
Dungeon material map. Adventure projection caches and slim reload images are
invalidated through their existing interfaces. Existing tower configuration,
portals, memberships, other material amounts, and equipment inventory remain
intact.

The same helper is also used by `actor-section-reuse-r52.mjs` for committed
reward material sections. The combined plan validates every actor before any
mutation, applies a prepared portal update first, and then merges material
inventory into the current public and resident Adventure bundles. This avoids
restoring a captured bundle that predates a portal created by the same reward.
See `tests/progress/native-material-progress.test.mjs` for the full native
material/rank/portal differential and the progress README for the real-channel
regression.

Run the native differential and guard tests:

```sh
python3 tests/runtime/run.py --test tests/collect/native-collect.test.mjs
```

These four tests cover all 14 native material kinds, both inserting a new stack
and adding to an existing stack, comparing the entire native readonly
actor-world bundle. The fixture uses real native SQLite schema and action
rules. It includes nonempty Adventure portals and unrelated tower material.
Additional injected native SQL triggers prove fallback on quest journal
writes, player XP changes, and foreign inventory writes. Bounds, missing
mirrors, whole-recipient validation, and stale epochs also fail closed.

Run the isolated actual channel comparison:

```sh
python3 tests/runtime/run.py --import ./tests/collect/register-collect.mjs tests/collect/native-collect-ack.mjs
R85_COLLECT_CANDIDATE=1 python3 tests/runtime/run.py --import ./tests/collect/register-collect.mjs tests/collect/native-collect-ack.mjs
```

Both runs use the exact R84 baseline tree, pinned native SQLite, four real OS
channel processes plus world, actual WS framing over OS IPC, and the installed
`--no-lazy` startup policy. The candidate loader replaces only the two material
collection modules. Its extra process message is a read-only test snapshot.
The 14 material pickups occur with a full 35-slot equipment bag. Each resident
material view is compared with durable SQL. The test also holds a completed
writer ACK to prove no earlier resident update, replays the durable receipt,
checks duplicate rejection, adds an offline party peer through the permanent
mutation interface and verifies the shared essence split and unchanged XP,
then verifies full-bag equipment rejection.

Reports and logs are in `evidence/collect-native-*`. The relevant performance
result is removal of the 14 complete actor reads. Single-actor timing is a
local diagnostic dominated by the channel tick; it is not a crowd capacity or
live-server result. The final combined crowd test is scheduled separately.
