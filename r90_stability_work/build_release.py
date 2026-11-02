import io,json,subprocess,sys,zipfile
from prepare_package import ROOT,PACKAGE,BASE,BASE_CORE,CORE,HTTP,MODULES,ALLOWED,sha,encoded,identity

def build():
 plan=json.loads((PACKAGE/'update.json').read_text());proof=json.loads((ROOT/'evidence/package-plan.json').read_text())
 assert plan['version']=='R90_GAMEPLAY' and plan['sourceVersion']=='R89_GAMEPLAY'
 assert plan['baseCoreSHA256']==BASE_CORE and identity(plan['baseCoreRows'])==BASE_CORE
 assert not any(plan[k] for k in ['clientChanges','databaseChanges','databaseSchemaChanges','accountsChanges'])
 assert set(plan['files'])==ALLOWED
 evidence=['before-process.tap','verification-tests.tap','compatibility-targeted.tap','installer-tests.txt','package-plan.json']
 for name,expected in [('verification-tests.tap',13),('compatibility-targeted.tap',2)]:
  text=(ROOT/'evidence'/name).read_text();assert f'# pass {expected}\n' in text and '# fail 0\n' in text
 assert 'Ran 10 tests' in (ROOT/'evidence/installer-tests.txt').read_text() and (ROOT/'evidence/installer-tests.txt').read_text().rstrip().endswith('OK')
 assert 'A timed CAPTCHA must not interrupt an active tower.' in (ROOT/'evidence/before-process.tap').read_text()
 rows={r['path']:r for r in plan['baseCoreRows']}
 for name,m in plan['files'].items():
  data=(PACKAGE/'payload'/name).read_bytes();assert data==(ROOT/'working'/name).read_bytes() and sha(data)==m['after'] and len(data)==m['bytes']
  if name.startswith(CORE):n=name[len(CORE):];rows[n]={'path':n,'bytes':m['bytes'],'sha256':m['after']}
 actual={p.relative_to(ROOT/'working'/CORE).as_posix():p for p in (ROOT/'working'/CORE).rglob('*') if p.is_file()}
 assert set(actual)==set(rows)
 for n,p in actual.items():assert sha(p.read_bytes())==rows[n]['sha256']
 assert identity(list(rows.values()))==proof['targetCoreSHA256']
 modules={name:(PACKAGE/'modules'/name).read_bytes() for name in MODULES}
 files={name:(PACKAGE/name).read_bytes() for name in ['__main__.py','update.json','RUNTIME.json']}
 files.update({'modules/'+name:data for name,data in modules.items()});files['package-files.json']=encoded({n:sha(b) for n,b in modules.items()})
 for name in plan['files']:files['payload/'+name]=(PACKAGE/'payload'/name).read_bytes()
 for name in evidence:files['evidence/'+name]=(ROOT/'evidence'/name).read_bytes()
 for name in ['KURULUM.md','SONUC.md']:files[name]=(ROOT/name).read_bytes()
 archive=ROOT/'artifacts/CORE511_R90_TOPLU.zip';assert not archive.exists(),'Never replace a delivered artifact'
 data=io.BytesIO()
 with zipfile.ZipFile(data,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for name,content in sorted(files.items()):
   info=zipfile.ZipInfo(name,(2026,11,2,0,0,0));info.external_attr=0o100644<<16;z.writestr(info,content,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
 archive.write_bytes(data.getvalue())
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  for name,data in files.items():assert z.read(name)==data
 result=subprocess.run([sys.executable,str(archive),'--help'],capture_output=True,text=True);assert result.returncode==0,result.stdout+result.stderr
 (archive.parent/(archive.name+'.sha256')).write_text(sha(archive.read_bytes())+'  '+archive.name+'\n')
 result={**proof,'files':list(plan['files']),'archive':archive.name,'sha256':sha(archive.read_bytes()),'bytes':archive.stat().st_size,'behaviorTests':15,'installerTests':10,'liveDeployment':False}
 (ROOT/'evidence/release-artifact.json').write_bytes(encoded(result));print(json.dumps(result,indent=2))

if __name__=='__main__':build()
