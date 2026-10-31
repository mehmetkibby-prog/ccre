"""Build the R80 -> R81 two-file CPU-hotspot delta, without live service access.

The exact R80 archive pins the base manifest. The installer updates only the
existing abandoned-normal.mjs and the health version tag plus source metadata.
"""
import argparse
import hashlib
import json
import sys
import zipfile
from pathlib import Path

BASE = Path(__file__).resolve().parent
REFERENCE = BASE / 'r79-audit'
PREVIOUS = BASE / 'r80-package'
WORK = BASE / 'r81-work'
PACKAGE = BASE / 'r81-package'
CORE = 'core511-source/scripts/core511/'
APPROVED = [CORE + 'abandoned-normal.mjs', CORE + 'native-http-bindings.mjs']
R80_ARCHIVE_SHA256 = '21a3b001edd4adc2f2bca5734efb6d9cc937e3c005214047d383c3e14e98ed54'
MODULES = ['installer.py', 'storage.py', 'central.mjs', 'r63_support.py',
           'client_stage.py', 'retention.py', 'runtime_stage.py', 'inplace_stage.py']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def previous_plan():
    archive = BASE / 'CORE511_R80_TOPLU.zip'
    assert sha(archive.read_bytes()) == R80_ARCHIVE_SHA256, 'Pinned R80 archive changed'
    with zipfile.ZipFile(archive) as z:
        result = json.loads(z.read('update.json'))
    assert result == json.loads((PREVIOUS / 'update.json').read_text()), 'R80 manifest differs from installed archive'
    assert result['version'] == 'R80_GAMEPLAY' and result['sourceVersion'] == 'R79_GAMEPLAY'
    return result


def plan():
    previous = previous_plan()
    rows = {row['path']: dict(row) for row in previous['baseCoreRows']}
    sys.path.insert(0, str(PACKAGE / 'modules'))
    from r63_support import identity_from_rows
    assert len(rows) == len(previous['baseCoreRows'])
    assert identity_from_rows(rows.values()) == previous['baseCoreSHA256']
    for name, meta in previous['files'].items():
        if name.startswith(CORE):
            relative = name[len(CORE):]
            rows[relative] = {'path': relative, 'bytes': meta['bytes'], 'sha256': meta['after']}
    result = {key: previous[key] for key in ('protocol', 'databaseChanges', 'databaseSchemaChanges',
              'databaseScope', 'accountsChanges', 'nativeBaseline',
              'operationsCanonicalSHA256', 'runtime', 'httpEntrySHA256')}
    result.update(version='R81_GAMEPLAY', sourceVersion='R80_GAMEPLAY', clientChanges=False,
                  baseCoreRows=sorted(rows.values(), key=lambda row: tuple(row['path'].split('/'))),
                  baseCoreSHA256=identity_from_rows(rows.values()))
    result['files'] = {}
    for name in APPROVED:
        before_path = PREVIOUS / 'payload' / name
        if not before_path.exists():
            before_path = REFERENCE / name
        before, after = before_path.read_bytes(), (WORK / name).read_bytes()
        expected_before = rows[name[len(CORE):]]
        assert len(before) == expected_before['bytes'] and sha(before) == expected_before['sha256'], name
        assert before != after, 'No gameplay change: ' + name
        if name == CORE + 'native-http-bindings.mjs':
            old_tag, new_tag = b"updateVersion:'R80_GAMEPLAY'", b"updateVersion:'R81_GAMEPLAY'"
            assert before.count(old_tag) == 1 and before.replace(old_tag, new_tag) == after, 'Health payload must only update the version literal'
        result['files'][name] = {'before': sha(before), 'after': sha(after), 'bytes': len(after)}
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
    # Evidence is staged explicitly after review. Do not silently ship an old
    # R80 evidence file or claim installer mock tests are full live gameplay.
    evidence = PACKAGE / 'evidence' / 'R81_KANIT.json'
    assert evidence.is_file(), 'Stage reviewed evidence/R81_KANIT.json before final archive build'
    evidence_data = json.loads(evidence.read_text())
    assert evidence_data.get('version') == result['version'], 'Evidence version mismatch'
    assert evidence_data.get('productionFiles') == result['files'], 'Evidence does not match reviewed gameplay bytes'
    paths.append('evidence/R81_KANIT.json')
    paths += ['evidence/' + path.name for path in sorted((PACKAGE / 'evidence').iterdir())
              if path.is_file() and path.name != 'R81_KANIT.json' and path.suffix in ('.json', '.txt', '.tap')]
    destination = BASE / 'CORE511_R81_TOPLU.zip'
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for name in sorted(paths):
            data = (PACKAGE / name).read_bytes()
            entry = zipfile.ZipInfo(name, date_time=(2026, 10, 31, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            output.writestr(entry, data, compresslevel=9)
    from installer import load_package
    checked, updates = load_package(destination)
    assert checked == result and len(updates) == 2
    assert [name for name, _, _ in updates] == APPROVED
    for name, _, data in updates:
        assert data == (WORK / name).read_bytes()
    checksum = sha(destination.read_bytes())
    (BASE / 'CORE511_R81_TOPLU.sha256').write_text(checksum + '  ' + destination.name + '\n')
    print(json.dumps({'archive': str(destination), 'bytes': destination.stat().st_size,
                      'sha256': checksum, 'productionFiles': len(updates),
                      'payloadBytes': sum(len(data) for _, _, data in updates),
                      'sourceVersion': result['sourceVersion'], 'targetVersion': result['version'],
                      'nativeRuntimeOrClientPayload': False}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan-only', action='store_true')
    args = parser.parse_args()
    if args.plan_only:
        result = plan()
        print(json.dumps({'version': result['version'], 'sourceVersion': result['sourceVersion'],
                          'baseRows': len(result['baseCoreRows']), 'baseCoreSHA256': result['baseCoreSHA256'],
                          'productionFiles': result['files']}, indent=2))
    else:
        archive()
