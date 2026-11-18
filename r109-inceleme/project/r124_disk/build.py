import hashlib
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent
files = [root / name for name in ('runner.py', 'worker.mjs', 'compact.mjs')]
files += sorted(path for path in (root / 'support').iterdir() if path.suffix in ('.py', '.mjs'))
bootstrap = """import os, subprocess, sys, tempfile
from pathlib import Path
from zipfile import ZipFile
os.umask(0o077)
with tempfile.TemporaryDirectory(prefix='col-r123-disk-') as directory:
    with ZipFile(sys.argv[0]) as archive:
        for name in archive.namelist():
            if name == '__main__.py':
                continue
            path = Path(name)
            if path.is_absolute() or '..' in path.parts:
                raise SystemExit('Invalid archive path')
            archive.extract(name, directory)
    raise SystemExit(subprocess.call([sys.executable, str(Path(directory) / 'runner.py'), *sys.argv[1:]]))
"""
output = root / 'r123-disk-bakim.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    archive.writestr('__main__.py', bootstrap)
    for path in files:
        archive.write(path, path.relative_to(root))
with ZipFile(output) as archive:
    assert archive.testzip() is None
print(hashlib.sha256(output.read_bytes()).hexdigest())
