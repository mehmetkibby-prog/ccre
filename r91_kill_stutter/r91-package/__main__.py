import hashlib,json,os,sys,tempfile,zipfile
from pathlib import Path

def run():
 archive=Path(sys.argv[0]).resolve();os.umask(0o077)
 with zipfile.ZipFile(archive) as z,tempfile.TemporaryDirectory(prefix='core-r91-gameplay-') as temp:
  root=Path(temp);manifest=json.loads(z.read('package-files.json'))
  expected=set(('installer.py', 'storage.py', 'central.mjs', 'r63_support.py', 'client_stage.py', 'retention.py', 'runtime_stage.py', 'inplace_stage.py', 'ingress_stage.py'))
  if set(manifest)!=expected:raise RuntimeError('Paket dosya listesi bozuk')
  for name,sha in manifest.items():
   data=z.read('modules/'+name)
   if hashlib.sha256(data).hexdigest()!=sha:raise RuntimeError('Paket dosyası doğrulanamadı: '+name)
   (root/name).write_bytes(data)
  sys.path.insert(0,str(root));from installer import main
  main(archive=str(archive))
if __name__=='__main__':
 try:run()
 except (Exception,KeyboardInterrupt) as error:
  print('DURDU: '+(str(error) if isinstance(error,RuntimeError) or type(error).__name__=='Refused' else type(error).__name__),flush=True);sys.exit(1)
