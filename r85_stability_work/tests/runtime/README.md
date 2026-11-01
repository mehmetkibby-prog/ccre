# Current native integration fixture

Run from any directory:

```sh
python3 /workspace/ccre/r85_stability_work/tests/runtime/run.py --test tests/runtime/r84-host-smoke.test.mjs
```

The runner verifies the exact Node v22.23.4 binary SHA256 and uses the published
R84 installer feature flags. It supplies `COL_CORE511_BASE` for the isolated
current native source tree and inherits the fixture loader into child processes.
It also reads the installer's R61 Node startup policy and enables `--no-lazy`
when `CORE511_R61_EAGER_REWARD=1`, matching the game service command line.

Earlier baseline/calibration and `r85-final` 10/30-player timing runs omitted
that main-process command-line argument. They remain diagnostic evidence with
that limitation; they are not final installed-startup performance acceptance.
The writer's explicit eager/lazy comparison is preserved separately.

The loader changes **test fixtures only**. It preserves the baseline manifest
hash check and replaces exactly two historical expected native entries with the
published R78 SQL timing and R80 WAL checkpoint SHA256/length entries. Every
present native source still passes byte and hash verification. It permits only
the eight recorded absent non-executable `.d.mts` declarations and initializes
the existing tower/adventure schemas in the old small PvP fixture.

Guild entry can use the recorded type-erased native `guild-village-runtime.ts`
fixture when its built chunk is absent. Both the native TS source and erased
fixture hashes are checked. This is an explicitly identified source fixture;
it does not establish the identity of the missing built chunk. Its event
publication imports remain unavailable and will fail if exercised.

The initial host smoke started the real native SQLite host, writer, world, four
channel processes, explicit channel admission, and WebSocket handshake. It did
not start the complete HTTP/browser application or contact live services.

`r84-baseline/` preserves all 1,167 R84 core files with aggregate identity
`a0e0bcdfd87717a3d5129a0a30d29bda5a4f85639a2b68773af556f19bda6365`.
Its native/dependency links point to the separately copied current native source
tree. The normal `working/` core is the evolving R85 candidate and has a different
identity once candidate changes are applied.

Bounded workload (default: immutable R84 core):

```sh
R85_RUNTIME_LABEL=r84-calibrated python3 /workspace/ccre/r85_stability_work/tests/runtime/run.py tests/runtime/native-mixed-load.mjs 10 30
```

Player stages accepted: 1, 10, 30, 50, 100. Duration: 10–180 seconds. It starts
coordinator and world periodic jobs and measures native read work, main reader
await duration, writer ACK duration, command ACK percentiles, loop pauses, and
durable potion/material/kill outcomes. Its workload includes two native lethal
hits and two seeded material drops per actor, followed by nonlethal combat.
It does not certify all game mechanics, actual browser motion/FPS, WAN latency,
natural progression, or prolonged load. Timing includes the local generator and
any other concurrent activity in this shared environment.

To test a final candidate, set `R85_RUNTIME_TREE` to its complete runtime root,
`R85_RUNTIME_LABEL` to a fresh evidence label, and `R85_EXPECT_CORE_SHA` to its
verified aggregate core SHA256. Never substitute a changed source under an old
evidence identity.

Final realistic transport mode uses the selected runtime's actual
`Core511Transport` and `OwnPrediction`. A 50 ms input timer lets those modules
enforce their 200 ms authoritative movement, 50 ms motion previews, two input
slots and unchanged 600 ms prediction limit. The earlier mixed workload chooses a fixed
1.3-second attack cadence and35% potion threshold; these are slower/different
than current UI autoattack and auto-potion policy. Potions wait at least two seconds;
heartbeats repeat every five seconds. Half the actors have active rank progress.
Scripted lethal rounds and material drops are followed by visible natural
respawns and nearby owned loot when available. At 100 actors, each channel owns
25 actors. The original `native-mixed-load.mjs` puts its generator inside the
main process and relays browser WebSockets through the test ProcessStream
adapter. Preserve its results with that attribution limitation.

The final isolated harness runs the same client pacing functions in a separate
OS process. Real TCP passes through `delivery511/runtime-ingress.mjs` in the
main process, including its private proxy authorization and ordinary TCP pipe,
then reaches the native channel listeners. Native Origin/ticket/ownership
checks stay active. This is the architecture selected by the R84 installer
entry path. The ingress file is pinned archived R62 content; its exact live R84
byte identity is not established. See
`../../evidence/generator-isolation-provenance-r85.json`.

```sh
R85_RUNTIME_TREE=/workspace/ccre/r85_stability_work/working \
R85_RUNTIME_LABEL=r85-final5 \
R85_EXPECT_CORE_SHA=82a974b7e7ff1f0e1d657d553f34bc4cdd51ab589eb8ec34254b425e48e07ed4 \
R85_EXPECT_INGRESS_SHA=325bd1caa7c52df9df159b63afa3cd7faf470f2cdae3f513a5c4ca29f655cec9 \
python3 /workspace/ccre/r85_stability_work/tests/runtime/run.py tests/runtime/native-mixed-load-isolated.mjs 100 180
```

Run stages sequentially after all functional checks. Inspect the preceding
stage's errors, durable outcomes, maximum ACK/queue age, process loop pauses,
RSS, client queue size and prediction cap episodes before scaling. These are
bounded local diagnostics, not a production-capacity or rendered-stall proof.
The final durations are 30 seconds for 1/10 actors, 60 seconds for 30/50, and
180 seconds for 100. Generator CPU/ELU/RSS is separate from game-owner metrics,
but it still competes for this host's four-core quota. Outer Caddy/TLS, WAN and
browser rendering are not measured. HTTP admission/rare transport fetch uses
explicit private fixture RPC; gameplay WS bytes follow the main TCP gateway.
The candidate ingress adds only `noDelay:true` to the upstream connection. Both
core and delivery identities are mandatory, checked again after each run.
Extra source-transform loaders are prohibited in this final harness.

Read-only cadence correction: current UI basic attack uses
`max(120, round(650 / (1 + clamp(attackSpeed, 0, 80) / 100)))`, plus returned
server deadlines. Auto-potion polls every500ms at HP<=50%, with ownership,
enabled-state and two-second minimum checks. See
`../../evidence/hold-and-input-review-r85.json`. Existing raw runs retain their
original fixed1300ms/35% workload; a new four-generator variant is being
prepared for final acceptance. Actual UI prediction runs on RAF, while these
transport harnesses explicitly feed20Hz frames and retain the600ms limit.
