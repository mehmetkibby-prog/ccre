"""Exercise the exact staged bootstrap and nine hashed modules; no payload release."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / 'r85-package'
LABEL = os.environ.get('R85_CHECK_LABEL', 'final6')
assert LABEL.replace('-', '').isalnum()
EXPECTED = {'installer.py', 'storage.py', 'central.mjs', 'r63_support.py',
            'client_stage.py', 'retention.py', 'runtime_stage.py',
            'inplace_stage.py', 'ingress_stage.py'}
sha = lambda data: hashlib.sha256(data).hexdigest()
modules = {p.name: p.read_bytes() for p in (PACKAGE / 'modules').iterdir() if p.is_file()}
assert set(modules) == EXPECTED
manifest = {name: sha(data) for name, data in sorted(modules.items())}
bootstrap = (PACKAGE / '__main__.py').read_bytes()
with tempfile.TemporaryDirectory(prefix='bootstrap-smoke-', dir=ROOT / 'tests/installer') as temp:
    archive = Path(temp) / 'bootstrap-smoke.zip'
    contents = {'__main__.py': bootstrap,
                'package-files.json': (json.dumps(manifest, sort_keys=True) + '\n').encode(),
                **{'modules/' + name: data for name, data in modules.items()}}
    with zipfile.ZipFile(archive, 'w') as z:
        for name, data in sorted(contents.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.external_attr = 0o600 << 16
            z.writestr(info, data)
    archive_sha = sha(archive.read_bytes())
    command = ['docker', 'run', '--rm', '--network', 'none',
               '--mount', 'type=bind,src=/workspace/ccre,dst=/workspace/ccre',
               '-e', 'PYTHONDONTWRITEBYTECODE=1', 'python:3.12-slim',
               'python3', str(archive), '--help']
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            timeout=30)
    log = ROOT / 'evidence' / f'installer-bootstrap-{LABEL}.log'
    log.write_bytes(result.stdout)
    assert result.returncode == 0, result.stdout.decode(errors='replace')
    assert b'R85: verified in-place game update' in result.stdout
    assert b'--rollback-latest' in result.stdout and b'--recover' in result.stdout
report = {'passed': True, 'moduleCount': len(modules), 'modules': manifest,
          'bootstrapSHA256': sha(bootstrap), 'testArchiveSHA256': archive_sha,
          'output': str(log.relative_to(ROOT)), 'outputSHA256': sha(result.stdout),
          'scope': 'Exact staged bootstrap verifies nine real module hashes and reaches argparse --help in network-disabled Python3.12 Docker. Temporary test zip contains no update plan or payload and is deleted; no releasable archive or live operation.'}
out = ROOT / 'evidence' / f'installer-bootstrap-{LABEL}.json'
out.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'passed': True, 'moduleCount': len(modules), 'proof': str(out.relative_to(ROOT))}))
