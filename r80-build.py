"""Build the verified R79 -> R80 delta. No live service access.

Only the six explicitly approved production files are included. The separate
foreground boss/Sinsi draft is intentionally absent from the install payload.
"""
import argparse
import hashlib
import json
import sys
import zipfile
from pathlib import Path

BASE = Path(__file__).resolve().parent
REFERENCE = BASE / 'r79-audit'
WORK = BASE / 'r80-work'
PACKAGE = BASE / 'r80-package'
CORE = 'core511-source/scripts/core511/'
APPROVED = [
    CORE + 'shared-world-jobs.mjs',
    CORE + 'checkpoint-runtime-r79.mjs',
    'native510-bb3a6cc689c6/vds-server/src/wal-checkpoint.mjs',
    CORE + 'writer-lane-r533.mjs',
    CORE + 'runtime-health-r80.mjs',
    CORE + 'native-http-bindings.mjs',
]
MODULES = ['installer.py', 'storage.py', 'central.mjs', 'r63_support.py',
           'client_stage.py', 'retention.py', 'runtime_stage.py', 'inplace_stage.py']

def sha(data):
    return hashlib.sha256(data).hexdigest()

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def plan():
    previous = json.loads((REFERENCE / 'update.json').read_text())
    rows = {r['path']: dict(r) for r in previous['baseCoreRows']}
    for name, meta in previous['files'].items():
        if name.startswith(CORE):
            relative = name[len(CORE):]
            rows[relative] = {'path': relative, 'bytes': meta['bytes'], 'sha256': meta['after']}
    expected = json.loads((REFERENCE / 'expected-r79-core.json').read_text())
    assert {k: r['sha256'] for k, r in rows.items()} == expected, 'R79 source manifest mismatch'
    sys.path.insert(0, str(PACKAGE / 'modules'))
    from r63_support import identity_from_rows
    result = {k: previous[k] for k in ('protocol', 'databaseChanges', 'databaseSchemaChanges',
              'databaseScope', 'accountsChanges', 'nativeBaseline',
              'operationsCanonicalSHA256', 'runtime')}
    result.update(version='R80_GAMEPLAY', sourceVersion='R79_GAMEPLAY', clientChanges=False,
                  baseCoreRows=sorted(rows.values(), key=lambda r: tuple(r['path'].split('/'))),
                  baseCoreSHA256=identity_from_rows(rows.values()),
                  httpEntrySHA256=sha((REFERENCE / 'http-runtime/dist-vds/server/index.js').read_bytes()))
    result['files'] = {}
    for name in APPROVED:
        before_path = REFERENCE / name
        before = before_path.read_bytes() if before_path.exists() else None
        after = (WORK / name).read_bytes()
        if name.startswith(CORE):
            expected_before = rows.get(name[len(CORE):], {}).get('sha256')
            assert (sha(before) if before is not None else None) == expected_before, name
        assert before != after, name
        result['files'][name] = {'before': sha(before) if before is not None else None,
                                  'after': sha(after), 'bytes': len(after)}
        target = PACKAGE / 'payload' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(after)
    write_json(PACKAGE / 'update.json', result)
    from installer import validate_scope
    validate_scope(result)
    return result

def archive():
    result = plan()
    write_json(PACKAGE / 'package-files.json', {name: sha((PACKAGE / 'modules' / name).read_bytes()) for name in MODULES})
    paths = ['__main__.py', 'update.json', 'package-files.json', 'RUNTIME.json', 'KURULUM.md', 'SONUC.md']
    paths += ['modules/' + name for name in MODULES]
    paths += ['payload/' + name for name in result['files']]
    for name in ('CORE511_R80_CANLI_OLCUM.py', 'CORE511_R79_EKSIK_KAYNAK.py'):
        target = PACKAGE / 'tools' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((BASE / 'r80-tools' / name).read_bytes())
        paths.append('tools/' + name)
    for name in ('R80_KANIT.json', 'installer-evidence.json', 'checkpoint-evidence.json', 'INCELEME_OZETI.txt'):
        target = PACKAGE / 'evidence' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((BASE / 'r80-tests' / name).read_bytes())
        paths.append('evidence/' + name)
    destination = BASE / 'CORE511_R80_TOPLU.zip'
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for name in sorted(paths):
            data = (PACKAGE / name).read_bytes()
            entry = zipfile.ZipInfo(name, date_time=(2026, 10, 31, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            output.writestr(entry, data, compresslevel=9)
    from installer import load_package
    checked, updates = load_package(destination)
    assert checked == result and len(updates) == len(APPROVED)
    assert set(name for name, _, _ in updates) == set(APPROVED)
    for name, _, data in updates:
        assert data == (WORK / name).read_bytes()
    checksum = sha(destination.read_bytes())
    (BASE / 'CORE511_R80_TOPLU.sha256').write_text(checksum + '  ' + destination.name + '\n')
    print(json.dumps({'archive': str(destination), 'bytes': destination.stat().st_size,
                      'sha256': checksum, 'productionFiles': len(updates),
                      'payloadBytes': sum(len(data) for _, _, data in updates),
                      'foregroundDraftIncluded': False}, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan-only', action='store_true')
    args = parser.parse_args()
    if args.plan_only:
        result = plan()
        print(json.dumps({'version': result['version'], 'sourceVersion': result['sourceVersion'],
                          'baseRows': len(result['baseCoreRows']), 'baseCoreSHA256': result['baseCoreSHA256'],
                          'productionFiles': len(result['files']), 'payloadBytes': sum(v['bytes'] for v in result['files'].values())}, indent=2))
    else:
        archive()
