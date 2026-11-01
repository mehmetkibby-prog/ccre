"""Port reviewed installer fault cases, retaining the installation invariants."""
import re
from pathlib import Path
from prepare_package import ROOT, transform_versions

def main():
    source=ROOT/'handoff/r84-tests'; target=ROOT/'tests/installer';target.mkdir(parents=True,exist_ok=True)
    for name in ('installer-fixture.py','installer-inplace.test.py','installer-gates.test.py','installer-client.test.py'):
        text=(source/name).read_text()
        # Resolve old/target source references before changing release labels.
        text=text.replace("F.BASE/'r83-work'", "F.BASE/'handoff/r84-work'")
        text=text.replace("F.BASE/'r84-work'", "F.BASE/'working'")
        text=text.replace("F.BASE/'r83-package/update.json'", "F.BASE/'handoff/PREVIOUS_PACKAGE/update.json'")
        text=transform_versions(text).replace('handoff/r85-work','handoff/r84-work').replace('PREVIOUS_PACKAGE','r84-package')
        text=text.replace('Path(__file__).resolve().parents[1]', 'Path(__file__).resolve().parents[2]')
        if name=='installer-fixture.py':
            text=text.replace("self.a=I.old.CORE+'native-bootstrap.mjs'", "self.a=I.PRODUCTION_PATHS[0]")
            anchor='   if name==I.HTTP:before,after=self.http,self.after_http'
            assert text.count(anchor)==1
            text=text.replace(anchor,anchor+"\n   if name==I.ingress.PATH:\n    before=(BASE/'handoff/r85-investigation/source-recovery/archived-prerequisites'/name).read_bytes()\n    after=(BASE/'working'/name).read_bytes()\n    require(after==I.ingress.canonical_payload(before),'Real ingress fixture differs from fixed reviewed pins')")
        if name=='installer-inplace.test.py':
            # The old arbitrary 10KB fixture ceiling counted the growing source
            # manifest. Check exact pre-update backup bodies instead: nothing
            # extra may be copied and no backup may be omitted or altered.
            old="  self.assertTrue(self.f.deploy());self.f.assert_intact(self,I.VERSION);directory,record=self.f.journal()"
            assert text.count(old)==1
            text=text.replace(old,"  original={p.relative_to(self.f.root).as_posix():p.read_bytes() for p in self.f.root.rglob('*') if p.is_file()}\n"+old)
            old="self.assertLess(sum(p.stat().st_size for p in (directory/'code').iterdir()),10000)"
            assert text.count(old)==1
            text=text.replace(old,"self.assertEqual({p.name:p.read_bytes() for p in (directory/'code').iterdir()},{row['backup']:original[row['path']] for row in record['files'] if row['before'] is not None})")
        if name=='installer-gates.test.py':
            text=text.replace("len(plan['baseCoreRows']),1166", "len(plan['baseCoreRows']),1167")
            text=text.replace("base=F.BASE/'r79-audit'", "base=F.BASE.parent/'r79_stability_work'")
            # Progress refresh was excluded in R84 but is explicitly reviewed
            # in R85. Keep the unapproved-file gate on unchanged reader paths.
            text=text.replace("I.old.CORE+'actor-section-reuse-r52.mjs',I.old.CORE+'actor-progress-refresh-r85.mjs'", "I.old.CORE+'read-worker.mjs',I.old.CORE+'snapshot-read-queue.mjs'")
            anchor="if __name__=='__main__':unittest.main(verbosity=2)"
            assert text.count(anchor)==1
            text=text.replace(anchor,(ROOT/'installer_extensions/ingress-tests.py.inc').read_text()+'\n'+anchor)
        if name=='installer-client.test.py':
            text=text.replace("node=F.BASE/'r79-audit'/F.R.NODE", "node=F.BASE.parent/'r79_stability_work'/F.R.NODE")
            text=text.replace("[rows[n] for n in sorted(rows)]", "sorted(rows.values(),key=lambda r:tuple(r['path'].split('/')))")
        (target/name).write_text(text)
    print('Installer tests ported: actual apply/recovery/rollback/client graph and source pins; service ports remain explicit fixtures.')

if __name__=='__main__':main()
