"""Bind the reviewed R85 client to an immutable asset graph; no live writes."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = ROOT / 'handoff/r84-work'
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
    candidate = json.loads((ROOT / 'handoff/r85-investigation/movement/combined-client-candidate.json').read_text())
    proof_path = CORE / 'generated/native-client-proof.json'
    proof = json.loads((BASE / proof_path).read_text())
    old_name = proof['name']
    old = (BASE / CORE / 'generated/client' / old_name).read_bytes()
    assert sha(old) == candidate['sourceSha256']
    text = old.decode()
    for edit in candidate['replacements']:
        assert text.count(edit['before']) == 1
        text = text.replace(edit['before'], edit['after'], 1)
    new = text.encode()
    assert sha(new) == candidate['candidateSha256'] and len(new) == candidate['bytes']
    name = 'game-client-core511-r85-' + sha(new)[:16] + '.js'
    assert (WORK / CORE / 'generated/client' / name).read_bytes() == new
    for edit in reversed(candidate['replacements']):
        assert text.count(edit['after']) == 1
        text = text.replace(edit['after'], edit['before'], 1)
    assert text.encode() == old
    patch = {'sourceSha256': sha(old), 'candidateSha256': sha(new), 'bytes': len(new),
             'replacements': candidate['replacements'], 'inverseEqual': True,
             'scope': 'Transport-owned attack, automatic collection, potion and heartbeat admission; no prediction bound or server durability changes.'}
    write_json(WORK / proof_path, {**proof, 'name': name, 'patchedSha256': sha(new), 'r85CommandOwnership': patch})
    namespace = subprocess.check_output([str(NODE), '--input-type=module', '-e',
        'const m=await import(process.argv[1]);console.log(m.CLIENT_ASSET_NAMESPACE);',
        (WORK / CORE / 'client-assets.mjs').as_uri()], text=True).strip()
    composition_path = CORE / 'generated/native-http-composition-proof.json'
    composition = json.loads((BASE / composition_path).read_text())
    old_namespace = composition['clientAssetNamespace']
    http = (BASE / HTTP).read_bytes()
    assert sha(http) == composition['generatedSha256'] == 'c4c1f4c08345f4aaffcde30de40b93bd9578a42cc9c1b8b1d0b3b4326651f320'
    assert http.count(old_namespace.encode()) == 351 and http.count(old_name.encode()) == 2
    assert namespace != old_namespace and namespace.encode() not in http
    after = http.replace(old_namespace.encode(), namespace.encode()).replace(old_name.encode(), name.encode())
    assert after.replace(namespace.encode(), old_namespace.encode()).replace(name.encode(), old_name.encode()) == http
    (WORK / HTTP).write_bytes(after)
    delta = {'oldNamespace': old_namespace, 'namespace': namespace, 'oldName': old_name,
             'name': name, 'sourceSha256': sha(http), 'generatedSha256': sha(after),
             'inverseEqual': True, 'namespaceReplacements': 351, 'gameNameReplacements': 2,
             'scope': 'Immutable R85 game client references only; native HTTP routes unchanged.'}
    write_json(WORK / composition_path, {**composition, 'clientAssetNamespace': namespace,
        'generatedSha256': sha(after), 'r85Gameplay': delta})
    binding = CORE / 'native-http-bindings.mjs'
    old_binding = (BASE / binding).read_bytes()
    assert old_binding.count(b"updateVersion:'R84_GAMEPLAY'") == 1
    (WORK / binding).write_bytes(old_binding.replace(b"updateVersion:'R84_GAMEPLAY'", b"updateVersion:'R85_GAMEPLAY'"))
    write_json(ROOT / 'evidence/client-integration.json', delta)
    print(json.dumps(delta, ensure_ascii=False))

if __name__ == '__main__':
    main()
