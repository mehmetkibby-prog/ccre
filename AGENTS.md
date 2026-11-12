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
r109-inceleme/project/r109_latency_completion/working (its content is R110).
A next installer must use R110_HANDOFF1 as its source. The older
measurements/not-installed/r110_* and r111_* experiments were never installed.
