import json,os,subprocess,sys,tempfile,unittest,zipfile
from pathlib import Path
PACKAGE=Path(__file__).resolve().parents[1]/'artifacts/TEMIZLIK.zip'
class Tests(unittest.TestCase):
 def run_package(self,path,*args):
  return subprocess.run([sys.executable,str(path),*args],capture_output=True,text=True,timeout=15)
 def test_built_archive_help(self):
  result=self.run_package(PACKAGE,'--help')
  self.assertEqual(result.returncode,0,result.stdout+result.stderr);self.assertIn('--inspect',result.stdout);self.assertIn('--apply',result.stdout)
 @unittest.skipIf(os.geteuid()==0,'This case tests the unprivileged execution boundary')
 def test_built_archive_refuses_non_root_apply(self):
  result=self.run_package(PACKAGE,'--apply')
  self.assertEqual(result.returncode,1);self.assertIn('Root olarak',result.stdout)
 def test_tampered_module_is_rejected_before_import(self):
  with tempfile.TemporaryDirectory() as directory:
   target=Path(directory)/'modified.zip'
   with zipfile.ZipFile(PACKAGE) as source,zipfile.ZipFile(target,'w') as destination:
    for name in source.namelist():
     data=source.read(name)
     if name=='support/cleanup.py':data=b'raise RuntimeError("SHOULD NEVER EXECUTE")'
     destination.writestr(name,data)
   result=self.run_package(target,'--apply')
   self.assertEqual(result.returncode,1);self.assertIn('Paket bütünlüğü bozuk',result.stdout);self.assertNotIn('SHOULD NEVER EXECUTE',result.stdout)
 def test_unexpected_module_name_is_rejected(self):
  with tempfile.TemporaryDirectory() as directory:
   target=Path(directory)/'modified.zip'
   with zipfile.ZipFile(PACKAGE) as source,zipfile.ZipFile(target,'w') as destination:
    for name in source.namelist():
     data=source.read(name)
     if name=='modules.json':
      manifest=json.loads(data);manifest['../unexpected.py']='a'*64;data=json.dumps(manifest).encode()
     destination.writestr(name,data)
   result=self.run_package(target,'--inspect')
   self.assertEqual(result.returncode,1);self.assertIn('Paket dosya listesi bozuk',result.stdout)
 def test_tampered_schema_allowlist_is_rejected(self):
  with tempfile.TemporaryDirectory() as directory:
   target=Path(directory)/'modified.zip'
   with zipfile.ZipFile(PACKAGE) as source,zipfile.ZipFile(target,'w') as destination:
    for name in source.namelist():
     data=source.read(name)
     if name=='support/schema_sources.json':data=b'{"files":{}}'
     destination.writestr(name,data)
   result=self.run_package(target,'--apply')
   self.assertEqual(result.returncode,1);self.assertIn('Paket bütünlüğü bozuk',result.stdout)
 def test_tampered_artifact_allowlist_is_rejected(self):
  with tempfile.TemporaryDirectory() as directory:
   target=Path(directory)/'modified.zip'
   with zipfile.ZipFile(PACKAGE) as source,zipfile.ZipFile(target,'w') as destination:
    for name in source.namelist():
     data=source.read(name)
     if name=='support/artifact_sources.json':data=b'{"files":{}}'
     destination.writestr(name,data)
   result=self.run_package(target,'--apply')
   self.assertEqual(result.returncode,1);self.assertIn('Paket bütünlüğü bozuk',result.stdout)
if __name__=='__main__':unittest.main(verbosity=2)
