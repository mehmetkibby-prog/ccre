import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

SCRIPT = Path(__file__).resolve().parents[1] / 'r80-tools/CORE511_R79_EKSIK_KAYNAK.py'
spec = importlib.util.spec_from_file_location('source_export', SCRIPT)
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


class SourceExportTests(unittest.TestCase):
    def fixture(self, folder):
        root = Path(folder) / 'release'
        root.mkdir()
        source = root / 'core511-source/scripts/core511/action-writer.mjs'
        source.parent.mkdir(parents=True)
        data = b'export const exactSource = 79;\n'
        source.write_bytes(data)
        expected = {str(source.relative_to(root)): {'bytes': len(data), 'sha256': tool.digest(data)}}
        return root, source, expected, Path(folder) / 'sources.zip'

    def test_only_verified_code_is_exported_without_mutating_source(self):
        with tempfile.TemporaryDirectory() as folder:
            root, source, expected, output = self.fixture(folder)
            (root / '.env').write_text('PRIVATE')
            (root / 'game.sqlite').write_bytes(b'PLAYER DATA')
            before = source.read_bytes()
            count, sha = tool.export(root, output, expected)
            self.assertEqual(count, 1)
            self.assertEqual(sha, tool.digest(output.read_bytes()))
            self.assertEqual(source.read_bytes(), before)
            with zipfile.ZipFile(output) as archive:
                self.assertEqual(set(archive.namelist()), {*expected, 'KAYNAK_KIMLIKLERI.json'})
                self.assertEqual(archive.read(next(iter(expected))), before)
                self.assertNotIn(b'PRIVATE', archive.read('KAYNAK_KIMLIKLERI.json'))

    def test_wrong_hash_creates_no_output(self):
        with tempfile.TemporaryDirectory() as folder:
            root, source, expected, output = self.fixture(folder)
            source.write_bytes(b'changed')
            with self.assertRaises(RuntimeError):
                tool.export(root, output, expected)
            self.assertFalse(output.exists())

    def test_symlink_is_rejected_even_with_matching_content(self):
        with tempfile.TemporaryDirectory() as folder:
            root, source, expected, output = self.fixture(folder)
            copy = Path(folder) / 'external.mjs'
            copy.write_bytes(source.read_bytes())
            source.unlink()
            source.symlink_to(copy)
            with self.assertRaises(RuntimeError):
                tool.export(root, output, expected)
            self.assertFalse(output.exists())

    def test_existing_output_and_release_tree_are_never_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            root, source, expected, output = self.fixture(folder)
            output.write_bytes(b'existing')
            with self.assertRaises(FileExistsError):
                tool.export(root, output, expected)
            self.assertEqual(output.read_bytes(), b'existing')
            with self.assertRaises(RuntimeError):
                tool.export(root, root / 'new.zip', expected)
            self.assertFalse((root / 'new.zip').exists())


if __name__ == '__main__':
    unittest.main(verbosity=2)
