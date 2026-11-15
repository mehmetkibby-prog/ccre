"""Versioned Academy RT origin compatibility; the R102 bundle stays immutable."""
import hashlib,os,re,stat,tempfile
from pathlib import Path
from storage import encoded,read,require,digest,sync_dir

UNIT='coreoflife-rt-r2.service'
CONTROL=Path('/var/lib/core511/r102-realtime-repair')
LIBRARY=Path('/usr/local/lib/core102')
ROOT_UID=0
VERSION='R120_ORIGIN1'
ORIGIN='https://2d.coreoflife.net'
PROFILE_SHA='b3862500de8021fab5721a9b64f5f8dc442d22e8d3fec79800f4601960b90820'
ENTRY_SHA='ce4ad3bedaf0a16a5b8584abe8d38b5fea7012d5b05e21a93f65f5504ca0e92d'
sha=lambda b:hashlib.sha256(b).hexdigest()

def trusted(p,directory=False):
 p=Path(p);s=p.lstat()
 require(not p.is_symlink() and s.st_uid==ROOT_UID and not s.st_mode&0o022 and (stat.S_ISDIR(s.st_mode) if directory else stat.S_ISREG(s.st_mode)),'Akademi bağlantı dosyası sahibi/izni farklı: '+str(p))
 return p

def prepare(live,systemd,run,old_origins):
 trusted(CONTROL,True);record=read(trusted(CONTROL/'record.json'))
 require(record.get('version')=='R102_REALTIME1' and record.get('phase')=='healthy' and record.get('root')==str(live.root),'Akademi R102 bağlantı kaydı farklı')
 target=Path(record['target']);trusted(LIBRARY,True)
 require(target.parent==LIBRARY and re.fullmatch('academy-realtime-[a-f0-9]{16}',target.name),'Akademi eski bağlantı kod yolu farklı');trusted(target,True)
 names={'server.mjs','realtime-entry.mjs','realtime-profile.mjs','bundle.json'}
 require({p.name for p in target.iterdir()}==names,'Akademi eski bağlantı kod kapsamı farklı')
 files={n:trusted(target/n).read_bytes() for n in sorted(names)};manifest=read(target/'bundle.json')
 require(manifest.get('version')=='R102_REALTIME1' and manifest.get('root')==str(live.root) and manifest.get('config')==str(live.configs['r2']),'Akademi bağlantı manifest kimliği farklı')
 require(manifest.get('files')=={n:sha(b) for n,b in files.items() if n!='bundle.json'},'Akademi bağlantı kod bütünlüğü farklı')
 # R102 calculated its key in this insertion order; preserve that contract.
 key=sha(encoded({n:sha(files[n]) for n in ('server.mjs','realtime-entry.mjs','realtime-profile.mjs','bundle.json')}))
 require(record.get('key')==key and target.name=='academy-realtime-'+key[:16],'Akademi bağlantı paket kimliği farklı')
 require(sha(files['realtime-profile.mjs'])==PROFILE_SHA and sha(files['realtime-entry.mjs'])==ENTRY_SHA,'Akademi bağlantı başlangıcı bilinen sürüm değil')
 old_drop=systemd/(UNIT+'.d')/'zz-r102-realtime.conf'
 require(record.get('dropin')==str(old_drop) and digest(trusted(systemd/UNIT))==record.get('unitSHA256'),'Akademi bağlantı servis kaydı farklı')
 old_command=[str(live.node),str(target/'realtime-entry.mjs'),str(live.root),str(live.configs['r2'])]
 for p in old_command:require(re.fullmatch(r'/[A-Za-z0-9_./-]+',p),'Akademi servis yolu farklı')
 require(trusted(old_drop).read_bytes()==('[Service]\nExecStart=\nExecStart='+' '.join(old_command)+'\n').encode(),'Akademi eski bağlantı ek ayarı farklı')
 pid=run(['systemctl','show',UNIT,'--property=MainPID','--value'])
 require(pid.isdigit() and int(pid)>1,'Akademi bağlantı süreci çalışmıyor')
 require(Path('/proc',pid,'cmdline').read_bytes().rstrip(b'\0').split(b'\0')==[p.encode() for p in old_command],'Akademi çalışan bağlantı kodu farklı')
 realm=next(r for r in live.manifest['realms'] if r['id']=='r2')
 require(realm['origin']=='https://r2.coreoflife.net' and old_origins==realm['origin'],'Akademi mevcut Origin kimliği farklı')
 profile=files['realtime-profile.mjs'].decode()
 old='env.ALLOWED_ORIGINS===realm.origin'
 require(profile.count(old)==1,'Akademi Origin kontrolü farklı')
 files['realtime-profile.mjs']=profile.replace(old,"(env.ALLOWED_ORIGINS===realm.origin||env.ALLOWED_ORIGINS===realm.origin+',https://2d.coreoflife.net')").encode()
 marker="transportRepairVersion:'R102_REALTIME1',"
 server=files['server.mjs'].decode();require(server.count(marker)==2,'Akademi bağlantı sağlık sözleşmesi farklı')
 files['server.mjs']=server.replace(marker,marker+" originCompatibility:'"+VERSION+"',").encode()
 manifest={**manifest,'originCompatibility':VERSION,'files':{n:sha(files[n]) for n in ('server.mjs','realtime-entry.mjs','realtime-profile.mjs')}}
 files['bundle.json']=encoded(manifest)
 key=sha(encoded({n:sha(files[n]) for n in sorted(files)}));destination=LIBRARY/('academy-realtime-r120-'+key[:16])
 if destination.exists():trusted(destination,True);require(not list(destination.iterdir()),'Akademi yeni bağlantı dizini boş değil')
 require(not destination.is_symlink(),'Akademi yeni bağlantı dizini sembolik bağ')
 drop=systemd/(UNIT+'.d')/'zz-r120-realtime.conf'
 require(not drop.exists() and not drop.is_symlink(),'Akademi R120 bağlantı ek ayarı zaten var')
 override=('[Service]\nExecStart=\nExecStart='+str(live.node)+' '+str(destination/'realtime-entry.mjs')+' '+str(live.root)+' '+str(live.configs['r2'])+'\n').encode()
 # Validate the new profile with the actual service user before stopping games.
 # Only public verification key, fixed local port and origins are needed here.
 with tempfile.TemporaryDirectory(prefix='r120-academy-profile-') as folder:
  folder=Path(folder);folder.chmod(0o755);p=folder/'realtime-profile.mjs';p.write_bytes(files['realtime-profile.mjs']);p.chmod(0o644)
  script="import fs from 'node:fs';import{pathToFileURL}from'node:url';const [module,root,file]=process.argv.slice(1);const c=JSON.parse(fs.readFileSync(file)),m=JSON.parse(fs.readFileSync(c.realm.manifestFile)),r=m.realms.find(r=>r.id==='r2');const {academyProfile}=await import(pathToFileURL(module));const p=await academyProfile(root,file,{CORE_REALM_ID:'r2',PORT:String(r.ports.realtime),HOST:'127.0.0.1',ALLOWED_ORIGINS:r.origin+',https://2d.coreoflife.net',REALTIME_PUBLIC_KEY_SPKI:c.environment.REALTIME_PUBLIC_KEY_SPKI});p.close();"
  run(['runuser','-u','col-r2','--',live.node,'--input-type=module','-e',script,p,live.root,live.configs['r2']])
 return {'target':str(destination),'version':VERSION,'node':str(live.node),'rows':[(destination/n,None,b) for n,b in sorted(files.items())]+[(drop,None,override)]}

def make_directory(prepared):
 target=Path(prepared['target']);require(target.parent==LIBRARY and re.fullmatch('academy-realtime-r120-[a-f0-9]{16}',target.name),'Akademi yeni kod yolu farklı')
 trusted(LIBRARY,True)
 if not target.exists():target.mkdir(mode=0o755);target.chmod(0o755);sync_dir(LIBRARY)
 trusted(target,True);require(not list(target.iterdir()),'Akademi yeni kod dizini değişti')

def check_access(prepared,run):
 target=Path(prepared['target'])
 run(['runuser','-u','col-r2','--',prepared['node'],'--input-type=module','-e',"import fs from 'node:fs';for(const p of process.argv.slice(1))fs.accessSync(p,fs.constants.R_OK);",*[target/n for n in ('bundle.json','realtime-entry.mjs','realtime-profile.mjs','server.mjs')]])
