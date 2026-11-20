"""Build one cumulative R127 update against each verified source manifest."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parent
WORK = PROJECT / 'r109_latency_completion/working'
MODULES = ROOT / 'deployment/modules'
sys.path.insert(0, str(MODULES))
from r63_support import identity_from_rows
from source_identity import CORE, source_rows, target_rows
from storage import encoded

def digest(data):
    return hashlib.sha256(data).hexdigest()

def load_release(folder, name, checksum):
    path = PROJECT / folder / 'artifacts' / name
    assert digest(path.read_bytes()) == checksum, name
    with zipfile.ZipFile(path) as archive:
        plan = json.loads(archive.read('plan.json'))
        payload = {name: archive.read('payload/'+name) for name in plan['files']}
        return plan, payload, archive.read('__main__.py')

p126, data126, _ = load_release('r126_encounter','R126_ENCOUNTER_ce09ea6316de.zip','8838bffefee002964455e0273deb4f788b5acf1c14d4ebb76aafe54902946e5e')
p127, data127, bootstrap = load_release('r127_academy_update','R127_TOPLU_d4fcd0771327.zip','6f9a31af7b5138c3df76c74e7be3e7f4a9e94c80cfc79086936fc0dc93e1f4f5')
sources = {**p126['sources'], **p127['sources']}
source126 = sources['R126_ENCOUNTER1']
rows127 = target_rows(source_rows(source126),p127)
assert identity_from_rows(rows127.values()) == p127['targetCore']
retained = []
for old in source126['retainedFiles']:
    new = p127['files'].get(old['path'])
    retained.append({**old,'sha256':new['after'],'bytes':new['bytes']} if new else old)
client = {k:p127[k] for k in ('game','portal','namespace','admin')}
sources['R127_ACADEMY1'] = {**source126, **client, 'core':p127['targetCore'], 'coreRows':list(rows127.values()), 'retainedFiles':retained}
data = {**data126, **data127}
for name in (
    'committed-result-r113.mjs','committed-holdings-r127.mjs','committed-local-r127.mjs',
    'committed-store-r113.mjs','committed-protocol-r113.mjs','committed-codec-r113.mjs','generated/cold-world-rules.mjs','generated/world-projection-rules.mjs',
    'world-projection.mjs','resident-channel.mjs','channel-runtime.mjs','engine-health-r113.mjs',
    'shared-combat-channel.mjs','collect-light.mjs',
):
    data[CORE+name] = (WORK/CORE/name).read_bytes()

files = {}
for name, body in data.items():
    accepted = []
    for version, source in sources.items():
        rows = {CORE+r['path']: r['sha256'] for r in source['coreRows']}
        rows.update({r['path']:r['sha256'] for r in source['retainedFiles']})
        if version=='R127_ACADEMY1':
            rows.update({k:v['after'] for k,v in p127['files'].items()})
        if rows.get(name) not in accepted:
            accepted.append(rows.get(name))
    files[name] = {'before':accepted,'after':digest(body),'bytes':len(body)}

targets = {version:{'core':identity_from_rows(target_rows(source_rows(src),{'files':files}).values())} for version,src in sources.items()}
assert len({v['core'] for v in targets.values()})==1,targets
plan = {**p127, 'version':'R127_PERF2','files':files,'sources':sources,'targets':targets,'targetCore':next(iter(targets.values()))['core']}
(MODULES/'code_contract.py').write_text("PLAN_SHA256 = '"+digest(encoded(plan))+"'\n")
modules = {p.name:p.read_bytes() for p in MODULES.iterdir() if p.suffix in ('.py','.mjs')}
members = {'payload/'+k:v for k,v in data.items()}
members.update({'modules/'+k:v for k,v in modules.items()})
members.update({'plan.json':encoded(plan),'__main__.py':bootstrap,'modules.json':encoded({k:digest(v) for k,v in modules.items()})})
name='R127_PERFORMANS_'+digest(encoded({k:digest(v) for k,v in sorted(members.items())}))[:12]+'.zip'
path=ROOT/'artifacts'/name
with zipfile.ZipFile(path,'w') as archive:
    for key, value in sorted(members.items()):
        info=zipfile.ZipInfo(key,(2026,11,20,0,0,0))
        info.external_attr=0o100644<<16
        archive.writestr(info,value,compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
with zipfile.ZipFile(path) as archive:
    assert archive.testzip() is None
    assert all(archive.read(k)==v for k,v in members.items())
report={'file':str(path.relative_to(ROOT)),'sha256':digest(path.read_bytes()),'bytes':path.stat().st_size,'sources':list(sources),'target':'R127_PERF2','core':plan['targetCore']}
(ROOT/'evidence/package.json').write_bytes(encoded(report))
print(json.dumps(report))
