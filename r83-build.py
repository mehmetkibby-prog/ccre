"""Build the reviewed, server-only R82 -> R83 delta without live VDS access.

The shipped R82 archive supplies the complete source identity. Missing local
modules remain pinned by that manifest; none is reconstructed or substituted.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path

BASE = Path(__file__).resolve().parent
PREVIOUS = BASE / 'r82-package'
BASELINE = BASE / 'r82-work'
WORK = BASE / 'r83-work'
PACKAGE = BASE / 'r83-package'
CORE = 'core511-source/scripts/core511/'
HTTP = 'http-runtime/dist-vds/server/index.js'
R82_ARCHIVE_SHA256 = '30ee51d4a45949b2a3bbbce49e846b430a5892f31ebffbfb38e9782ce8c15d81'
R82_CORE_SHA256 = '7c5ae6d88decda07ae8ab6ad1dca23c16d105a2242ba21ef95172efdd9b15bc7'
R82_HTTP_SHA256 = '286e89f0b37a46ef79c5b7fead2b20341fac9025ae79a9a814e2049208f07662'
EXPECTED_PATHS = tuple(CORE + name for name in (
    'heartbeat-loop.mjs', 'shared-combat-channel.mjs',
    'native-http-bindings.mjs',
))
MODULES = ['installer.py', 'storage.py', 'central.mjs', 'r63_support.py',
           'client_stage.py', 'retention.py', 'runtime_stage.py', 'inplace_stage.py']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def installer():
    sys.path.insert(0, str(PACKAGE / 'modules'))
    import installer as module
    assert module.PRODUCTION_PATHS == EXPECTED_PATHS
    assert not module.NEW_PRODUCTION_PATHS
    assert module.VERSION == 'R83_GAMEPLAY' and module.SOURCE_VERSION == 'R82_GAMEPLAY'
    return module


def source_rows():
    archive = BASE / 'CORE511_R82_TOPLU.zip'
    assert sha(archive.read_bytes()) == R82_ARCHIVE_SHA256, 'Pinned R82 package changed'
    with zipfile.ZipFile(archive) as z:
        previous = json.loads(z.read('update.json'))
    assert previous == json.loads((PREVIOUS / 'update.json').read_text()), 'R82 plan differs from shipped archive'
    assert previous['version'] == 'R82_GAMEPLAY' and previous['sourceVersion'] == 'R81_GAMEPLAY'
    module = installer()
    rows = {row['path']: dict(row) for row in previous['baseCoreRows']}
    assert len(rows) == len(previous['baseCoreRows'])
    assert module.old.identity_from_rows(rows.values()) == previous['baseCoreSHA256']
    for name, meta in previous['files'].items():
        if name.startswith(CORE):
            short = name[len(CORE):]
            rows[short] = {'path': short, 'bytes': meta['bytes'], 'sha256': meta['after']}
    assert len(rows) == 1166 and module.old.identity_from_rows(rows.values()) == R82_CORE_SHA256
    assert previous['files'][HTTP]['after'] == R82_HTTP_SHA256
    return previous, rows, module


def audit_local_tree(rows):
    counts = {'verifiedAvailableSourceFiles': 0, 'changedFiles': 0, 'missingPinnedFiles': 0}
    for path in (WORK / CORE).rglob('*'):
        if not path.is_file():
            continue
        assert not path.is_symlink(), 'Unexpected source symlink: ' + str(path)
        name = path.relative_to(WORK).as_posix()
        short = name[len(CORE):]
        assert short in rows, 'Unapproved new source: ' + name
        expected = rows[short]
        before = BASELINE / name
        assert before.is_file() and not before.is_symlink(), name
        data = before.read_bytes()
        assert len(data) == expected['bytes'] and sha(data) == expected['sha256'], 'R82 baseline drift: ' + name
        if name in EXPECTED_PATHS:
            assert path.read_bytes() != data
            counts['changedFiles'] += 1
        else:
            assert path.read_bytes() == data, 'Unapproved source change: ' + name
        counts['verifiedAvailableSourceFiles'] += 1
    assert counts['changedFiles'] == len(EXPECTED_PATHS)
    counts['missingPinnedFiles'] = len(rows) - counts['verifiedAvailableSourceFiles']
    assert sha((BASELINE / HTTP).read_bytes()) == R82_HTTP_SHA256
    assert (WORK / HTTP).read_bytes() == (BASELINE / HTTP).read_bytes(), 'HTTP or browser delivery changed'
    return counts


def plan():
    previous, rows, module = source_rows()
    audit = audit_local_tree(rows)
    result = {key: previous[key] for key in (
        'protocol', 'databaseChanges', 'databaseSchemaChanges', 'databaseScope',
        'accountsChanges', 'nativeBaseline', 'operationsCanonicalSHA256', 'runtime',
    )}
    result.update(version='R83_GAMEPLAY', sourceVersion='R82_GAMEPLAY',
                  clientChanges=False, httpEntrySHA256=R82_HTTP_SHA256,
                  baseCoreRows=sorted(rows.values(), key=lambda row: tuple(row['path'].split('/'))),
                  baseCoreSHA256=R82_CORE_SHA256, files={})
    proof = json.loads((BASE / 'r83-investigation/server/heartbeat-tail-source-proof.json').read_text())
    heartbeat = {row['path']: row for row in proof['files']}
    staged_bytes = {}
    for name in EXPECTED_PATHS:
        before, after = (BASELINE / name).read_bytes(), (WORK / name).read_bytes()
        short = name[len(CORE):]
        expected = rows[short]
        assert len(before) == expected['bytes'] and sha(before) == expected['sha256'], name
        assert before != after and after, name
        if short in heartbeat:
            row = heartbeat[short]
            assert sha(before) == row['beforeSha256'] and sha(after) == row['afterSha256']
            assert before.count(row['old'].encode()) == 1
            assert before.replace(row['old'].encode(), row['replacement'].encode()) == after
        elif short == 'native-http-bindings.mjs':
            old_tag, new_tag = b"updateVersion:'R82_GAMEPLAY'", b"updateVersion:'R83_GAMEPLAY'"
            assert before.count(old_tag) == 1 and before.replace(old_tag, new_tag) == after
        result['files'][name] = {'before': sha(before), 'after': sha(after), 'bytes': len(after)}
        staged_bytes[name] = after
    module.validate_scope(result)
    for name, data in staged_bytes.items():
        target = PACKAGE / 'payload' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    staged = {path.relative_to(PACKAGE / 'payload').as_posix()
              for path in (PACKAGE / 'payload').rglob('*') if path.is_file()}
    assert staged == set(EXPECTED_PATHS), 'Unapproved or stale payload'
    target_rows = dict(rows)
    for name, meta in result['files'].items():
        short = name[len(CORE):]
        target_rows[short] = {'path': short, 'sha256': meta['after'], 'bytes': meta['bytes']}
    audit.update(sourceCoreSHA256=R82_CORE_SHA256,
                 targetCoreSHA256=module.old.identity_from_rows(target_rows.values()),
                 sourceRows=len(rows), targetRows=len(target_rows))
    write_json(PACKAGE / 'update.json', result)
    write_json(BASE / 'r83-source-verification.json', audit)
    return result


def archive():
    result = plan()
    module = installer()
    write_json(PACKAGE / 'package-files.json', {name: sha((PACKAGE / 'modules' / name).read_bytes()) for name in MODULES})
    paths = ['__main__.py', 'update.json', 'package-files.json', 'RUNTIME.json', 'KURULUM.md', 'SONUC.md']
    paths += ['modules/' + name for name in MODULES]
    paths += ['payload/' + name for name in result['files']]
    evidence_file = PACKAGE / 'evidence/R83_KANIT.json'
    assert evidence_file.is_file(), 'Final R83 evidence is required'
    evidence = json.loads(evidence_file.read_text())
    assert evidence['version'] == result['version'] and evidence['productionFiles'] == result['files']
    assert evidence['failedTests'] == 0 and evidence['passedTests'] > 0
    paths += ['evidence/' + path.name for path in sorted((PACKAGE / 'evidence').iterdir())
              if path.is_file() and path.suffix in ('.json', '.txt', '.tap')]
    destination = BASE / 'CORE511_R83_TOPLU.zip'
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for name in sorted(paths):
            data = (PACKAGE / name).read_bytes()
            entry = zipfile.ZipInfo(name, date_time=(2026, 10, 31, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            output.writestr(entry, data, compresslevel=9)
    checked, updates = module.load_package(destination)
    assert checked == result and tuple(name for name, _, _ in updates) == EXPECTED_PATHS
    for name, _, data in updates:
        assert data == (WORK / name).read_bytes()
    checksum = sha(destination.read_bytes())
    (BASE / 'CORE511_R83_TOPLU.sha256').write_text(checksum + '  ' + destination.name + '\n')
    report = {'archive': str(destination), 'bytes': destination.stat().st_size,
              'sha256': checksum, 'productionFiles': len(updates), 'newProductionFiles': 0,
              'payloadBytes': sum(len(data) for _, _, data in updates),
              'sourceVersion': result['sourceVersion'], 'targetVersion': result['version'],
              'baseCoreRows': len(result['baseCoreRows']), 'nativeRuntimePayload': False,
              'clientPayload': False, 'databaseChanges': False}
    write_json(BASE / 'r83-build-result.json', report)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan-only', action='store_true')
    options = parser.parse_args()
    if options.plan_only:
        result = plan()
        print(json.dumps({'version': result['version'], 'sourceVersion': result['sourceVersion'],
                          'baseRows': len(result['baseCoreRows']), 'files': result['files']}, indent=2))
    else:
        archive()
