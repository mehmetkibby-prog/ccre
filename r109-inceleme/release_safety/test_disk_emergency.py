import hashlib
import importlib.util
from pathlib import Path
import sqlite3
import stat
import tempfile
import unittest
from unittest.mock import patch, Mock

SOURCE = Path(__file__).with_name('DISK_ACIL_R121.py')
spec = importlib.util.spec_from_file_location('emergency', SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class EmergencyTests(unittest.TestCase):
    def test_verified_ext4_changes_only_reserved_blocks(self):
        database = Mock()
        database.is_file.return_value = True
        database.stat.return_value = Mock(st_dev=99)
        def file_stat(path):
            if str(path) == '/':
                return Mock(st_dev=99)
            if str(path) == '/dev/vda2':
                return Mock(st_mode=stat.S_IFBLK, st_rdev=99)
            raise AssertionError(str(path))
        replies = ['{"filesystems":[{"source":"/dev/vda2","fstype":"ext4","target":"/"}]}',
                   'Block count:              50000000\nReserved block count:     2500000\nBlock size:               4096\n', '']
        with patch.object(m, 'DATABASE', database), patch.object(m.os, 'geteuid', return_value=0), patch.object(Path, 'stat', file_stat), patch.object(Path, 'resolve', lambda p, **kw: p), patch.object(m.shutil, 'which', return_value='/sbin/tune2fs'), patch.object(m, 'run', side_effect=replies) as call:
            m.relieve()
            self.assertEqual(call.call_count, 3)
            self.assertEqual(call.call_args.args[0], ['/sbin/tune2fs', '-r', '524288', '/dev/vda2'])

    def test_two_gib_and_one_percent_are_kept(self):
        for gib in (10, 100, 200, 400, 1000):
            count = gib * m.GIB // 4096
            old = count // 20
            new = m.reserve_target(count, old, 4096)
            self.assertLessEqual(new, old)
            if old * 4096 > 2 * m.GIB:
                self.assertGreaterEqual(new * 4096, 2 * m.GIB)
                self.assertGreaterEqual(new / count, .01)

    def test_never_increase_existing_reserve(self):
        for old in (0, 1, 100, 30000):
            self.assertEqual(m.reserve_target(50000000, old, 4096), old)

    def test_bad_metadata_rejected(self):
        for args in ((0, 0, 4096), (10, 11, 4096), (10, -1, 4096), (10, 1, 0)):
            with self.assertRaises(ValueError):
                m.reserve_target(*args)

    def test_non_ext4_never_mutates(self):
        database = Mock()
        database.is_file.return_value = True
        database.stat.return_value = Path('/').stat()
        with patch.object(m, 'DATABASE', database), patch.object(m.os, 'geteuid', return_value=0), patch.object(m, 'run', return_value='{"filesystems":[{"source":"/dev/mock","fstype":"xfs","target":"/"}]}') as call:
            m.relieve()
            self.assertEqual(call.call_count, 1)
            self.assertEqual(call.call_args.args[0][0], 'findmnt')

    def test_db_probe_does_not_change_contents(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'game.sqlite'
            db = sqlite3.connect(path)
            db.executescript('''
                CREATE TABLE players(id PRIMARY KEY, payload);
                INSERT INTO players VALUES(1, zeroblob(262144));
                INSERT INTO players VALUES(2, zeroblob(262144));
                DELETE FROM players WHERE id=2;
                CREATE TABLE kernel511_channel_receipts(created_ms);
                INSERT INTO kernel511_channel_receipts VALUES(1);
                CREATE TABLE kernel511_system_receipts(created_ms);
                CREATE TABLE kernel511_notifications(created_ms);
                CREATE TABLE kernel511_committed_images_r113(id PRIMARY KEY,created_ms) WITHOUT ROWID;
                CREATE INDEX kernel511_committed_images_age_r113 ON kernel511_committed_images_r113(created_ms);
            ''')
            db.commit()
            db.close()
            before = hashlib.sha256(path.read_bytes()).hexdigest()
            result = m.database_metadata(path)
            self.assertGreater(result['freelist_count'], 0)
            self.assertEqual(result['auto_vacuum'], 0)
            self.assertGreater(result['ages']['channel_receipts'], 0)
            self.assertEqual(result['ages']['committed_images'], 'bos')
            self.assertEqual(before, hashlib.sha256(path.read_bytes()).hexdigest())


if __name__ == '__main__':
    unittest.main()
