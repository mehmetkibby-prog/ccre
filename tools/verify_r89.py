#!/usr/bin/env python3
"""Read-only verification of the R89 source, measured evidence and payload."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1];r=root/'r89_stability_work';core='core511-source/scripts/core511/'
plan=json.loads((r/'r89-package/update.json').read_text());gate=json.loads((r/'evidence/final-release-gate-r89.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert gate['performancePassed'] and gate['allRequiredChecksPassed'] and not gate['liveDeploymentPerformed']
assert plan['version']=='R89_GAMEPLAY' and plan['sourceVersion']=='R86_GAMEPLAY'
rows={v['path']:v for v in plan['baseCoreRows']}
for name,meta in plan['files'].items():
 p=r/'working'/name;payload=r/'r89-package/payload'/name
 assert sha(p)==meta['after']==sha(payload) and p.stat().st_size==meta['bytes'],name
 if name.startswith(core):short=name[len(core):];rows[short]={'path':short,'bytes':meta['bytes'],'sha256':meta['after']}
actual={p.relative_to(r/'working'/core).as_posix():p for p in (r/'working'/core).rglob('*') if p.is_file()}
assert set(rows)==set(actual)
for name,meta in rows.items():assert sha(actual[name])==meta['sha256'] and actual[name].stat().st_size==meta['bytes'],name
ordered=sorted(rows.values(),key=lambda v:tuple(v['path'].split('/')))
b=json.dumps({'kind':'core511-source-candidate-v1','baselineManifestSha256':'bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b','files':ordered},ensure_ascii=False,separators=(',',':')).encode()
assert hashlib.sha256(b).hexdigest()==gate['coreSHA256']
for row in gate['evidencePins']:assert sha(r/row['path'])==row['sha256'],row['path']
print('R89 source, payload and measured evidence verified: '+gate['coreSHA256'])
print('Local native tests only; no live deployment or full rendered-browser acceptance is claimed.')
