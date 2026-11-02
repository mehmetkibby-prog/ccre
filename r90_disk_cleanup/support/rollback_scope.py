"""Bind the immediate R90/R91 code rollback before pruning old releases."""
import hashlib,json,stat
from pathlib import Path
import inplace_stage
from storage import digest,read,require

ROOT_UID=0

def configuration_text(live,record):
 import installer
 text=[]
 for key,path in (('beforeConfig',live.config_file),('beforeDropin',installer.unit_path(live.unit))):
  row=record[key];data=bytes.fromhex(row['data'])
  require(row['exists'] and Path(row['path'])==path and hashlib.sha256(data).hexdigest()==row['sha256'],'Geri alma ayar kopyası doğrulanamadı')
  require(installer.saved_matches(row),'Geri alma yapılandırması kurulu ayarlarla eşleşmiyor')
  text.append(data.decode('utf-8'))
 return '\n'.join(text)

def validate_rollback(live,journal):
 journal=Path(journal);state=journal.parent.parent.parent/'state.json'
 require(not journal.is_symlink() and journal.resolve()==journal,'Geri alma günlüğü yolu farklı')
 st=journal.stat();require(st.st_uid==ROOT_UID and not st.st_mode&0o022,'Geri alma günlüğü izinleri farklı')
 record=read(journal);version=live.state['r64Deployment']['version']
 require(version in ('R90_GAMEPLAY','R91_GAMEPLAY') and record.get('version')==version and record.get('kind')=='inplace-'+version.split('_')[0].lower(),'Yerinde güncelleme kaydı tanınmıyor')
 require(record.get('phase')=='complete' and Path(record.get('root','')).resolve()==live.root,'Güncelleme tamamlanmamış veya başka sürüme ait')
 saved={}
 for name in ('beforeState','afterState'):
  row=record[name];data=bytes.fromhex(row['data'])
  require(row['exists'] and Path(row['path'])==state and hashlib.sha256(data).hexdigest()==row['sha256'],'Geri alma durum kopyası doğrulanamadı')
  saved[name]=json.loads(data)
 require(digest(state)==record['afterState']['sha256'] and read(state)==live.state,'Kurulu sürüm güncelleme günlüğüyle eşleşmiyor')
 before=saved['beforeState']
 require(before.get('installed') is True and Path(before['releaseRoot']).resolve()==live.root,'Geri alma farklı oyun klasörüne bağlı')
 accounts=Path(before.get('r64Deployment',{}).get('accountsRoot',before['releaseRoot'])).resolve()
 require(accounts==live.accounts_root,'Geri alma farklı hesap sürümüne bağlı')
 configuration_text(live,record)
 require(record.get('files') and isinstance(record['files'],list),'Geri alma dosyaları bulunamadı')
 states=inplace_stage.validate(live.root,journal.parent,record['files'])
 require(all(s=='after' for s in states),'Güncel kod dosyaları tamamlanmış kurulumla eşleşmiyor')
 # Current in-place rollback restores these checked small code snapshots in
 # this same release tree. It does not boot a historical clone (e.g. R78).
 # Do not remove the journal, code snapshots, configs or database backups.
 return {live.root:'current + verified in-place rollback',live.accounts_root:'accounts'}
