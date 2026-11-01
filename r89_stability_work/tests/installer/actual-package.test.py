import sys,json,hashlib,subprocess,zipfile,tempfile,types,unittest
from pathlib import Path
ROOT=Path('/workspace/ccre/r89_stability_work')
sys.path.insert(0,str(ROOT/'r89-package/modules'))
import installer as I
import client_stage as C
def sha(data):return hashlib.sha256(data).hexdigest()
class ActualPackageTests(unittest.TestCase):
 def test_actual_plan_pins_and_all_source_payloads(self):
  plan=json.loads((ROOT/'r89-package/update.json').read_text());I.validate_scope(plan)
  self.assertEqual(plan['sourceVersion'],'R86_GAMEPLAY');self.assertEqual(plan['version'],'R89_GAMEPLAY')
  self.assertEqual(I.old.identity_from_rows(plan['baseCoreRows']),plan['baseCoreSHA256'])
  target={r['path']:dict(r) for r in plan['baseCoreRows']}
  for n,m in plan['files'].items():
   b=(ROOT/'r89-package/payload'/n).read_bytes();self.assertEqual(b,(ROOT/'working'/n).read_bytes());self.assertEqual(sha(b),m['after']);self.assertEqual(len(b),m['bytes'])
   if n.startswith(I.old.CORE):short=n[len(I.old.CORE):];self.assertEqual(target.get(short,{}).get('sha256'),m['before']);target[short]={'path':short,'bytes':len(b),'sha256':sha(b)}
  proof=json.loads((ROOT/'evidence/package-plan.json').read_text());self.assertEqual(I.old.identity_from_rows(target.values()),proof['targetCoreSHA256'])
  self.assertEqual(I.old.core_identity(ROOT/'working'/I.old.CORE),proof['targetCoreSHA256'])
  self.assertIn("updateVersion:'R89_GAMEPLAY'",(ROOT/'working'/I.old.CORE/'native-http-bindings.mjs').read_text())
  before=(ROOT.parent/'r86_stability_work/working'/I.HTTP).read_bytes();after=(ROOT/'working'/I.HTTP).read_bytes()
  self.assertEqual(sha(before),I.R86_HTTP_SHA256)
  self.assertEqual(before.replace(I.CLIENT_OLD_NAMESPACE.encode(),I.CLIENT_NAMESPACE.encode()).replace(I.CLIENT_OLD_NAME.encode(),I.CLIENT_NAME.encode()),after)
 def test_actual_three_generated_assets_and_transport_reference(self):
  plan=json.loads((ROOT/'r89-package/update.json').read_text())
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);prefix=I.CLIENT_ASSETS+I.CLIENT_OLD_NAMESPACE+'/'
   source=ROOT.parent/'r86_stability_work/working'/I.old.CORE/'generated/client';rows=[]
   for p in source.glob('*.js'):
    dest=root/prefix/p.name;dest.parent.mkdir(parents=True,exist_ok=True);data=p.read_bytes();dest.write_bytes(data);rows.append({'path':prefix+p.name,'bytes':len(data),'sha256':sha(data)})
   updates=[(n,m,(ROOT/'r89-package/payload'/n).read_bytes()) for n,m in plan['files'].items()]
   outputs,links=C.prepare_client_updates(types.SimpleNamespace(root=root),plan,updates,original_manifest={'files':rows})
   mapped={n:data for n,m,data in outputs};newprefix=I.CLIENT_ASSETS+I.CLIENT_NAMESPACE+'/'
   for name in I.CLIENT_GENERATED_NAMES:self.assertIn(newprefix+name,mapped)
   transport='core511-transport-r88-f2a907c787e721a0.js'
   self.assertIn(transport.encode(),mapped[newprefix+I.CLIENT_NAME]);self.assertIn(newprefix+transport,mapped)
   self.assertNotIn(newprefix+I.CLIENT_OLD_NAME,mapped)
   self.assertTrue(links)
   proof=json.loads((ROOT/'working'/I.old.CORE/'generated/native-client-proof.json').read_text())
   self.assertEqual(proof['name'],I.CLIENT_NAME)
   self.assertEqual(proof['patchedSha256'],sha((ROOT/'working'/I.old.CORE/'generated/client'/I.CLIENT_NAME).read_bytes()))
if __name__=='__main__':unittest.main(verbosity=2)
