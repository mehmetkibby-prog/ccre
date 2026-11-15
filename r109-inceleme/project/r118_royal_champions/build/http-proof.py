"""Reversible, reviewed R118 extension of the immutable installed HTTP composition.

The canonical V510 composition and all historical patch evidence are retained.
This records only the ten reviewed Royal changes after the exact R117 listener.
It never changes the runtime's entry-integrity guard or rewrites the HTTP source.
"""
from pathlib import Path
import difflib
import hashlib
import json
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parent
WORK = PROJECT/'r109_latency_completion/working'
SERVER = 'http-runtime/dist-vds/server/index.js'
PROOF = 'core511-source/scripts/core511/generated/native-http-composition-proof.json'
ARCHIVE = PROJECT/'r113_engine/artifacts/R113_ENGINE_76cd8cd4c40f.zip'
ARCHIVE_SHA = '4399dfe08550ebf04bd4c8ea7fbab8cedcdb804fd851495dd17847a0eabbcbc3'
BEFORE_SHA = 'd4d7b0366525ca205055bf08e503bbe644963d423c615b4414e0a074b7794056'
AFTER_SHA = 'ebd020559246908bed5921f66c4cc73155a1dd457ee0dfb812429779707ccbf6'
sha = lambda b: hashlib.sha256(b).hexdigest()


def compose():
    assert sha(ARCHIVE.read_bytes()) == ARCHIVE_SHA, 'historical HTTP archive changed'
    with zipfile.ZipFile(ARCHIVE) as archive:
        before = archive.read('payload/'+SERVER)
        proof_bytes = archive.read('payload/'+PROOF)
    proof = json.loads(proof_bytes)
    assert sha(before) == proof['generatedSha256'] == BEFORE_SHA
    after = (WORK/SERVER).read_bytes()
    assert sha(after) == AFTER_SHA, 'HTTP source differs from the reviewed ten-change R118 delta'
    labels = [
        'Register the two royal materials with versioned icons',
        'Count mixed emerald/royal pieces as one existing set family',
        'Name the royal set without changing its bonuses',
        'Retain the existing NPC-sale exclusion for royal gear',
        'Route royal/champions admin actions after existing administrator and Origin gates',
        'Restrict administrator royal grants to the five existing equipment slots',
        'Allow royal rarity in the existing administrator gear validator',
        'Sort royal gear in incremental inventory reads',
        'Sort royal gear in owner inventory reads',
        'Sort royal gear in full inventory reads',
    ]
    old = before.decode().splitlines(keepends=True)
    new = after.decode().splitlines(keepends=True)
    def offsets(lines):
        result = [0]
        for line in lines:
            result.append(result[-1]+len(line.encode()))
        return result
    a, b = offsets(old), offsets(new)
    edits = []
    for operation, i, j, k, l in difflib.SequenceMatcher(a=old, b=new, autojunk=False).get_opcodes():
        if operation == 'equal':
            continue
        edits.append({'scope': labels[len(edits)], 'beforeStart': a[i], 'beforeEnd': a[j],
                      'afterStart': b[k], 'afterEnd': b[l],
                      'original': ''.join(old[i:j]), 'replacement': ''.join(new[k:l])})
    assert len(edits) == 10, 'unexpected HTTP delta scope'
    forward, reverse = before, after
    for edit in reversed(edits):
        x, y = edit['beforeStart'], edit['beforeEnd']
        assert forward[x:y] == edit['original'].encode()
        forward = forward[:x]+edit['replacement'].encode()+forward[y:]
        x, y = edit['afterStart'], edit['afterEnd']
        assert reverse[x:y] == edit['replacement'].encode()
        reverse = reverse[:x]+edit['original'].encode()+reverse[y:]
    assert forward == after and reverse == before, 'HTTP delta is not exactly reversible'
    proof['generatedSha256'] = AFTER_SHA
    proof['r118RoyalChampions'] = {
        'sourceVersion': 'R117_HOOK10',
        'historicalServerArchive': ARCHIVE.relative_to(PROJECT).as_posix(),
        'historicalArchiveSha256': ARCHIVE_SHA,
        'previousCompositionProofSha256': sha(proof_bytes),
        'sourceSha256': BEFORE_SHA, 'patchedSha256': AFTER_SHA,
        'edits': edits, 'forwardByteEquality': True, 'inverseByteEquality': True,
        'scope': 'Ten reviewed Royal HTTP changes only. Original V510 source hash, all historical patches, admission guards, listener integrity check, authorization and transaction boundaries retained. Later R114-R117 installers retain this HTTP entry byte-for-byte.',
    }
    return proof


def main():
    proof = compose()
    if '--check' in sys.argv:
        assert json.loads((WORK/PROOF).read_text()) == proof, 'HTTP composition proof is stale'
    else:
        (WORK/PROOF).write_text(json.dumps(proof, indent=2, ensure_ascii=False)+'\n')
    report = {'sourceVersion':'R117_HOOK10','httpSha256':AFTER_SHA,'baseHttpSha256':BEFORE_SHA,
              'sourceSha256Preserved':proof['sourceSha256'],'edits':10,
              'forwardByteEquality':True,'inverseByteEquality':True,'integrityGuardChanged':False}
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
