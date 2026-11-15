# R120: depot and two-domain transition

Active source is `../r109_latency_completion/working`. Immutable R118 and R119
archives are inputs; do not modify them. The cumulative package includes R119
champion animation behavior. No game DB/schema/loot/capacity changes.

- `build/client.mjs`: AST-scoped depot navigation relocation and scoped styles;
  immutable new client chunks with exact source proof.
- `deployment/modules/domain_move.py`: exact-host Caddy aliases, runtime Origin
  additions, static site URL update and forum transition; before/after journal.
- `build/package.py`: exact R118/R119 identities, reviewed delta, immutable ZIP.
- `evidence/package.json`, `evidence/verification.json`: current final artifact and tests.
- `KURULUM.md`: installation prerequisites and commands.
- `CLOUDFLARE-VE-CANLI-KONTROL.md`: Cloudflare GUI steps and live acceptance/cutover.
- `tools/onsite-audit.py`: redacted VDS inspection; read-only.
- `tools/cloudflare-readonly.py`: GET-only rules/SSL/DNS inventory; token via hidden prompt.
- `tools/check-har.py`: private local post-cutover check for exact apex/www requests.

Tests use Node 22.23.4, `../../scripts/run.py` and absolute test paths. Python
installer tests set REVIEW_NODE to the same binary. `tests/stage-runtime.py`
installs the ZIP into a temporary fixture; boot with the existing R118 migrated
`relocated-entry.test.mjs` / `ws-handoff-runtime.test.mjs`, not the historical
R109 fixture (which lacks the deliberately required royal schema).

No live VDS or Cloudflare management access was available. The user reported
creating the new 2d DNS record. The execution proxy rejected CONNECT to that
hostname; this is not an origin HTTP result. Old apex loaded HTTP 200 in a fresh
browser and registered no service worker. Public authenticated, audio and email
flows and the user's future apex DNS cutover remain pending. Do not label the
site "2D hazır" solely from local tests or installer health.
