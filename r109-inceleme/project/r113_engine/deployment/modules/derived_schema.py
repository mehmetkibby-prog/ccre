"""Additive R113 schema with verified, scoped snapshots and a crash journal.

Rollback keeps compatible derived tables. It never restores a stale player DB.
"""
import hashlib,json,subprocess
from pathlib import Path
from storage import descriptor,digest,require

SCOPE='r113-derived-images-v1'
POLICY={'keep':1,'scope':'changed-code-and-derived-tables'}
TABLES=['kernel511_actor_revision_r113','kernel511_committed_images_r113']
HERE=Path(__file__).resolve().parent

def invoke(node,config):
 p=subprocess.run([str(node),str(HERE/'derived-migration.mjs')],input=json.dumps(config),text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=180)
 require(p.returncode==0,'R113 şema hazırlığı durdu: '+p.stderr[-600:])
 result=json.loads(p.stdout);require(result.get('version')=='R113_DERIVED1','Şema yanıtı farklı');return result

def migrate(live,j,persist):
 for rid in ('r1','r2'):
  identity=j['databases'][rid];require(descriptor(identity['path'])==identity,'Şema veritabanı kimliği farklı')
  backup=str(Path(j['directory'])/('derived-'+rid+'.sqlite'))
  row={'path':backup,'phase':'preparing'};j.setdefault('derived',{})[rid]=row;j['phase']='derived';persist(j)
  config={'database':identity['path'],'identity':identity,'backup':backup}
  result=invoke(live.node,{**config,'action':'prepare'})
  require(result['path']==backup and result['sha256']==digest(backup),'Şema yedeği doğrulanamadı')
  row.update(result);row['phase']='backed-up';persist(j)
  invoke(live.node,{**config,'sha256':row['sha256'],'action':'verify'})
  row['phase']='applying';persist(j)
  result=invoke(live.node,{**config,'sha256':row['sha256'],'action':'apply'})
  require(result.get('applied') is True and result.get('playerDataChanged') is False,'Şema sonucu farklı')
  row['phase']='applied';persist(j)

def validate(j,completed=False):
 rows=j.get('derived',{});require(set(rows)<=set(('r1','r2')),'Şema sunucu kapsamı farklı')
 if completed:require(set(rows)=={'r1','r2'},'İki şema yedeği eksik')
 for rid,row in rows.items():
  path=Path(j['directory'])/('derived-'+rid+'.sqlite')
  require(row['path']==str(path) and row['phase'] in ('preparing','backed-up','applying','applied'),'Şema yedeği yolu/aşaması farklı')
  if completed:require(row['phase']=='applied','Şema kurulumu bitmedi')
  if row.get('sha256'):
   require(path.is_file() and not path.is_symlink() and path.stat().st_nlink==1 and digest(path)==row['sha256'],'Şema yedeği değişmiş')
   # Hash binds the independent SQLite integrity/row verification performed
   # before apply; do not spawn a game process during rollback validation.
   require(row.get('version')=='R113_DERIVED1' and set(row.get('data',{}))==set(TABLES),'Şema yedeği sözleşmesi farklı')
