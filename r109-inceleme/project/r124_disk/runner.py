"""Offline R123 receipt compaction. No live-file unlink/rename or schema change."""
import argparse
import contextlib
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import time
import uuid
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent / 'support'))

import installer as installed
from storage import atomic, encoded, read, require, lock, descriptor, sync_dir

ROOT = Path('/var/lib/core511/r122-disk')
ACTIVE = ROOT / 'active.json'
UNIT = 'coreoflife-r1.service'
GUARD = Path('/etc/systemd/system') / (UNIT + '.d/zz-r122-disk.conf')
BLOCKED = ROOT / 'blocked'
HERE = Path(__file__).resolve().parent
GIB = 1024 ** 3


def say(value):
    print(value, flush=True)


def persist(j):
    atomic(ACTIVE, encoded(j))


def guard(enable):
    data = ('[Unit]\nConditionPathExists=!' + str(BLOCKED) + '\n').encode()
    require(not GUARD.is_symlink() and (not GUARD.exists() or GUARD.read_bytes() == data), 'Disk koruma dosyası farklı')
    if enable:
        atomic(BLOCKED, b'R122_DISK1\n')
        atomic(GUARD, data, 0o644)
    else:
        BLOCKED.unlink(missing_ok=True)
        if GUARD.exists():
            GUARD.unlink()
        sync_dir(ROOT)
    installed.reload()


def preflight(recovery=False):
    require(os.geteuid() == 0, 'Root olarak çalıştırın')
    require(not installed.ACTIVE.exists(), 'Önce yarım güncelleme tamamlanmalı')
    live = installed.discover()
    version = live.state.get('r64Deployment', {}).get('version')
    require(version in ('R123_FREEZE1',), 'Bu bakım doğrulanmış R123 içindir')
    journal = read(Path(live.state['r102AdminFix']['journal']) / 'result.json')
    # The code-only journal contract is identical in R121/R122. Validate the
    # actual completed version and all its bytes, never downgrade the record.
    original_version = installed.VERSION
    try:
        installed.VERSION = version
        installed.validate_record(journal, completed=True)
    finally:
        installed.VERSION = original_version
    source = Path(live.databases['r1']['path'])
    require(source.stat().st_nlink == 1 and not source.is_symlink(), 'Veritabanı bağı farklı')
    if not recovery:
        require(os.statvfs(source.parent).f_bavail * os.statvfs(source.parent).f_frsize >= 3 * GIB, 'En az 3 GiB kullanılabilir alan gerekli')
    return live


@contextlib.contextmanager
def exclusive_database(source):
    fd = os.open(source, os.O_RDWR | os.O_NOFOLLOW)
    try:
        require(os.fstat(fd).st_nlink == 1, 'Veritabanı sert bağı farklı')
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        require(installed.prop(UNIT, 'MainPID') == '0', 'Oyun süreci hâlâ çalışıyor')
        yield
    finally:
        os.close(fd)


def worker(live, j, mode):
    args = [str(live.node), str(HERE / 'worker.mjs'), mode, j['source'], j['directory'], str(j['cutoff'])]
    child = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env={**os.environ, 'NODE_OPTIONS': '--no-warnings'})
    try:
        for line in child.stdout:
            try:
                value = json.loads(line)
            except ValueError:
                continue
            if value.get('phase') == 'read':
                say('Korunacak kayıtlar okunuyor: ' + value['table'])
            elif value.get('phase') == 'copy':
                say('Kopyalanıyor: ' + value['table'] + ' — ' + str(value['rows']) + ' kayıt')
            elif value.get('phase') == 'verified':
                say('Yeni kopya bütünlük ve satır karşılaştırmasını geçti: %.3f GiB' % (value['bytes'] / GIB))
            elif value.get('phase') == 'install':
                say('Doğrulanmış kopya SQLite işlemiyle uygulanıyor; dosya kimliği korunuyor.')
        error = child.stderr.read()
        require(child.wait() == 0, 'Bakım işlemi durdu: ' + error[-1000:])
    except BaseException:
        child.terminate()
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()
        raise


def permissions(j):
    for suffix in ('', '-wal', '-shm'):
        file = Path(j['source'] + suffix)
        if file.exists():
            require(not file.is_symlink() and stat.S_ISREG(file.stat().st_mode) and file.stat().st_nlink == 1, 'Veritabanı izin yolu farklı')
            os.chown(file, j['uid'], j['gid'])
            os.chmod(file, j['mode'])


def start(live, j):
    permissions(j)
    j['phase'] = 'starting'
    persist(j)
    guard(False)
    installed.service(UNIT, 'reset-failed')
    installed.service(UNIT, 'start')
    installed.readiness.wait(live.manifest, say=say)
    installed.central(live, 'r1', 'restore', j['policy'])


def finish(j, phase):
    j['phase'] = phase
    persist(j)
    atomic(Path(j['directory']) / 'result.json', encoded(j))
    atomic(ROOT / 'last.json', encoded({'directory': j['directory'], 'phase': phase}))
    ACTIVE.unlink()
    sync_dir(ROOT)


def discard_preparation(j):
    directory = Path(j['directory'])
    require(directory.parent == ROOT and re.fullmatch(r'run-[0-9a-f]{32}', directory.name) and not directory.is_symlink(), 'Hazırlık dizini farklı')
    # Only this run's disposable, never-installed copy. Completed backups and
    # original database/WAL paths are outside this exact allowlist.
    for name in ('verified.sqlite', 'verified.sqlite-journal', 'verified.sqlite-wal', 'verified.sqlite-shm', 'verified.json'):
        file = directory / name
        if file.exists():
            info = file.lstat()
            require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, 'Hazırlık kopyası farklı')
            file.unlink()
    sync_dir(directory)


def recover(live, j):
    directory = Path(j['directory'])
    require(directory.parent == ROOT and re.fullmatch(r'run-[0-9a-f]{32}', directory.name) and not directory.is_symlink(), 'Kurtarma dizini farklı')
    require(j['database'] == live.databases['r1'] and descriptor(j['source']) == j['database'], 'Kurtarma veritabanı farklı')
    require(j.get('version') == 'R122_DISK1' and j.get('phase') in ('prepared', 'stopping', 'copying', 'verified', 'installing', 'installed', 'starting'), 'Kurtarma aşaması farklı')
    disposable = j['phase'] in ('prepared', 'stopping', 'copying', 'verified')
    if j['phase'] == 'installing':
        # Never reapply a stale copy after gameplay resumes. The persistent unit
        # condition excludes boot during this interrupted transactional restore.
        require(BLOCKED.read_bytes() == b'R122_DISK1\n' and installed.prop(UNIT, 'MainPID') == '0', 'Yarım kurulum koruması doğrulanamadı')
        say('Yarım SQLite kurulumu doğrulanmış kopyadan ileri tamamlanacak.')
        with exclusive_database(j['source']), lock(Path(j['source']).parent / 'backups/.backup.lock'):
            worker(live, j, 'recover-install')
        j['phase'] = 'installed'
        persist(j)
    start(live, j)
    if disposable:
        discard_preparation(j)
    finish(j, 'recovered')
    say('Oyun servisleri yeniden doğrulandı. Bakım ayarın korundu.')


def retention_minutes(live):
    pid = int(installed.prop(UNIT, 'MainPID'))
    require(pid > 1, 'Çalışan oyun süreci bulunamadı')
    env = dict(value.split(b'=', 1) for value in Path('/proc', str(pid), 'environ').read_bytes().split(b'\0') if b'=' in value)
    require(env.get(b'CORE_CONFIG_FILE') == str(live.gf).encode(), 'Çalışan oyun ayarı farklı')
    # Config may override startup environment. Keeping the larger retention
    # window is conservative in either precedence order. Never print secrets.
    values = [live.game.get('environment', {}).get('CORE511_RETENTION_MINUTES', '15'), env.get(b'CORE511_RETENTION_MINUTES', b'15').decode()]
    for value in values:
        require(re.fullmatch(r'\d{1,5}', str(value)) is not None and 15 <= int(value) <= 10080, 'Saklama süresi doğrulanamadı')
    return max(1440, *(int(value) for value in values))


def apply(live):
    require(not ACTIVE.exists(), 'Yarım disk bakımı var; --recover çalıştırın')
    policy = installed.central(live, 'r1')
    require(policy['phase'] == 'maintenance' and policy.get('deadlineMs', 0) <= int(time.time() * 1000), 'Ana panelden bakımı başlatıp 10 saniyelik geri sayımı tamamlayın')
    installed.readiness.wait(live.manifest, say=say)
    source = Path(live.databases['r1']['path'])
    minutes = retention_minutes(live)
    ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
    require(not ROOT.is_symlink() and ROOT.stat().st_uid == os.geteuid(), 'Disk bakım dizini farklı')
    directory = ROOT / ('run-' + uuid.uuid4().hex)
    directory.mkdir(mode=0o700)
    info = source.stat()
    j = {'version': 'R122_DISK1', 'phase': 'prepared', 'directory': str(directory), 'source': str(source), 'database': live.databases['r1'], 'cutoff': int(time.time() * 1000) - minutes * 60000, 'uid': info.st_uid, 'gid': info.st_gid, 'mode': stat.S_IMODE(info.st_mode), 'policy': policy, 'sourceBytes': info.st_size}
    persist(j)
    try:
        installed.central(live, 'r1', 'gate', policy)
        guard(True)
        j['phase'] = 'stopping'
        persist(j)
        installed.service(UNIT, 'stop')
        with exclusive_database(str(source)), lock(source.parent / 'backups/.backup.lock'):
            j['phase'] = 'copying'
            persist(j)
            say('Önce ayrı ve doğrulanmış kopya hazırlanıyor. Süre veri miktarına bağlı; ilerleme aşağıda yazılacak.')
            worker(live, j, 'prepare')
            j['phase'] = 'verified'
            persist(j)
            require(installed.central(live, 'r1')['phase'] == 'maintenance', 'Bakım ayarı dışarıdan değişti; kurulum yapılmadı')
            j['phase'] = 'installing'
            persist(j)
            worker(live, j, 'install')
            j['phase'] = 'installed'
            persist(j)
        start(live, j)
        result = read(directory / 'installed.json')
        finish(j, 'complete')
        say('DİSK BAKIMI TAMAMLANDI: %.2f -> %.2f GiB; açılan alan %.2f GiB. İki sunucu ve sekiz kanal doğrulandı. Panelden oyunu açabilirsiniz.' % (result['bytesBefore'] / GIB, result['bytesAfter'] / GIB, result['reclaimedBytes'] / GIB))
    except BaseException:
        if j['phase'] in ('prepared', 'stopping', 'copying', 'verified'):
            # Original data was never written in these phases.
            start(live, j)
            discard_preparation(j)
            finish(j, 'preparation-failed')
            say('Hazırlık durdu; asıl veritabanı değiştirilmeden oyun servisleri yeniden doğrulandı.')
        else:
            say('Kurtarma kaydı korundu. Aynı paketle --recover çalıştırın; veritabanı dosyalarını silmeyin.')
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    for name in ('check', 'apply', 'recover'):
        group.add_argument('--' + name, action='store_true')
    args = parser.parse_args()
    with lock(installed.STATE.parent / 'r23-backups/install.lock'):
        live = preflight(recovery=args.recover)
        if args.check:
            require(not ACTIVE.exists(), 'Yarım disk bakımı var; --recover çalıştırın')
            say('ÖN KONTROL GEÇTİ. Kurulu kod ve veritabanı kimliği doğrulandı. Henüz temizlik yapılmadı.')
        elif args.recover:
            require(ACTIVE.exists(), 'Kurtarma bekleyen disk bakımı yok')
            recover(live, read(ACTIVE))
        else:
            apply(live)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        say('DURDU: ' + str(error))
        sys.exit(1)
