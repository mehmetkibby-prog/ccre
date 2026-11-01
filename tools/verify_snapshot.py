#!/usr/bin/env python3
"""Check the exported snapshot against its manifest, without running gameplay."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root/'HANDOFF_MANIFEST.json').read_text())
failures = []
for row in manifest['files']:
    path = root/row['path']
    if not path.is_file() or path.stat().st_size != row['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest() != row['sha256']:
        failures.append(row['path'])
if failures:
    raise SystemExit('Snapshot differs: ' + ', '.join(failures))
print(f"Verified {len(manifest['files'])} exported files. This is file integrity, not gameplay acceptance.")
