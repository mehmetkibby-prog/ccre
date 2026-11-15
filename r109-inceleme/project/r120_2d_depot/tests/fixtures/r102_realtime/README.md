# Historical Academy transport fixture

The three files in `deployment/modules` are byte-for-byte copies of the original
R102 realtime installer/profile/entry. They exist only to reproduce the production
single-Origin failure. They are not deployed by R120.

`fixture.py` is the synthetic R102 fixture with repository-relative dependency
paths. Run `npm ci`/setup as documented by the repository, then use Node 22.23.4:

```
REVIEW_NODE=/path/to/node python3 tests/academy_origin_test.py -v
```

No production player data or keys are used. Systemd is simulated, while the Node
service, SQLite identity checks, HTTP readiness and signed WebSockets are real.
