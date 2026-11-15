# R118 map development findings

Failures were investigated before packaging. The final TAP logs are separate evidence; this note does not replace a test log.

- The first area-allowlist patch accidentally extended the old forest/frozen/black layout initializer. NativeHost startup then reported `Av alanı kaynakları bulunamadı.` Both legacy initializer files were restored to their earlier map scope. New champions rows are created only by the explicit migration.
- A lethal PvP test exposed the existing generic 5% gem-loss SQL. A champions-only exemption now preserves gems; old maps retain their original rule. Tests cover native/memory PvP and death/respawn.
- Early test fixtures omitted ownership/adventure tables, used attacker projections for defenders, or asserted that global boss metadata was absent from world snapshots. Those fixture assumptions were corrected without removing production checks.
- The initial orderly spawn grid was rejected in visual review. Final spawn coordinates are fixed, irregular, species-mixed, separated by at least220px and at least300px from the1800,1950 entry point. Count and IDs remain unchanged.
- `champions-final.log` records the nine passing pre-scatter focused tests; `champions-scattered-final.log` records the focused tests after the requested layout change.

## Release acceptance findings: real 50-player combat

The first legal 50-player Champions run failed with `checkpoint_join_monster`,
then unknown-outcome actor fences/disconnects. Its logs remain in
`load50-final-legal-client/01-champions.log`; the package was withheld.
The existing focused tests had exercised native/shared attack execution but
had not covered the joined checkpoint used by concurrent ordinary combat.

The fix admits only canonical, nonboss, nonstone, nonsummoned Champions
catalog rows, with matching channel, into the existing joined checkpoint and
eager normal reward completion predicates. Existing spawn, held-resource,
actor, ownership, journal and durable receipt checks remain unchanged.

The new map IDs also used underscores, which the existing reward claim
protocol rejects. Because R118 has not shipped, only the new map producer and
parser were changed to hyphenated IDs; existing validators and old map IDs
were preserved. All four internal config keys still use underscores.

`champions.test.mjs` now checks the actual joined checkpoint validation boundary
using real SQLite rows: valid identity reaches the existing SAVEPOINT, while
foreign channel, stale spawn, unlocked target, boss, stone, summon and forged
identity fail before any write. This is explicitly a boundary test, not a
fabricated successful commit.

`champions-checkpoint-host.test.mjs` separately uses the actual authenticated
owner stream under release flags and the production schema certificate:
nonlethal hits, a durable kill, normalized reward claims and replay, then
collection of exactly one configured crown and three essence. It waits for
persisted defeat completion, not the early lethal visual reply. This solo
fixture uses the legitimate shared fallback; it is not presented as proof of
joined-path concurrency. The final legal 50-player run supplies that coverage.
Early test experiments that wrongly demanded a joined marker from this solo
fallback are retained in `champions-checkpoint-host-*.log`; those failures were
coverage assertions, not gameplay exceptions.
