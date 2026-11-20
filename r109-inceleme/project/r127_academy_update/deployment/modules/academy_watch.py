"""Read-only Akademi public opening check and one systemd calendar event."""
import datetime
import json
import subprocess
import time
from pathlib import Path

from r63_support import local
from storage import atomic, require

UNIT='coreoflife-r127-akademi-acilis'
NOTE='# Core of Life R127 - Akademi açılış kontrolü\n'
AREA=Path('/var/lib/core511/r127-akademi')
PACKAGE=AREA/'observer.zip'
SYSTEM=Path('/etc/systemd/system')

def status(live, central, request=local):
    manifest=live.manifest
    realm=next(r for r in manifest['realms'] if r['id']=='r2')
    launch=request(manifest['authPort'],'/api/launch?realm=r2')
    game=request(realm['ports']['app'],'/api/vds-health')
    rt=request(realm['ports']['realtime'],'/readyz')
    gate=central(live,'r2')['realm']['status']
    channels=game.get('channelProcesses',{}).get('channels',[])
    ready=sorted(c['channel'] for c in channels if c.get('ready') is True and c.get('capacity')==realm['initialChannelCapacity'])
    healthy=(ready==[1,2,3,4] and game.get('ok') is True and game.get('realm',{}).get('dbIdentity')==realm['dbIdentity']
             and rt.get('ok') is True and rt.get('realmId')=='r2' and rt.get('dbIdentity')==realm['dbIdentity'])
    opened=(launch.get('phase') in ('open','normal') and launch.get('canPlay') is True
            and not launch.get('approvalRequired') and gate=='open' and healthy)
    return dict(acik=opened,asama=launch.get('phase'),katalog=gate,kanallar=ready,baglanti=rt.get('ok'),
                zaman=launch.get('publicOpeningAt'),otomatik=launch.get('automaticOpening'),saglik=healthy)

def check(live, central, wait=False):
    end=time.monotonic()+(90 if wait else 0)
    while True:
        try:
            result=status(live,central)
            print(json.dumps(result,ensure_ascii=False),flush=True)
            if result['acik']:return
            if not wait and result['asama']=='waiting' and result['saglik']:return
            reason='Akademi genel girişi ve dört kanal birlikte doğrulanamadı'
        except Exception as error:reason=str(error)
        if time.monotonic()>=end:raise RuntimeError(reason)
        time.sleep(5)

def managed(path,data):
    if path.exists() or path.is_symlink():
        require(not path.is_symlink() and path.read_bytes().startswith(NOTE.encode()),'Açılış kontrolü birim dosyası farklı')
    atomic(path,(NOTE+data).encode(),0o644)

def install(live,archive,request=local,now=time.time,run=subprocess.run):
    launch=request(live.manifest['authPort'],'/api/launch?realm=r2')
    stamp=launch.get('publicOpeningAt')
    if not launch.get('automaticOpening') or not isinstance(stamp,int) or stamp<=0:
        print('Akademi için etkin otomatik açılış takvimi bulunmuyor.',flush=True);return
    if now()>stamp/1000+120:
        return
    due=datetime.datetime.fromtimestamp(max(stamp/1000+5,now()+3),datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
    require(not AREA.is_symlink(),'Açılış denetim dizini geçersiz')
    AREA.mkdir(mode=0o700,exist_ok=True)
    payload=Path(archive).read_bytes()
    if not PACKAGE.exists() or PACKAGE.read_bytes()!=payload:atomic(PACKAGE,payload)
    managed(SYSTEM/(UNIT+'.service'),'[Unit]\nDescription=Akademi genel giriş ve kanal kontrolü\nAfter=network-online.target\n[Service]\nType=oneshot\nExecStart=/usr/bin/python3 '+str(PACKAGE)+' --academy-open-check\nTimeoutStartSec=150\nPrivateTmp=true\nNoNewPrivileges=true\n')
    managed(SYSTEM/(UNIT+'.timer'),'[Unit]\nDescription=Akademi açılışını doğrula\n[Timer]\nOnCalendar='+due+'\nAccuracySec=1s\nPersistent=true\n[Install]\nWantedBy=timers.target\n')
    for args in [['daemon-reload'],['enable',UNIT+'.timer'],['restart',UNIT+'.timer']]:
        run(['systemctl',*args],check=True,timeout=60)
    print('Akademi açılış kontrolü planlandı: '+due,flush=True)

def remove(run=subprocess.run):
    service,timer=(SYSTEM/(UNIT+suffix) for suffix in ('.service','.timer'))
    if not service.exists() and not timer.exists():return
    for path in (service,timer):
        if path.exists():require(not path.is_symlink() and path.read_bytes().startswith(NOTE.encode()),'Açılış kuralı farklı')
    if timer.exists():run(['systemctl','disable','--now',UNIT+'.timer'],check=True,timeout=60)
    for path in (service,timer):path.unlink(missing_ok=True)
    run(['systemctl','daemon-reload'],check=True,timeout=60)
    PACKAGE.unlink(missing_ok=True)
