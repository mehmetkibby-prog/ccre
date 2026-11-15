# R118 map development findings

Failures were investigated before packaging. The final TAP logs are separate evidence; this note does not replace a test log.

- The first area-allowlist patch accidentally extended the old forest/frozen/black layout initializer. NativeHost startup then reported `Av alanı kaynakları bulunamadı.` Both legacy initializer files were restored to their earlier map scope. New champions rows are created only by the explicit migration.
- A lethal PvP test exposed the existing generic 5% gem-loss SQL. A champions-only exemption now preserves gems; old maps retain their original rule. Tests cover native/memory PvP and death/respawn.
- Early test fixtures omitted ownership/adventure tables, used attacker projections for defenders, or asserted that global boss metadata was absent from world snapshots. Those fixture assumptions were corrected without removing production checks.
- The initial orderly spawn grid was rejected in visual review. Final spawn coordinates are fixed, irregular, species-mixed, separated by at least220px and at least300px from the1800,1950 entry point. Count and IDs remain unchanged.
- `champions-final.log` records the nine passing pre-scatter focused tests; `champions-scattered-final.log` records the focused tests after the requested layout change.
