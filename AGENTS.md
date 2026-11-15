# Core of Life R109 review

Read CLAUDE.md and r109-inceleme/README.md before edits. The active code is
r109-inceleme/project/r109_latency_completion/working. Historical reference
trees must not be mistaken for the installed release. Do not modify immutable
delivery archives; build a new artifact for a new release. Never commit live
player databases, credentials, service keys or dependency directories.

Use the portable scripts and local synthetic fixtures. Preserve ownership,
durability, receipts, reward and access invariants. Record each independent
change in its own commit and report failed tests/performance regressions.

Current live release (12 Nov 2026): **R110_HANDOFF1** on both realms. Read
r109-inceleme/CHATGPT_DEVIR_R110.md first (what changed, tests, installer
template). The active tree still lives in
r109-inceleme/project/r109_latency_completion/working; see the continuation
note below for its current candidate version.
A next installer must use R110_HANDOFF1 as its source. The older
measurements/not-installed/r110_* and r111_* experiments were never installed.

For the Codex continuation, read r109-inceleme/R111_BASLANGIC.md after the
R110 handoff. It records the verified R110 baseline and local test evidence;
it does not represent a released or installed R111 version.

R112 continuation: read `r109-inceleme/R112_DEVIR.md`. The active tree now
contains the R112 candidate, not the live R110 code. R112 accepts exact R110
or R111 sources; production installation is unconfirmed. Preserve the raw
performance regressions and distinguish functional checks from latency goals.

R113 continuation: `r109-inceleme/R113_DEVIR.md` supersedes the candidate-state
notes above. The active tree contains the R113 engine candidate; confirmed live
is still R110_HANDOFF1. Latest requested population testing is ONLY 50 players.
Preserve failed measurements and do not equate functional success with zero lag.

R114 continuation: `r109-inceleme/R114_DEVIR.md` records the unpublished rune
geometry and standalone forum draft. The active working tree adds those changes
on R113; no R114 installer exists yet. The user requested preview before updating.

R114 approval/production continuation (13 Nov 2026): the user approved the forum.
`r109-inceleme/R114_DEVIR.md` now supersedes the draft-only and old live-source
notes. Read-only Efsane health confirms R113_ENGINE1. R114 accepts the exact
final R113 artifact as source, applies code-only rune changes and hosts the forum
separately. The package is locally verified; R114 live installation is unconfirmed.

R115 incident continuation (13 Nov 2026): the user and read-only r1 health
confirmed R114_RUNE_FORUM1 installed. R115 supersedes the stale live-source
notes above. Read `r109-inceleme/R115_DEVIR.md`. The active tree fixes the
shared_partition_actor_changed realm-wide recovery: initial recipient scope
now includes historical local contributors, using the same closure as terminal
validation. Three runtime files; source is exact R114_RUNE_FORUM1. No forum,
client, schema or reward-rule changes. Preserve receipt/owner/durability guards.

R116 incident continuation (14 Nov 2026): public Efsane health confirms live
R115_SHARED_SCOPE1. Read `r109-inceleme/R116_DEVIR.md`. The active candidate
adds bounded, ordered admission-control fragmentation on the private process
transport, preserving the original 1 MiB frame and 4 MiB reader limits. The
first candidate control-ordering regression was caught and fixed before
delivery. Package source is exact R115; three runtime files, no DB or client
changes. The original disconnect trigger is not proven by the recovery log.

R117 continuation (14 Nov 2026): live Efsane health confirms R116 installed.
Read `r109-inceleme/R117_DEVIR.md`. User requested Azrail chest hook chance 10%.
Active source includes the rule, nonmutating legacy 6% read compatibility and
new hashed UI assets. New package source is exact R116; no player DB/schema
changes. Preserve original R116 archive and all previous hashed assets.

R118 continuation (15 Nov 2026): read `r109-inceleme/R118_DEVIR.md`.
Read-only live Efsane health confirms R117_HOOK10. The active candidate adds
royal equipment, controlled emerald salvage and the champion-only PvP map.
This release has explicit additive schema migration, not only code changes.
Latest user feedback requires scattered monsters and Turkish-facing labels.
Use the exact R117 source and preserve all old artifacts. Check the final
R118 package evidence before treating this candidate as delivered or installed.

R119 continuation (15 Nov 2026): read `r109-inceleme/R119_DEVIR.md` first.
Public Efsane health confirms R118_ROYAL1. R119 changes only champion monster
presentation, reusing the North Forest renderer. The installer requires exact
corrected R118, preserves schema recovery archives, and changes five client
files. Backend health remains R118; installer state/new client hashes are R119.
See the R119 package/verification evidence; live R119 installation is unconfirmed.

R120 continuation (15 Nov 2026): read `r109-inceleme/R120_DEVIR.md`. Active candidate
adds depot visibility and 2d domain transition on exact R118/R119; includes R119
animation behavior. Live domain/SSL/Cloudflare verification remains pending.
Preserve all prior artifacts, host-only cookies and protected DNS. No 3D changes.

R120 v2 continuation (15 Nov 2026): screenshots confirm Cloudflare Full with automatic
mode, and Caddy default certificate automation. Use R120_2D_DEPOT2 and its
maintenance-gated --prepare-web, then --check/--apply. Game bytes equal v1.
Read the updated R120_DEVIR.md; live end-to-end acceptance remains pending.
