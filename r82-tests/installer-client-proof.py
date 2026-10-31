"""Stage only proven R82 client metadata and exact immutable HTTP references."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
OLD = BASE / 'r81-work'
WORK = BASE / 'r82-work'
PACKAGE = BASE / 'r82-package'
CORE = 'core511-source/scripts/core511/'
HTTP = 'http-runtime/dist-vds/server/index.js'
OLD_NAMESPACE = 'core511-ef15c9c67ad1ae14'
OLD_HTTP_SHA = '9aa47af0b1be2cf7c2431eba5fad03a05769ff721e2099478540350a52fa4536'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main():
    patch = json.loads((BASE / 'r82-tests/respawn-client-patch-proof.json').read_text())
    old_name, new_name = patch['oldName'], patch['newName']
    assert old_name == 'game-client-core511-r79-51fbce3bd7351cf0.js'
    assert patch['exactInverse'] is True and patch['oldBundleUnchanged'] is True
    old_game = (OLD / CORE / 'generated/client' / old_name).read_bytes()
    new_game = (WORK / CORE / 'generated/client' / new_name).read_bytes()
    assert sha(old_game) == patch['oldSha256'] and len(old_game) == patch['oldBytes']
    assert sha(new_game) == patch['newSha256'] and len(new_game) == patch['newBytes']
    assert new_name == 'game-client-core511-r82-' + sha(new_game)[:16] + '.js'
    assert (WORK / CORE / 'generated/client' / old_name).read_bytes() == old_game
    proof_name = CORE + 'generated/native-client-proof.json'
    proof = json.loads((OLD / proof_name).read_text())
    assert proof['name'] == old_name and proof['patchedSha256'] == sha(old_game)
    proof['name'], proof['patchedSha256'], proof['r82Respawn'] = new_name, sha(new_game), patch
    write_json(WORK / proof_name, proof)
    node = BASE / 'r79-audit/runtime/node-v22.23.4-linux-x64/bin/node'
    module = WORK / CORE / 'client-assets.mjs'
    assert module.read_bytes() == (OLD / CORE / 'client-assets.mjs').read_bytes()
    script = "const m=await import(process.argv[1]);console.log(m.CLIENT_ASSET_NAMESPACE);"
    namespace = subprocess.check_output([str(node), '--input-type=module', '-e', script, module.as_uri()], text=True).strip()
    assert re.fullmatch(r'core511-[0-9a-f]{16}', namespace) and namespace != OLD_NAMESPACE
    original_http = (BASE / 'r79-audit' / HTTP).read_bytes()
    assert len(original_http) == 2229879 and sha(original_http) == OLD_HTTP_SHA
    assert original_http.count(OLD_NAMESPACE.encode()) == 351 and original_http.count(old_name.encode()) == 2
    assert namespace.encode() not in original_http and new_name.encode() not in original_http
    new_http = original_http.replace(OLD_NAMESPACE.encode(), namespace.encode()).replace(old_name.encode(), new_name.encode())
    assert new_http.replace(namespace.encode(), OLD_NAMESPACE.encode()).replace(new_name.encode(), old_name.encode()) == original_http
    (WORK / HTTP).parent.mkdir(parents=True, exist_ok=True)
    (WORK / HTTP).write_bytes(new_http)
    composition_name = CORE + 'generated/native-http-composition-proof.json'
    composition = json.loads((OLD / composition_name).read_text())
    assert composition['clientAssetNamespace'] == OLD_NAMESPACE and composition['generatedSha256'] == OLD_HTTP_SHA
    composition['clientAssetNamespace'], composition['generatedSha256'] = namespace, sha(new_http)
    composition['r82Gameplay'] = {'oldNamespace': OLD_NAMESPACE, 'namespace': namespace,
        'oldName': old_name, 'name': new_name, 'sourceSha256': OLD_HTTP_SHA,
        'generatedSha256': sha(new_http), 'inverseEqual': True,
        'namespaceReplacements': 351, 'gameNameReplacements': 2,
        'scope': 'Only immutable browser namespace and game asset references. All R79 HTTP route bodies, authorization and mutation paths retained.'}
    write_json(WORK / composition_name, composition)
    client = {'oldNamespace': OLD_NAMESPACE, 'namespace': namespace,
              'oldName': old_name, 'name': new_name, 'generatedNames': [new_name]}
    write_json(PACKAGE / 'client-plan.json', client)
    installer = PACKAGE / 'modules/installer.py'
    text = installer.read_text()
    text, n1 = re.subn(r"^CLIENT_NAMESPACE='[^']*'.*$", "CLIENT_NAMESPACE='" + namespace + "'", text, count=1, flags=re.MULTILINE)
    text, n2 = re.subn(r"^CLIENT_NAME='[^']*'.*$", "CLIENT_NAME='" + new_name + "'", text, count=1, flags=re.MULTILINE)
    assert (n1, n2) == (1, 1)
    installer.write_text(text)
    evidence = {'version': 'R82_GAMEPLAY', 'sourceVersion': 'R81_GAMEPLAY', 'client': client,
                'oldGameSHA256': sha(old_game), 'newGameSHA256': sha(new_game),
                'oldHTTP_SHA256': sha(original_http), 'newHTTP_SHA256': sha(new_http),
                'HTTPBytes': len(new_http), 'namespaceReplacements': 351, 'gameNameReplacements': 2,
                'HTTPExactInverse': True, 'oldGameUnchanged': True, 'nativeRecomposition': False,
                'generatedMetadata': {name: {'before': sha((OLD / name).read_bytes()),
                                           'after': sha((WORK / name).read_bytes())}
                                      for name in (proof_name, composition_name)},
                'liveDeploymentPerformed': False}
    write_json(BASE / 'r82-tests/installer-client-proof-evidence.json', evidence)
    print(json.dumps(evidence, indent=2))


if __name__ == '__main__':
    main()
