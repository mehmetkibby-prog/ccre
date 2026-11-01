# Rejected world notification during the frozen load

The load fixture creates player IDs as `runId + ':' + n` (`tests/runtime/native-mixed-load-realistic.mjs:57`). Native `broadcastWorldEvent` rejects any `message.player_id` outside `/^[A-Za-z0-9_-]{1,80}$/` (`generated/notification-rules.mjs:57`). A colon is therefore deterministically invalid. Normal native character creation uses `crypto.randomUUID()` (`working/native510-bb3a6cc689c6/dist-vds/server/index.js:25921`).

The exact generated attack/action rule factory has one world publisher call, in `broadcastAnnouncement` (`generated/attack-writer-rules.mjs:2954`). `announceRareDrop` inserts a world message and retains `player.id` verbatim (`2940–2949`). The two call sites announce a purple reward (`3678`) or collected red/purple equipment (`6545`). Neither combat hit nor level-up events use this world publisher. The broader native HTTP server also invokes the same publisher for GM announcements (`dist-vds/server/index.js:32070`) and ordinary world/trade chat (`33636`). The mixed generator sends gameplay actions, not GM/chat requests.

`rare-announcement-fixture-id-r85.test.mjs` extracts the two unchanged producer declarations with Acorn and runs their actual SQL through production `nativeAtomicStatements` against in-memory SQLite. It passes the resulting event through the complete current native notification validator and `notificationViews`. Both purple and red cases passed:

- Colon actor: zero realtime recipients and `invalid_world_event`; notificationViews emits the exact `core511_notification_skipped invalid_world_event` warning (rate-limited, so one warning for the two immediate cases).
- Valid UUID twin: one realtime recipient. `message.player_id` is the sole event difference.
- Calling the producer twice retains one message and emits one event, preserving its SQL deduplication.

Run:

```sh
python3 /workspace/ccre/r85_stability_work/tests/runtime/run.py --test /workspace/ccre/r85_stability_work/tests/client/rare-announcement-fixture-id-r85.test.mjs
```

The TAP and `rare-announcement-fixture-id-r85-evidence.json` contain results and source/declaration hashes. This is a component test with real SQLite, controlled clock, and captured publication port. It is not a new native-process/load run. Production source was not changed.

The log at `evidence/native-mixed-load-r85-final-exact2-30.log:5` does not retain the rejected payload, and fixture teardown removed the database. Thus this proves a concrete fixture incompatibility that produces exactly this diagnostic, not the specific original event body or timestamp.

For this reproduced event, immediate realtime announcement delivery is lost. The persisted message survives; source inspection shows `generated/cold-world-rules.mjs:765–766` can read active announcements without inspecting their player ID, but this test does not claim that a later snapshot actually displayed it during its seven-second lifetime. Native collection commits item transfer before requesting the cosmetic announcement (`generated/attack-writer-rules.mjs:6536–6548`), and the notification guard skips malformed cosmetic delivery rather than failing the transaction. This is not evidence of lost equipment, combat state, or a channel freeze.

Use valid UUID/hyphen IDs in future load fixtures. Keep the production validator unchanged. Historical load evidence should retain this notification-coverage limitation rather than be described as validating every cosmetic world event.
