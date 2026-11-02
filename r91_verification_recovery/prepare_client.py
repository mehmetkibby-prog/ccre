from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parent
BASE=Path('/tmp/core511-r90-startup-fix/working')
WORK=ROOT/'working'
CORE=Path('core511-source/scripts/core511')
HTTP=Path('http-runtime/dist-vds/server/index.js')
NODE='/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node'
def sha(data):return hashlib.sha256(data).hexdigest()
def encoded(value):return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
proof=json.loads((BASE/CORE/'generated/native-client-proof.json').read_bytes())
old_name=proof['name'];original=(BASE/CORE/'generated/client'/old_name).read_bytes()
assert sha(original)==proof['patchedSha256']
text=original.decode();start=text.index('function colUseVerificationState501(');end=text.index('function colTimedInfo502(',start)
helper=(WORK/CORE/'verification-recovery-r91.mjs').read_text()
replacement=helper.replace('export function ','function ').replace('export async function ','async function ')
patched=(text[:start]+replacement+'\n'+text[end:]).encode()
assert patched.decode().replace(replacement+'\n',text[start:end],1)==text
name='game-client-core511-r91-'+sha(patched)[:16]+'.js'
for stale in (WORK/CORE/'generated/client').glob('game-client-core511-r91-*.js'):
 if stale.name!=name:stale.unlink()
(WORK/CORE/'generated/client'/name).write_bytes(patched)
record={'sourceSha256':sha(original),'patchedSha256':sha(patched),'name':name,'helperSha256':sha(helper.encode()),'scope':'Bound verification status reads, recover retry, coalesce duplicate requirements, display read errors; fail closed.'}
new_proof={**proof,'name':name,'patchedSha256':sha(patched),'r91VerificationRecovery':record}
(WORK/CORE/'generated/native-client-proof.json').write_bytes(encoded(new_proof))
namespace=subprocess.check_output([NODE,'--input-type=module','-e','const m=await import(process.argv[1]);console.log(m.CLIENT_ASSET_NAMESPACE);',(WORK/CORE/'client-assets.mjs').as_uri()],text=True).strip()
comp=json.loads((BASE/CORE/'generated/native-http-composition-proof.json').read_bytes());before=(BASE/HTTP).read_bytes()
assert comp['generatedSha256']==sha(before)
old_namespace=comp['clientAssetNamespace']
assert before.count(old_namespace.encode())==351 and before.count(old_name.encode())==2
after=before.replace(old_namespace.encode(),namespace.encode()).replace(old_name.encode(),name.encode())
assert after.replace(namespace.encode(),old_namespace.encode()).replace(name.encode(),old_name.encode())==before
(WORK/HTTP).write_bytes(after)
new_comp={**comp,'clientAssetNamespace':namespace,'generatedSha256':sha(after)}
(WORK/CORE/'generated/native-http-composition-proof.json').write_bytes(encoded(new_comp))
evidence={'client':record,'oldName':old_name,'name':name,'oldNamespace':old_namespace,'namespace':namespace,'httpBefore':sha(before),'httpAfter':sha(after),'namespaceReplacements':351,'gameNameReplacements':2,'inverseEqual':True}
(ROOT/'evidence/client.json').write_bytes(encoded(evidence))
print(json.dumps(evidence,ensure_ascii=False))
