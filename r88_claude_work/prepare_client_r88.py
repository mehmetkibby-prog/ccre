"""R88 client graph: one-line transport change (use_potion may be followed by
pipelined movement) bound to new immutable names. No live writes.

Run once on top of the R87 working tree (idempotency guarded by SHA checks)."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WORK = ROOT.parent / 'r87_stability_work/working'
CORE = Path('core511-source/scripts/core511')
HTTP = Path('http-runtime/dist-vds/server/index.js')
NODE = Path('/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node')
OLD_GAME = 'game-client-core511-r87-aaf06f246f8a616a.js'
OLD_BRIDGE = 'core511-transport-r79-715e78ecd9021ea8.js'
EDIT = ('var mayPipelineMovement = (payload) => payload?.action === "attack" && Number(payload.ability ?? 0) === 0 || ["claim_rewards", "collect"].includes(payload?.action);',
        'var mayPipelineMovement = (payload) => payload?.action === "attack" && Number(payload.ability ?? 0) === 0 || ["claim_rewards", "collect", "use_potion"].includes(payload?.action);')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    gen = WORK / CORE / 'generated'
    proof_path = gen / 'native-client-proof.json'
    proof = json.loads(proof_path.read_text())
    assert proof['name'] == OLD_GAME and proof['bridge'] == OLD_BRIDGE, 'expects the R87 client graph'
    old_bridge = (gen / 'client' / OLD_BRIDGE).read_bytes()
    assert sha(old_bridge) == proof['bridgeSha256']
    text = old_bridge.decode()
    assert text.count(EDIT[0]) == 1
    bridge = text.replace(EDIT[0], EDIT[1]).encode()
    assert bridge.decode().replace(EDIT[1], EDIT[0]).encode() == old_bridge
    bridge_name = 'core511-transport-r88-' + sha(bridge)[:16] + '.js'
    old_game = (gen / 'client' / OLD_GAME).read_bytes()
    assert sha(old_game) == proof['patchedSha256']
    gtext = old_game.decode()
    assert gtext.count(OLD_BRIDGE) == 1
    game = gtext.replace(OLD_BRIDGE, bridge_name).encode()
    assert game.decode().replace(bridge_name, OLD_BRIDGE).encode() == old_game
    game_name = 'game-client-core511-r88-' + sha(game)[:16] + '.js'
    (gen / 'client' / bridge_name).write_bytes(bridge)
    (gen / 'client' / game_name).write_bytes(game)
    source = (WORK / CORE / 'client-transport.mjs').read_bytes()
    record = {'oldGame': OLD_GAME, 'oldGameSha256': sha(old_game), 'game': game_name, 'gameSha256': sha(game),
              'oldBridge': OLD_BRIDGE, 'oldBridgeSha256': sha(old_bridge), 'bridge': bridge_name, 'bridgeSha256': sha(bridge),
              'edit': {'before': EDIT[0], 'after': EDIT[1], 'count': 1}, 'inverseEqual': True,
              'transportSourceSha256': sha(source),
              'scope': 'R88: a pending use_potion may be followed by one pipelined movement batch (server allowsFollowingMovement mirrors it); no other client change.'}
    new_proof = {**proof, 'name': game_name, 'patchedSha256': sha(game), 'bridge': bridge_name, 'bridgeSha256': sha(bridge),
                 'transportSourceSha256': sha(source), 'r88Movement': record}
    proof_path.write_text(json.dumps(new_proof, ensure_ascii=False, indent=2) + '\n')
    namespace = subprocess.check_output([str(NODE), '--input-type=module', '-e',
        'const m=await import(process.argv[1]);console.log(m.CLIENT_ASSET_NAMESPACE);',
        (WORK / CORE / 'client-assets.mjs').as_uri()], text=True).strip()
    composition_path = gen / 'native-http-composition-proof.json'
    composition = json.loads(composition_path.read_text())
    old_namespace = composition['clientAssetNamespace']
    http = (WORK / HTTP).read_bytes()
    assert sha(http) == composition['generatedSha256']
    assert http.count(old_namespace.encode()) == 351 and http.count(OLD_GAME.encode()) == 2
    assert namespace != old_namespace and namespace.encode() not in http
    after = http.replace(old_namespace.encode(), namespace.encode()).replace(OLD_GAME.encode(), game_name.encode())
    assert after.replace(namespace.encode(), old_namespace.encode()).replace(game_name.encode(), OLD_GAME.encode()) == http
    (WORK / HTTP).write_bytes(after)
    delta = {'oldNamespace': old_namespace, 'namespace': namespace, 'oldName': OLD_GAME, 'name': game_name,
             'sourceSha256': sha(http), 'generatedSha256': sha(after), 'inverseEqual': True,
             'namespaceReplacements': 351, 'gameNameReplacements': 2,
             'scope': 'Immutable R88 game client/transport references only; native HTTP routes unchanged.'}
    composition_path.write_text(json.dumps({**composition, 'clientAssetNamespace': namespace, 'generatedSha256': sha(after), 'r88Movement': delta}, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'evidence').mkdir(exist_ok=True)
    (ROOT / 'evidence/client-integration-r88.json').write_text(json.dumps({'client': record, 'http': delta}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'game': game_name, 'bridge': bridge_name, 'namespace': namespace, 'httpSha256': sha(after)}))

if __name__ == '__main__':
    main()
