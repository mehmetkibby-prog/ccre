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
