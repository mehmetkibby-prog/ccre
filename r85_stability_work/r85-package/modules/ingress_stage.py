"""Fixed R85 TCP ingress delta, outside the independently pinned core tree.

The old bytes are an exact archived prerequisite, not an assumed live identity.
Every installation must match both its live manifest and its actual file first.
Recovery obtains the same original bytes from the verified journal backup.
"""
import hashlib

PATH = 'core511-source/scripts/delivery511/runtime-ingress.mjs'
BEFORE_SHA256 = '4b4a74bb7e57736787d717d51f28bb901e5d7f7fde060151bb84ad5c5c8b5403'
BEFORE_BYTES = 5178
AFTER_SHA256 = '325bd1caa7c52df9df159b63afa3cd7faf470f2cdae3f513a5c4ca29f655cec9'
AFTER_BYTES = 5191
OLD_CONNECT = b"net.connect({host:'127.0.0.1',port:d.channelPorts[channel-1]})"
NEW_CONNECT = b"net.connect({host:'127.0.0.1',port:d.channelPorts[channel-1],noDelay:true})"


def require(ok, message):
    if not ok:
        raise RuntimeError(message)


def metadata():
    return {'before': BEFORE_SHA256, 'after': AFTER_SHA256, 'bytes': AFTER_BYTES}


def validate_plan(plan):
    require(plan.get('files', {}).get(PATH) == metadata(),
            'R85 ingress başlangıç kimliği/tek özellik kapsamı farklı: ' + PATH)


def checked_body(data, *, updated=False):
    wanted_hash, wanted_size = (AFTER_SHA256, AFTER_BYTES) if updated else (BEFORE_SHA256, BEFORE_BYTES)
    actual_hash = hashlib.sha256(data).hexdigest()
    require(len(data) == wanted_size and actual_hash == wanted_hash,
            'Ingress dosyası tanınmıyor; kurulum durduruldu. Dosya: ' + PATH +
            '; beklenen SHA256=' + wanted_hash + ', bayt=' + str(wanted_size) +
            '; bulunan SHA256=' + actual_hash + ', bayt=' + str(len(data)) +
            '. Bu dosyayı ve release-manifest.json kaydını incelemek için paylaşın.')
    return data


def canonical_payload(original):
    checked_body(original)
    require(original.count(OLD_CONNECT) == 1 and NEW_CONNECT not in original,
            'Ingress bağlantı kapsamı farklı; yalnız upstream noDelay:true eklenebilir')
    return checked_body(original.replace(OLD_CONNECT, NEW_CONNECT, 1), updated=True)


def manifest_row(manifest, *, updated=False):
    rows = [row for row in manifest.get('files', []) if row.get('path') == PATH]
    wanted_hash, wanted_size = (AFTER_SHA256, AFTER_BYTES) if updated else (BEFORE_SHA256, BEFORE_BYTES)
    require(len(rows) == 1 and rows[0].get('sha256') == wanted_hash and
            type(rows[0].get('bytes')) is int and rows[0]['bytes'] == wanted_size,
            'Ingress release-manifest.json kaydı farklı/eksik: ' + PATH +
            '; beklenen SHA256=' + wanted_hash + ', bayt=' + str(wanted_size) +
            '. Kurulum durduruldu; dosya ve manifest kaydı incelenmeli.')
    return rows[0]


def validate_installed(root, manifest, *, updated=False):
    from inplace_stage import checked_path
    manifest_row(manifest, updated=updated)
    path = checked_path(root, PATH)
    require(path.is_file(), 'Ingress dosyası eksik: ' + PATH)
    checked_body(path.read_bytes(), updated=updated)


def validate_update(root, plan, updates, original_manifest, *, source_reader=None):
    from inplace_stage import checked_path
    validate_plan(plan)
    row = manifest_row(original_manifest)
    original = source_reader(row) if source_reader else checked_path(root, PATH).read_bytes()
    expected = canonical_payload(original)
    matches = [(meta, data) for name, meta, data in updates if name == PATH]
    require(len(matches) == 1 and matches[0][0] == metadata() and matches[0][1] == expected,
            'R85 ingress yükü farklı; yalnız doğrulanmış upstream noDelay:true eklenebilir')
