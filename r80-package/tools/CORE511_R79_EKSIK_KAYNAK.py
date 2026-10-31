#!/usr/bin/env python3
"""R80 ödül incelemesi için SHA ile sabitlenmiş eksik kaynakları dışa aktarır.

Oyun dosyaları, servisler ve veritabanları değişmez. Yalnız belirtilen yeni ZIP
oluşturulur. Kaynak listesi sabittir; .env, ayar, log ve oyuncu verisi alınmaz.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import zipfile

EXPECTED = {'core511-source/scripts/core511/action-writer.mjs': {'bytes': 9134, 'sha256': '4f712838c458cec8fee90947ab8efec60d217e8763ad54e443caf90afb82eac6'}, 'core511-source/scripts/core511/adventure-service.mjs': {'bytes': 32127, 'sha256': 'ddc5be25f746bcb6b607e5dd9f00a0d21fbee4e2de2482d33f91229e41efe724'}, 'core511-source/scripts/core511/afk-channel.mjs': {'bytes': 14035, 'sha256': '01907f56da0c951b9507389efd16a62d8040d6f940b619f34ea8c3767a55cd17'}, 'core511-source/scripts/core511/afk-client.mjs': {'bytes': 11477, 'sha256': '669a59aad349230adf4c899ba5b96b14873f2c3d0790a3ccc5a8ef3f837bb268'}, 'core511-source/scripts/core511/afk-service.mjs': {'bytes': 33658, 'sha256': 'b4166374fd7fc5c550fdf6e1d26218de74a19742c1c90f6e372894e238967d00'}, 'core511-source/scripts/core511/compose-native-http.mjs': {'bytes': 5213, 'sha256': 'fbe109cf29c76cea6c59d04a975d22805ea0181a2dee1797c2cafbab1af60dab'}, 'core511-source/scripts/core511/dungeon-projection.mjs': {'bytes': 3564, 'sha256': '3423d714d05d2f0bb46cd65fe1391266924d3f0c3d843a41ec4c67b90bad1767'}, 'core511-source/scripts/core511/extract-reward-services.mjs': {'bytes': 9499, 'sha256': 'bdce0dd14b07a9305a101fcdb7132b2e019d436326caea654a28800b36f9b519'}, 'core511-source/scripts/core511/generated/native-http-services-proof.json': {'bytes': 3484, 'sha256': '20a6f20f6bf9f4f2415a8b8c769e644d4917d1609dbf49e7ec1733a38c55a442'}, 'core511-source/scripts/core511/generated/native-http-services.mjs': {'bytes': 10936, 'sha256': 'eb6d49facc61476485e1475360874fe014d74d03713e5221a1ed8f02a4f50f62'}, 'core511-source/scripts/core511/generated/reward-services-proof.json': {'bytes': 31478, 'sha256': 'c8f84c6bc0388e26a3420a04576afee6521ab0cffee098c0e219edfe5289ff8c'}, 'core511-source/scripts/core511/generated/reward-services.mjs': {'bytes': 234830, 'sha256': 'ce1f1d795cbc1778733d4062971c5a204d879ba462d5316601bcde7efaa1a43d'}, 'core511-source/scripts/core511/native-configuration.mjs': {'bytes': 8328, 'sha256': '3bcfe9a144c7ff8bb5f0bfbe13e5d6cb7d5db677188bdeffe4e81e10983f4203'}, 'core511-source/scripts/core511/native-presence-lease.mjs': {'bytes': 1229, 'sha256': 'dd0dee98e2ab5d9b2ae1c9c101fe71bdb9072189c1045b57c437b91fa2f183ba'}, 'core511-source/scripts/core511/native-presence.mjs': {'bytes': 3849, 'sha256': '7e6d8b35df7db2325f98e6970bc98d3391b719476cbde1a87b88336fed45b85d'}, 'core511-source/scripts/core511/player-jobs.mjs': {'bytes': 3341, 'sha256': 'fbe47c01191cefe2c1e9a7acb1ddb7a102875b8856735e98799726bf8f3b3cf2'}, 'core511-source/scripts/core511/remote-movement.mjs': {'bytes': 12772, 'sha256': 'fae304d1099652f689534cd4acf605ee7356c6e6d23a3555f78e8f4fbbb53170'}, 'core511-source/scripts/core511/remote-playback-r45.mjs': {'bytes': 95, 'sha256': 'b172651f0507dc98cb83a59e6bd6b881f3a1290e137bac1830c4ea0cb18e4f2a'}, 'core511-source/scripts/core511/resident-world-transition.mjs': {'bytes': 18066, 'sha256': 'd0beda4ec25202fe32c0fc05b2f14f705480bd50464a146c27ab9ea5e6e83be5'}, 'core511-source/scripts/core511/tests/process-cold-upkeep.test.mjs': {'bytes': 29102, 'sha256': '5e2dd1ec2fc337e894a150317231de246f1fa0b531382d7493096f9fefd0701d'}, 'core511-source/scripts/core511/nonlethal-rewards-r56.mjs': {'bytes': 4184, 'sha256': '38b70dfb121579b9e4c0f4e79646c090ceb6ba7249c768e861b4dae6d3968fb9'}, 'core511-source/scripts/core511/patch-admin-settings-r65.mjs': {'bytes': 2332, 'sha256': 'ef57f7dcd89545125e1f9e0de754a02980ab594754604b3780276864a5101c13'}, 'core511-source/scripts/core511/action-conflict-log-r65.mjs': {'bytes': 1078, 'sha256': '17ad75c5f32fb6e5102221b1e0b03c95068d769ccdb91cafcebb1415d7c67452'}, 'core511-source/scripts/core511/dungeon-peer-motion-r72.mjs': {'bytes': 2232, 'sha256': 'a52016db95e767c38d8631b57998d09c6e6b249f7d6f7a1922d563744df07860'}, 'core511-source/scripts/core511/generated/client/core511-transport-r72-2def200d709afcba.js': {'bytes': 584244, 'sha256': '2def200d709afcbadf558f78d78daf0304c72a6b33c063a15d0048b811aeedf0'}, 'core511-source/scripts/core511/generated/client/game-client-core511-r72-10f67c795498b37b.js': {'bytes': 1623329, 'sha256': '10f67c795498b37b5248e756ac09411c6d34c0e7df3d42b69a1fa80c5015afbf'}, 'core511-source/scripts/core511/patch-guild-voice-renew-r72.mjs': {'bytes': 2260, 'sha256': '98e9c0fa2a863e63aee282110dc262df9d617c49e9505e6d5bed7f270246b1ca'}, 'core511-source/scripts/core511/patch-trade-idle-r72.mjs': {'bytes': 1284, 'sha256': '4c251247657fca75792fe2277be8bc8ae39ac1e95203cbd42ded3e9e2d5a041d'}, 'core511-source/scripts/core511/remote-playback-r72.mjs': {'bytes': 7899, 'sha256': '2fa6c0eea6988bad227716787c1cc3c1d6b6c4aea1392817c580a04ce7df7782'}, 'core511-source/scripts/core511/generated/client/game-client-core511-r73-be706e266c9b01a4.js': {'bytes': 1626799, 'sha256': 'be706e266c9b01a40574a82a9dcb731c87696422618884f9a1fbec5139f1dbfb'}, 'core511-source/scripts/core511/peer-pose-r73.mjs': {'bytes': 2603, 'sha256': '0c0f0e749a8b59e5bb528328e16c12fd114d91be2704aea700c549c07d7c8082'}, 'core511-source/scripts/core511/generated/client/game-client-core511-r75-b69215a7f9a7341d.js': {'bytes': 1629228, 'sha256': 'b69215a7f9a7341d64cb18dcde328fba6297d8988f329f75b093d0c212d5d08a'}, 'core511-source/scripts/core511/peer-pose-r75.mjs': {'bytes': 4961, 'sha256': '3fac1db9737057e513bf86f2f12bbdd4ee3722aa1fb87ed7a55ecd52df4805d5'}, 'core511-source/scripts/core511/daily-monster-rewards-r76.mjs': {'bytes': 8079, 'sha256': 'f4c135fa95de0a71f26a52c6a44ebbe5d1c7f24e3cc7570c72b182ad356f4f31'}, 'core511-source/scripts/core511/generated/client/game-client-core511-r76-63da43f1e5d71be7.js': {'bytes': 1630153, 'sha256': '63da43f1e5d71be74632d56bc92146d728fa5d3f4778d45b660b77673a7494ce'}, 'core511-source/scripts/core511/generated/enchantment-settings-r76-proof.json': {'bytes': 1055, 'sha256': '57de691135204c53e33f5fc9c046b7abdd842424008c2ef517ab8b1d2affe8f2'}, 'core511-source/scripts/core511/monster-ranking-r76.mjs': {'bytes': 581, 'sha256': 'd7813cf562c711bfb77460976ede7bc855764f51a5aa5379de90f2941bfa6b2a'}, 'core511-source/scripts/core511/native-admin-player-r76.mjs': {'bytes': 2202, 'sha256': 'e9553b96503bd4494a42769b98ccf832c7beb4e87c44d2a9947ff11ca7b9174f'}, 'core511-source/scripts/core511/tests/enchantment-settings-r76.test.mjs': {'bytes': 7390, 'sha256': '5768164933ae0d48b35d9099f675b50156266b63aeecef5c377cc970d48f1872'}, 'core511-source/scripts/core511/generated/client/admin-client-core511-r77-cd330aeddc742cd8.js': {'bytes': 586082, 'sha256': 'cd330aeddc742cd8da1633faf5423bc668b0c75f32dd2a86ca2fd17b25aef3d1'}, 'core511-source/scripts/core511/generated/client/core511-afk-r77-669a59aad349230a.js': {'bytes': 11477, 'sha256': '669a59aad349230adf4c899ba5b96b14873f2c3d0790a3ccc5a8ef3f837bb268'}, 'core511-source/scripts/core511/generated/client/game-client-core511-r77-b2743163841c6721.js': {'bytes': 1630755, 'sha256': 'b2743163841c67216922d0ea54243dd7aea90cb936bb64aeacc4ec10dc087ae5'}}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def collect_sources(root, expected=EXPECTED):
    root = Path(root).resolve()
    if not expected:
        raise RuntimeError('Kaynak listesi boş; hazırlanmış dosyayı kullanın.')
    files = []
    for name, row in sorted(expected.items()):
        relative = Path(name)
        if relative.is_absolute() or '..' in relative.parts or str(relative) != name or relative.suffix not in ('.mjs', '.js', '.json'):
            raise RuntimeError('Kaynak listesi geçersiz.')
        source = root / relative
        if not source.resolve().is_relative_to(root):
            raise RuntimeError('Kaynak yolu sürüm dışına çıkıyor.')
        for part in (source, *source.parents):
            if part == root:
                break
            if part.is_symlink():
                raise RuntimeError('Kaynak yolunda sembolik bağ var: ' + name)
        if not source.is_file() or not stat.S_ISREG(source.lstat().st_mode):
            raise RuntimeError('Beklenen kaynak yok: ' + name)
        with source.open('rb') as stream:
            data = stream.read(row['bytes'] + 1)
        if len(data) != row['bytes'] or digest(data) != row['sha256']:
            raise RuntimeError('Kaynak R79 kimliğiyle eşleşmedi: ' + name)
        files.append((name, data))
    return files


def export(root, output, expected=EXPECTED):
    files = collect_sources(root, expected)
    output = Path(output).absolute()
    if output.suffix != '.zip' or output.resolve().is_relative_to(Path(root).resolve()):
        raise RuntimeError('Çıktı, oyun sürüm dizininin dışında yeni bir .zip olmalı.')
    fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    identity = os.fstat(fd)
    try:
        with os.fdopen(fd, 'wb') as stream:
            with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
                for name, data in files:
                    archive.writestr(name, data)
                archive.writestr('KAYNAK_KIMLIKLERI.json', json.dumps({
                    'purpose': 'R80 foreground reward validation; source-only; no live data',
                    'sourceVersion': 'R79_GAMEPLAY', 'files': expected,
                }, ensure_ascii=False, indent=2) + '\n')
            stream.flush()
            os.fsync(stream.fileno())
    except BaseException:
        try:
            current = output.lstat()
            if (current.st_dev, current.st_ino) == (identity.st_dev, identity.st_ino):
                output.unlink()
        except FileNotFoundError:
            pass
        raise
    return len(files), digest(output.read_bytes())


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='/root/CORE511_R79_EKSIK_KAYNAK.zip')
    args = parser.parse_args(argv)
    state = json.loads(Path('/var/lib/core511/state.json').read_bytes())
    if state.get('installed') is not True or state.get('r64Deployment', {}).get('version') not in ('R79_GAMEPLAY', 'R80_GAMEPLAY'):
        raise RuntimeError('Kurulu R79/R80 bulunamadı.')
    root = Path(state['releaseRoot']).resolve()
    if root.parent != Path('/opt/core511/releases'):
        raise RuntimeError('Oyun sürüm dizini beklenen kapsamda değil.')
    count, sha = export(root, args.output)
    print('Hazır: ' + str(Path(args.output).absolute()))
    print('Doğrulanmış kaynak dosyası: ' + str(count))
    print('SHA256: ' + sha)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('DURDU: ' + (str(error) if isinstance(error, RuntimeError) else type(error).__name__), file=sys.stderr)
        sys.exit(1)
