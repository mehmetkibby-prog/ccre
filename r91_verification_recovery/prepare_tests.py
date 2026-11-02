from pathlib import Path
import re
ROOT=Path(__file__).resolve().parent
BASE=Path('/tmp/core511-r90-startup-fix')
def versions(s):return re.sub('R89|R90|r89|r90',lambda m:{'R89':'R90','R90':'R91','r89':'r90','r90':'r91'}[m[0]],s)
def once(s,a,b):
 assert s.count(a)==1,a[:100]
 return s.replace(a,b)
folder=ROOT/'tests/installer';folder.mkdir(exist_ok=True)
s=versions((BASE/'tests/installer/installer-fixture.py').read_text())
s=once(s,'  self.http+=I.VERIFICATION_HTTP_BEFORE\n  self.after_http=I.verification_http(self.http)','  self.after_http=self.http.replace(I.CLIENT_OLD_NAMESPACE.encode(),I.CLIENT_NAMESPACE.encode()).replace(I.CLIENT_OLD_NAME.encode(),I.CLIENT_NAME.encode())')
s=once(s,"before=encoded({'generatedSha256':sha(self.http),'scope':'fixture'});after=encoded({'generatedSha256':sha(self.after_http),'scope':'fixture'})","before=encoded({'generatedSha256':sha(self.http),'clientAssetNamespace':I.CLIENT_OLD_NAMESPACE,'scope':'fixture'});after=encoded({'generatedSha256':sha(self.after_http),'clientAssetNamespace':I.CLIENT_NAMESPACE,'scope':'fixture'})")
s=once(s,'  put(self.root/I.HTTP,self.http)',"  self.before_a,self.after_a=next((b,a) for n,b,a in self.fixture_rows if n==self.a)\n  self.before_b,self.after_b=next((b,a) for n,b,a in self.fixture_rows if n==self.b)\n  put(self.root/I.HTTP,self.http)")
s=once(s,"'clientChanges':False","'clientChanges':True")
(folder/'installer-fixture.py').write_text(s)
s=versions((BASE/'tests/installer/installer-server-only.test.py').read_text())
s=once(s,"self.assertFalse(plan['clientChanges'])","self.assertTrue(plan['clientChanges'])")
s=once(s,"self.assertEqual(plan['client']['oldNamespace'],plan['client']['namespace'])","self.assertNotEqual(plan['client']['oldNamespace'],plan['client']['namespace'])")
s=once(s,"self.assertEqual(plan['client']['oldName'],plan['client']['name'])","self.assertNotEqual(plan['client']['oldName'],plan['client']['name'])")
s=once(s,"[('clientChanges',True)","[('clientChanges',False)")
(folder/'installer.test.py').write_text(s)
s=(BASE/'tests/startup-proof.test.mjs').read_text().replace('R90','R91').replace('r90-package','r91-package')
s=once(s,"'/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/generated/native-http-composition-proof.json'","'/tmp/core511-r90-startup-fix/working/core511-source/scripts/core511/generated/native-http-composition-proof.json'")
(ROOT/'tests/startup-proof.test.mjs').write_text(s)
