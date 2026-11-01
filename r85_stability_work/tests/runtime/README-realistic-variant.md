# R85 exact-cadence, four-generator variant

This is a new workload variant. The existing `native-mixed-load-isolated.mjs` and `native-mixed-generator.mjs` remain unchanged for matched comparisons. Previous results keep their original meaning; they used 1,300 ms attack pacing, a 35% HP check in the frame loop, and manual potions. They are not equal-workload comparisons with this variant.

The new parent is `native-mixed-load-realistic.mjs`; its child is `native-mixed-generator-realistic.mjs`. It starts up to four OS client generators, one per channel, using the actual current `Core511Transport` and `OwnPrediction`. Sequential native admission, per-child 5 s setup heartbeats, native signed fixture auth, and main `startIngress` authentication/TCP forwarding remain intact. HTTP admission/image requests use private fixture IPC. Main ingress source is the pinned archived implementation plus the approved `noDelay` change; this is not byte verification of the live R84 delivery source. The original production channel listeners and current native core execute the gameplay.

The parent requires explicit expected core and actual disk ingress SHA-256 values and retains installed `--no-lazy` startup. It forbids extra dynamic source-transform loaders. No production file is changed by this harness.

## Cadence and economy

- Basic attacks use the current native `calculateEquipmentStats` on the current world inventory/settings/own-player projection and `max(180, effectiveAttackCooldownMs(650, attackSpeed))`. This matches the built R84 client `ru`/`iu` formula: speed clamps to 0–80%, and the 180 ms global minimum does not bind the minimum 361 ms basic cooldown. Native `cooldownRemainingMs` or `nextAttackAtMs` extends the optimistic deadline. `nextAttackAtMs` uses the client's observed world server clock. Only native status429 with exact `basic_attack_cadence` and a usable deadline is a normal recorded retry; all other negative results remain errors. Raw status counts and every cadence retry are retained.
- Automatic potion polling is a separate 500 ms timer, with HP >0 and <=50%, owned/enabled, non-arena/non-war, one potion request in flight, and a 2 s minimum. It sends `automatic:true`, so it consumes HP charge, not manual potion inventory. It can queue behind another transport action, as the actual client can.
- Fixture seeded HP/maxHP is 100,000/1,000,000. The valid partially used automatic package has total1,000,000 and remaining900,000, owned/enabled1. Admission records actual projected/SQL HP and requires0<HP<=100,000 with maxHP1,000,000 and the original automatic/manual stock. Native world ticks may damage earlier entrants while later players join; that damage is retained, so the HP deficit remains at least900,000. There is no setup HP reset or timed HP injection. The independent final oracle requires charge0, owned/enabled0, total1,000,000, at least one real automatic heal, and manual potions64 unchanged.
- A small SQL observation before/after each automatic potion actor records charge debit and that actor's ACK details, including all entries in the native `batchPotionsR61` envelope. Native SQL debits exactly the healed HP, so the report labels the healing amount as derived from charge debit; it does not subtract stale client HP. Positive no-op ACKs remain visible. Two extra local read statements per automatic actor request are observation overhead. Final stock expectations are independent of this telescoping trace.
- The arranged high-HP target, two scheduled lethal lives and two material drops per actor remain. Natural respawns and visible owned loot are attempted afterward. Rank fixtures use native level40→65 entry and quest triggers. There is no combat warmup.

The input generator runs at20Hz, while the real game uses browser RAF. Frame integration clamps at250 ms, matching the built game. Actual transport pacing remains5Hz authoritative movement,20Hz previews,two slots, and the unchanged600 ms prediction limit. This measures protocol/prediction behavior; it does not render canvas/DOM or measure visual FPS. Browser visibility is held active. Movement follows an arranged circle rather than human input.

## Window and resource accounting

All children share `performance.timeOrigin + performance.now()` from the parent as their epoch. ACK offsets, generator frame gaps, prediction-limited samples, and each cap episode's start/end use that epoch. Cap intervals are sampled at20Hz; they are not continuous browser render measurements.

Each child suspends prediction and drains pending commands before sending its small completion notice. Parent `endLoad` runs only after all notices. Every native owner measurement finishes before any large child report is requested. Generator CPU snapshots intentionally include idle waiting after their own drain through the final report request; each child's resource start/end and gameplay-drain offset are retained. Serialization of its report starts after that child's CPU snapshot.

Aggregate client CPU is the sum of CPU milliseconds divided by one shared elapsed window, never by summed durations. Aggregate ELU uses summed active/idle time; each process's ELU and maximum pause are also retained. The sum of lifetime peak RSS values is conservative and is explicitly not simultaneous server-owner memory. These client processes still compete with the native server under the same host CPU quota. Server-owner CPU/ELU/RSS remain in native diagnostics.

Raw `passed` covers native economy, transport health, no input cancellation, drained slots, and unchanged source. Performance acceptance remains a separate gate; caps, ACK tails, generator saturation, and historical metric scope must be reviewed. There is no sample exclusion or prediction-cap increase.

## Commands and proof state

Use the existing pinned runner, with freshly verified exact source hashes:

```sh
R85_RUNTIME_TREE=/workspace/ccre/r85_stability_work/working \
R85_EXPECT_CORE_SHA=<exact-core-sha256> \
R85_EXPECT_INGRESS_SHA=<exact-ingress-sha256> \
R85_RUNTIME_LABEL=<unique-label> \
python3 tests/runtime/run.py tests/runtime/native-mixed-load-realistic.mjs 10 30
```

`R85_ADMISSION_ONLY=1` with `1 30` performs only one native admission, authenticated TCP handshake, image, setup drain and seed assertions. It does not begin a load window or run gameplay. The nominal duration argument is unused in that mode.

Preparation has passed Node22 syntax checks. No native admission or load has been run by the variant author yet. Native admission and subsequent final load stages require the coordinator's explicit scheduling signal so they do not compete with correctness proofs. The intended final stages are1/10 players for30 s,30/50 for60 s,100 for180 s, subject to lower-stage safety and latency gates.
