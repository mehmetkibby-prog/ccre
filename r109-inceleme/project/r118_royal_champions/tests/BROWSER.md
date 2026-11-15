# R118 browser checks

Run after the current client build has generated its immutable proof and assets:

```bash
REVIEW_NODE=/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node \
python3 project/r118_royal_champions/tests/runtime-browser-matrix.py
```

Run from `r109-inceleme`. The driver uses `R102_TEST_REALM` because the repository runner intentionally overrides direct `CORE101_REALM_ID` environment values. The matrix runs r1/r2 × desktop/mobile serially and stops on a failure. Set `R118_BROWSER_RESUME=1` to retain already successful reports only when their generated game bundle name matches the current proof.

The game tests load the actual generated portal/game modules, native HTTP routes, SQLite writer, four channel processes, and production WebSocket socket handoff. All accounts, inventory, settings and writes are isolated fixtures. The flows cover real NPC clicks/touch, the town-menu entry, confirmations, exact material consumption, Haso salvage, categorized map travel, actual monster damage, disengagement and return, and both new admin saves. Mobile uses 844×390 gameplay and 390×844 admin.

The full compiled admin component uses its production framework and CSS. External admin identity and the existing overview's data projection are controlled fixtures. The unchanged central-account launch card is supplied a read-only projection of the real isolated launch service; its authorization/mutations are outside this test. New admin requests run through the actual compiled authorization handler and real settings services. Its separate Vinext page hydration bootstrap is held pending because this admin shell is not an actual SSR response; React's recoverable empty-shell hydration notice is suppressed, while application errors are asserted absent. This does not claim full SSR/admin-provider integration or live-VDS coverage.

Mobile labels are cached in detached canvases. The test follows a label's cached `drawImage` into the visible canvas to locate real touch coordinates; it does not treat cache pixel coordinates as screen coordinates. No game code is modified by this hook. NPC interactions also wait for the previous dialog’s exit portal to release pointer input and assert that the real canvas is the top hit target; they never force clicks through an overlay.

`stage-browser.mjs` stages cached immutable dependency modules plus current generated roots with the standard client asset staging function. Package installation/graph integrity is a separate parent-owned check. Genuine legacy public media absent from the older cache is recorded in `evidence/runtime-media.json`; no placeholder images are used. The staging script verifies those sizes and SHA256 values; if the disposable media cache is absent it downloads only the recorded public read-only URL and rejects a digest mismatch.

The final matrix report, individual HTTP/input logs and screenshots are written under `evidence/runtime-browser-*`. These are functional/UI tests, not player-load or latency measurements. Full runtime asset staging is a disposable local cache and is not a deployment artifact.

The earlier candidate passed four gameplay cases on namespace `core511-50776109cf7b82b1`; that evidence is now archived under `evidence/before-canonical-monster-ids`, because canonical monster IDs and subsequent backend repairs require a fresh final matrix. Separate `ADMIN_ONLY=1` captures live under `runtime-admin-preview-*` and never replace full-game reports; they add the legacy Akademi read fixture metadata for clean screenshots. Realm banners and prior configuration are fixture state, not a statement about current production availability.

The final-ID harness additionally checks the actual fixture realm, canonical hyphenated IDs in native browser frames, real draw calls using all four champion sprite atlases, and all four Turkish monster names drawn on canvas. These assertions do not substitute for the separate backend checkpoint/reward and 50-player tests.

Final canonical-ID verification: all four realm/layout cases passed on `core511-c4d0f4d061896a4e` / `game-client-core511-r118-a4d21f5a07c2cb04.js`, seven functional checks per case. Each report records 48 champion-area IDs, four actual sprite-atlas draws and four Turkish names; champion combat targets explicitly exclude global boss HUD metadata. Final admin screenshots are also present in the corresponding full-run folders. No subsequent UI runs are required for this frozen build.
