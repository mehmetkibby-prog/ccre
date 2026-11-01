# Adventure scheduler baseline and candidate review

The current baseline `adventure-channel.mjs` SHA-256 is `452af5eb132fda60e4cb6500772fa0d5aeb4dffe012f1bb90a07351e28e947c4`. Its `tick` returns on the first due run (line 33), even when `execute` declines admission because an actor is barred/suspended/quiescing (line 37) or a resource lane is unavailable (line 39). The declined run remains due, so later independent rooms are skipped on subsequent ticks too.

Run the focused reproduction from any directory:

```sh
python3 /workspace/ccre/r85_stability_work/tests/runtime/run.py --test /workspace/ccre/r85_stability_work/tests/client/adventure-scheduler-review.test.mjs
```

The canonical result is `adventure-scheduler-review.tap`: 5/5 tests passed, asserting the unwanted baseline behavior. `adventure-scheduler-review-evidence.json` records source hashes and observations. These tests import the complete production AdventureChannel, FixedLoop, ResidentState, and ResourceLanes. Writer/checkpoint ports are controlled. They are component reproductions, not native-process, SQL, live latency, or full-game FPS measurements.

- An alive actor A with an expired room deadline and a real `FixedLoop.durableGroup` barrier prevents due independent B/C from being submitted for 20 ticks. This holds for both Mist and Tower. After barrier release, A/B/C each submit exactly once under the controlled closing ACK.
- Calling actual `kernel.quiesce` during that barrier, then settling it and completing quiescence, leaves the owned actor suspended. The due room continues suppressing B/C across 40 ticks spanning quiescing and suspended states.
- A real conflicting room ResourceLanes lease reproduces the same refusal.
- Exact DungeonChannel `ready`/`tick` and DungeonLoop `ready`/`tick` visit B/C with the same actual A barrier. Their start/step outputs are controlled; both use `continue` on a blocked room.

Natural reachability follows from existing contracts, without requiring a dead-player state race. `action-loop.mjs:57` starts a per-actor durable group, held through checkpoint draining, native submission, ACK, and committed reload (through line 90). `fixed-loop.mjs:53` sets that actor's barrier; this does not pause the channel. An adventure deadline, wave deadline, or hazard can become due during that wait. `channel-runtime.mjs:102` invokes adventure ticking unless the global-control barrier is held, independently of an ordinary actor's barrier. `AdventureService.step` at `adventure-service.mjs:195` performs the actual timeout/death/wave transition; a refused admission never reaches it, so the due condition persists. Trusted quiesce at `fixed-loop.mjs:145–161` similarly holds an actor through draining and suspension while it can still remain owned in the room. The reproduction uses an expired deadline specifically to avoid depending on simultaneous death/combat mutation assumptions.

Kadim Tower and Sis both use this AdventureChannel. `adventure-maps.mjs:3–4` explicitly states these maps have no DungeonEngine instance. The separate DungeonChannel at `dungeon-channel.mjs:71–74` and DungeonLoop at `dungeon-loop.mjs:17–23` already continue past blocked rooms.

Read-only review of isolated candidate SHA-256 `d06f6cadc996a03ccded2a8c82bb8aa4a2e7aeb8ea39bd41d2d6894ec3301b0d` found no defect within this scope. Its two pre-work refusal branches return false; only explicit false allows the next room. Started work returns true with pending installed. Undefined, throws, and unknown/error outcomes stop the scan. The empty expired-room branch has the same admission handling. Scheduled portal priority, mutation/receipt behavior, and failure fencing remain unchanged. The candidate's 24-test suite covers two kinds and seven block conditions, four-room progress, delayed ACK, error/unknown outcomes, and scheduled portal priority. This establishes progress past blocked rooms with at most one admitted operation per tick; it does not establish general round-robin fairness or eliminate downstream shared writer/checkpoint waits.

No production source was edited by this review.
