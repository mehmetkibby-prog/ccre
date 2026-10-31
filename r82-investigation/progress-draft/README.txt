R82 PROGRESS REFRESH CANDIDATE — DRAFT ONLY, EXCLUDED FROM RELEASE

Decision
The candidate was removed from r82-work. The production
actor-section-reuse-r52.mjs is restored byte-for-byte to R81. The new helper is
not present in the production tree. Do not package these draft files or count
the progress-* tests toward R82 release acceptance.

Proven observation
The exact R81 ResidentChannel.applyCommit + actor-section-reuse source, with
controlled external ports, falls back to a full actor load when only rank XP,
one of four rank counters, or battle-pass XP changes. The draft can avoid that
load while producing the same owner player projection as the actual native
createWorldPlayerProjector, including nested rank.xp and rank.kills. Merely
adding rank_xp to the scalar allowlist demonstrably leaves nested rank.xp stale.

Unclosed dependency that blocks shipping
core511-source/scripts/core511/cold-world.mjs, ColdWorldReader.read, always
assigns:
  data.adventure511 = publicAdventure(readAdventureBundle(this.sql,
      this.sql.prepare('SELECT * FROM players WHERE id=?').get(auth.player.id)))

The exact deployed adventure-service.mjs containing readAdventureBundle and
publicAdventure is absent from the recovered latest source graph. This call is
not restricted to adventure maps: normal forest/frozen/black/ancient/sanctum
snapshots also go through it. AdventureChannel retains a per-player adventure
bundle even on normal maps. The client reads towerInfo/inventory/portals in
addition to a currently active run, so run=null does not prove independence.
Likewise, the current output being null or absent would not prove that an XP
change cannot cause a previously empty derived output to become nonempty.

Consequently, the additional raw player fields cannot yet be proved independent
of every cached cold projection. The native owner player rank proof alone is
insufficient. No older adventure-service implementation was substituted, and no
production stub was added. Reconsider only with the exact deployed source and
tests covering its output and bundle semantics.

Validated local draft scope
16 named tests pass when run directly with pinned Node 22.23.4:
  r79-audit/runtime/node-v22.23.4-linux-x64/bin/node
      r82-investigation/progress-draft/progress-refresh.test.mjs

The tests import the actual native world-player projector, native rank constants
and threshold math, actual public-player privacy projector, actual R60 material
validation and actual R61 compact commit-row/digest functions. Source-exact
refresh and ResidentChannel.applyCommit function bodies run in a VM with
controlled external runtime ports. Cases include 0 -> 1 rank XP, all four
counters, same-season battle-pass XP, tier/level/equipment/stat/unlock/season
fallback, missing/invalid/stale values, world/owner/epoch/barrier/resource
guards, atomic multiple recipients, 25-actor grouped reads, after-await fences,
committed snapshots, digest rejection, expired drops and material sections.

Limits
These are draft unit/port tests. They do not execute a complete channel server,
do not validate the missing adventure service, and do not demonstrate that a
particular live user's half-second pause was caused by the observed full load.
No live VDS or database was modified by this investigation.

Location details
The helper's native ranks import path was changed only to resolve from this
draft directory. Its function body is unchanged. Other dependencies of the
draft actor-section module are injected only by the explicitly controlled
fixture; the module is not intended to be deployed from this directory.

Restored production actor-section-reuse SHA-256:
98ccb8ab12cc60e0e37f92e3f697e73da4ba6d8d871e663c91389a37a64f4f23
