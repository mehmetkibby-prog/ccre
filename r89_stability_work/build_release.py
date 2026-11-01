"""Build only the exact reviewed and measured R86 → R89 delta."""
import hashlib,io,json,subprocess,sys,zipfile
from pathlib import Path
from prepare_package import ROOT,PACKAGE,CORE,MODULES,BASE_CORE,identity
from assess_release import assess
def sha(data):return hashlib.sha256(data).hexdigest()
def encoded(value):return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
def build():
 gate=assess();assert gate['performancePassed'] and gate['allRequiredChecksPassed'],'Unfinished acceptance; do not publish'
 plan=json.loads((PACKAGE/'update.json').read_text());assert plan['version']=='R89_GAMEPLAY' and plan['sourceVersion']=='R86_GAMEPLAY'
 assert identity(plan['baseCoreRows'])==BASE_CORE
 assert not any(plan[k] for k in ['databaseChanges','databaseSchemaChanges','accountsChanges']) and plan['clientChanges']
 files={name:(PACKAGE/name).read_bytes() for name in ['__main__.py','update.json','RUNTIME.json']}
 modules={name:(PACKAGE/'modules'/name).read_bytes() for name in MODULES};files['package-files.json']=encoded({n:sha(b) for n,b in modules.items()});files.update({'modules/'+n:b for n,b in modules.items()})
 for name,meta in plan['files'].items():
  data=(PACKAGE/'payload'/name).read_bytes();assert data==(ROOT/'working'/name).read_bytes() and sha(data)==meta['after'] and len(data)==meta['bytes'];files['payload/'+name]=data
 files['evidence/R89_KANIT.json']=encoded(gate)
 for row in gate['evidencePins']:
  data=(ROOT/row['path']).read_bytes();assert sha(data)==row['sha256'];files[row['path']]=data
 for name in ['KURULUM.md','SONUC.md']:
  data=(ROOT/name).read_bytes();assert b'__PENDING__' not in data;files[name]=data
 archive=ROOT/'artifacts/CORE511_R89_TOPLU.zip';assert not archive.exists(),'Never overwrite a delivered archive';archive.parent.mkdir(exist_ok=True)
 stream=io.BytesIO()
 with zipfile.ZipFile(stream,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for name,data in sorted(files.items()):
   entry=zipfile.ZipInfo(name,(2026,11,1,0,0,0));entry.external_attr=0o100644<<16;z.writestr(entry,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
 archive.write_bytes(stream.getvalue())
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None and sorted(z.namelist())==sorted(files)
  for name,data in files.items():assert z.read(name)==data
 result=subprocess.run([sys.executable,str(archive),'--help'],capture_output=True,text=True);assert result.returncode==0,result.stdout+result.stderr
 digest=sha(archive.read_bytes());(archive.parent/(archive.name+'.sha256')).write_text(digest+'  '+archive.name+'\n')
 proof={'name':archive.name,'bytes':archive.stat().st_size,'sha256':digest,'sourceCoreSHA256':BASE_CORE,'targetCoreSHA256':gate['coreSHA256'],'productionFiles':len(plan['files']),'members':len(files),'bootstrapHelpPassed':True,'liveDeployment':False}
 (ROOT/'evidence/release-artifact.json').write_bytes(encoded(proof));print(json.dumps(proof,indent=2))
if __name__=='__main__':build()
