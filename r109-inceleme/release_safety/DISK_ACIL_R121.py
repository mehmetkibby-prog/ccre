#!/usr/bin/env python3
"""Emergency headroom plus bounded SQLite metadata. Never deletes game data."""
import argparse
import json
import math
import os
from pathlib import Path
import re
import shutil
import sqlite3
import stat
import subprocess
import sys
import time

GIB = 1024 ** 3
DATABASE = Path('/var/lib/coreoflife-realms-417/r1/game.sqlite')


def run(args, **kw):
    return subprocess.run(args, check=True, text=True, capture_output=True,
                          timeout=10, env={**os.environ, 'LC_ALL': 'C'}, **kw).stdout


def reserve_target(total, reserved, block_size):
    if min(total, block_size) <= 0 or not 0 <= reserved <= total:
        raise ValueError('filesystem_metadata_invalid')
    # Keep at least two GiB AND one percent; never increase an existing reserve.
    target = max(math.ceil(total / 100), math.ceil(2 * GIB / block_size))
    return min(reserved, target)


def relieve():
    if os.geteuid() != 0:
        raise RuntimeError('root_required')
    if not DATABASE.is_file() or DATABASE.stat().st_dev != Path('/').stat().st_dev:
        raise RuntimeError('database_root_filesystem_mismatch')
    mounts = json.loads(run(['findmnt', '-J', '-T', '/', '-o', 'SOURCE,FSTYPE,TARGET']))['filesystems']
    if len(mounts) != 1 or mounts[0]['target'] != '/' or mounts[0]['fstype'] != 'ext4':
        print('AYRILMIS ALAN: ext4 degil; ayar degismedi.', flush=True)
        return
    device = Path(mounts[0]['source']).resolve(strict=True)
    if not stat.S_ISBLK(device.stat().st_mode) or device.stat().st_rdev != Path('/').stat().st_dev:
        raise RuntimeError('root_device_mismatch')
    tune = shutil.which('tune2fs') or next((p for p in ('/usr/sbin/tune2fs', '/sbin/tune2fs') if Path(p).is_file()), None)
    if not tune:
        raise RuntimeError('tune2fs_not_found')
    info = run([tune, '-l', str(device)])
    def number(key):
        matches = re.findall(r'^' + re.escape(key) + r':\s+(\d+)\s*$', info, re.M)
        if len(matches) != 1:
            raise RuntimeError('filesystem_metadata_invalid')
        return int(matches[0])
    total, reserved, size = (number(k) for k in ('Block count', 'Reserved block count', 'Block size'))
    target = reserve_target(total, reserved, size)
    print(f'AYRILMIS ALAN: {reserved * size / GIB:.2f} -> {target * size / GIB:.2f} GiB', flush=True)
    if target == reserved:
        print('AYAR: zaten sinirda; degismedi.', flush=True)
        return
    print(f'Geri alma: {tune} -r {reserved} {device}', flush=True)
    run([tune, '-r', str(target), str(device)])
    print('AYAR UYGULANDI: dosya silinmedi; disk kucultulmedi.', flush=True)


def database_metadata(path):
    result = {}
    with sqlite3.connect(Path(path).absolute().as_uri() + '?mode=ro', uri=True, timeout=1, isolation_level=None) as db:
        db.execute('PRAGMA query_only=ON')
        db.execute('PRAGMA trusted_schema=OFF')
        db.execute('PRAGMA cache_size=-1024')
        for name in ('page_size', 'page_count', 'freelist_count', 'auto_vacuum'):
            deadline = time.monotonic() + 1
            db.set_progress_handler(lambda: time.monotonic() >= deadline, 100)
            result[name] = db.execute('PRAGMA ' + name).fetchone()[0]
        result['ages'] = {}
        queries = {
            'channel_receipts': 'SELECT created_ms FROM kernel511_channel_receipts ORDER BY rowid LIMIT 1',
            'system_receipts': 'SELECT created_ms FROM kernel511_system_receipts ORDER BY rowid LIMIT 1',
            'notifications': 'SELECT created_ms FROM kernel511_notifications ORDER BY rowid LIMIT 1',
            'committed_images': 'SELECT created_ms FROM kernel511_committed_images_r113 INDEXED BY kernel511_committed_images_age_r113 ORDER BY created_ms LIMIT 1',
        }
        for key, sql in queries.items():
            try:
                deadline = time.monotonic() + 1
                row = db.execute(sql).fetchone()
                result['ages'][key] = round((time.time() * 1000 - row[0]) / 3600000, 2) if row else 'bos'
            except sqlite3.Error as error:
                result['ages'][key] = getattr(error, 'sqlite_errorname', 'okunamadi')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--relieve', action='store_true')
    parser.add_argument('--db-worker', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.db_worker:
        print(json.dumps(database_metadata(DATABASE)))
        return
    if args.relieve:
        try:
            relieve()
        except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
            print('AYAR DURDU:', type(error).__name__, flush=True)
    fs = os.statvfs('/')
    print(f'DISKTE KULLANILABILIR: {fs.f_bavail * fs.f_frsize / GIB:.2f} GiB', flush=True)
    try:
        # Limit the whole DB reader, including filesystem IO, to ten seconds.
        data = json.loads(run([sys.executable, str(Path(__file__).resolve()), '--db-worker']))
        size = data['page_size']
        print(f"DB TOPLAM: {data['page_count'] * size / GIB:.2f} GiB")
        print(f"DB ICINDE BOS: {data['freelist_count'] * size / GIB:.2f} GiB")
        print(f"DB VERI/INDEKS: {(data['page_count'] - data['freelist_count']) * size / GIB:.2f} GiB")
        print('OTOMATIK KUCULTME:', data['auto_vacuum'])
        print('ILK KAYDIN YASI (saat):', json.dumps(data['ages'], ensure_ascii=False))
    except (OSError, ValueError, KeyError, subprocess.SubprocessError):
        print('DB OLCUMU: okunamadi veya sure siniri; veri degistirilmedi.')
    try:
        print(run(['systemctl', 'show', 'coreoflife-disk-maintenance.service',
                   '-p', 'ActiveState,Result,ExecMainStatus,InactiveEnterTimestamp']).strip())
        print(run(['systemctl', 'show', 'coreoflife-disk-maintenance.timer',
                   '-p', 'ActiveState,LastTriggerUSec']).strip())
    except (OSError, subprocess.SubprocessError):
        print('OTOMATIK BAKIM: servis bilgisi okunamadi.')


if __name__ == '__main__':
    main()
