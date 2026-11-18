import hashlib,json,os,subprocess,sys,tempfile,zipfile
from pathlib import Path
os.umask(0o077)
archive=Path(sys.argv[0]).resolve()
try:
 with zipfile.ZipFile(archive) as z,tempfile.TemporaryDirectory(prefix='core-r122-') as temp:
  for group,manifest in [('modules','modules.json'),('disk','disk-modules.json')]:
   for name,digest in json.loads(z.read(manifest)).items():
    p=Path(name)
    if p.is_absolute() or '..' in p.parts or p.suffix not in ('.py','.mjs') or len(p.parts)>2 or (len(p.parts)==2 and p.parts[0]!='support'):raise RuntimeError('Paket yolu farkli')
    data=z.read(group+'/'+name)
    if hashlib.sha256(data).hexdigest()!=digest:raise RuntimeError('Paket butunlugu bozuk')
    target=Path(temp)/group/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
  mode=sys.argv[1:]
  disk_modes={'--compact':'--apply','--check-disk':'--check','--recover-disk':'--recover'}
  if len(mode)==1 and mode[0] in disk_modes:
   result=subprocess.run([sys.executable,str(Path(temp)/'disk/runner.py'),disk_modes[mode[0]]]);sys.exit(result.returncode)
  sys.path.insert(0,str(Path(temp)/'modules'))
  from installer import main
  main(archive)
except Exception as error:
 print('DURDU: '+str(error),file=sys.stderr)
 sys.exit(1)
