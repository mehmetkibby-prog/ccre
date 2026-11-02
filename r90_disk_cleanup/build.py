"""Build the fixed-scope cleanup ZIP; never run the game updater."""
import hashlib,json,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent
MODULES={'installer.py','storage.py','r63_support.py','retention.py','central.mjs','cleanup.py','runtime_stage.py','inplace_stage.py','ingress_stage.py','client_stage.py','rollback_scope.py'}
WRAPPER='''import hashlib,json,os,sys,tempfile,zipfile
from pathlib import Path
archive=Path(sys.argv[0]).resolve();os.umask(0o077)
try:
 with zipfile.ZipFile(archive) as z,tempfile.TemporaryDirectory(prefix='core-disk-cleanup-') as temp:
  manifest=json.loads(z.read('modules.json'))
  expected={'installer.py','storage.py','r63_support.py','retention.py','central.mjs','cleanup.py','runtime_stage.py','inplace_stage.py','ingress_stage.py','client_stage.py','rollback_scope.py'}
  if set(manifest)!=expected or len(z.namelist())!=len(set(z.namelist())):raise RuntimeError('Paket dosya listesi bozuk')
  for name,sha in manifest.items():
   data=z.read('support/'+name)
   if hashlib.sha256(data).hexdigest()!=sha:raise RuntimeError('Paket bütünlüğü bozuk')
   (Path(temp)/name).write_bytes(data)
  sys.path.insert(0,temp)
  from cleanup import main
  main()
except BlockingIOError:
 print('DURDU: Başka bir kurulum veya yedek çalışıyor. Bitince aynı komutu tekrar çalıştırın.',flush=True);sys.exit(1)
except (Exception,KeyboardInterrupt) as e:
 message=str(e) if isinstance(e,RuntimeError) or type(e).__name__=='Refused' else type(e).__name__
 if isinstance(e,FileNotFoundError) and e.filename:message+=': '+str(e.filename)
 print('DURDU: '+message,flush=True);sys.exit(1)
'''
modules={name:(ROOT/'support'/name).read_bytes() for name in MODULES}
for name,data in modules.items():
 if name.endswith('.py'):compile(data,name,'exec')
compile(WRAPPER,'__main__.py','exec')
files={'__main__.py':WRAPPER.encode(),'KULLANIM.md':(ROOT/'KULLANIM.md').read_bytes(),
 'modules.json':(json.dumps({n:hashlib.sha256(b).hexdigest() for n,b in sorted(modules.items())},indent=2)+'\n').encode()}
files.update({'support/'+n:b for n,b in modules.items()})
out=ROOT/'artifacts/TEMIZLIK.zip';out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,data in sorted(files.items()):
  entry=zipfile.ZipInfo(name,(2026,11,2,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=0o100644<<16;z.writestr(entry,data)
with zipfile.ZipFile(out) as z:
 if z.testzip() is not None:raise RuntimeError('ZIP verification failed')
sha=hashlib.sha256(out.read_bytes()).hexdigest()
out.with_suffix('.zip.sha256').write_text(sha+'  '+out.name+'\n')
(ROOT/'evidence/package.json').write_text(json.dumps({'file':out.name,'bytes':out.stat().st_size,'sha256':sha},indent=2)+'\n')
print(sha,out.stat().st_size)
