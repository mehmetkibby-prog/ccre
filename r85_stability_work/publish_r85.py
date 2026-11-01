"""Publish only the verified R85 artifact to a new download branch."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import shutil
import subprocess
import tempfile
import zipfile

if not __debug__:raise RuntimeError('Publication verification requires Python assertions')

ROOT = Path(__file__).resolve().parent
proof = json.loads((ROOT/'evidence/release-artifact.json').read_text())
gate_path=proof.get('gatePath','evidence/final-release-gate.json')
assert gate_path in ('evidence/final-release-gate.json','evidence/final-release-gate-scoped50-r85.json','evidence/final-release-gate-scoped50-retry1-r85.json','evidence/final-release-gate-urgent50-r85.json','evidence/final-release-gate-mitigation-r85.json')
gate = json.loads((ROOT/gate_path).read_text())
archive = ROOT/'artifacts/CORE511_R85_TOPLU.zip'
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
assert gate['allRequiredChecksPassed']
assert gate['crowdTestedLast'] if gate_path!='evidence/final-release-gate-mitigation-r85.json' else gate['exactPreviouslyMeasuredSourceRestored']
assert gate['coreSHA256'] == proof['targetCoreSHA256']
assert sha(archive) == proof['sha256'] and archive.stat().st_size == proof['bytes']
scoped=gate_path in ('evidence/final-release-gate-scoped50-r85.json','evidence/final-release-gate-scoped50-retry1-r85.json')
assert (gate.get('assessmentKind')=='preregistered-scoped50')==scoped
assert (gate.get('assessmentKind')=='urgent-two-short50')==(gate_path=='evidence/final-release-gate-urgent50-r85.json')
assert (gate.get('assessmentKind')=='verified-functional-mitigation')==(gate_path=='evidence/final-release-gate-mitigation-r85.json')
assert proof.get('assessmentKind','historical-full-gate')==gate.get('assessmentKind','historical-full-gate')
with zipfile.ZipFile(archive) as package:
    assert json.loads(package.read('evidence/R85_KANIT.json'))==gate
    assert json.loads(package.read('evidence/crowd-summary.json'))==json.loads((ROOT/gate['crowdSummary']).read_text())
    for document in ('KURULUM.md','SONUC.md'):
        assert package.read(document)==(ROOT/document).read_bytes()
repository = 'https://github.com/mehmetkibby-prog/ccre.git'
branch = 'r85-download'
def git(*args, cwd=None):
    return subprocess.check_output(['git', *args], cwd=cwd, stderr=subprocess.STDOUT, text=True).strip()
assert not git('ls-remote', '--heads', repository, branch), 'Existing download branch must not be overwritten'
stage = Path(tempfile.mkdtemp(prefix='github-publish-r85-', dir='/tmp'))
for name in (archive.name, archive.name+'.sha256'):
    shutil.copy2(ROOT/'artifacts'/name, stage/name)
for name in ('KURULUM.md', 'SONUC.md'):
    shutil.copy2(ROOT/name, stage/name)
url = 'https://github.com/mehmetkibby-prog/ccre/raw/refs/heads/r85-download/'+archive.name
(stage/'README.md').write_text(
    '# Core of Life R85\n\n'
    f'[R85 paketini indir]({url})\n\n'
    'R84 üzerine uygulanır. İşlem sonrası kilitli kalma, ödüllerde gereksiz oyuncu bekletme, '
    'envanter okumaları, geciken komutların birikmesi ve yeniden doğuş bildirimi düzeltmelerini içerir.\n\n'
    f'Boyut: {proof["bytes"]:,} bayt. Bu bir değişiklik paketidir; mevcut doğrulanmış çalışma zamanını kullanır.\n\n'
    f'SHA-256: `{proof["sha256"]}`\n\n'
    'Kurulum: [KURULUM.md](KURULUM.md). Ölçümler ve sınırlar: [SONUC.md](SONUC.md). '
    'Bu yayın canlı VDS kurulumu yapmaz.\n')
git('init', '-q', cwd=stage)
git('checkout', '-q', '-b', branch, cwd=stage)
git('remote', 'add', 'origin', repository, cwd=stage)
names = sorted(p.name for p in stage.iterdir() if p.is_file())
git('add', '--', *names, cwd=stage)
git('-c', 'user.name=Codex', '-c', 'user.email=codex@openai.com', 'commit', '-q', '-m',
    'Deliver verified R85 game stability update', cwd=stage)
commit = git('rev-parse', 'HEAD', cwd=stage)
print(json.dumps({'phase':'pushing', 'bytes':proof['bytes'], 'commit':commit}), flush=True)
git('push', '-u', 'origin', 'HEAD:refs/heads/'+branch, cwd=stage)
assert git('ls-remote', '--heads', repository, branch).split()[0] == commit
download = Path(tempfile.mkdtemp(prefix='github-verify-r85-', dir='/tmp'))/'download'
git('clone', '--quiet', '--depth', '1', '--single-branch', '--branch', branch, repository, str(download))
assert git('rev-parse', 'HEAD', cwd=download) == commit
assert sorted(git('ls-files', cwd=download).splitlines()) == names
for name in names:
    assert sha(download/name) == sha(stage/name), name
result = {'status':'UPLOADED_AND_VERIFIED', 'repository':'mehmetkibby-prog/ccre',
    'branch':branch, 'commit':commit, 'archiveBytes':proof['bytes'], 'archiveSha256':proof['sha256'],
    'files':names, 'userAuthorizedUpload':True, 'liveDeployment':False,
    'remoteBranchVerified':True, 'verificationMethod':'Fresh authenticated clone; exact commit, file list and all hashes',
    'verifiedAtUtc':datetime.now(timezone.utc).isoformat(), 'downloadUrl':url,
    'accessNote':'Repository visibility unchanged; authorized GitHub sign-in is required for the private repository.'}
(ROOT/'evidence/github-delivery-r85.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(result, ensure_ascii=False), flush=True)
