"""Publish the verified R89 delta to a new private download branch only."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path('/workspace/ccre/r89_stability_work')
if not __debug__:
    raise RuntimeError('Publication verification requires assertions')
gate = json.loads((ROOT/'evidence/final-release-gate-r89.json').read_text())
proof = json.loads((ROOT/'evidence/release-artifact.json').read_text())
archive = ROOT/'artifacts/CORE511_R89_TOPLU.zip'
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
assert gate['allRequiredChecksPassed'] and gate['performancePassed']
assert gate['assessmentKind'] == 'local-native50-twochannels-forest180-rune180'
assert gate['coreSHA256'] == proof['targetCoreSHA256']
assert sha(archive) == proof['sha256'] and archive.stat().st_size == proof['bytes']
with zipfile.ZipFile(archive) as package:
    assert json.loads(package.read('evidence/R89_KANIT.json')) == gate
    for document in ('KURULUM.md', 'SONUC.md'):
        assert package.read(document) == (ROOT/document).read_bytes()

repository = 'https://github.com/mehmetkibby-prog/ccre.git'
branch = 'r89-download'
def git(*args, cwd=None):
    return subprocess.check_output(['git', *args], cwd=cwd, stderr=subprocess.STDOUT, text=True).strip()
assert not git('ls-remote', '--heads', repository, branch), 'Existing branch cannot be overwritten'
stage = Path(tempfile.mkdtemp(prefix='github-publish-r89-', dir='/tmp'))
for name in (archive.name, archive.name+'.sha256'):
    shutil.copy2(ROOT/'artifacts'/name, stage/name)
for name in ('KURULUM.md', 'SONUC.md'):
    shutil.copy2(ROOT/name, stage/name)
url = f'https://github.com/mehmetkibby-prog/ccre/raw/refs/heads/{branch}/{archive.name}'
(stage/'README.md').write_text(
    '# Core of Life R89\n\n'
    f'[R89 paketini indir]({url})\n\n'
    'Kurulu R86 üzerine uygulanır. Rün Sahili iksir/kayıt kuyruğu, toplu kayıt zamanlaması ve katalog dışı Rün canavarıyla oluşan kanal çökmesi düzeltildi. R87–R88 istemci ve hareket iyileştirmeleri dahildir.\n\n'
    'Normal harita ve Rün Sahili için yerel 50 oyunculu 180 saniyelik ölçümlerin sonuçları [SONUC.md](SONUC.md) dosyasında. '
    'Bu yayın canlı VDS kurulumu yapmaz.\n\n'
    f'Boyut: {proof["bytes"]} bayt. SHA-256: `{proof["sha256"]}`\n\n'
    '[Kurulum ve geri alma](KURULUM.md)\n')
git('init', '-q', cwd=stage)
git('checkout', '-q', '-b', branch, cwd=stage)
git('remote', 'add', 'origin', repository, cwd=stage)
names = sorted(p.name for p in stage.iterdir() if p.is_file())
git('add', '--', *names, cwd=stage)
git('-c', 'user.name=Codex', '-c', 'user.email=codex@openai.com', 'commit', '-q', '-m',
    'Deliver verified R89 movement and crowd update', cwd=stage)
commit = git('rev-parse', 'HEAD', cwd=stage)
git('push', '-u', 'origin', 'HEAD:refs/heads/'+branch, cwd=stage)
assert git('ls-remote', '--heads', repository, branch).split()[0] == commit
download = Path(tempfile.mkdtemp(prefix='github-verify-r89-', dir='/tmp'))/'download'
git('clone', '--quiet', '--depth', '1', '--single-branch', '--branch', branch, repository, str(download))
assert git('rev-parse', 'HEAD', cwd=download) == commit
assert sorted(git('ls-files', cwd=download).splitlines()) == names
for name in names:
    assert sha(download/name) == sha(stage/name)
result = {'status':'UPLOADED_AND_VERIFIED', 'repository':'mehmetkibby-prog/ccre',
    'branch':branch, 'commit':commit, 'archiveBytes':proof['bytes'],
    'archiveSha256':proof['sha256'], 'files':names, 'userAuthorizedUpload':True,
    'liveDeployment':False, 'remoteBranchVerified':True,
    'verificationMethod':'Fresh authenticated clone; exact commit, file list and hashes',
    'verifiedAtUtc':datetime.now(timezone.utc).isoformat(), 'downloadUrl':url,
    'accessNote':'Repository visibility unchanged; authorized GitHub sign-in required.'}
(ROOT/'evidence/github-delivery-r89.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(result, ensure_ascii=False))
