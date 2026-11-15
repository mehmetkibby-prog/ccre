# R118 original royal and champion artwork

Original image-generation sources are retained in `sources/`; prior live art is
not modified. `pack_assets.py` performs deterministic transparent-cell packing,
foot-anchor normalization and WebP encoding. The generated lion sheet initially
had a white background; an image-generation background-removal edit produced the
clean transparent source included here. No fake animation offsets are used: every
monster has five distinct locomotion poses and five distinct attack poses.

The monster packer extracts ten separate connected character silhouettes before
packing them. This preserves long blades/limbs that extend beyond nominal source
sheet grid lines; fixed-grid cropping is not used for those figures.

`manifest.json` lists immutable names, SHA256, dimensions and compressed sizes.
`validate_assets.py` verifies hashes, dimensions, alpha, distinct animation frames,
transparent margins, fixed monster foot baseline and a 2.5 MB delivery budget.
`previews/contact-sheet.jpg` is an asset contact sheet, not a live game screenshot.

The active module is `working/core511-source/scripts/core511/royal-visuals-r118.mjs`.
It exports `ROYAL_MEDIA_R118`, `royalItemIconR118(kind, role)`, and the two bounded
royal armor/weapon effect functions. Package builders copy only `optimized/*.webp`
listed in the manifest into the immutable client namespace, alongside the built
module; source PNGs and development previews are not runtime payload.

- Hero: 1920×1098, six columns × three class rows. Class order is muhafiz, avci,
  arkanist. Poses match the existing emerald skin's animation contract.
- Equipment: 768×512, three columns × two rows; top weapons muhafiz/avci/arkanist,
  bottom helmet/necklace/shoes. Upright weapon attachments match existing pivots.
- Armor loot: separate 256×256 transparent image.
- Inventory: nine separate 128×128 transparent icons, approximately 4–9 KB each.
- Monsters: four 1280×512 transparent atlases, five columns × two rows; frame size
  256×256, foot y=232, facing right, locomotion row 0 and attack row 1.
- World: 1536×1024 opaque map art for the 3600×2400 map. The central playable area
  is open, with decorative architecture around the exterior. Art is not collision.

Runtime textures are shared and should be lazy-loaded for the champion map or
visible royal equipment. All delivered art together decodes to about 27.6 MB RGBA;
this is not an always-loaded startup budget. The FX functions use one shared small
atlas and at most 96 sprite draws per canvas/frame (48 at reduced quality), reserving room for the local
player. No growing particle arrays, canvas filters, timers or per-player textures.

Local Canvas benchmark: `canvas-benchmark.json` retains the initial three-repeat
50-actor measurement. The later runs overlapped active Node/test processes, and
even the no-FX baseline recorded frame delays. These timings are not clean
performance acceptance. They exposed that reduced quality still consumed the full
shared budget; the final module caps reduced quality at 48 draws. A clean serial
rerun was deferred until other heavy checks completed; final results follow below. An initial benchmark harness
import path failed before running; its repository-relative path was corrected.

Clean serial final measurement completed after other heavy tests stopped:
`canvas-benchmark-clean-final.json` and `canvas-summary-clean-final.json`. Each
mode rendered 50 actors in three repetitions. Full-effect draw-submission p95
median/worst was 2.1/4.8 ms; p99 median/worst was 3.1/7.2 ms. Reduced-effect p95
median/worst was 1.9/3.1 ms. Total draw calls were 191/full, 139/reduced and
101/no-effects. Cgroup throttling delta was zero. One full-effect RAF interval
exceeded 50 ms in the third repetition; this remains in the evidence and does
not establish zero stutter. This is an art-only local Canvas measurement, not a
server/network or live-device capacity guarantee. No game runtime or art assets
were changed for this final measurement.
