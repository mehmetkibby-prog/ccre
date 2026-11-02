"""Reconstruct the local test tree from the preserved corrected R90 workspace."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('--base', type=Path, default=Path('/tmp/core511-r90-startup-fix'))
args = parser.parse_args()
root = Path(__file__).resolve().parent
work = root / 'working'
if work.exists():
    raise SystemExit('working zaten mevcut; mevcut çalışma ağacının üzerine yazılmadı.')
base = args.base.resolve()
plan = json.loads((root / 'r91-package/update.json').read_bytes())
core = 'core511-source/scripts/core511/'
for row in plan['baseCoreRows']:
    data = (base / 'working' / core / row['path']).read_bytes()
    if len(data) != row['bytes'] or hashlib.sha256(data).hexdigest() != row['sha256']:
        raise SystemExit('R90 kaynak kimliği farklı: ' + row['path'])
shutil.copytree(base / 'working', work, symlinks=True)
for name, meta in plan['files'].items():
    data = (root / 'r91-package/payload' / name).read_bytes()
    if len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['after']:
        raise SystemExit('Paket dosyası doğrulanamadı: ' + name)
    destination = work / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
print(work)
