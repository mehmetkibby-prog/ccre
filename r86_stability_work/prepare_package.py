"""Stage the server-only R86 delta from the exact installed R85 archive.

Preparation only: this script never creates a distributable archive.
"""
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PREVIOUS = ROOT.parent / 'r85_stability_work'
PACKAGE = ROOT / 'r86-package'
CORE = 'core511-source/scripts/core511/'
HTTP = 'http-runtime/dist-vds/server/index.js'
INGRESS = 'core511-source/scripts/delivery511/runtime-ingress.mjs'
BASE_CORE = '47e7486138ceb488d645e78c20c5c297d3ea423a7acb5cb4215a828ca17c6759'
ARCHIVE_SHA = '465eae779b9af525155d1fda328902dbdccab2bc6a7ac000dbe0c48960c39927'
MODULES = ['installer.py', 'storage.py', 'central.mjs', 'r63_support.py', 'client_stage.py', 'retention.py', 'runtime_stage.py', 'inplace_stage.py', 'ingress_stage.py']
ALLOWED = {
    'attack-writer.mjs', 'generated/attack-writer-rules.mjs', 'event-config-cache-r86.mjs',
    'attack-commit-r53.mjs', 'death-batch-single-r57.mjs', 'fixed-loop.mjs',
    'tick-slices-r53.mjs', 'resident-channel.mjs', 'movement-loop.mjs',
    'death-movement-r86.mjs', 'actor-section-reuse-r52.mjs', 'item-refresh-r57.mjs',
    'channel-runtime.mjs', 'native-http-bindings.mjs',
    'potion-batch-channel-r61.mjs', 'potion-batch-writer-r61.mjs',
    'attack-loop.mjs', 'retaliation-loop.mjs', 'actor-checkpoint.mjs',
}


def sha(data): return hashlib.sha256(data).hexdigest()
def encoded(value): return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
def identity(rows):
    ordered = [{'path': r['path'], 'bytes': r['bytes'], 'sha256': r['sha256']} for r in sorted(rows, key=lambda r: tuple(r['path'].split('/')))]
    return sha(json.dumps({'kind': 'core511-source-candidate-v1', 'baselineManifestSha256': 'bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b', 'files': ordered}, ensure_ascii=False, separators=(',', ':')).encode())
def replace_once(text, before, after):
    assert text.count(before) == 1, 'Installer anchor changed: ' + before[:120]
    return text.replace(before, after)
def versions(text):
    return re.sub(r'R8[45]|r8[45]', lambda m: {'R84': 'R85', 'R85': 'R86', 'r84': 'r85', 'r85': 'r86'}[m[0]], text)


def source():
    archive = PREVIOUS / 'artifacts/CORE511_R85_TOPLU.zip'
    assert sha(archive.read_bytes()) == ARCHIVE_SHA, 'Delivered R85 archive changed'
    with zipfile.ZipFile(archive) as z:
        plan = json.loads(z.read('update.json'))
        assert plan['version'] == 'R85_GAMEPLAY'
        rows = {r['path']: dict(r) for r in plan['baseCoreRows']}
        assert identity(rows.values()) == plan['baseCoreSHA256']
        for name, meta in plan['files'].items():
            data = z.read('payload/' + name)
            assert len(data) == meta['bytes'] and sha(data) == meta['after'], name
            if name.startswith(CORE):
                short = name[len(CORE):]
                assert rows.get(short, {}).get('sha256') == meta['before'], name
                rows[short] = {'path': short, 'bytes': len(data), 'sha256': sha(data)}
        modules = {name: z.read('modules/' + name) for name in MODULES}
        bootstrap = z.read('__main__.py')
        runtime = z.read('RUNTIME.json')
    assert len(rows) == 1179 and identity(rows.values()) == BASE_CORE, 'Installed R85 core identity changed'
    return plan, rows, modules, bootstrap, runtime


def installer_text(original, files, client, http_sha):
    text = versions(original.decode())
    values = {'CLIENT_OLD_NAMESPACE': client['namespace'], 'CLIENT_NAMESPACE': client['namespace'],
              'CLIENT_OLD_NAME': client['name'], 'CLIENT_NAME': client['name'],
              'SOURCE_CORE_SHA256': BASE_CORE, 'R85_HTTP_SHA256': http_sha}
    for key, value in values.items():
        text, count = re.subn(r'^' + key + r'=.*$', key + '=' + repr(value), text, flags=re.M)
        assert count == 1, key
    start = text.index('PRODUCTION_PATHS='); end = text.index('NATIVE_TIMING=', start)
    new = sorted(n for n, m in files.items() if m['before'] is None)
    text = text[:start] + 'PRODUCTION_PATHS=' + repr(tuple(files)) + '\nNEW_PRODUCTION_PATHS=frozenset(' + repr(new) + ')\n' + text[end:]
    text = replace_once(text, "plan.get('clientChanges') is True", "plan.get('clientChanges') is False")
    text = replace_once(text, " require(plan['files'][HTTP]['before']==R85_HTTP_SHA256,'R86 HTTP başlangıç kimliği farklı')",
        " require(HTTP not in plan['files'] and not any(n.startswith(CLIENT_ASSETS) or n.startswith(old.CORE+'generated/client/') for n in plan['files']),'R86 istemci ve HTTP dosyalarını değiştiremez')")
    text = replace_once(text, "(plan['files'][HTTP]['after'] if installed==VERSION else R85_HTTP_SHA256)", 'R85_HTTP_SHA256')
    start = text.index(' # R86 changes the HTTP bundle only to point at the new immutable graph.')
    end = text.index(' operations=member(live.root,old.OPS)', start)
    text = text[:start] + """ # R86 retains the exact installed R85 HTTP/client graph. No asset copies,
 # renamed namespace or client payload is allowed, including during recovery.
 http_row=by_name[HTTP]
 original_http=source_reader(http_row) if source_reader else inplace.checked_path(live.root,HTTP).read_bytes()
 require(hashlib.sha256(original_http).hexdigest()==R85_HTTP_SHA256 and http_row['sha256']==R85_HTTP_SHA256,'Özgün HTTP kaynak kimliği farklı')
 require(not any(name==HTTP or name.startswith(CLIENT_ASSETS) or name.startswith(old.CORE+'generated/client/') for name,meta,data in updates),'R86 istemci grafiğini değiştiremez')
""" + text[end:]
    text = text.replace('# Exact reviewed scope; only the immutable game client is a new core file.', '# Exact reviewed server-only scope; the installed R85 client is retained.')
    return text.encode()


def retained_ingress(original):
    """Keep the same strict R85 file/manifest pins without another ingress delta."""
    text = original.decode()
    text = replace_once(text, "BEFORE_SHA256 = '4b4a74bb7e57736787d717d51f28bb901e5d7f7fde060151bb84ad5c5c8b5403'", "BEFORE_SHA256 = '325bd1caa7c52df9df159b63afa3cd7faf470f2cdae3f513a5c4ca29f655cec9'")
    text = replace_once(text, 'BEFORE_BYTES = 5178', 'BEFORE_BYTES = 5191')
    start = text.index('def validate_plan(plan):'); end = text.index('\ndef checked_body(', start)
    text = text[:start] + """def validate_plan(plan):
    require(PATH not in plan.get('files', {}), 'R86 mevcut R85 ingress dosyasını değiştiremez')

""" + text[end:]
    start = text.index('def canonical_payload(original):'); end = text.index('\ndef manifest_row(', start)
    text = text[:start] + """def canonical_payload(original):
    return checked_body(original)

""" + text[end:]
    start = text.index('def validate_update(')
    text = text[:start] + """def validate_update(root, plan, updates, original_manifest, *, source_reader=None):
    from inplace_stage import checked_path
    validate_plan(plan)
    row = manifest_row(original_manifest)
    original = source_reader(row) if source_reader else checked_path(root, PATH).read_bytes()
    checked_body(original)
    require(not any(name == PATH for name, meta, data in updates),
            'R86 mevcut R85 ingress dosyasını değiştiremez')
"""
    text = text.replace('Fixed R85 TCP ingress delta, outside the independently pinned core tree.', 'Preserved R85 TCP ingress identity for the server-only R86 update.')
    return text.encode()


def stage():
    previous, rows, modules, bootstrap, runtime = source()
    work = ROOT / 'working'
    actual = {p.relative_to(work / CORE).as_posix(): p for p in (work / CORE).rglob('*') if p.is_file()}
    assert set(rows) <= set(actual), 'A pinned R85 core file was removed'
    changed = []
    for name, path in actual.items():
        assert not path.is_symlink(), name
        data = path.read_bytes(); base = rows.get(name)
        if base and len(data) == base['bytes'] and sha(data) == base['sha256']: continue
        assert name in ALLOWED, 'Unreviewed production scope: ' + name
        changed.append(name)
    assert changed, 'Empty production delta'
    files = {}
    for short in sorted(changed, key=lambda n: (n not in rows, n)):
        data = actual[short].read_bytes(); base = rows.get(short)
        files[CORE + short] = {'before': base['sha256'] if base else None, 'after': sha(data), 'bytes': len(data)}
    for retained in (HTTP, INGRESS):
        data = (work / retained).read_bytes(); old = previous['files'][retained]
        assert len(data) == old['bytes'] and sha(data) == old['after'], 'Retained R85 file changed: ' + retained
    client = {**previous['client'], 'oldNamespace': previous['client']['namespace'], 'oldName': previous['client']['name']}
    plan = {key: previous[key] for key in ('protocol', 'databaseChanges', 'databaseSchemaChanges', 'databaseScope', 'accountsChanges', 'nativeBaseline', 'operationsCanonicalSHA256', 'runtime')}
    plan.update(version='R86_GAMEPLAY', sourceVersion='R85_GAMEPLAY', clientChanges=False,
                client=client, httpEntrySHA256=previous['files'][HTTP]['after'], baseCoreSHA256=BASE_CORE,
                baseCoreRows=sorted(rows.values(), key=lambda r: tuple(r['path'].split('/'))), files=files)
    for name, original in modules.items():
        data = original
        if name == 'installer.py': data = installer_text(original, files, client, plan['httpEntrySHA256'])
        elif name == 'ingress_stage.py': data = retained_ingress(original)
        elif name in ('runtime_stage.py', 'inplace_stage.py'): data = versions(original.decode()).encode()
        write(PACKAGE / 'modules' / name, data)
    write(PACKAGE / '__main__.py', versions(bootstrap.decode()).encode())
    payload = PACKAGE / 'payload'
    existing = {p.relative_to(payload).as_posix() for p in payload.rglob('*') if p.is_file()} if payload.exists() else set()
    assert existing <= set(files), 'Stale payload needs review'
    for name in files: write(payload / name, (work / name).read_bytes())
    write(PACKAGE / 'update.json', encoded(plan))
    write(PACKAGE / 'client-plan.json', encoded(client))
    write(PACKAGE / 'RUNTIME.json', runtime)
    target = dict(rows)
    for name, meta in files.items():
        short = name[len(CORE):]; target[short] = {'path': short, 'bytes': meta['bytes'], 'sha256': meta['after']}
    result = {'sourceArchiveSHA256': ARCHIVE_SHA, 'sourceCoreSHA256': BASE_CORE, 'targetCoreSHA256': identity(target.values()),
              'productionFiles': len(files), 'files': files, 'newFiles': [n for n, m in files.items() if m['before'] is None],
              'retainedClient': client, 'retainedHTTP': plan['httpEntrySHA256'], 'retainedIngress': previous['files'][INGRESS]['after'],
              'archiveProduced': False}
    write(ROOT / 'evidence/package-plan.json', encoded(result))
    print(json.dumps({k: v for k, v in result.items() if k not in ('files', 'retainedClient')}, indent=2))


if __name__ == '__main__':
    if not __debug__: raise RuntimeError('Package verification requires Python assertions')
    stage()
