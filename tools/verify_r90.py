"""Verify the exact R90 production tree, shipped delta, modules and test pins."""
from pathlib import Path
import hashlib,json,zipfile

repo=Path(__file__).resolve().parents[1]
root=repo/'r90_stability_work'
sha=lambda b:hashlib.sha256(b).hexdigest()
archive=root/'artifacts/CORE511_R90_TOPLU.zip'
assert sha(archive.read_bytes())=='51f0c634b0b05bce1f6267b0ffca3218e4ea56141a912333741fafb336082e2b'
core='core511-source/scripts/core511/'
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 plan=json.loads(z.read('update.json'));rows={r['path']:r for r in plan['baseCoreRows']}
 assert plan['version']=='R90_GAMEPLAY' and plan['sourceVersion']=='R89_GAMEPLAY'
 assert not any(plan[k] for k in ['clientChanges','databaseChanges','databaseSchemaChanges','accountsChanges'])
 for name,m in plan['files'].items():
  data=z.read('payload/'+name);assert len(data)==m['bytes'] and sha(data)==m['after']
  assert data==(root/'working'/name).read_bytes()==(root/'r90-package/payload'/name).read_bytes()
  if name.startswith(core):n=name[len(core):];rows[n]={'path':n,'bytes':len(data),'sha256':sha(data)}
 for name,h in json.loads(z.read('package-files.json')).items():assert sha(z.read('modules/'+name))==h==sha((root/'r90-package/modules'/name).read_bytes())
 for name in z.namelist():
  if name.startswith('evidence/') or name in ['SONUC.md','KURULUM.md']:assert z.read(name)==(root/name).read_bytes()
actual={p.relative_to(root/'working'/core).as_posix():p for p in (root/'working'/core).rglob('*') if p.is_file()}
assert set(actual)==set(rows)
for name,p in actual.items():assert sha(p.read_bytes())==rows[name]['sha256'],name
data={'kind':'core511-source-candidate-v1','baselineManifestSha256':plan['nativeBaseline'],'files':sorted(rows.values(),key=lambda r:tuple(r['path'].split('/')))}
identity=sha(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode())
assert identity=='b891076bb7e888968cbe42d1b8d19425b9390a72908706b7f9067a517e28001e'
print('R90 doğrulandı: 7 sunucu dosyası, R89 tabanı, arşiv/modül/test özeti eşleşti. Canlı kurulumu doğrulamaz.')
