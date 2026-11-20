import json, re, subprocess, time
from pathlib import Path
from storage import atomic,lock,require
from disk_space import inspect_db,reclaim,GIB

UNIT='coreoflife-r1.service'
JOB='coreoflife-r127-disk.service'
MARK=Path('/run/coreoflife-r127-disk-active')
GUARD=Path('/run/systemd/system')/(UNIT+'.d')/'90-r127-disk.conf'
GUARD_CONTENT=('[Unit]\nConditionPathExists=!'+str(MARK)+'\n').encode()
def ctl(*args):
    subprocess.run(['systemctl',*args],check=True,timeout=90)
def resume():
    guarded=GUARD.exists()
    if guarded:
        require(not GUARD.is_symlink() and GUARD.read_bytes()==GUARD_CONTENT,'Disk bakım koruması farklı')
        GUARD.unlink()
    if guarded or MARK.exists():
        ctl('daemon-reload')
    if MARK.exists():
        require(not MARK.is_symlink() and MARK.read_bytes()==b'restore-r1\n','Disk bakım işareti farklı')
        ctl('reset-failed',UNIT);ctl('start',UNIT);ctl('is-active','--quiet',UNIT)
        MARK.unlink()

def dispatch(mode,archive):
    import installer as app
    if mode=='disk_finish':resume();return
    if mode=='disk_clean':
        package=str(Path(archive).resolve())
        require(re.fullmatch(r'[/a-zA-Z0-9._-]+',package) and Path(package).is_file(),'Paketi /root/r127-toplu.zip adıyla kaydedin')
        print('Disk denetimi başladı. İlerleme: journalctl -fu '+JOB,flush=True)
        # The worker owns install.lock and repeats every precondition. Its
        # systemd lifetime is independent of the operator shell. --wait also
        # makes a following shell command conditional on successful recovery.
        result=subprocess.run(['systemd-run','--wait','--unit='+JOB,'--collect','--property=Type=oneshot',
            '--property=TimeoutStartSec=infinity','--property=ExecStopPost=/usr/bin/python3 '+package+' --disk-finish',
            '/usr/bin/python3',package,'--disk-worker'])
        subprocess.run(['journalctl','--unit='+JOB,'--lines=10','--no-pager','-o','cat'],check=False)
        require(result.returncode==0,'Disk işlemi tamamlanmadı. Yukarıdaki birim kaydına bakın.')
        return
    with lock(app.STATE.parent/'r23-backups/install.lock'):
        live=app.discover()
        require(live.state.get('r64Deployment',{}).get('version') in ('R126_ENCOUNTER1','R127_ACADEMY1'),'Disk bakımı R126 veya R127 gerektirir')
        meta=live.databases['r1'];path=Path(meta['path'])
        if mode=='disk_check':
            print(json.dumps(inspect_db(path),ensure_ascii=False),flush=True);return
        require(not app.ACTIVE.exists(),'Önce yarım kod güncellemesini tamamlayın')
        policy=app.central(live,'r1')
        require(policy.get('phase')=='maintenance' and policy.get('deadlineMs',0)<=int(time.time()*1000),'Efsane bakım geri sayımını önce tamamlayın')
        require(app.prop(UNIT,'ActiveState')=='active' and not (MARK.exists() or GUARD.exists()),'Efsane etkin olmalı ve başka disk bakımı bulunmamalı')
        fs=subprocess.check_output(['findmnt','-n','-o','FSTYPE','-T',str(path)],text=True).strip()
        require(fs in ('ext4','xfs'),'Bu dosya sisteminde boş blok iadesi doğrulanmadı')
        require(mode=='disk_worker','Disk işlemi geçersiz')
        before=inspect_db(path)
        print(json.dumps(before),flush=True)
        if before['sqliteFreeGiB']<0.01 or before['physicalGiB']<=before['logicalGiB']-before['sqliteFreeGiB']+0.01:
            print('Geri verilecek anlamlı fiziksel alan bulunmadı.',flush=True);return
        atomic(GUARD,GUARD_CONTENT,0o644)
        try:
            atomic(MARK,b'restore-r1\n')
            ctl('daemon-reload');ctl('stop',UNIT)
            require(app.prop(UNIT,'MainPID')=='0','Efsane hâlâ çalışıyor')
            freed=reclaim(path,(meta['device'],meta['inode']))
            print('Diske geri verilen alan %.2f GiB'%(freed/GIB),flush=True)
        finally:resume()
        print(json.dumps(inspect_db(path)),flush=True)
