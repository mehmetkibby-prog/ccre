#!/usr/bin/env python3
"""Verify the immutable review baseline without running production installers."""
import hashlib,json,pathlib,sys,zipfile
root=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((root/'docs/r109-runtime-manifest.json').read_text())
errors=[]
for row in manifest['runtimeFiles']:
    p=root/row['path']
    if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=row['sha256']:errors.append(row['path'])
archive=root/'project/r109_latency_completion/delivery/r109-gecikme.zip'
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
if sha!='1ba96d415891f8d474188edb64331b87b7bc12fdfb54733f49918a906e6ef068':errors.append('R109 archive SHA256')
with zipfile.ZipFile(archive) as z:
    if z.testzip():errors.append('archive corrupt')
    plan=json.loads(z.read('plan.json'))
sys.path.insert(0,str(root/'project/r109_latency_completion/deployment/modules'))
from r63_support import core_identity
identity=core_identity(root/'project/r109_latency_completion/working/core511-source/scripts/core511')
if identity!=plan['targetCore']:errors.append('core identity mismatch')
profile=root/'measurements/live-r109/six-players-60s.cpuprofile.json'
if hashlib.sha256(profile.read_bytes()).hexdigest()!='42f50688a62556e2dd874fac092b060aba015823ef9370743b6b014ea365fd3e':errors.append('live profile SHA256')
print(json.dumps({'ok':not errors,'runtimeFiles':len(manifest['runtimeFiles']),'core':identity,'archiveSHA256':sha,'errors':errors},indent=2))
raise SystemExit(bool(errors))
