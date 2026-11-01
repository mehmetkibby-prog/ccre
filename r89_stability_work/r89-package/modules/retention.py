"""Delete only unreferenced managed release trees, never databases or backups.

Caller holds the install lock. Current and immediate rollback releases, effective
service paths, running processes and transitive symlink dependencies are pinned.
Unknown trees, ambiguous history, mount points and persistent data fail closed.
"""
import json,os,re,shutil,stat,subprocess,time
from pathlib import Path
from storage import read,require,journal,sync_dir

def references(text,roots):
 found={p for p in roots if re.search(re.escape(str(p))+r'(?=$|[^A-Za-z0-9_.-])',str(text))}
 for name in set(re.findall(r'''/[^\s\x00"'{};=():,]+''',str(text))):
  resolved=Path(name).resolve()
  found.update(p for p in roots if resolved.is_relative_to(p))
 return found

def system_references():
 def run(args):
  r=subprocess.run(['/usr/bin/systemctl',*args],capture_output=True,text=True,timeout=20)
  require(r.returncode==0,'Servis başlatma yolları okunamadı; sürüm silinmedi')
  return r.stdout
 names={line.split()[0] for line in run(['list-unit-files','coreoflife-*','--no-legend','--no-pager']).splitlines() if line.strip()}
 names.update(line.split()[0] for line in run(['list-units','--all','coreoflife-*','--no-legend','--no-pager','--plain']).splitlines() if line.strip())
 require('coreoflife-accounts.service' in names,'Hesap servisi tanımları bulunamadı')
 data=[]
 for unit in sorted(names):
  require(re.fullmatch(r'coreoflife-[A-Za-z0-9_.@-]+',unit),'Servis adı geçersiz')
  data.append(run(['show',unit,'--property=ExecStart,ExecStartPre,ExecStartPost,ExecStop,ExecStopPost,Environment,EnvironmentFiles,WorkingDirectory,RootDirectory,ReadOnlyPaths,ReadWritePaths,BindPaths,BindReadOnlyPaths']))
 # Processes may still have an old binary, library, working directory or fd.
 for proc in Path('/proc').iterdir():
  if not proc.name.isdigit():continue
  try:
   for name in ('cmdline','environ','maps'):data.append((proc/name).read_bytes().decode(errors='replace'))
   for name in ('cwd','exe'):data.append(os.readlink(proc/name))
   for fd in (proc/'fd').iterdir():
    try:data.append(os.readlink(fd))
    except FileNotFoundError:pass
  except (FileNotFoundError,ProcessLookupError):continue
 # Service environment files can contain additional runtime paths.
 for blob in list(data):
  for name in re.findall(r'(?:path=|[=\s])(/[A-Za-z0-9_./-]+\.(?:env|conf|json))',blob):
   p=Path(name)
   if p.is_file():data.append(p.read_text())
 return '\n'.join(data)

def mount_points():
 return {Path(re.sub(r'\\([0-7]{3})',lambda m:chr(int(m[1],8)),line.split()[4])) for line in Path('/proc/self/mountinfo').read_text().splitlines()}

def inspect_tree(root,mounts,protected=False):
 """Never follow links. Count allocated blocks, retaining shared inode counts."""
 rows={};links=[];blocked=[];last=time.monotonic()
 for folder,dirs,files in os.walk(root,followlinks=False,onerror=lambda e:(_ for _ in ()).throw(e)):
  if time.monotonic()-last>=5:
   print('Sürüm kullanımı inceleniyor: '+root.name,flush=True);last=time.monotonic()
  for name in dirs+files:
   p=Path(folder)/name;s=p.lstat()
   if p in mounts:blocked.append('mounted path');dirs[:]=[n for n in dirs if n!=name];continue
   if stat.S_ISLNK(s.st_mode):links.append((p,p.resolve()));continue
   if stat.S_ISDIR(s.st_mode):continue
   if protected:continue
   if not stat.S_ISREG(s.st_mode):blocked.append('special file');continue
   if p.name.lower().endswith(('.sqlite','.sqlite3','.db','.sqlite-wal','.sqlite-shm','.sqlite3-wal','.sqlite3-shm','.db-wal','.db-shm','.rdb','.aof')) or p.name.lower() in ('dump.sql','database','backups'):
    blocked.append('persistent data')
   # Catch SQLite databases with nonstandard filenames too.
   if s.st_size>=16:
    with p.open('rb') as f:
     if f.read(16)==b'SQLite format 3\x00':blocked.append('SQLite data')
   key=(s.st_dev,s.st_ino)
   row=rows.setdefault(key,{'blocks':s.st_blocks*512,'links':s.st_nlink,'count':0});row['count']+=1
 return rows,links,blocked

def plan(live,releases,state_root,external=None,mounts=None,updates_root=None):
 releases=Path(releases);state_root=Path(state_root)
 require(releases.is_dir() and not releases.is_symlink(),'Sürüm ana dizini geçersiz')
 require(live.root.parent==releases and live.accounts_root.parent==releases,'Canlı sürüm kapsamı farklı')
 # No cleanup can coexist with an unfinished updater/reset.
 for active in state_root.glob('*/active.json'):
  raise RuntimeError('Yarım işlem kaydı var; sürüm silinmedi: '+str(active))
 roots={p for p in releases.iterdir() if p.is_dir() and not p.is_symlink()}
 pins={live.root:'current',live.accounts_root:'accounts'}
 previous_file=Path(live.state.get('r64Deployment',{}).get('journal',''))
 require(previous_file.is_absolute() and previous_file.parent.parent==Path(updates_root or state_root/'r64-updates'),'Geri dönüş kaydı doğrulanamadı; sürüm silinmedi')
 record=read(previous_file)
 require(record['phase']=='complete' and Path(record['destination'])==live.root,'Geri dönüş kaydı etkin sürümle eşleşmiyor')
 previous=Path(record['source'])
 require(previous in roots and previous!=live.root,'Bir önceki sürüm bulunamadı; sürüm silinmedi')
 pins[previous]='previous'
 # Retain configs, realm databases and all state-selected runtime references.
 protected=json.dumps({'game':live.config,'accounts':live.accounts_config,'realm':live.manifest})
 for root in references(protected,roots):pins.setdefault(root,'state/config')
 for root in references(system_references() if external is None else external,roots):pins.setdefault(root,'service/process')
 for alias in [*releases.iterdir(),*releases.parent.iterdir()]:
  if alias.is_symlink():
   for root in roots:
    if alias.resolve().is_relative_to(root):pins.setdefault(root,'active symlink')
 mounts=mount_points() if mounts is None else mounts
 trees={};unknown={};interrupted={}
 audit=state_root/'release-retention'
 if audit.exists():
  require(not audit.is_symlink() and audit.stat().st_uid==0 and stat.S_IMODE(audit.stat().st_mode)==0o700,'Temizlik günlüğü izinleri değişmiş')
  for log in audit.glob('*.json'):
   require(not log.is_symlink() and log.stat().st_uid==0,'Temizlik günlüğü değişmiş')
   saved=read(log);name=saved.get('deleting')
   if saved.get('phase')=='planned' and name in saved.get('candidates',[]):interrupted[name]=tuple(saved['identities'][name])
 for root in sorted(roots):
  if not root.name.startswith('core511-') or root in mounts or root.lstat().st_uid!=0:
   unknown[root]='unmanaged/mount/owner';continue
  mf=root/'release-manifest.json'
  try:
   if interrupted.get(str(root))!=(root.stat().st_dev,root.stat().st_ino):
    require(mf.is_file() and not mf.is_symlink() and mf.stat().st_uid==0,'manifest')
    m=read(mf);require(isinstance(m.get('files'),list) and bool(m['files']) and re.fullmatch('[0-9a-f]{64}',m.get('runtimeSha256','')),'manifest')
    for row in m['files']:
     name=Path(row['path']);require(not name.is_absolute() and '..' not in name.parts and row['bytes']>=0 and re.fullmatch('[0-9a-f]{64}',row['sha256']),'manifest row')
   trees[root]=inspect_tree(root,mounts,root in pins)
   if trees[root][2]:unknown[root]=','.join(sorted(set(trees[root][2])))
  except (OSError,RuntimeError,ValueError,KeyError,TypeError):unknown[root]='unrecognized tree'
 # Unknown directories can still depend on managed releases; retain those too.
 for root in roots-trees.keys():
  for folder,dirs,files in os.walk(root,followlinks=False,onerror=lambda e:(_ for _ in ()).throw(e)):
   for name in dirs+files:
    p=Path(folder)/name
    if p.is_symlink():
     for target in roots:
      if p.resolve().is_relative_to(target):pins.setdefault(target,'unknown tree dependency')
 pins.update({r:reason for r,reason in unknown.items() if r not in pins})
 changed=True
 while changed:
  changed=False
  for root in list(pins):
   for link,target in trees.get(root,({},[],[]))[1]:
    for other in roots:
     if target.is_relative_to(other) and other not in pins:pins[other]='symlink dependency';changed=True
 candidates=sorted(roots-pins.keys());inodes={}
 for root in candidates:
  for key,row in trees[root][0].items():
   saved=inodes.setdefault(key,{**row,'count':0});saved['count']+=row['count']
 return {'protected':{str(k):v for k,v in pins.items()},'candidates':[str(p) for p in candidates],
         'reclaimableBytes':sum(v['blocks'] for v in inodes.values() if v['links']==v['count']),
         'identities':{str(p):(p.stat().st_dev,p.stat().st_ino) for p in candidates}}

def cleanup(live,releases,state_root,apply=False,external=None,mounts=None,updates_root=None):
 result=plan(live,releases,state_root,external,mounts,updates_root)
 print('Sürüm temizliği: '+str(len(result['candidates']))+' eski klasör; tahmini boşalacak '+str(round(result['reclaimableBytes']/1024**3,2))+' GiB.',flush=True)
 for name,why in sorted(result['protected'].items()):print('KORUNDU: '+Path(name).name+' ('+why+')',flush=True)
 if not apply:return result
 require(shutil.rmtree.avoids_symlink_attacks,'Güvenli dizin silme desteklenmiyor')
 audit=Path(state_root)/'release-retention';audit.mkdir(mode=0o700,exist_ok=True)
 log=audit/(time.strftime('%Y%m%dT%H%M%S')+'-'+os.urandom(4).hex()+'.json')
 result.update(deleted=[],phase='planned');journal(log,result)
 for name in result['candidates']:
  # Re-resolve all roots/references before each deletion; fail closed on change.
  fresh=plan(live,releases,state_root,external,mounts,updates_root)
  require(name in fresh['candidates'] and fresh['identities'][name]==result['identities'][name],'Sürüm kullanımı değişti; temizlik durdu')
  p=Path(name);require(p.parent==Path(releases) and not p.is_symlink(),'Silme kapsamı değişti')
  result['deleting']=name;journal(log,result)
  shutil.rmtree(p);sync_dir(releases)
  result['deleted'].append(name);journal(log,result)
  print('Eski sürüm temizlendi: '+p.name,flush=True)
 result['phase']='complete';journal(log,result);return result
