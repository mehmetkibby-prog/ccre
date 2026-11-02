from pathlib import Path
from prepare_package import ROOT,versions,once

dest=ROOT/'tests/installer';dest.mkdir(exist_ok=True)
base=Path('/workspace/ccre/r86_stability_work/tests/installer')
s=versions((base/'installer-fixture.py').read_text())
s=once(s,'  self.after_http=self.http.replace(I.CLIENT_OLD_NAMESPACE.encode(),I.CLIENT_NAMESPACE.encode()).replace(I.CLIENT_OLD_NAME.encode(),I.CLIENT_NAME.encode())','  self.http+=I.VERIFICATION_HTTP_BEFORE\n  self.after_http=I.verification_http(self.http)')
s=once(s,'+[I.HTTP,I.ingress.PATH,self.old_game_core','+[I.ingress.PATH,self.old_game_core')
s=once(s,'test.assertEqual((self.root/I.HTTP).read_bytes(),self.http)','test.assertEqual((self.root/I.HTTP).read_bytes(),self.after_http if version==I.VERSION else self.http)')
(dest/'installer-fixture.py').write_text(s)
s=versions((base/'installer-server-only.test.py').read_text())
(dest/'installer-server-only.test.py').write_text(s)
print('R90 kurulum, tekrar çalıştırma, yarım yazma ve geri alma kontrolleri hazır.')
