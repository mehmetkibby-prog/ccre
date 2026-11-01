"""Bind the reviewed R87 client to an immutable asset graph; no live writes."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = ROOT.parent / 'r86_stability_work/working'
WORK = ROOT / 'working'
CORE = Path('core511-source/scripts/core511')
HTTP = Path('http-runtime/dist-vds/server/index.js')
NODE = Path('/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def main():
    proof_path = CORE / 'generated/native-client-proof.json'
    proof = json.loads((BASE / proof_path).read_text())
    old_name = proof['name']
    old = (BASE / CORE / 'generated/client' / old_name).read_bytes()
    assert sha(old) == 'b25e12cf61072ebe008bd3e38bcb832aca61db273b5baa994963dff73af7c2a7'
    replacements = json.loads((ROOT / 'tests/client-edits.json').read_text())
    text = old.decode()
    for edit in replacements:
        if edit.get('scope') == 'wings-loader-only':
            begin = text.index('    let e4 = `wings`;')
            end = text.index('  }, []), ia2 =', begin)
            section = text[begin:end]
            assert section.count(edit['before']) == edit['count']
            text = text[:begin] + section.replace(edit['before'],edit['after']) + text[end:]
        else:
            assert text.count(edit['before']) == edit['count']
            text = text.replace(edit['before'],edit['after'])
    new = text.encode()
    assert new == (ROOT / 'tests/client-candidate.js').read_bytes()
    name = 'game-client-core511-r87-' + sha(new)[:16] + '.js'
    (WORK / CORE / 'generated/client' / name).write_bytes(new)
    for edit in reversed(replacements):
        assert text.count(edit['after']) == edit['count']
        text = text.replace(edit['after'], edit['before'])
    assert text.encode() == old
    patch = {'sourceSha256': sha(old), 'candidateSha256': sha(new), 'bytes': len(new),
             'replacements': replacements, 'inverseEqual': True,
             'scope': 'Bounded asynchronous wings chroma processing and indexed previous-entity lookup; identical pixels and first-match lookup semantics.'}
    write_json(WORK / proof_path, {**proof, 'name': name, 'patchedSha256': sha(new), 'r87RenderWork': patch})
    namespace = subprocess.check_output([str(NODE), '--input-type=module', '-e',
        'const m=await import(process.argv[1]);console.log(m.CLIENT_ASSET_NAMESPACE);',
        (WORK / CORE / 'client-assets.mjs').as_uri()], text=True).strip()
    composition_path = CORE / 'generated/native-http-composition-proof.json'
    composition = json.loads((BASE / composition_path).read_text())
    old_namespace = composition['clientAssetNamespace']
    http = (BASE / HTTP).read_bytes()
    assert sha(http) == composition['generatedSha256']
    assert http.count(old_namespace.encode()) == 351 and http.count(old_name.encode()) == 2
    assert namespace != old_namespace and namespace.encode() not in http
    after = http.replace(old_namespace.encode(), namespace.encode()).replace(old_name.encode(), name.encode())
    assert after.replace(namespace.encode(), old_namespace.encode()).replace(name.encode(), old_name.encode()) == http
    (WORK / HTTP).write_bytes(after)
    delta = {'oldNamespace': old_namespace, 'namespace': namespace, 'oldName': old_name,
             'name': name, 'sourceSha256': sha(http), 'generatedSha256': sha(after),
             'inverseEqual': True, 'namespaceReplacements': 351, 'gameNameReplacements': 2,
             'scope': 'Immutable R87 game client references only; native HTTP routes unchanged.'}
    write_json(WORK / composition_path, {**composition, 'clientAssetNamespace': namespace,
        'generatedSha256': sha(after), 'r87Gameplay': delta})
    write_json(ROOT / 'evidence/client-integration.json', delta)
    print(json.dumps(delta, ensure_ascii=False))

if __name__ == '__main__':
    main()
