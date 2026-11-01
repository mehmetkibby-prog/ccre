Native player respawn repair

The isolated process test executes the recovered native GameWriter, four real channel child processes, one real world process, the exact current generated Core511Transport and WebSocket framing over private process streams. It uses a disposable native SQLite database. This is not a live VDS or browser rendering check.

Baseline native rune_v2 respawn moved the actor to bazaar, then its durable event audience was resolved from the updated SQL row against the old rune_v2 room. The resulting player_respawn notification had no actor recipient. Healthy direct result and snapshot still recovered the transport, but the UI has an independent observer timeout and economy snapshot guard. The baseline evidence is preserved in native-respawn-process-evidence-baseline.json and native-respawn-wire-rune_v2-baseline.json.

The repair retains the native old-room observer event and adds one actor-private copy for successful cross-area respawn only. action-writer.mjs validates the event against the native result and the before/after SQL actor rows through respawn-notification-r85.mjs. notification-audience.mjs handles this single explicit event exception without widening the generic native private-event allowlist. It requires one matching actor, valid life revision/HP, valid native event ID, destination area/channel/cycle, and uses existing GM visibility projection. Destination spectators do not receive the private copy; a later scope change drops it. Arena respawns remain on the existing room route. Native SQL, HP authority, receipts, pickup rules and timeouts are unchanged.

The process tests perform real native lethal hit, early rejection, then due respawn with the writer ACK held at least 8.2 seconds after durable commit. Both forest and rune_v2 cases keep one due command, one receipt and one life revision increase. The repaired cross-area case delivers exactly one actor respawn, retains the old-room spectator event, excludes destination spectators, and rejects an old-epoch mailbox read after actual native channel transfer. The exact current client callback independently rejects a respawn from an older death revision; see the client owner's snapshot-vitals evidence.

Validation files: native-respawn-final.tap (default flags, three checks), native-respawn-audience-regression.tap (five existing notification routing checks), native-respawn-release.tap (same focused checks with installer release flags), native-respawn-process-evidence.json (canonical latest native run). Checks are scenarios, not separate defects.

Release configuration command:
  python3 /workspace/ccre/r85_stability_work/tests/runtime/run.py --test /workspace/ccre/r85_stability_work/tests/client/native-respawn-process.test.mjs /workspace/ccre/r85_stability_work/tests/client/native-respawn-notification.test.mjs /workspace/ccre/r85_stability_work/working/core511-source/scripts/core511/tests/notification-audience.test.mjs

The runner uses pinned Node, actual installer release flags, and a loader adapting only historical fixture pin/schema checks for exact current native overlays. Production files execute without loader rewrites.

This fixes a reproduced missing cross-area actor notification. It is not proof that the reported full-game freezes or permanent-death incident had this single cause.
