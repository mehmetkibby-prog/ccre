"""Remove only unused managed releases and recognized old installer directories."""
import argparse,contextlib,hashlib,json,os,re,stat,sys,time,zipfile
from pathlib import Path
import installer as m
import retention
from rollback_scope import validate_rollback
from storage import digest,lock,require

DATA=Path('/var/lib/core511')
STAGING_PARENTS=(Path('/root'),Path('/var/tmp'))
ARCHIVE_EXTENSIONS=('.tar','.tgz','.tar.gz','.tar.xz','.tar.bz2','.7z','.rar','.zip')
DATA_EXTENSIONS=('.sqlite','.sqlite3','.db','.sql','.rdb','.aof','.sqlite-wal','.sqlite-shm','.db-wal','.db-shm')

ROOT_UID=0
SCHEMA_SOURCES=json.loads((Path(__file__).parent/'schema_sources.json').read_text())['files']
ARTIFACT_SOURCES=json.loads((Path(__file__).parent/'artifact_sources.json').read_text())['files']
PACKAGED_SOURCES={**SCHEMA_SOURCES,**ARTIFACT_SOURCES}

def known_packaged_source(root,path):
 # Exact original schema, dependency sourcemap and evidence-file identities.
 # This is not an extension/name exemption: changed files stay protected.
 expected=PACKAGED_SOURCES.get(path.relative_to(root).as_posix())
 return bool(expected and not path.is_symlink() and path.stat().st_size==expected['bytes'] and digest(path)==expected['sha256'])

def old_installer_name(name):
 if re.fullmatch(r'col-entry(?:420|421|422|423|424|425)\.[A-Za-z0-9_-]+',name):return True
 if name in ('col419','v416a-kurulum','col-bot-test-results'):return True
 if re.fullmatch(r'(?:col-kolay-|col-perf-r12\.)[A-Za-z0-9_-]+',name):return True
 found=re.fullmatch(r'(?:core-r|r)(\d+)(?:-fix)?-[A-Za-z0-9_-]+',name)
 return bool(found and 1<=int(found[1])<=89)

def staging_directories(now=None):
 now=time.time() if now is None else now;result={}
 for parent in STAGING_PARENTS:
  if not parent.exists():continue
  require(parent.is_dir() and not parent.is_symlink() and parent.resolve()==parent,'Geçici kurulum ana dizini farklı')
  for path in parent.iterdir():
   if path.is_symlink() or not path.is_dir():continue
   st=path.stat()
   # Unknown folders stay in the dependency graph, always protected. Only the
   # old installer names actually seen on this server may become candidates.
   result[path]=bool(old_installer_name(path.name) and now-st.st_mtime>=3600 and st.st_uid==ROOT_UID and not st.st_mode&0o022)
 return result

def staging_archive_guard(root,mounts,managed=False,examples=None):
 blocked=[]
 def block(reason,path):
  blocked.append(reason)
  if examples is not None and len(examples)<5:examples.append({'reason':reason,'path':path.relative_to(root).as_posix()})
 for folder,dirs,files in os.walk(root,followlinks=False,onerror=lambda e:(_ for _ in ()).throw(e)):
  dirs[:]=[n for n in dirs if Path(folder)/n not in mounts]
  for name in files:
   p=Path(folder)/name
   if p.is_symlink():continue
   lower=name.lower()
   if lower.endswith(DATA_EXTENSIONS) or re.search(r'\.(?:sqlite3?|db|sql)(?:$|[._-])',lower) or (not lower.endswith(('.py','.mjs','.js','.ts','.md')) and any(mark in lower for mark in ('backup','snapshot','-before.','yedek'))):
    if not (managed and known_packaged_source(root,p)):block('backup/data file',p)
    continue
   if not lower.endswith(ARCHIVE_EXTENSIONS):continue
   # Never discard an opaque archive inside a staging folder. A recognizable
   # Python installer ZIP contains its own plan; nested archives or data cause
   # preservation rather than decompression or speculative deletion.
   if not lower.endswith('.zip') or p.stat().st_size>100*1024**2:
    block('unclassified archive',p);continue
   try:
    with zipfile.ZipFile(p) as z:
     names=z.namelist()
     require(len(names)<=15000 and {'__main__.py','update.json'}.issubset(names),'installer ZIP shape')
     for member in names:
      base=Path(member).name.lower()
      require(not member.startswith('/') and '..' not in Path(member).parts,'archive member path')
      require(not base.endswith(DATA_EXTENSIONS+ARCHIVE_EXTENSIONS) and not any(x in base for x in ('backup.sqlite','snapshot','-before.','yedek')),'archive data')
   except (OSError,RuntimeError,ValueError,zipfile.BadZipFile):block('unclassified archive',p)
 return blocked

def live_guard(live):
 require(live.state.get('r64Deployment',{}).get('version') in ('R90_GAMEPLAY','R91_GAMEPLAY'),'Bu araç kurulu R90/R91 için hazırlanmıştır')
 require(not list(DATA.glob('*/active.json')),'Yarım kurulum/sıfırlama var; temizlik yapılmadı')
 live.active_binding();live.health(empty=False);accounts=live.accounts_identity()
 files=[m.STATE,live.config_file,live.accounts_file,Path(live.config['realm']['manifestFile']),Path(live.state['r64Deployment']['journal'])]
 expected={p:digest(p) for p in files}
 validate_rollback(live,files[-1])
 def recheck():
  require(not list(DATA.glob('*/active.json')),'Kurulum/sıfırlama başladı; temizlik durdu')
  require(all(digest(p)==value for p,value in expected.items()),'Kurulum/ayar kaydı değişti; temizlik durdu')
  live.same_database();live.account_stable(accounts);live.active_binding();live.health(empty=False)
 return recheck

def run(apply=False):
 require(os.geteuid()==0,'Root olarak çalıştırın')
 with lock(DATA/'r23-backups/install.lock'):
  live=m.Live();recheck=live_guard(live)
  # These are the same mutexes used by the daily SQLite snapshot services.
  # Missing or busy locks stop cleanup; no backup process is interrupted.
  live.backup_binding()
  with contextlib.ExitStack() as stack:
   for parent in sorted({live.database.parent,live.accounts_database.parent}):
    folder=parent/'backups';file=folder/'.backup.lock'
    require(folder.is_dir() and not folder.is_symlink() and file.is_file() and not file.is_symlink(),'Günlük yedek kilidi doğrulanamadı')
    stack.enter_context(lock(file))
   before=os.statvfs(m.RELEASES);free_before=before.f_bavail*before.f_frsize
   staging=staging_directories
   result=retention.cleanup(live,m.RELEASES,DATA,apply=apply,staging=staging,recheck=recheck)
   recheck()
   after=os.statvfs(m.RELEASES);free_after=after.f_bavail*after.f_frsize
   for name,reason in sorted(result['protected'].items()):
    if Path(name).parent==m.RELEASES and Path(name) not in (live.root,live.accounts_root):
     print('ESKİ SÜRÜM KORUNDU: '+Path(name).name+' ('+reason+')',flush=True)
     for row in result.get('protectedDetails',{}).get(name,[]):print('  '+row['reason']+': '+row['path'],flush=True)
   if apply:
    print('TEMİZLİK TAMAMLANDI. Silinen klasör: '+str(len(result['deleted'])),flush=True)
    print('Dosya sistemindeki boş alan değişimi: '+str(round((free_after-free_before)/1024**3,2))+' GiB',flush=True)
   else:print('İNCELEME TAMAMLANDI; silme yapılmadı.',flush=True)
   print('Kullanılabilir boş alan: '+str(round(free_after/1024**3,2))+' GiB',flush=True)
   return result

def main():
 p=argparse.ArgumentParser(description=__doc__)
 actions=p.add_mutually_exclusive_group(required=True)
 actions.add_argument('--inspect',action='store_true');actions.add_argument('--apply',action='store_true')
 args=p.parse_args();run(apply=args.apply)
