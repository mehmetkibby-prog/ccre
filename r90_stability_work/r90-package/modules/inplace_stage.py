"""Small, journaled code deltas. No release clone and no database restoration.

Each live path is accepted only at its recorded before/after hash. A private
same-filesystem staging directory keeps incomplete writes outside the source
tree, so a killed writer cannot leave an untracked temporary core module.
"""
import hashlib,os,stat,tempfile
from pathlib import Path
from storage import atomic,digest,member,require,sync_dir

def checked_path(root,name):
 require(isinstance(name,str) and name and str(Path(name))==name and not name.startswith('.') and '\\' not in name,'Yerinde dosya yolu geçersiz')
 p=member(root,name)
 for parent in (p,*p.parents):
  if parent==root:break
  require(not parent.is_symlink(),'Yerinde dosya yolunda sembolik bağ var: '+name)
  if parent!=p and parent.exists():require(parent.is_dir(),'Yerinde dosya üst dizini geçersiz: '+name)
 return p

def fingerprint(root,name):
 p=checked_path(root,name)
 if not p.exists():return None
 require(stat.S_ISREG(p.lstat().st_mode),'Yerinde hedef normal dosya olmalı: '+name)
 return digest(p)

def describe(root,updates):
 rows=[];seen=set();directories=set()
 for index,(name,meta,data) in enumerate(updates):
  require(name not in seen,'Tekrarlanan yerinde dosya');seen.add(name)
  link=meta.get('linkSource')
  if link is not None:
   require(data is None and meta['before'] is None and link!=name,'Yerinde varlık bağı geçersiz: '+name)
   source=checked_path(root,link);require(fingerprint(root,link)==meta['after'] and source.stat().st_size==meta['bytes'],'Varlık bağı kaynağı farklı: '+name)
  else:require(isinstance(data,bytes) and len(data)==meta['bytes'] and hashlib.sha256(data).hexdigest()==meta['after'],'Yerinde veri doğrulanamadı: '+name)
  require(meta['before']!=meta['after'],'Değişmeyen dosya güncellemeye alınamaz: '+name)
  p=checked_path(root,name);require(fingerprint(root,name)==meta['before'],'Başlangıç dosyası farklı: '+name)
  exists=p.exists();s=p.stat() if exists else (source.stat() if link is not None else root.stat())
  if 'executable' in meta:require(type(meta['executable']) is bool,'Çalıştırma izni geçersiz')
  mode=(0o755 if meta['executable'] else 0o644) if 'executable' in meta else (stat.S_IMODE(s.st_mode) if exists or link is not None else 0o644)
  rows.append({'path':name,'before':meta['before'],'after':meta['after'],'bytes':meta['bytes'],
               'backup':str(index)+'.before' if exists else None,'slot':str(index),
               'mode':stat.S_IMODE(s.st_mode) if exists else mode,'afterMode':mode,'uid':s.st_uid,'gid':s.st_gid,
               **({'linkSource':link} if link is not None else {})})
  parent=p.parent
  while parent!=root and not parent.exists():directories.add(str(parent.relative_to(root)));parent=parent.parent
 return rows,sorted(directories,key=lambda n:(len(Path(n).parts),n))

def store_backups(root,directory,rows):
 backup=directory/'code';backup.mkdir(mode=0o700);sync_dir(directory)
 for row in rows:
  if row['before'] is None:continue
  p=checked_path(root,row['path']);data=p.read_bytes()
  require(hashlib.sha256(data).hexdigest()==row['before'],'Yedek öncesi dosya değişti: '+row['path'])
  atomic(backup/row['backup'],data,0o600)

def validate(root,directory,rows,*,before_only=False,backups=True):
 states=[];seen=set()
 for index,row in enumerate(rows):
  name=row['path'];require(name not in seen and row['slot']==str(index),'Kod journal sırası geçersiz');seen.add(name)
  p=checked_path(root,name);current=fingerprint(root,name)
  if 'linkSource' in row:
   require(row['before'] is None and row['linkSource']!=name,'Varlık bağı journal kapsamı farklı')
   source=checked_path(root,row['linkSource'])
   require(fingerprint(root,row['linkSource'])==row['after'] and source.stat().st_size==row['bytes'],'Varlık bağı kaynağı değişmiş')
   require((stat.S_IMODE(source.stat().st_mode),source.stat().st_uid,source.stat().st_gid)==(row['afterMode'],row['uid'],row['gid']),'Varlık bağı kaynak izinleri değişmiş')
   if current is not None:require((p.stat().st_dev,p.stat().st_ino)==(source.stat().st_dev,source.stat().st_ino),'Varlık bağı kimliği değişmiş')
  require(current==row['before'] or (not before_only and current==row['after']),'Dosya dışarıdan değişmiş; üzerine yazılmadı: '+name)
  state='before' if current==row['before'] else 'after';states.append(state)
  if current is not None:
   s=p.stat();require((stat.S_IMODE(s.st_mode),s.st_uid,s.st_gid)==(row['mode'] if state=='before' else row['afterMode'],row['uid'],row['gid']),'Dosya izinleri dışarıdan değişmiş: '+name)
  if row['before'] is not None and backups:
   require(row['backup']==str(index)+'.before','Kod yedeği yolu geçersiz')
   saved=checked_path(directory,'code/'+row['backup'])
   require(saved.is_file() and digest(saved)==row['before'],'Kod yedeği doğrulanamadı: '+name)
  elif row['before'] is None:require(row['backup'] is None,'Yeni dosya yedeği geçersiz')
 return states

def stage_directory(root,record):
 row=record.get('stage')
 if not row or row.get('removed'):return None
 p=Path(row['path'])
 require(p.parent==root.parent and p.name.startswith('.r90-stage-'),'Geçici kod dizini kapsamı geçersiz')
 if not p.exists():return None
 s=p.lstat();require(stat.S_ISDIR(s.st_mode) and not p.is_symlink() and (s.st_dev,s.st_ino)==(row['device'],row['inode']) and s.st_uid==os.geteuid() and stat.S_IMODE(s.st_mode)==0o700,'Geçici kod dizini kimliği değişmiş')
 return p

def clean_parts(root,record):
 p=stage_directory(root,record)
 if p is None:return
 allowed={row['slot']+'.part':row for row in record['files']}
 for f in p.iterdir():
  s=f.lstat();row=allowed.get(f.name)
  require(row is not None and stat.S_ISREG(s.st_mode) and s.st_nlink==1 and (s.st_uid,s.st_gid) in ((os.geteuid(),os.getegid()),(row['uid'],row['gid'])),'Geçici kod dosyası dışarıdan değişmiş')
  f.unlink()
 sync_dir(p)

def ensure_stage(root,record,persist):
 p=stage_directory(root,record)
 if p is None:
  require(root.stat().st_dev==root.parent.stat().st_dev,'Atomik yerinde güncelleme için sürüm dizini aynı diskte olmalı')
  p=Path(tempfile.mkdtemp(prefix='.r90-stage-',dir=root.parent));s=p.stat();sync_dir(p.parent)
  record['stage']={'path':str(p),'device':s.st_dev,'inode':s.st_ino}
  persist()
 clean_parts(root,record)
 return p

def _parents(root,p):
 missing=[];q=p.parent
 while q!=root and not q.exists():missing.append(q);q=q.parent
 owner=root.stat()
 for q in reversed(missing):
  q.mkdir(mode=0o755);os.chmod(q,0o755);os.chown(q,owner.st_uid,owner.st_gid);sync_dir(q.parent)

def _replace(root,stage,row,data,*,restore=False):
 p=checked_path(root,row['path']);_parents(root,p)
 require(p.parent.stat().st_dev==stage.stat().st_dev,'Kod hedefi atomik değişim diskinden farklı')
 temp=stage/(row['slot']+'.part');fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
 try:
  with os.fdopen(fd,'wb') as stream:
   os.fchmod(stream.fileno(),row['mode'] if restore else row['afterMode']);os.fchown(stream.fileno(),row['uid'],row['gid'])
   stream.write(data);stream.flush();os.fsync(stream.fileno())
  require(fingerprint(root,row['path'])==(row['after'] if restore else row['before']),'Atomik değişim öncesi dosya değişti: '+row['path'])
  os.replace(temp,p);sync_dir(p.parent);sync_dir(stage)
 finally:
  if temp.exists():temp.unlink();sync_dir(stage)

def apply(root,directory,record,updates,persist):
 rows=record['files'];validate(root,directory,rows,before_only=True)
 require([name for name,_,_ in updates]==[row['path'] for row in rows],'Yerinde paket sırası farklı')
 stage=ensure_stage(root,record,persist)
 for row,(name,meta,data) in zip(rows,updates):
  if 'linkSource' in row:
   require(data is None and meta.get('linkSource')==row['linkSource'] and meta['after']==row['after'] and meta['bytes']==row['bytes'],'Varlık bağı paketi değişmiş')
   _link(root,row);continue
  require(hashlib.sha256(data).hexdigest()==row['after'] and len(data)==row['bytes'],'Yerinde paket değişmiş')
  require(fingerprint(root,name)==row['before'],'Yazmadan önce dosya değişti: '+name)
  _replace(root,stage,row,data)

def _link(root,row):
 # A hardlink creates the complete immutable file in one filesystem operation.
 # The destination is already journaled; crash recovery removes only that name.
 source=checked_path(root,row['linkSource']);target=checked_path(root,row['path'])
 require(fingerprint(root,row['path']) is None and fingerprint(root,row['linkSource'])==row['after'] and source.stat().st_size==row['bytes'],'Varlık bağı yazım öncesi değişmiş')
 _parents(root,target);require(source.stat().st_dev==target.parent.stat().st_dev,'Varlık bağı farklı diskte')
 os.link(source,target,follow_symlinks=False);sync_dir(target.parent)

def restore(root,directory,record,persist):
 # Validate every path and backup before touching any live file. In particular,
 # a manual edit in a later row must not permit a partial rollback of earlier rows.
 rows=record['files'];states=validate(root,directory,rows)
 stage=ensure_stage(root,record,persist)
 for row,state in zip(rows,states):
  if state=='before':continue
  require(fingerprint(root,row['path'])==row['after'],'Geri almadan önce dosya değişti: '+row['path'])
  p=checked_path(root,row['path'])
  if row['before'] is None:p.unlink();sync_dir(p.parent)
  else:
   data=(directory/'code'/row['backup']).read_bytes();require(hashlib.sha256(data).hexdigest()==row['before'],'Geri alma yedeği değişti: '+row['path'])
   _replace(root,stage,row,data,restore=True)
 for name in reversed(record.get('createdDirectories',[])):
  p=checked_path(root,name)
  if p.exists() and not any(p.iterdir()):p.rmdir();sync_dir(p.parent)
 validate(root,directory,rows,before_only=True)

def cleanup(root,record,persist):
 p=stage_directory(root,record)
 if p is not None:clean_parts(root,record);p.rmdir();sync_dir(p.parent)
 if record.get('stage'):
  record['stage']['removed']=True;persist()
