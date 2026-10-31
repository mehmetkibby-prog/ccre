"""Build the reviewed R81 -> R82 gameplay delta, without live service access.

The exact shipped R81 archive pins all 1164 source-manifest rows. Missing local
source modules are retained by their pinned identity, never replaced or guessed.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path

BASE = Path(__file__).resolve().parent
PREVIOUS = BASE / 'r81-package'
BASELINE = BASE / 'r81-work'
WORK = BASE / 'r82-work'
PACKAGE = BASE / 'r82-package'
CORE = 'core511-source/scripts/core511/'
R81_ARCHIVE_SHA256 = '46340f6459f85ccb07287e79b26efad52e2b0de052e8d878154e9fca681f2e21'
R81_CORE_SHA256 = '0fdd34be8b14f326166d24469c3b3c0a2e2a9ba84db839402598baa5e60ff0e8'
MODULES = ['installer.py', 'storage.py', 'central.mjs', 'r63_support.py',
           'client_stage.py', 'retention.py', 'runtime_stage.py', 'inplace_stage.py']
sys.path.insert(0, str(PACKAGE / 'modules'))
from installer import PRODUCTION_PATHS, NEW_PRODUCTION_PATHS, validate_scope, HTTP, R79_HTTP_SHA256
from r63_support import identity_from_rows


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def previous_plan():
    archive = BASE / 'CORE511_R81_TOPLU.zip'
    assert sha(archive.read_bytes()) == R81_ARCHIVE_SHA256, 'Pinned R81 archive changed'
    with zipfile.ZipFile(archive) as z:
        result = json.loads(z.read('update.json'))
    assert result == json.loads((PREVIOUS / 'update.json').read_text()), 'R81 manifest differs from shipped archive'
    assert result['version'] == 'R81_GAMEPLAY' and result['sourceVersion'] == 'R80_GAMEPLAY'
    return result


def audit_local_tree(rows):
    allowed = set(PRODUCTION_PATHS)
    assert len(allowed) == len(PRODUCTION_PATHS) and NEW_PRODUCTION_PATHS <= allowed
    for path in (WORK / CORE).rglob('*'):
        if not path.is_file():
            continue
        name = path.relative_to(WORK).as_posix()
        assert not path.is_symlink(), 'Unexpected source symlink: ' + name
        if name in allowed:
            continue
        relative = name[len(CORE):]
        assert relative in rows, 'Unapproved new source file: ' + name
        data, expected = path.read_bytes(), rows[relative]
        assert len(data) == expected['bytes'] and sha(data) == expected['sha256'], 'Unapproved source change: ' + name


def verify_client(client):
    patch = json.loads((BASE / 'r82-tests/respawn-client-patch-proof.json').read_text())
    game = (WORK / CORE / 'generated/client' / client['name']).read_bytes()
    assert client['name'] == 'game-client-core511-r82-' + sha(game)[:16] + '.js'
    assert patch['newName'] == client['name'] and patch['newSha256'] == sha(game) and patch['exactInverse'] is True
    assert (WORK / CORE / 'generated/client' / client['oldName']).read_bytes() == (BASELINE / CORE / 'generated/client' / client['oldName']).read_bytes()
    proof_path = CORE + 'generated/native-client-proof.json'
    before = json.loads((BASELINE / proof_path).read_text())
    after = json.loads((WORK / proof_path).read_text())
    expected = {**before, 'name': client['name'], 'patchedSha256': sha(game), 'r82Respawn': patch}
    assert after == expected, 'Native client proof changed outside the reviewed effect metadata'
    node = BASE / 'r79-audit/runtime/node-v22.23.4-linux-x64/bin/node'
    actual = subprocess.check_output([str(node), '--input-type=module', '-e',
        'const m=await import(process.argv[1]);console.log(m.CLIENT_ASSET_NAMESPACE);',
        (WORK / CORE / 'client-assets.mjs').as_uri()], text=True).strip()
    assert actual == client['namespace'], 'Computed client namespace mismatch'
    composition_path = CORE + 'generated/native-http-composition-proof.json'
    before = json.loads((BASELINE / composition_path).read_text())
    after = json.loads((WORK / composition_path).read_text())
    expected_delta = {'oldNamespace': client['oldNamespace'], 'namespace': client['namespace'],
        'oldName': client['oldName'], 'name': client['name'], 'sourceSha256': R79_HTTP_SHA256,
        'generatedSha256': sha((WORK / HTTP).read_bytes()), 'inverseEqual': True,
        'namespaceReplacements': 351, 'gameNameReplacements': 2,
        'scope': 'Only immutable browser namespace and game asset references. All R79 HTTP route bodies, authorization and mutation paths retained.'}
    assert after == {**before, 'clientAssetNamespace': client['namespace'],
                     'generatedSha256': expected_delta['generatedSha256'], 'r82Gameplay': expected_delta}, 'HTTP proof changed outside exact client reference metadata'


def plan():
    previous = previous_plan()
    rows = {row['path']: dict(row) for row in previous['baseCoreRows']}
    assert len(rows) == len(previous['baseCoreRows'])
    assert identity_from_rows(rows.values()) == previous['baseCoreSHA256']
    for name, meta in previous['files'].items():
        if name.startswith(CORE):
            relative = name[len(CORE):]
            rows[relative] = {'path': relative, 'bytes': meta['bytes'], 'sha256': meta['after']}
    assert len(rows) == 1164 and identity_from_rows(rows.values()) == R81_CORE_SHA256, 'R81 complete source identity mismatch'
    audit_local_tree(rows)
    result = {key: previous[key] for key in ('protocol', 'databaseChanges', 'databaseSchemaChanges',
              'databaseScope', 'accountsChanges', 'nativeBaseline',
              'operationsCanonicalSHA256', 'runtime', 'httpEntrySHA256')}
    client = json.loads((PACKAGE / 'client-plan.json').read_text())
    verify_client(client)
    result.update(version='R82_GAMEPLAY', sourceVersion='R81_GAMEPLAY', clientChanges=True, client=client,
                  baseCoreRows=sorted(rows.values(), key=lambda row: tuple(row['path'].split('/'))),
                  baseCoreSHA256=R81_CORE_SHA256)
    result['files'] = {}
    materialized = {}
    for name in PRODUCTION_PATHS:
        before_path, after_path = BASELINE / name, WORK / name
        expected_before = rows.get(name[len(CORE):]) if name.startswith(CORE) else None
        if name == HTTP:
            before_path = BASE / 'r79-audit' / HTTP
            expected_before = {'bytes': 2229879, 'sha256': R79_HTTP_SHA256}
        assert after_path.is_file() and not after_path.is_symlink(), name
        after = after_path.read_bytes()
        if name in NEW_PRODUCTION_PATHS:
            assert expected_before is None and not before_path.exists(), 'New source path already exists in R81: ' + name
            before = None
        else:
            assert expected_before is not None and before_path.is_file() and not before_path.is_symlink(), name
            before = before_path.read_bytes()
            assert len(before) == expected_before['bytes'] and sha(before) == expected_before['sha256'], name
        assert before != after and after, 'No gameplay change: ' + name
        if name == CORE + 'native-http-bindings.mjs':
            old_tag, new_tag = b"updateVersion:'R81_GAMEPLAY'", b"updateVersion:'R82_GAMEPLAY'"
            assert before.count(old_tag) == 1 and before.replace(old_tag, new_tag) == after, 'Health payload must only update the version literal'
        if name == HTTP:
            assert before.count(client['oldNamespace'].encode()) == 351 and before.count(client['oldName'].encode()) == 2
            assert before.replace(client['oldNamespace'].encode(), client['namespace'].encode()).replace(client['oldName'].encode(), client['name'].encode()) == after, 'HTTP may only change reviewed immutable client references'
            assert after.replace(client['namespace'].encode(), client['oldNamespace'].encode()).replace(client['name'].encode(), client['oldName'].encode()) == before, 'HTTP inverse proof failed'
        result['files'][name] = {'before': sha(before) if before is not None else None,
                                  'after': sha(after), 'bytes': len(after)}
        materialized[name] = after
    validate_scope(result)
    # Stage only after every source, path and manifest check above has succeeded.
    for name in PRODUCTION_PATHS:
        target = PACKAGE / 'payload' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(materialized[name])
    staged = {path.relative_to(PACKAGE / 'payload').as_posix()
              for path in (PACKAGE / 'payload').rglob('*') if path.is_file()}
    assert staged == set(PRODUCTION_PATHS), 'Stale or unapproved staged payload'
    write_json(PACKAGE / 'update.json', result)
    return result


def archive():
    result = plan()
    write_json(PACKAGE / 'package-files.json', {name: sha((PACKAGE / 'modules' / name).read_bytes()) for name in MODULES})
    paths = ['__main__.py', 'update.json', 'package-files.json', 'RUNTIME.json', 'KURULUM.md', 'SONUC.md']
    paths += ['modules/' + name for name in MODULES]
    paths += ['payload/' + name for name in result['files']]
    evidence = PACKAGE / 'evidence' / 'R82_KANIT.json'
    assert evidence.is_file(), 'Stage reviewed evidence/R82_KANIT.json before final archive build'
    evidence_data = json.loads(evidence.read_text())
    assert evidence_data.get('version') == result['version'], 'Evidence version mismatch'
    assert evidence_data.get('productionFiles') == result['files'], 'Evidence does not match reviewed gameplay bytes'
    paths.append('evidence/R82_KANIT.json')
    paths += ['evidence/' + path.name for path in sorted((PACKAGE / 'evidence').iterdir())
              if path.is_file() and path.name != 'R82_KANIT.json' and path.suffix in ('.json', '.txt', '.tap')]
    destination = BASE / 'CORE511_R82_TOPLU.zip'
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for name in sorted(paths):
            data = (PACKAGE / name).read_bytes()
            entry = zipfile.ZipInfo(name, date_time=(2026, 10, 31, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            output.writestr(entry, data, compresslevel=9)
    from installer import load_package
    checked, updates = load_package(destination)
    assert checked == result and len(updates) == len(PRODUCTION_PATHS)
    assert tuple(name for name, _, _ in updates) == PRODUCTION_PATHS
    for name, _, data in updates:
        assert data == (WORK / name).read_bytes()
    checksum = sha(destination.read_bytes())
    (BASE / 'CORE511_R82_TOPLU.sha256').write_text(checksum + '  ' + destination.name + '\n')
    print(json.dumps({'archive': str(destination), 'bytes': destination.stat().st_size,
                      'sha256': checksum, 'productionFiles': len(updates),
                      'newProductionFiles': len(NEW_PRODUCTION_PATHS),
                      'payloadBytes': sum(len(data) for _, _, data in updates),
                      'sourceVersion': result['sourceVersion'], 'targetVersion': result['version'],
                      'baseCoreRows': len(result['baseCoreRows']),
                      'nativeRuntimePayload': False, 'clientPayload': True}, indent=2))


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
