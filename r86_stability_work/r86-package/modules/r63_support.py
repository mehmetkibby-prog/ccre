"""R63 installer: maintenance or manual preregistration; preserve launch policy."""
import argparse
import contextlib
import datetime
import fcntl
import hashlib
import json
import io
import math
import os
from pathlib import Path
import re
import signal
import errno
import sqlite3
import stat
import subprocess
import sys
import time
import urllib.request
import uuid
import zipfile

STATE = Path('/var/lib/core511/state.json')
BACKUPS = Path('/var/lib/core511/r63-recovery-backups')
CORE = 'core511-source/scripts/core511/'
OPS = 'core511-source/scripts/delivery511/install-operations.mjs'
PANEL = '/api/realm/maintenance/panel511'
# Installer-only, authenticated reads. Never changes the owner's launch mode,
# early-access allowlist, registration dates or automatic opening schedule.
UPDATE_POLICY_JS = """
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const [root,g,a,rev,expected]=process.argv.slice(1),revision=Number(rev);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),game=read(g);
const {maintenanceClient}=await import(pathToFileURL(root+'/core511-source/scripts/delivery511/maintenance-client.mjs'));
const client=maintenanceClient({gameConfig:game,accountsConfig:read(a),manifest:read(game.realm.manifestFile)});
const p=await client.policy();
if(!Number.isSafeInteger(revision)||revision<1||p.revision!==revision||expected&&p.phase!==expected)
 throw Error('update_policy_changed');
if(p.phase==='maintenance'){
 if(!Number.isSafeInteger(p.deadlineMs)||p.deadlineMs>Date.now())throw Error('maintenance_not_drained');
}else if(p.phase==='waiting'){
 const {settings,status}=await client.admin({resource:'launch',method:'GET'});
 if(settings?.mode!=='closed'||settings.enabled!==1||settings.revision!==revision||status?.phase!=='waiting'||status.revision!==revision)
  throw Error('manual_preregistration_required');
 const latest=await client.policy();
 if(latest.phase!=='waiting'||latest.revision!==revision)throw Error('update_policy_changed');
}else throw Error('maintenance_or_manual_preregistration_required');
process.stdout.write(JSON.stringify({phase:p.phase,revision}));
"""
DELIVERY = 'core511-source/scripts/delivery511/'
PATCH_FILES = []  # Set only from the verified package metadata in main().
LIVE_CONFIG_FILE = None
DB_RESERVE = 512 * 1024 * 1024
MANIFEST_IDENTITY_FILE = CORE + 'benchmark/no-network.c'
CLIENT_PROOF = CORE + 'generated/native-client-proof.json'
HTTP_PROOF = CORE + 'generated/native-http-composition-proof.json'
HTTP_ROOT = 'http-runtime/dist-vds/'
HTTP_ASSETS = HTTP_ROOT + 'client/assets/'

class HardLink:
    """Immutable verified media; keep bytes out of memory and never copy them."""
    def __init__(self, source, size, sha256):
        self.source, self.size, self.sha256 = source, size, sha256
    def __len__(self):
        return 0  # No new content blocks; manifest uses .size.
    def __eq__(self, other):
        return isinstance(other, HardLink) and vars(self) == vars(other)


def update_digest(value):
    return value.sha256 if isinstance(value, HardLink) else digest(value)


def update_bytes(value):
    return value.size if isinstance(value, HardLink) else len(value)


def apply_update(file, value, row):
    if not isinstance(value, HardLink):
        atomic(file, value, row['mode'], row['uid'], row['gid'])
        return
    require(not file.exists(), 'yeni_medya_dosyasi_zaten_var')
    st = regular(value.source, allow_hardlinks=True)
    require(st.st_size == value.size and digest(value.source.read_bytes()) == value.sha256,
            'medya_kaynagi_degisti:' + value.source.name)
    temporary = file.with_name('.r41-' + uuid.uuid4().hex)
    try:
        os.link(value.source, temporary, follow_symlinks=False)
        os.replace(temporary, file)
        sync_dir(file.parent)
    finally:
        temporary.unlink(missing_ok=True)


class Refused(Exception):
    pass

def require(ok, code):
    if not ok:
        raise Refused(code)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def read_json(file):
    return json.loads(Path(file).read_bytes())

def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()

def member(root, name):
    require(isinstance(name, str) and name and not name.startswith('/') and
            all(p not in ('', '.', '..') for p in name.split('/')), 'gecersiz_dosya_yolu')
    p = root / name
    require(p.parent.resolve().is_relative_to(root.resolve()), 'dizin_disina_cikan_yol')
    require(not p.is_symlink(), 'hedef_simgesel_bag_olamaz:' + name)
    return p

def regular(file, *, allow_hardlinks=False):
    s = file.lstat()
    require(stat.S_ISREG(s.st_mode), 'normal_dosya_gerekli:' + file.name)
    require(allow_hardlinks or s.st_nlink == 1,
            'tek_bagli_dosya_gerekli:' + file.name + ':bag=' + str(s.st_nlink))
    return s

def sync_dir(directory):
    fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)

def atomic(file, data, mode=0o600, uid=None, gid=None):
    temp = file.with_name('.r41-' + uuid.uuid4().hex)
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    try:
        if uid is not None:
            os.fchown(fd, uid, gid)
        os.fchmod(fd, mode)
        with os.fdopen(fd, 'wb', closefd=False) as out:
            out.write(data)
            out.flush()
            os.fsync(fd)
        os.close(fd)
        fd = None
        os.replace(temp, file)
        sync_dir(file.parent)
    finally:
        if fd is not None:
            os.close(fd)
        temp.unlink(missing_ok=True)

def prepare_parent(root, file, uid, gid):
    """Only create missing payload directories inside the verified release."""
    require(file.is_relative_to(root), 'payload_dizini_kapsami')
    current = root
    for component in file.parent.relative_to(root).parts:
        current = current / component
        if not current.exists():
            current.mkdir(mode=0o755)
            os.chown(current, uid, gid)
            sync_dir(current.parent)
        require(current.is_dir() and not current.is_symlink(), 'payload_dizini_simgesel_bag')

def safe_error(error):
    if isinstance(error, Refused):
        return str(error)
    if isinstance(error, OSError):
        # Report only OS metadata, never configuration, SQL or subprocess output.
        detail = {'type': type(error).__name__, 'errno': error.errno,
                  'code': errno.errorcode.get(error.errno, 'UNKNOWN')}
        for key in ('filename', 'filename2'):
            value = getattr(error, key, None)
            if value is not None:
                detail[key] = Path(os.fsdecode(value)).name
        return json.dumps(detail, ensure_ascii=True)
    return type(error).__name__

def command(args, timeout=20):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    require(result.returncode == 0, 'komut_basarisiz:' + Path(args[0]).name)
    return result.stdout.decode().strip()

def verification_budget(manifest, sample=None):
    """Bound native verification by the measured live scan and actual volume."""
    rows = manifest['files']
    count, total = len(rows), sum(row['bytes'] for row in rows)
    # Conservative fallback for an idempotent check with no preflight sample.
    seconds = total / (16 * 1024 * 1024) + count / 250 + 30
    if sample:
        scale = max(total / max(1, sample['bytes']), count / max(1, sample['files']))
        seconds = max(seconds, sample['seconds'] * scale * 3 + 30)
    return max(180, min(1200, math.ceil(seconds)))

def verify_command(args, timeout):
    started = time.monotonic()
    process = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        while True:
            remaining = timeout - (time.monotonic() - started)
            if remaining <= 0:
                raise Refused('kurulu_paket_dogrulama_sure_siniri_' + str(timeout) + 'sn')
            try:
                out, error = process.communicate(timeout=min(5, remaining))
                require(process.returncode == 0, 'komut_basarisiz:' + Path(args[0]).name)
                return out.decode().strip()
            except subprocess.TimeoutExpired:
                elapsed = int(time.monotonic() - started)
                print('Kurulu dosya SHA256 doğrulaması sürüyor: ' + str(elapsed) +
                      ' sn; kalan üst süre: ' + str(max(0, timeout - elapsed)) + ' sn.', flush=True)
    finally:
        if process.poll() is None:
            process.kill()
            process.communicate()

def service(unit, action):
    return command(['/usr/bin/systemctl', action, unit], 70)

def prop(unit, field):
    return command(['/usr/bin/systemctl', 'show', unit, '--property=' + field, '--value'])

def local(port, endpoint):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open('http://127.0.0.1:' + str(port) + endpoint, timeout=3) as response:
        body = response.read(131073)
        require(len(body) <= 131072, 'yerel_yanit_boyutu')
        return json.loads(body)

def core_identity(root):
    rows = []
    def walk(folder):
        for p in sorted(folder.iterdir(), key=lambda f: f.name):
            if p.name.startswith('.') or p.name in ('evidence', 'node_modules'):
                continue
            if p.is_symlink():
                continue  # Same lstat semantics as source-identity.mjs.
            if p.is_dir():
                walk(p)
            elif p.is_file() and p.suffix in ('.mjs', '.js', '.json', '.c'):
                data = p.read_bytes()
                rows.append({'path': p.relative_to(root).as_posix(), 'bytes': len(data), 'sha256': digest(data)})
    walk(root)
    return identity_from_rows(rows)

def identity_from_rows(rows):
    # Component order matches the recursive name-sorted JS sourceIdentity walk.
    # Sorting whole paths would incorrectly put foo.js before foo/bar.mjs.
    rows = sorted(rows, key=lambda row: tuple(row['path'].split('/')))
    rows = [{'path': r['path'], 'bytes': r['bytes'], 'sha256': r['sha256']} for r in rows]
    body = {'kind': 'core511-source-candidate-v1', 'baselineManifestSha256':
            'bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b', 'files': rows}
    return digest(json.dumps(body, ensure_ascii=False, separators=(',', ':')).encode())

def packaged_core_rows(spec):
    rows = {}
    for name, row in spec['baseFiles'].items():
        if not name.startswith(CORE):
            continue
        relative = name[len(CORE):]
        if any(p.startswith('.') or p in ('node_modules', 'evidence') for p in relative.split('/')):
            continue
        if Path(relative).suffix in ('.mjs', '.js', '.json', '.c'):
            rows[relative] = {'path': relative, 'bytes': row['bytes'], 'sha256': row['sha256']}
    return rows

def resolve_core_identity(live, spec):
    """Bind only the known export omission to its verified live manifest entry.

    The C file is never supplied, replaced, removed or executed by this patch.
    Other unexpected core files still fail the full source-identity comparison.
    """
    before = packaged_core_rows(spec)
    after = dict(before)
    for row in spec['changes']:
        if row['path'].startswith(CORE) and Path(row['path']).suffix in ('.mjs', '.js', '.json', '.c'):
            name = row['path'][len(CORE):]
            after[name] = {'path': name, 'bytes': row['bytes'], 'sha256': row['after']}
    package_before = spec.get('packagedBeforeCore', spec['beforeCore'])
    package_after = spec.get('packagedAfterCore', spec['afterCore'])
    require(identity_from_rows(before.values()) == package_before and
            identity_from_rows(after.values()) == package_after, 'paket_kimlik_listesi_uyusmuyor')
    for row in spec.get('runtimeBeforeCoreRows', []):
        require(row['path'] == HTTP_PROOF[len(CORE):], 'dinamik_taban_dosyasi_kapsami')
        before[row['path']] = row
    # Exactly one deterministic runtime composition proof depends on the
    # byte-pinned server entry present only on the live release.
    for row in spec.get('runtimeCoreRows', []):
        require(row['path'] == HTTP_PROOF[len(CORE):], 'dinamik_cekirdek_dosyasi_kapsami')
        after[row['path']] = row
    mf = member(live.root, 'release-manifest.json')
    regular(mf)
    manifest = read_json(mf)
    matches = [r for r in manifest['files'] if r.get('path') == MANIFEST_IDENTITY_FILE]
    require(len(matches) <= 1, 'tekrarli_no_network_manifest_kaydi')
    file = member(live.root, MANIFEST_IDENTITY_FILE)
    included = []
    if matches:
        row = matches[0]
        require(type(row.get('bytes')) is int and row['bytes'] >= 0 and
                isinstance(row.get('sha256'), str) and re.fullmatch('[0-9a-f]{64}', row['sha256']),
                'no_network_manifest_degeri_gecersiz')
        require(file.exists(), 'manifestteki_no_network_c_eksik_ozgun_dosyayi_geri_koyun')
        st = regular(file, allow_hardlinks=True)  # Verified read-only identity input.
        require(st.st_size == row['bytes'] and digest(file.read_bytes()) == row['sha256'],
                'no_network_c_manifest_SHA256_veya_boyut_uyusmuyor')
        name = MANIFEST_IDENTITY_FILE[len(CORE):]
        extra = {'path': name, 'bytes': row['bytes'], 'sha256': row['sha256']}
        before[name] = after[name] = extra
        included.append(extra)
    else:
        require(not file.exists(), 'no_network_c_manifest_kaydi_yok')
    return dict(spec, packagedBeforeCore=package_before, packagedAfterCore=package_after,
                beforeCore=identity_from_rows(before.values()), afterCore=identity_from_rows(after.values()),
                liveIdentityFiles=included)

BASE_ARCHIVE = None
R55_VERIFIER_SHA256 = 'cad1b71924f9c522a8a713a1e8c83b313f0e971b377ff3c46440e2fa61252b9a'

def client_namespace(source, proof):
    return 'core511-' + digest(source + json.dumps(proof, ensure_ascii=False, separators=(',', ':')).encode())[:16]


R61_READONLY_PROOF_SHA256 = 'e1a771a8cdce73209e0f3e8062c1a03357c3aadea377b759959cef666c4b08e0'
R61_READ_VIEW_ADAPTER = {"require(not read_view, 'R61_runtime_read_view_yasak')": 'read_view = read_view or {}', "manifest = read_json(member(live.root, 'release-manifest.json'))": "manifest = json.loads(read_view.get('release-manifest.json',member(live.root,'release-manifest.json').read_bytes()))", 'data = file.read_bytes()\n            require(len(data)': 'data = read_view.get(name,file.read_bytes())\n            require(len(data)', 'member(live.root,CLIENT_PROOF).read_bytes() ==': 'read_view.get(CLIENT_PROOF,member(live.root,CLIENT_PROOF).read_bytes()) ==', "        view = {CORE+'client-assets.mjs':old_source}": "        view = {**read_view,CORE+'client-assets.mjs':old_source}", 'observed=target.read_bytes()': 'observed=read_view.get(target.relative_to(live.root).as_posix(),target.read_bytes())'}

def runtime_file_allowed(name, namespace):
    if name.startswith(HTTP_ASSETS + namespace + '/'):
        return all(x not in ('', '.', '..') for x in name.split('/'))
    if name.startswith(HTTP_ROOT + 'server/'):
        return Path(name).suffix in ('.js', '.mjs', '.json', '.html')
    if name.startswith(HTTP_ROOT + 'client/') and not name.startswith(HTTP_ASSETS):
        return Path(name).suffix in ('.js', '.mjs', '.json', '.html')
    return name == HTTP_PROOF


def runtime_activation(live, archive, spec, read_view=None):
    """Exact R57 -> gameplay R62 immutable graph; preserve every old asset.

    Only references outside assets change. The approved unchanged R61 verifier
    validates the original graph, including through an inverse view on repeat.
    Authenticated loot preview uses the actual Sis profile and scoped Sinsi exemption.
    """
    require(not read_view, 'R62_runtime_read_view_yasak')
    # A selected base omits unchanged gameplay files. Client verification still
    # uses the complete, pinned package asset list on every repeat verification.
    spec = dict(spec, changes=spec.get('packageChanges', spec['changes']))
    policy = spec.get('runtimeActivation', {})
    require(policy.get('from') == 'R61' and policy.get('to') == 'R63_RECOVERY' and
            policy.get('clientRevision') == 1 and policy.get('embeddedProofSha256') == R61_READONLY_PROOF_SHA256,
            'R62_runtime_politikasi')
    raw = archive.read('runtime/r61-readonly-proof.zip')
    require(digest(raw) == R61_READONLY_PROOF_SHA256, 'R61_gomulu_dogrulayici_SHA256')
    with zipfile.ZipFile(io.BytesIO(raw)) as previous:
        prior = json.loads(previous.read('patch.json'))
        require(prior.get('version') == 'R61_AUDIO' and prior.get('afterCore') ==
                'cdaffd0d1297c1ef49248bffb39226e966f1195148a808a480dee36bee5961a9', 'R61_gomulu_taban_kimligi')
        baseline_bytes = previous.read('payload/' + CLIENT_PROOF)
        scope = {'__name__': '_core511_r60_readonly_verifier', '__file__': 'sha256-pinned-r60/__main__.py'}
        verifier_source = previous.read('__main__.py').decode()
        # SHA-pinned verifier, mechanically adapted for an inverse read view.
        # Every supplied byte has already been checked against the live manifest.
        start=verifier_source.index('def runtime_activation(');end=verifier_source.index('\ndef require_authorized_updates(',start)
        function=verifier_source[start:end]
        for before,after in R61_READ_VIEW_ADAPTER.items():
            require(function.count(before)==1,'R61_read_view_adapter_anchor')
            function=function.replace(before,after)
        verifier_source=verifier_source[:start]+function+verifier_source[end:]
        exec(compile(verifier_source,scope['__file__'],'exec'),scope)

        scope['BASE_ARCHIVE'] = BASE_ARCHIVE
        baseline = json.loads(baseline_bytes)
        require(digest(baseline_bytes) == policy['baselineClientProofSha256'], 'R61_istemci_kaniti_SHA256')
        new_bytes = archive.read('payload/' + CLIENT_PROOF)
        row = next((r for r in spec['changes'] if r['path'] == CLIENT_PROOF), None)
        require(row and len(new_bytes) == row['bytes'] and digest(new_bytes) == row['after'], 'R62_istemci_kaniti_SHA256')
        new = json.loads(new_bytes)
        claim = new.get('r62Polish', {})
        require(claim.get('baseline', {}).get('proofSHA256') == digest(baseline_bytes), 'R62_claim_taban_bagi')
        old_source=archive.read('runtime/r61-client-assets.mjs');source=old_source
        require(digest(old_source)==baseline['assetSourceSha256'] and digest(source)==new['assetSourceSha256'],'R62_asset_kaynak_kaniti')
        old_ns,new_ns=client_namespace(old_source,baseline),client_namespace(source,new)
        require(old_ns == policy['baselineNamespace'] == 'core511-c2f173cf2145e0ae' and
                new_ns == policy['namespace'] and new_ns != old_ns and re.fullmatch(r'core511-[a-f0-9]{16}', new_ns), 'R62_namespace_kaniti')
        # Native tower/transport and prior provenance remain byte-identical.
        require(new['r49']==baseline['r49'] and new['r58Gameplay']==baseline['r58Gameplay'] and new['r59Castle']==baseline['r59Castle'] and new['r60Gameplay']==baseline['r60Gameplay'] and new['r61Audio']==baseline['r61Audio'] and new['admin']==baseline['admin'] and new['bridge']==baseline['bridge'],'R62_onceki_istemci_kanitlari_degisti')
        pairs = [[a,b] for a,b in [(old_ns,new_ns),(baseline['name'],new['name']),
                                  (baseline['portal']['name'],new['portal']['name']),
                                  (baseline['admin']['name'],new['admin']['name']),(baseline['bridge'],new['bridge']),(baseline['tower']['bridge'],new['tower']['bridge'])] if a != b]
        require(pairs == policy['replacement'], 'R62_referans_kaniti')
        def rewrite(data, reverse=False):
            value = data.decode('utf-8')
            for a,b in (reversed(pairs) if reverse else pairs):
                value = value.replace(b,a) if reverse else value.replace(a,b)
            return value.encode()
        def route(data, reverse=False):
            edits=policy['httpEdits']
            for edit in (reversed(edits) if reverse else edits):
                before,after=(edit['to'],edit['from']) if reverse else (edit['from'],edit['to'])
                before,after=before.encode(),after.encode()
                require(data.count(before)==edit['count'],'R62_HTTP_route_anchor')
                data=data.replace(before,after)
            return data
        def client_paths(data):
            value = data.decode('utf-8')
            value = value.replace(Path(new['file']).name,new['name']).replace(Path(new['portal']['file']).name,new['portal']['name'])
            value = value.replace('/assets/','/assets/' + new_ns + '/')
            return re.sub(r'(["\'`])assets/',lambda match:match[1]+'assets/'+new_ns+'/',value).encode()
        manifest = read_json(member(live.root, 'release-manifest.json'))
        rows = {r['path']:r for r in manifest['files']}
        require(len(rows) == len(manifest['files']), 'tekrarli_manifest_dosyasi')
        def verified(name):
            require(name in rows, 'R62_runtime_manifest_kaydi_yok:' + name)
            file = member(live.root,name);regular(file,allow_hardlinks=True)
            data = file.read_bytes()
            require(len(data) == rows[name]['bytes'] and digest(data) == rows[name]['sha256'], 'R62_runtime_SHA256:' + name)
            return data
        index_name = HTTP_ROOT + 'server/index.js'
        current_index = verified(index_name);actual_proof = verified(HTTP_PROOF)
        already = new_ns.encode() in current_index
        require(member(live.root,CLIENT_PROOF).read_bytes() == (new_bytes if already else baseline_bytes), 'R62_kurulu_istemci_kaniti')
        view = {CORE+'client-assets.mjs':old_source}
        prior_proof = json.loads(actual_proof)
        if already:
            record = prior_proof.pop('clientR62Polish', None)
            require(isinstance(record,dict) and record.get('version') == 'client-r62-polish-1' and
                    record.get('replacement') == pairs and record.get('priorClientProofSha256') == digest(baseline_bytes) and
                    record.get('clientProofSha256') == digest(new_bytes), 'R62_HTTP_kaniti')
            prior_proof['generatedSha256'] = record['priorGeneratedSha256']
            prior_proof['clientAssetNamespace'] = old_ns
            view[HTTP_PROOF] = encoded(prior_proof);view[CLIENT_PROOF] = baseline_bytes
            for name in rows:
                if name == HTTP_PROOF or name.startswith(HTTP_ASSETS) or not runtime_file_allowed(name,new_ns):continue
                data = verified(name);before = rewrite(route(data,reverse=True) if name==index_name else data,reverse=True)
                require((route(rewrite(before)) if name==index_name else rewrite(before)) == data, 'R62_HTTP_ters_donus:' + name)
                if before != data:view[name] = before
            require(index_name in view and digest(view[index_name]) == prior_proof['generatedSha256'], 'R62_HTTP_taban_SHA256')
            old_manifest = json.loads(encoded(manifest))
            for r in old_manifest['files']:
                if r['path'] in view:
                    data = view[r['path']];r.update(bytes=len(data),sha256=digest(data))
            view['release-manifest.json'] = encoded(old_manifest)
        else:
            require('clientR62Polish' not in prior_proof and prior_proof['clientAssetNamespace'] == old_ns, 'R61_HTTP_taban_kaniti')
        require(member(live.root,CORE+'client-assets.mjs').read_bytes()==(source if already else old_source),'R62_kurulu_asset_kaynagi')
        checked = scope['runtime_activation'](live, previous, prior, read_view=view)
    require(checked['already'] and checked['namespace'] == old_ns, 'R61_istemcisi_tam_kurulu_olmali')
    old_proof_bytes = view.get(HTTP_PROOF,actual_proof);prior_index = view.get(index_name,current_index)
    next_index = route(rewrite(prior_index))
    require(rewrite(route(next_index,reverse=True),reverse=True) == prior_index and (not already or next_index == current_index), 'R62_HTTP_kesin_ters_donus')
    prefix,target_prefix = HTTP_ASSETS+old_ns+'/',HTTP_ASSETS+new_ns+'/'
    old_rows = [r for name,r in rows.items() if name.startswith(prefix)]
    require(old_rows and not any(r['path'].startswith(prefix) for r in manifest.get('symlinks',[])), 'R61_namespace_manifesti')
    require(already or not member(live.root,target_prefix.rstrip('/')).exists(), 'R62_namespace_zaten_var')
    updates={member(live.root,index_name):next_index};links=written=0
    for r in old_rows:
        name=r['path'];original=member(live.root,name);data=verified(name)
        target=member(live.root,target_prefix+name[len(prefix):])
        transformed=rewrite(data) if original.suffix in ('.js','.mjs','.json','.html') else data
        if transformed == data:
            updates[target]=HardLink(original,r['bytes'],r['sha256']);links+=1
        else:
            require(rewrite(transformed,reverse=True) == data,'R62_asset_ters_donus:'+name)
            updates[target]=transformed;written+=1
    generated_prefix=CORE+'generated/client/';payload_names=set()
    asset_proofs={r['name']:r for r in claim.get('assets',[])}
    require(len(asset_proofs)==len(claim.get('assets',[])) and asset_proofs,'R62_tekrarli_asset_kaniti')
    for r in spec['changes']:
        if not r['path'].startswith(generated_prefix):continue
        name=r['path'][len(generated_prefix):]
        require('/' not in name and name.endswith(('.js','.webp')) and
                r['beforeByBase'] == {'R61': None, 'R62': r['after']}, 'R62_yeni_claim_asset_kapsami')
        data=archive.read('payload/'+r['path'])
        require(len(data)==r['bytes'] and digest(data)==r['after'] and (name.endswith('.webp') or name.endswith('-'+digest(data)[:16]+'.js')),'R62_yeni_asset_SHA256')
        require(name in asset_proofs and asset_proofs[name]['sha256']==digest(data) and asset_proofs[name]['bytes']==len(data),'R62_asset_kaniti_uyusmazligi')
        updates[member(live.root,target_prefix+name)]=client_paths(data) if name.endswith('.js') else data;payload_names.add(name)
    require(payload_names==set(policy['newBrowserFiles'])==set(asset_proofs),'R62_yeni_asset_listesi')
    for name in [new['name'],new['portal']['name'],new['admin']['name'],new['tower']['bridge'],new['bridge']]:
        require(member(live.root,target_prefix+name) in updates,'R62_istemci_grafi_eksik:'+name)
    for name in rows:
        if name in (index_name,HTTP_PROOF) or name.startswith(HTTP_ASSETS) or not runtime_file_allowed(name,new_ns):continue
        data=view.get(name,verified(name));transformed=rewrite(data)
        if transformed!=data:
            require(rewrite(transformed,reverse=True)==data,'R62_referans_ters_donus:'+name)
            updates[member(live.root,name)]=transformed
    next_proof=dict(json.loads(old_proof_bytes),generatedSha256=digest(next_index),clientAssetNamespace=new_ns)
    next_proof['clientR62Polish']={'version':'client-r62-polish-1','priorGeneratedSha256':digest(prior_index),
        'replacement':pairs,'priorClientProofSha256':digest(baseline_bytes),'clientProofSha256':digest(new_bytes),
        'scope':'R62 gameplay fixes; stackable mount materials, riding state and daily castle notices; exact reversible immutable client references.'}
    proof_bytes=encoded(next_proof);updates[member(live.root,HTTP_PROOF)]=proof_bytes
    if already:
        require(proof_bytes==actual_proof,'R62_HTTP_kaniti_kesin_eslesme')
        for target,data in updates.items():
            regular(target,allow_hardlinks=True)
            observed=target.read_bytes()
            require(len(observed)==update_bytes(data) and digest(observed)==update_digest(data),'R62_runtime_degismis:'+target.relative_to(live.root).as_posix())
            if isinstance(data,HardLink):require(target.stat().st_ino==data.source.stat().st_ino and target.stat().st_dev==data.source.stat().st_dev,'R62_medya_bagi_degismis')
    return {'namespace':new_ns,'oldNamespace':old_ns,'updates':updates,'already':already,
        'hardlinks':links,'rewrittenOldJs':written,'newBrowserFiles':len(payload_names),
        'beforeCoreRows':checked['coreRows'],
        'coreRows':[{'path':HTTP_PROOF[len(CORE):],'bytes':len(proof_bytes),'sha256':digest(proof_bytes)}]}


def require_authorized_updates(live, updates, runtime):
    allowed = {member(live.root, p) for p in PATCH_FILES + [OPS, 'release-manifest.json']}
    allowed.update((STATE, live.config_file, startup_file(live.unit)))
    for target in runtime['updates']:
        require(target.is_relative_to(live.root) and runtime_file_allowed(target.relative_to(live.root).as_posix(),runtime['namespace']), 'R61_runtime_yazimi_kapsami')
        allowed.add(target)
    require(all(p in allowed and isinstance(data,(bytes,HardLink)) for p,data in updates.items()), 'R61_yazim_kapsami')
    old_prefix=live.root/(HTTP_ASSETS+runtime['oldNamespace'])
    require(not any(p.is_relative_to(old_prefix) for p in updates), 'R61_eski_namespace_yazimi_yasak')





R61_NODE_STARTUP_POLICY = {'version': 1, 'flag': 'CORE511_R61_EAGER_REWARD', 'service': 'game', 'nodeArgumentsWhenEnabled': ['--no-lazy'], 'dropInName': '91-core511-r61-eager.conf', 'accountsChanged': False, 'customExecStart': 'refuse-without-mutation'}

# Installer-owned launch policy. No production module or accounts unit changes.
R61_SYSTEMD_ROOT = Path('/etc/systemd/system')
R61_EAGER_FLAG = 'CORE511_R61_EAGER_REWARD'
R61_EAGER_DROPIN = '91-core511-r61-eager.conf'

def startup_file(unit):
    require(re.fullmatch(r'coreoflife-[A-Za-z0-9_-]+\.service', unit) and unit != 'coreoflife-accounts.service', 'R61_oyun_servisi_kapsami')
    return R61_SYSTEMD_ROOT / (unit + '.d') / R61_EAGER_DROPIN

def startup_arguments(live, enabled):
    node, entry = str(live.node), str(live.root / (DELIVERY + 'runtime-entry.mjs'))
    require(all(re.fullmatch(r'/[A-Za-z0-9_./-]+', p) and '..' not in Path(p).parts for p in [node, entry]), 'R61_baslatma_yolu')
    return [node, *(['--no-lazy'] if enabled else []), entry]

def startup_bytes(live, enabled):
    if not enabled:
        return b'# Core511 R61 eager startup disabled; managed launch remains unchanged.\n'
    return ('# Owned by the Core511 R61 installer.\n[Service]\nExecStart=\nExecStart=' + ' '.join(startup_arguments(live, True)) + '\n').encode()

def startup_flag(live):
    env = read_json(live.config_file).get('environment', {})
    value = env.get(R61_EAGER_FLAG, '0')
    require(value in ('0', '1'), 'R61_baslatma_anahtari')
    return value == '1', R61_EAGER_FLAG in env

def startup_regular(file):
    require(file.is_absolute() and file.resolve() == file and not file.is_symlink(), 'R61_servis_dosyasi_yolu')
    st = regular(file)
    require(st.st_uid == 0 and not stat.S_IMODE(st.st_mode) & 0o022, 'R61_servis_dosyasi_sahibi')
    return st

def startup_directory(unit):
    target = startup_file(unit)
    for folder in (R61_SYSTEMD_ROOT, target.parent):
        st = folder.lstat()
        require(stat.S_ISDIR(st.st_mode) and not folder.is_symlink() and folder.resolve() == folder and st.st_uid == 0 and not stat.S_IMODE(st.st_mode) & 0o022, 'R61_servis_dizini_sahibi')
    return target

def startup_inspect(live, *, installed):
    """Refuse custom argv/prefixes; retain every other existing unit attribute."""
    target = startup_directory(live.unit)
    require(prop(live.unit, 'LoadState') == 'loaded', 'R61_servis_yuklu_olmali')
    require(prop(live.unit, 'NeedDaemonReload') == 'no', 'R61_servis_bekleyen_degisim_var')
    fragment = Path(prop(live.unit, 'FragmentPath'))
    require(fragment == R61_SYSTEMD_ROOT / live.unit, 'R61_servis_fragment_kapsami')
    startup_regular(fragment)
    paths = [Path(p) for p in prop(live.unit, 'DropInPaths').split()]
    require(len(paths) == len(set(paths)) and all(p.parent == target.parent and re.fullmatch(r'[A-Za-z0-9_.-]+\.conf', p.name) for p in paths), 'R61_servis_dropin_kapsami')
    managed = target.parent / '90-core511.conf'
    owner = next((r for r in live.state.get('prior', {}).get('changedUnits', []) if r.get('unit') == live.unit and r.get('file') == str(managed)), None)
    require(owner and managed in paths, 'R61_yonetilen_servis_kaniti_yok')
    for file in paths:
        startup_regular(file)
    require(digest(managed.read_bytes()) == owner.get('sha256'), 'R61_yonetilen_servis_degisti')
    expected_line = 'ExecStart=' + ' '.join(startup_arguments(live, False))
    lines = managed.read_text().splitlines()
    require(lines.count('ExecStart=') == 1 and lines.count(expected_line) == 1 and sum(line.startswith('ExecStart=') for line in lines) == 2, 'R61_yonetilen_baslatma_uyusmazligi')
    enabled, configured = startup_flag(live)
    if installed:
        require(configured and target in paths and target.read_bytes() == startup_bytes(live, enabled), 'R61_baslatma_dropin_uyusmazligi')
    else:
        require(not target.exists() and not target.is_symlink() and target not in paths, 'R61_baslatma_dropin_zaten_var')
        require(not configured, 'R61_baslatma_anahtari_kurulmadan_ayarlanmis')
    # ExecStartEx exposes executable prefixes/flags as well as argv. A plain
    # ExecStart property alone cannot prove that @, -, +, ! or : is absent.
    command = prop(live.unit, 'ExecStartEx')
    prefix = r'\{\s*path=' + re.escape(str(live.node)) + r'\s*;\s*argv\[\]=' + re.escape(' '.join(startup_arguments(live, enabled))) + r'\s*;\s*flags=\s*;\s*'
    tail = r'start_time=[^{};]*;\s*stop_time=[^{};]*;\s*pid=\d+\s*;\s*code=[^{};]*;\s*status=[^{};]*\s*\}'
    require(re.fullmatch(prefix + tail, command), 'R61_ozel_ExecStart_desteklenmiyor')
    return {str(p): digest(p.read_bytes()) for p in [fragment, *paths]}

def startup_prepare(live, spec):
    require(spec.get('nodeStartup') == R61_NODE_STARTUP_POLICY, 'R61_baslatma_paket_kaniti')
    configured=read_json(live.config_file).get('environment', {})
    startup_inspect(live, installed=R61_EAGER_FLAG in configured)
    return {startup_file(live.unit): startup_bytes(live, configured.get(R61_EAGER_FLAG, INSTALL_FLAGS[R61_EAGER_FLAG]) == '1')}

def startup_verify(live):
    enabled, configured = startup_flag(live)
    startup_inspect(live, installed=configured)

def startup_reload(live):
    command(['/usr/bin/systemctl', 'daemon-reload'])
    startup_verify(live)

def startup_running(live, argv):
    enabled, configured = startup_flag(live)
    if configured:
        require([os.fsdecode(a) for a in argv if a] == startup_arguments(live, enabled), 'R61_calisan_baslatma_argumanlari')

def startup_flag_change(live, record, next_config):
    startup_verify(live)
    file = startup_file(live.unit)
    row = next((r for r in record['files'] if r['file'] == str(file)), None)
    require(row is not None, 'R61_baslatma_yedegi_yok')
    before = file.read_bytes()
    require(digest(before) == row['after'], 'R61_baslatma_disaridan_degisti')
    after = startup_bytes(live, next_config['environment'].get(R61_EAGER_FLAG, '0') == '1')
    record['approvedStartupHashes'] = [digest(before), digest(after)]
    return file, row, before, after


class Live:
    def __init__(self):
        regular(STATE)
        self.state = read_json(STATE)
        require(self.state.get('installed') is True, 'kurulu_cekirdek_kaydi_gerekli')
        self.root = Path(self.state['releaseRoot']).resolve()
        require(self.root.is_relative_to(Path('/opt/core511/releases')), 'beklenmeyen_sur um_dizini'.replace(' ', ''))
        p = self.state['prior']
        self.unit = p['gameUnit']
        self.accounts_unit = p['accountsUnit']
        require(self.accounts_unit == 'coreoflife-accounts.service', 'hesap_servisi_uyusmazligi')
        require(re.fullmatch(r'coreoflife-[a-zA-Z0-9_-]+\.service', self.unit), 'beklenmeyen_servis')
        self.config_file = Path(p['newGameConfigFile']).resolve()
        self.config = read_json(self.config_file)
        self.database = Path(self.config['database']).resolve()
        require(self.database == Path(p['database']).resolve(), 'guncel_db_yolu_degismis')
        require(Path(self.config['delivery511']['releaseRoot']).resolve() == self.root, 'aktif_sur um_uyusmazligi'.replace(' ', ''))
        self.port = self.config['delivery511']['appPort']
        require(type(self.port) is int and 1024 <= self.port <= 65535, 'uygulama_portu')
        self.accounts = Path(p.get('newAccountsConfigFile') or p['accountsConfigFile']).resolve()
        self.accounts_config = read_json(self.accounts)
        require(self.accounts_config['realm']['role'] == 'accounts', 'hesap_ayari_uyusmazligi')
        self.db_identity = self.config['realm']['dbIdentity']
        self.inode = self.db_inode()
        require(self.inode == (p['databaseIdentity']['dev'], p['databaseIdentity']['ino']), 'guncel_db_kimligi_degismis')
        self.node = self.root / 'bin/node'
        require(self.node.is_file(), 'kurulu_node_bulunamadi')
        require(command([str(self.node), '--version']).startswith('v22.'), 'node22_gerekli')

    def db_inode(self):
        s = regular(self.database)
        return s.st_dev, s.st_ino

    def same_database(self):
        require(self.db_inode() == self.inode, 'guncel_db_degisti')

    def active_binding(self, require_accounts=True):
        require(prop(self.unit, 'ActiveState') == 'active', 'oyun_servisi_calisiyor_olmali')
        pid = int(prop(self.unit, 'MainPID'))
        require(pid > 1, 'servis_pid')
        argv = Path('/proc/' + str(pid) + '/cmdline').read_bytes().split(b'\0')
        startup_running(self, argv)
        entry = str(self.root / 'core511-source/scripts/delivery511/runtime-entry.mjs').encode()
        require(entry in argv, 'calisan_cekirdek_yolu_uyusmuyor')
        env = dict(x.split(b'=', 1) for x in Path('/proc/' + str(pid) + '/environ').read_bytes().split(b'\0') if b'=' in x)
        require(env.get(b'CORE_CONFIG_FILE') == str(self.config_file).encode(), 'calisan_ayar_dosyasi_uyusmuyor')
        if b'CORE_DATA_ROOT' in env:
            require(Path(os.fsdecode(env[b'CORE_DATA_ROOT'])).resolve() == self.database.parent, 'yedek_veri_dizini_uyusmazligi')
        if not require_accounts:
            return
        require(prop(self.accounts_unit, 'ActiveState') == 'active', 'hesap_servisi_calisiyor_olmali')
        accounts_pid = int(prop(self.accounts_unit, 'MainPID'))
        require(accounts_pid > 1, 'hesap_servisi_pid')
        accounts_args = Path('/proc/' + str(accounts_pid) + '/cmdline').read_bytes().split(b'\0')
        require(str(self.root / (DELIVERY + 'generated/accounts-entry.mjs')).encode() in accounts_args, 'hesap_servisi_surumu_uyusmuyor')
        accounts_env = dict(x.split(b'=', 1) for x in Path('/proc/' + str(accounts_pid) + '/environ').read_bytes().split(b'\0') if b'=' in x)
        require(accounts_env.get(b'CORE_CONFIG_FILE') == str(self.accounts).encode(), 'hesap_servisi_ayari_uyusmuyor')


    def pin_update_policy(self, phase, revision):
        require(phase in ('maintenance', 'waiting') and type(revision) is int and revision > 0,
                'bakim_veya_elle_kapali_on_kayit_gerekli')
        previous = getattr(self, '_update_policy', None)
        require(previous is None or previous == (phase, revision), 'guncelleme_sirasinda_oyun_durumu_degisti')
        self._update_policy = (phase, revision)

    def central(self, revision):
        expected = getattr(self, '_update_policy', ('', None))[0]
        reply = command([str(self.node), '--input-type=module', '-e', UPDATE_POLICY_JS,
                         str(self.root), str(self.config_file), str(self.accounts), str(revision), expected])
        policy = json.loads(reply)
        require(policy.get('revision') == revision, 'merkezi_oyun_durumu_degisti')
        self.pin_update_policy(policy.get('phase'), policy.get('revision'))

    def offline_maintenance(self):
        require(prop(self.accounts_unit, 'ActiveState') in ('inactive','failed'), 'hesap_servisi_durmali')
        file = Path(self.accounts_config['database']).resolve()
        with contextlib.closing(sqlite3.connect(file.as_uri() + '?mode=ro', uri=True, timeout=3)) as db:
            row = db.execute('SELECT mode,revision,maintenance_deadline_ms,enabled FROM launch_settings WHERE id=1').fetchone()
        maintenance = row and row[0] == 'maintenance' and type(row[2]) is int and row[2] <= int(time.time()*1000)
        preregistration = row and row[0] == 'closed' and row[3] == 1
        require(maintenance or preregistration, 'merkezi_bakim_veya_elle_kapali_on_kayit_karari_yok')
        self.pin_update_policy('maintenance' if maintenance else 'waiting', row[1])
        return row[1]

    def wait_central(self, revision):
        until = time.monotonic() + 30
        while True:
            try:
                self.central(revision)
                return
            except Refused:
                if time.monotonic() >= until:
                    raise
                time.sleep(.5)

    def stop_services(self):
        service(self.unit, 'stop')
        require(prop(self.unit, 'ActiveState') == 'inactive', 'oyun_servisi_durmadi')
        service(self.accounts_unit, 'stop')
        require(prop(self.accounts_unit, 'ActiveState') == 'inactive', 'hesap_servisi_durmadi')
        # Waiting can admit explicitly authorized testers. Recheck after both
        # services stop so no admission or admin-mode change can race a write.
        self.offline_maintenance()
        self.empty()
        self.same_database()

    def start_services(self, revision):
        service(self.accounts_unit, 'start')
        self.wait_central(revision)
        service(self.unit, 'start')
        self.ready(revision)
        startup_verify(self)
        self.active_binding()

    def empty(self):
        # Source is read-only; no schema/DML/checkpoint or database replacement.
        with contextlib.closing(sqlite3.connect(self.database.as_uri() + '?mode=ro', uri=True, timeout=3)) as db:
            counts = [db.execute('SELECT COUNT(*) FROM game_presence WHERE expires_at_ms>?', (int(time.time()*1000),)).fetchone()[0],
                      db.execute('SELECT COUNT(*) FROM players WHERE last_seen>?', (int(time.time())-40,)).fetchone()[0],
                      db.execute('SELECT COUNT(*) FROM kernel511_admissions').fetchone()[0]]
        require(counts == [0, 0, 0], 'aktif_oyuncu_veya_admin_var_oyundan_cikip_45_saniye_bekleyin')

    def maintenance(self, revision=None):
        panel = local(self.port, PANEL)
        phase = panel.get('phase')
        require(phase in ('maintenance', 'waiting') and not panel.get('configurationPaused') and
                not panel.get('configurationResuming'), 'panelden_bakim_veya_elle_kapali_on_kayit_secin')
        current = panel.get('revision')
        require(type(current) is int and (revision is None or current == revision), 'bakim_karari_degisti')
        if phase == 'maintenance':
            require(panel.get('jobsEnabled') is False and panel.get('approvedRevision') is None,
                    'bakim_henuz_tamamlanmadi')
        else:
            require(type(panel.get('jobsEnabled')) is bool and
                    panel.get('approvedRevision') in (None, current) and
                    (panel.get('jobsEnabled') is False or panel.get('approvedRevision') == current),
                    'on_kayit_cekirdek_durumu_uyusmuyor')
        require(not panel.get('manualReset'), 'dunya_sifirlama_suruyor')
        self.pin_update_policy(phase, current)
        self.central(current)
        self.empty()
        self.same_database()
        return current

    def ready(self, revision):
        end = time.monotonic() + 90
        while time.monotonic() < end:
            self.central(revision)
            try:
                h = local(self.port, '/api/vds-health')
                rows = h.get('channelProcesses', {}).get('channels', [])
                if (h.get('kernel511', {}).get('ready') is True and h.get('durable') is True and
                    h.get('realm', {}).get('dbIdentity') == self.db_identity and len(rows) == 4 and
                    all(r.get('channel') == i+1 and r.get('ready') is True and r.get('online') == 0
                        and r.get('capacity') == 25 for i, r in enumerate(rows))):
                    self.maintenance(revision)
                    return
            except (OSError, ValueError):
                pass
            time.sleep(.5)
        raise Refused('dort_kanal_saglik_kontrolu_basarisiz')

def select_base(live, spec, runtime=None):
    """Exact released R61 or R62 bytes; never trust only a version marker."""
    bases = spec.get('bases')
    require(isinstance(bases, list) and {b.get('name') for b in bases} == {'R61', 'R62'} and len(bases) == 2,
            'desteklenen_taban_listesi_gecersiz')
    current = core_identity(live.root / CORE)
    targets = []
    for base in bases:
        changes = []
        for row in spec['changes']:
            expected = row['beforeByBase']
            require(set(expected) == {'R61', 'R62'}, 'paket_taban_SHA_listesi_gecersiz')
            if expected[base['name']] != row['after']:
                changes.append(dict(row, before=expected[base['name']]))
        selected = dict(spec, packageChanges=spec['changes'], installedBase=base['name'], beforeCore=base['beforeCore'],
                        baseFiles=base['baseFiles'], changes=changes)
        if runtime:
            before_rows = runtime['coreRows'] if base['name'] == 'R62' else runtime['beforeCoreRows']
            selected = dict(selected, runtimeCoreRows=runtime['coreRows'], runtimeBeforeCoreRows=before_rows, _runtimePlan=runtime)
        selected = resolve_core_identity(live, selected)
        if current == selected['beforeCore']:
            require(runtime is not None and runtime['already'] == (base['name'] == 'R62'),
                    'kaynak_ve_istemci_tabanlari_uyusmuyor')
            return selected
        if current == selected['afterCore']:
            targets.append(selected)
    require(bool(targets), 'kod_dogrulanmis_R61_veya_R62_ile_ayni_degil:' + current)
    require(len({t['afterCore'] for t in targets}) == 1, 'paket_hedef_kimligi_uyusmuyor')
    return targets[0]  # Already installed: only verify; never apply baseline bytes.

def canonical_operations(data, spec):
    pattern = rb"export const CANDIDATE='([0-9a-f]{64})';"
    matches = list(re.finditer(pattern, data))
    require(len(matches) == 1 and matches[0][1].decode() == spec['beforeCore'],
            'kurulu_taban_kurucu_kimligi_uyusmuyor')
    return re.sub(pattern, ("export const CANDIDATE='" + spec['packagedBeforeCore'] + "';").encode(), data)

def prepare(live, archive, spec):
    spec = resolve_core_identity(live, spec)
    root, state = live.root, live.state
    require(core_identity(root / CORE) == spec['beforeCore'], 'kod_dogrulanmis_taban_ile_ayni_degil')
    # A stale release manifest cannot authorize older bytes over live R23.
    for name, row in spec['baseFiles'].items():
        target = member(root, name)
        # Read-only source verification: a hard link is a regular file too.
        # Payload/metadata targets and databases retain the single-link rule.
        regular(target, allow_hardlinks=True)
        data = target.read_bytes()
        if name == HTTP_PROOF and spec.get('runtimeBeforeCoreRows'):
            row = dict(spec['runtimeBeforeCoreRows'][0])
        if name == OPS:
            # R23 bound CANDIDATE to the verified live C-file-inclusive identity.
            # Normalize only that exact assignment to the packaged identity;
            # every other byte remains covered by the pinned R23 SHA256.
            data = canonical_operations(data, spec)
        require(len(data) == row['bytes'] and digest(data) == row['sha256'], 'canli_taban_dosyasi_degismis:' + name)
    updates = {}
    for row in spec['changes']:
        target = member(root, row['path'])
        if row['before'] is None:
            require(not target.exists(), 'yeni_dosya_zaten_var:' + row['path'])
        else:
            regular(target)
            require(digest(target.read_bytes()) == row['before'], 'dosya_degismis:' + row['path'])
        data = archive.read('payload/' + row['path'])
        require(len(data) == row['bytes'] and digest(data) == row['after'], 'paket_dosyasi_bozuk:' + row['path'])
        updates[target] = data
    runtime = spec.get('_runtimePlan')
    if runtime:
        if runtime['already']:
            # R62 already contains the byte-identical R63 client. Its complete
            # inverse/runtime proof was verified above; no HTTP/media rewrite.
            require(spec['installedBase'] == 'R62', 'runtime_ve_kaynak_tabani_uyusmuyor')
        else:
            for target, data in runtime['updates'].items():
                if target.exists():
                    regular(target, allow_hardlinks=True)
                updates[target] = data
    operations = member(root, OPS)
    regular(operations)  # This metadata-bound source file will be replaced.
    require(digest(canonical_operations(operations.read_bytes(), spec)) == spec['baseFiles'][OPS]['sha256'], 'kurucu_kodu_degismis')
    source = operations.read_text()
    candidate = re.search(r"export const CANDIDATE='([0-9a-f]{64})';", source)
    require(candidate is not None, 'kurucu_kimligi_bulunamadi')
    mf = member(root, 'release-manifest.json')
    regular(mf)
    manifest = read_json(mf)
    known_candidates = {candidate[1], spec['beforeCore'], spec['packagedBeforeCore']}
    require(manifest.get('runtimeSha256') in known_candidates and state.get('candidate') in known_candidates, 'mevcut_kurucu_manifest_state_uyusmuyor')
    require(manifest.get('baselineSha256') == spec['nativeBaseline'], 'native_taban_uyusmazligi')
    updates[operations] = source.replace(candidate.group(0), "export const CANDIDATE='" + spec['afterCore'] + "';").encode()
    seen = set()
    scan_started, scan_bytes = time.monotonic(), 0
    for row in manifest['files']:
        name = row['path']
        require(name not in seen, 'tekrarli_manifest_dosyasi')
        seen.add(name)
        target = member(root, name)
        regular(target, allow_hardlinks=True)
        data = target.read_bytes()
        scan_bytes += len(data)
        base = spec['baseFiles'].get(name)
        # Only pinned R22+R23 bytes can reconcile metadata, never an old payload.
        require((digest(data) == row['sha256'] and len(data) == row['bytes']) or
                (base and digest(data) == base['sha256'] and len(data) == base['bytes']), 'manifest_dosyasi_degismis:' + name)
        data = updates.get(target, data)
        row.update(bytes=update_bytes(data), sha256=update_digest(data))
    live._manifest_verification_sample = {'seconds': time.monotonic() - scan_started,
                                         'bytes': scan_bytes, 'files': len(seen)}
    for target, data in updates.items():
        name = target.relative_to(root).as_posix()
        if name not in seen:
            manifest['files'].append({'path': name, 'bytes': update_bytes(data), 'sha256': update_digest(data)})
    for row in manifest.get('symlinks', []):
        name, target = row['path'], row['target']
        require(not Path(name).is_absolute() and '..' not in Path(name).parts and not Path(target).is_absolute(), 'manifest_bag_yolu')
        link = root / name
        require(link.is_symlink() and os.readlink(link) == target and link.resolve().is_relative_to(root), 'manifest_bagi_degismis')
    manifest['runtimeSha256'] = spec['afterCore']
    updates[mf] = encoded(manifest)
    next_state = dict(state, candidate=spec['afterCore'])
    next_state['hotfixR63_RECOVERY'] = {'baseline': spec['sourceZip'], 'from': spec['installedBase'], 'scope': 'r63-recovery', 'inPlace': True}
    if runtime:
        next_state['hotfixR63_RECOVERY']['clientNamespace'] = runtime['namespace']
    updates[STATE] = encoded(next_state)
    current_config = read_json(live.config_file)
    require(current_config == live.config, 'kurulum_oncesi_config_degisti')
    next_config = dict(current_config, environment={**INSTALL_FLAGS, **current_config.get('environment', {}), **R62_INSTALL_FLAGS})
    updates[live.config_file] = encoded(next_config)
    updates.update(startup_prepare(live, spec))
    require_authorized_updates(live, updates, runtime)
    # Exact payload lengths and SHA256 replace arbitrary package size caps.
    # Runtime/manifest sizes remain included in the preflight disk budget.
    return updates

def backup(root, updates, unit, revision, runtime=None):
    private_backups()
    directory = BACKUPS / (datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8])
    directory.mkdir(mode=0o700)
    rows = []
    for n, (file, data) in enumerate(updates.items()):
        old = file.read_bytes() if file.exists() else None
        s = regular(file, allow_hardlinks=bool(runtime and file in runtime['updates'])) if old is not None else regular(root / (CORE + 'permanent-coordinator.mjs'))
        row = {'file': str(file), 'backup': str(n), 'before': digest(old) if old is not None else None,
               'after': update_digest(data), 'mode': stat.S_IMODE(s.st_mode), 'uid': s.st_uid, 'gid': s.st_gid}
        if file == startup_file(unit):
            row.update(mode=0o644, uid=0, gid=0)
        if isinstance(data, HardLink):
            row['hardlinkSource'] = str(data.source)
        if old is not None:
            atomic(directory / str(n), old)
        rows.append(row)
    record = {'root': str(root), 'unit': unit, 'revision': revision, 'status': 'prepared', 'files': rows}
    if runtime:
        record['runtimeNamespace'] = runtime['namespace']
    directories = set()
    for file in updates:
        if file in (STATE, LIVE_CONFIG_FILE, startup_file(unit)):
            continue
        parent = file.parent
        while parent != root and not parent.exists():
            require(parent.is_relative_to(root), 'yedek_dizin_kapsami')
            directories.add(str(parent))
            parent = parent.parent
    record['directories'] = sorted(directories, key=lambda p: (len(Path(p).parts), p))
    atomic(directory / 'journal.json', encoded(record))
    return directory, record

def installation_window(now=None):
    # R34: hourly backup has been removed. The daily 05:00 backup and this
    # installer share scheduled_backup_lock; no wall-clock minute is forbidden.
    return time.monotonic() + 1200

def database_space(live, folder):
    with contextlib.closing(sqlite3.connect(live.database.as_uri() + '?mode=ro', uri=True, timeout=3)) as db:
        size = db.execute('PRAGMA page_count').fetchone()[0] * db.execute('PRAGMA page_size').fetchone()[0]
    v = os.statvfs(folder)
    require(v.f_bavail * v.f_frsize >= size + DB_RESERVE, 'DB_yedegi_ve_512MiB_pay_icin_bos_alan_yetersiz')
    return size

@contextlib.contextmanager
def scheduled_backup_lock(live):
    # Same flock used by the supplied native backup.mjs. Never remove this file.
    directory = live.database.parent / 'backups'
    require(directory.is_dir() and not directory.is_symlink(), 'gunluk_yedek_dizini_bulunamadi')
    file = directory / '.backup.lock'
    created = False
    try:
        fd = os.open(file, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        created = True
    except FileExistsError:
        fd = os.open(file, os.O_RDWR | os.O_NOFOLLOW)
    try:
        if created:
            s = directory.stat()
            os.fchown(fd, s.st_uid, s.st_gid)
        require(stat.S_ISREG(os.fstat(fd).st_mode) and os.fstat(fd).st_nlink == 1, 'gunluk_yedek_kilidi_gecersiz')
        until = time.monotonic() + 1200
        last_report = None
        while True:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                now = time.monotonic()
                require(now < until, 'gunluk_yedek_bekleme_suresi_asildi_servisler_durdurulmadi')
                if last_report is None or now - last_report >= 5:
                    print('Devam eden günlük yedek bekleniyor; servisler henüz durdurulmadı. '
                          'Bekleme sınırına kalan: ' + str(int(until - now)) + ' sn.', flush=True)
                    last_report = now
                time.sleep(.5)
        yield
    finally:
        os.close(fd)

def verify_database_backup(target, deadline):
    """Check every backup page; distinguish our deadline from SQLite failures."""
    started = time.monotonic()
    last_report = [started]
    expired = [False]
    print('Yedek sağlamlığı kontrol ediliyor (quick_check); kalan süre: ' +
          str(max(0, int(deadline - started))) + ' sn.', flush=True)
    def progress():
        now = time.monotonic()
        if now >= deadline:
            expired[0] = True
            return 1
        if now - last_report[0] >= 5:
            print('Yedek sağlamlık kontrolü sürüyor: ' + str(int(now - started)) +
                  ' sn; kalan süre: ' + str(int(deadline - now)) + ' sn.', flush=True)
            last_report[0] = now
        return 0
    target.set_progress_handler(progress, 10000)
    try:
        require(not progress(), 'DB_yedegi_dogrulama_sure_siniri')
        result = target.execute('PRAGMA quick_check').fetchall()
        require(time.monotonic() < deadline, 'DB_yedegi_dogrulama_sure_siniri')
        require(result == [('ok',)], 'DB_yedegi_dogrulanamadi')
    except sqlite3.DatabaseError as error:
        if expired[0]:
            raise Refused('DB_yedegi_dogrulama_sure_siniri') from None
        code = getattr(error, 'sqlite_errorcode', None)
        name = getattr(error, 'sqlite_errorname', 'SQLITE_UNKNOWN')
        # Never expose SQL text, table/row contents, account data or raw errors.
        code = str(code) if type(code) is int else 'unknown'
        name = name if isinstance(name, str) and re.fullmatch(r'SQLITE_[A-Z0-9_]+', name) else 'SQLITE_UNKNOWN'
        raise Refused('DB_yedegi_dogrulama_SQLite_hatasi:kod=' + code + ':ad=' + name) from None
    finally:
        target.set_progress_handler(None, 0)
    return round(time.monotonic() - started, 3)

def backup_database(live, directory, record, deadline):
    """SQLite backup API includes committed WAL. Never copy the DB with cp."""
    database_space(live, directory)
    partial = directory / 'game.sqlite.partial'
    final = directory / 'game.sqlite'
    require(not final.exists(), 'kurulum_DB_yedegi_zaten_var')
    fd = os.open(partial, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    os.close(fd)
    last_report = [0.0]
    def progress(status, remaining, total, force=False):
        require(time.monotonic() < deadline, 'DB_yedegi_kopyalama_sure_siniri')
        v = os.statvfs(directory)
        require(v.f_bavail * v.f_frsize >= DB_RESERVE // 2, 'DB_yedegi_sirasinda_bos_alan_azaldi')
        if force or time.monotonic() - last_report[0] >= 5:
            print('Kurulum DB yedeği: %' + str(int(100 * (total - remaining) / max(1, total))), flush=True)
            last_report[0] = time.monotonic()
    try:
        with contextlib.closing(sqlite3.connect(live.database.as_uri() + '?mode=ro', uri=True, timeout=3)) as source, contextlib.closing(sqlite3.connect(partial)) as target:
            started = time.monotonic()
            source.backup(target, pages=256, progress=progress, sleep=.05)
            progress(0, 0, 1, force=True)
            copy_seconds = round(time.monotonic() - started, 3)
            target.execute('PRAGMA journal_mode=DELETE')
            verify_seconds = verify_database_backup(target, deadline)
        require(time.monotonic() < deadline, 'DB_yedegi_dogrulama_sure_siniri')
        with partial.open('rb') as stream:
            os.fsync(stream.fileno())
        live.same_database()
        os.replace(partial, final)
        sync_dir(directory)
        s = regular(final)
        record['databaseBackup'] = {'file': 'game.sqlite', 'status': 'verified', 'quickCheck': 'ok',
                                    'dev': s.st_dev, 'ino': s.st_ino, 'bytes': s.st_size,
                                    'copySeconds': copy_seconds, 'verifySeconds': verify_seconds}
        atomic(directory / 'journal.json', encoded(record))
        print('Kurulum DB yedeği doğrulandı (quick_check=ok).', flush=True)
    finally:
        for suffix in ('', '-journal', '-wal', '-shm'):
            (directory / ('game.sqlite.partial' + suffix)).unlink(missing_ok=True)

def remove_own_database_backup(directory, record):
    row = record.get('databaseBackup')
    if not row or row.get('status') == 'deleted':
        return
    require(row.get('file') == 'game.sqlite' and row.get('status') == 'verified', 'DB_yedegi_silme_kapsami')
    file = directory / 'game.sqlite'
    if file.exists():
        s = regular(file)
        require((s.st_dev, s.st_ino, s.st_size) == (row['dev'], row['ino'], row['bytes']), 'kurulum_DB_yedegi_disaridan_degisti')
        file.unlink()
        sync_dir(directory)
    row['status'] = 'deleted'
    atomic(directory / 'journal.json', encoded(record))

def latest_backup(live):
    matches = []
    for file in BACKUPS.glob('*/journal.json'):
        record = read_json(file)
        if record.get('root') == str(live.root) and record.get('unit') == live.unit and record.get('status') in ('prepared', 'writing', 'installed'):
            matches.append(file.parent)
    require(bool(matches), 'geri_alinacak_R63_RECOVERY_kurulumu_yok')
    return max(matches, key=lambda p: p.name)

def restore(directory, record, *, validate_only=False):
    root = Path(record['root']).resolve()
    allowed = {str(root / p) for p in PATCH_FILES + [OPS, 'release-manifest.json']}
    allowed.add(str(STATE))
    allowed.add(str(startup_directory(record['unit'])))
    if LIVE_CONFIG_FILE is not None:
        allowed.add(str(LIVE_CONFIG_FILE))
    namespace = record.get('runtimeNamespace')
    if namespace:
        require(re.fullmatch(r'core511-[a-f0-9]{16}', namespace), 'geri_donus_namespace')
        for row in record['files']:
            file = Path(row['file'])
            if file.is_relative_to(root) and runtime_file_allowed(file.relative_to(root).as_posix(), namespace):
                allowed.add(str(file))
    for row in record['files']:
        file = Path(row['file'])
        require(re.fullmatch(r'[0-9]+', row['backup']) is not None, 'yedek_dosya_yolu')
        require(str(file) in allowed and not file.is_symlink(), 'geri_donus_kapsami')
        current = digest(file.read_bytes()) if file.exists() else None
        accepted = [row['before'], row['after']]
        if file == LIVE_CONFIG_FILE:
            accepted.extend(record.get('approvedConfigHashes', []))
        if file == startup_file(record['unit']):
            accepted.extend(record.get('approvedStartupHashes', []))
        require(current in accepted, 'geri_donus_dosyasi_disaridan_degisti:' + file.name)
        if row['before'] is not None:
            regular(directory / row['backup'])
            data = (directory / row['backup']).read_bytes()
            require(digest(data) == row['before'], 'geri_donus_yedegi_bozuk')
    if validate_only:
        return
    for row in reversed(record['files']):
        file = Path(row['file'])
        if row['before'] is None:
            if file.exists():
                file.unlink()
                sync_dir(file.parent)
        else:
            atomic(file, (directory / row['backup']).read_bytes(), row['mode'], row['uid'], row['gid'])
    for name in reversed(record.get('directories', [])):
        folder = Path(name)
        require(folder.is_relative_to(root) and folder != root and not folder.is_symlink(), 'geri_donus_dizini_kapsami')
        if folder.exists():
            try:
                folder.rmdir()
                sync_dir(folder.parent)
            except OSError as error:
                if error.errno not in (errno.ENOTEMPTY, errno.EEXIST):
                    raise

def verify_installed(live, spec):
    startup_verify(live)
    spec = resolve_core_identity(live, spec)
    require(core_identity(live.root / CORE) == spec['afterCore'], 'yazilan_kod_kimligi_uyusmuyor')
    for row in spec['changes']:
        target = member(live.root, row['path'])
        regular(target)
        data = target.read_bytes()
        require(len(data) == row['bytes'] and digest(data) == row['after'], 'yazilan_payload_SHA256_uyusmuyor:' + row['path'])
    for target, data in spec.get('_runtimePlan', {}).get('updates', {}).items():
        regular(target, allow_hardlinks=True)
        require(target.stat().st_size == update_bytes(data) and digest(target.read_bytes()) == update_digest(data),
                'yazilan_runtime_SHA256_uyusmuyor:' + target.name)
    require(read_json(STATE).get('candidate') == spec['afterCore'], 'yazilan_state_kimligi_uyusmuyor')
    js = "import {pathToFileURL} from 'node:url';const root=process.argv[1];const {verifyPackage}=await import(pathToFileURL(root+'/core511-source/scripts/delivery511/install-operations.mjs'));verifyPackage(root);"
    budget = verification_budget(read_json(member(live.root, 'release-manifest.json')),
                                 getattr(live, '_manifest_verification_sample', None))
    print('Kurulu dosyaların tamamı doğrulanıyor (ölçülen tarama/boyuta göre en fazla ' + str(budget) + ' sn)...', flush=True)
    verify_command([str(live.node), '--input-type=module', '-e', js, str(live.root)], budget)

def private_backups():
    require(not BACKUPS.is_symlink(), 'yedek_dizini_simgesel_bag')
    BACKUPS.mkdir(mode=0o700, parents=True, exist_ok=True)
    st = BACKUPS.stat()
    require(st.st_uid == 0 and stat.S_IMODE(st.st_mode) == 0o700, 'yedek_dizini_izinleri')

@contextlib.contextmanager
def install_lock():
    private_backups()
    # Share the existing R23 installer lock; keep patch rollback journals separate.
    lock_directory = STATE.parent / 'r23-backups'
    require(not lock_directory.is_symlink(), 'kurulum_kilit_dizini_simgesel_bag')
    lock_directory.mkdir(mode=0o700, exist_ok=True)
    require(lock_directory.stat().st_uid == 0 and stat.S_IMODE(lock_directory.stat().st_mode) == 0o700, 'kurulum_kilit_dizini_izinleri')
    fd = os.open(lock_directory / 'install.lock', os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        require(os.fstat(fd).st_nlink == 1, 'kilit_dosyasi')
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        os.close(fd)

def payload_allowed(name):
    return name in ('core511-source/scripts/core511/abandoned-normal.mjs', 'core511-source/scripts/core511/action-writer.mjs', 'core511-source/scripts/core511/adventure-service.mjs', 'core511-source/scripts/core511/azrail-r62.mjs', 'core511-source/scripts/core511/compose-native-http.mjs', 'core511-source/scripts/core511/generated/client/auth-portal-core511-0f0e6524ee433608.js', 'core511-source/scripts/core511/generated/client/azrail-chest-r62.webp', 'core511-source/scripts/core511/generated/client/core511-gameplay-r62-a97877c1988dff73.js', 'core511-source/scripts/core511/generated/client/core511-tower-r62-d25862551937995b.js', 'core511-source/scripts/core511/generated/client/game-client-core511-4b42be76aa93f01c.js', 'core511-source/scripts/core511/generated/native-client-proof.json', 'core511-source/scripts/core511/heartbeat-jobs.mjs', 'core511-source/scripts/core511/heartbeat-maintenance-reader.mjs', 'core511-source/scripts/core511/mount-client-r49.mjs', 'core511-source/scripts/core511/native-http-bindings.mjs', 'core511-source/scripts/core511/patch-azrail-market-r62.mjs', 'core511-source/scripts/core511/patch-responsive-bot-r62.mjs', 'core511-source/scripts/core511/polish-client-r62.mjs', 'core511-source/scripts/core511/read-worker.mjs', 'core511-source/scripts/core511/reward-recovery-r52.mjs', 'core511-source/scripts/core511/reward-recovery-r62.mjs', 'core511-source/scripts/core511/shared-world-jobs.mjs', 'core511-source/scripts/core511/tower-rules.mjs')

def verify_restored(live):
    manifest = read_json(member(live.root, 'release-manifest.json'))
    identity = core_identity(live.root / CORE)
    require(manifest.get('runtimeSha256') == identity and read_json(STATE).get('candidate') == identity,
            'geri_alinan_kod_kimligi_uyusmuyor')
    js = "import {pathToFileURL} from 'node:url';const root=process.argv[1];const {verifyPackage}=await import(pathToFileURL(root+'/core511-source/scripts/delivery511/install-operations.mjs'));verifyPackage(root);"
    verify_command([str(live.node), '--input-type=module', '-e', js, str(live.root)], verification_budget(manifest))

BOOL_FLAGS = ('CORE511_STAGE_TIMING', 'CORE511_LARGE_LOCAL_AOE', 'CORE511_ATTACK_ROW_BATCH', 'CORE511_AGGRO_SCOPE_CACHE', 'CORE511_INPUT_WORK_BUDGET', 'CORE511_COMBAT_SIZE_ACCOUNTING', 'CORE511_LOCAL_DEATH_BATCH', 'CORE511_CLAIM_HISTORY', 'CORE511_COLD_ROW_COPY', 'CORE511_MIXED_PARTICIPANT_INDEX', 'CORE511_NATIVE_REWARD_WORKSET', 'CORE511_ACTOR_SECTION_REUSE', 'CORE511_REWARD_RECOVERY_SCHEDULER', 'CORE511_COMPACT_COMBAT_IPC', 'CORE511_RETALIATION_DUE_QUEUE', 'CORE511_AGGRO_SPATIAL_INDEX', 'CORE511_MIXED_PARTICIPANT_FASTPATH', 'CORE511_MEMORY_COMBAT', 'CORE511_REWARD_GROUP_COMMIT', 'CORE511_NATIVE_ENGAGEMENT', 'CORE511_ATTACK_INDEX', 'CORE511_TICK_SLICES', 'CORE511_CONTROL_COALESCE', 'CORE511_BOUNDED_CLAIM_R53', 'CORE511_REWARD_PEER_CACHE_R531', 'CORE511_REWARD_EMPTY_XP_R531', 'CORE511_QUARANTINE_DRAIN_R531', 'CORE511_CHECKPOINT_SQL_BATCH_R531', 'CORE511_EARLY_COMBAT_REPLY_R531', 'CORE511_EVENT_WIRE_CACHE_R531', 'CORE511_CHECKPOINT_DEADLINES_R531', 'CORE511_SCOPED_POTION_CHECKPOINT_R531', 'CORE511_EGRESS_PACING_R531', 'CORE511_JOIN_CHECKPOINT_BOUND_R531', 'CORE511_TICK_HOLD_R531', 'CORE511_RECOVERY_CAUSE_R532', 'CORE511_SHARED_ABORT_EPOCH_R532', 'CORE511_WORLD_CLOCK_DEFER_R533', 'CORE511_SHARED_STOPPED_R533', 'CORE511_WRITER_AUDIT_R533', 'CORE511_REWARD_WORKER_R533', 'CORE511_SHARED_REJECTION_R533', 'CORE511_REWARD_ASYNC_REPLY_R54', 'CORE511_REWARD_IN_CODE_R54', 'CORE511_REWARD_IDLE_COST_R54', 'CORE511_R55_ENHANCEMENT_DURABILITY', 'CORE511_R55_ADMIN_MATERIALS', 'CORE511_R55_MOUNT_STATE', 'CORE511_R55_MOUNT_RENDER', 'CORE511_R55_MOUNT_DROPS', 'CORE511_R55_MOBILE_EXPERIENCE', 'CORE511_R55_DUNGEON_PROGRESS', 'CORE511_R56_REFRESH_READ_PIPELINE', 'CORE511_R56_AUDIT_GATE', 'CORE511_R56_NONLETHAL_REWARDS', 'CORE511_R56_REWARD_SLICE', 'CORE511_R56_BULK_HITS', 'CORE511_R56_RESOURCE_BATCH', 'CORE511_R56_XP_GROUP', 'CORE511_R56_REWARD_WARMUP', 'CORE511_R56_CLAIM_SCOPED_DRAIN', 'CORE511_R56_CLAIM_ACTOR_JOIN', 'CORE511_R56_COMPLETED_CLAIM', 'CORE511_R56_SMALL_GROUP_EAGER', 'CORE511_R56_WORKER_WINDOW', 'CORE511_R56_REWARD_READ_CACHE', 'CORE511_R56_MIST_CONFIG_CACHE', 'CORE511_R56_POTION_ACTOR_JOIN', 'CORE511_R56_SECTION_READ_GROUP', 'CORE511_R56_SHORT_WRITE_WINDOW', 'CORE511_R56_SMALL_REWARD_COMPLETE', 'CORE511_R57_COMMIT_SECTIONS', 'CORE511_R57_CHECKPOINT_WIRE', 'CORE511_R57_PORTAL_SECTIONS', 'CORE511_R57_GROUP_FAIRNESS', 'CORE511_R57_ITEM_REFRESH', 'CORE511_R57_REPLY_WIRE', 'CORE511_R57_WEAPON_COUNTER', 'CORE511_R57_CHECKPOINT_SCHEDULE', 'CORE511_R57_CLEAN_JOIN', 'CORE511_R57_JOINED_ACK', 'CORE511_R57_AUTHORITY_READ', 'CORE511_R57_COMBAT_CONTINUATION', 'CORE511_R57_DEATH_BATCH', 'CORE511_R57_COMPLETE_LOCAL_REWARDS', 'CORE511_R58_MOUNT_COMBAT', 'CORE511_R58_MOUNT_RENDER', 'CORE511_R58_DUNGEON_WORLD_CONTROLS', 'CORE511_R58_ADMIN_ACCESSORIES', 'CORE511_R58_MIST_LEVEL_REWARDS', 'CORE511_R59_CASTLE', 'CORE511_R60_MOUNT_MATERIALS', 'CORE511_R60_MOUNT_STATE', 'CORE511_R60_MOUNT_RENDER', 'CORE511_R60_CASTLE_NOTICES', 'CORE511_R60_REWARD_SECTIONS', 'CORE511_R61_REMOTE_AUDIO', 'CORE511_R61_CASTLE_TRAVEL', 'CORE511_R61_COMBAT_CONTINUATION', 'CORE511_R61_MIXED_BATCH', 'CORE511_R61_BATCH_ACTORS', 'CORE511_R61_BATCH_SNAPSHOT', 'CORE511_R61_LOOT_PROFILE_CACHE', 'CORE511_R61_POTION_STATEMENTS', 'CORE511_R61_POTION_BATCH', 'CORE511_R61_RESOURCE_FAIRNESS', 'CORE511_R61_EAGER_REWARD', 'CORE511_R61_STATEMENT_BOOT', 'CORE511_R61_EAGER_CHANNELS', 'CORE511_R61_BATCH_REFRESH', 'CORE511_R61_COMPACT_SECTIONS', 'CORE511_R62_AZRAIL', 'CORE511_R62_CHEST_MARKET', 'CORE511_R62_INVENTORY', 'CORE511_R62_VERIFICATION', 'CORE511_R62_REWARD_RECOVERY')
INSTALL_FLAGS = {'CORE511_STAGE_TIMING': '0', 'CORE511_LARGE_LOCAL_AOE': '1', 'CORE511_ATTACK_ROW_BATCH': '1', 'CORE511_AGGRO_SCOPE_CACHE': '1', 'CORE511_INPUT_WORK_BUDGET': '1', 'CORE511_COMBAT_SIZE_ACCOUNTING': '1', 'CORE511_LOCAL_DEATH_BATCH': '1', 'CORE511_CLAIM_HISTORY': '1', 'CORE511_COLD_ROW_COPY': '1', 'CORE511_MIXED_PARTICIPANT_INDEX': '1', 'CORE511_NATIVE_REWARD_WORKSET': '1', 'CORE511_ACTOR_SECTION_REUSE': '1', 'CORE511_REWARD_RECOVERY_SCHEDULER': '1', 'CORE511_COMPACT_COMBAT_IPC': '1', 'CORE511_RETALIATION_DUE_QUEUE': '1', 'CORE511_AGGRO_SPATIAL_INDEX': '1', 'CORE511_MIXED_PARTICIPANT_FASTPATH': '1', 'CORE511_MEMORY_COMBAT': '1', 'CORE511_REWARD_GROUP_COMMIT': '1', 'CORE511_NATIVE_ENGAGEMENT': '1', 'CORE511_ATTACK_INDEX': '1', 'CORE511_TICK_SLICES': '1', 'CORE511_CONTROL_COALESCE': '1', 'CORE511_BOUNDED_CLAIM_R53': '1', 'CORE511_REWARD_PEER_CACHE_R531': '1', 'CORE511_REWARD_EMPTY_XP_R531': '1', 'CORE511_QUARANTINE_DRAIN_R531': '1', 'CORE511_CHECKPOINT_SQL_BATCH_R531': '1', 'CORE511_EARLY_COMBAT_REPLY_R531': '1', 'CORE511_EVENT_WIRE_CACHE_R531': '1', 'CORE511_CHECKPOINT_DEADLINES_R531': '1', 'CORE511_SCOPED_POTION_CHECKPOINT_R531': '1', 'CORE511_EGRESS_PACING_R531': '1', 'CORE511_JOIN_CHECKPOINT_BOUND_R531': '1', 'CORE511_TICK_HOLD_R531': '1', 'CORE511_RECOVERY_CAUSE_R532': '1', 'CORE511_SHARED_ABORT_EPOCH_R532': '1', 'CORE511_WORLD_CLOCK_DEFER_R533': '1', 'CORE511_SHARED_STOPPED_R533': '1', 'CORE511_WRITER_AUDIT_R533': '1', 'CORE511_REWARD_WORKER_R533': '1', 'CORE511_SHARED_REJECTION_R533': '1', 'CORE511_REWARD_ASYNC_REPLY_R54': '1', 'CORE511_REWARD_IN_CODE_R54': '1', 'CORE511_REWARD_IDLE_COST_R54': '1', 'CORE511_R55_ENHANCEMENT_DURABILITY': '1', 'CORE511_R55_ADMIN_MATERIALS': '1', 'CORE511_R55_MOUNT_STATE': '1', 'CORE511_R55_MOUNT_RENDER': '1', 'CORE511_R55_MOUNT_DROPS': '1', 'CORE511_R55_MOBILE_EXPERIENCE': '1', 'CORE511_R55_DUNGEON_PROGRESS': '1', 'CORE511_R56_REFRESH_READ_PIPELINE': '0', 'CORE511_R56_AUDIT_GATE': '0', 'CORE511_R56_NONLETHAL_REWARDS': '1', 'CORE511_R56_REWARD_SLICE': '1', 'CORE511_R56_BULK_HITS': '1', 'CORE511_R56_RESOURCE_BATCH': '1', 'CORE511_R56_XP_GROUP': '1', 'CORE511_R56_REWARD_WARMUP': '1', 'CORE511_R56_CLAIM_SCOPED_DRAIN': '0', 'CORE511_R56_CLAIM_ACTOR_JOIN': '1', 'CORE511_R56_COMPLETED_CLAIM': '1', 'CORE511_R56_SMALL_GROUP_EAGER': '1', 'CORE511_R56_WORKER_WINDOW': '1', 'CORE511_R56_REWARD_READ_CACHE': '1', 'CORE511_R56_MIST_CONFIG_CACHE': '1', 'CORE511_R56_POTION_ACTOR_JOIN': '1', 'CORE511_R56_SECTION_READ_GROUP': '1', 'CORE511_R56_SHORT_WRITE_WINDOW': '1', 'CORE511_R56_SMALL_REWARD_COMPLETE': '1', 'CORE511_R57_COMMIT_SECTIONS': '1', 'CORE511_R57_CHECKPOINT_WIRE': '1', 'CORE511_R57_PORTAL_SECTIONS': '1', 'CORE511_R57_GROUP_FAIRNESS': '1', 'CORE511_R57_ITEM_REFRESH': '1', 'CORE511_R57_REPLY_WIRE': '1', 'CORE511_R57_WEAPON_COUNTER': '1', 'CORE511_R57_CHECKPOINT_SCHEDULE': '1', 'CORE511_R57_CLEAN_JOIN': '1', 'CORE511_R57_JOINED_ACK': '1', 'CORE511_R57_AUTHORITY_READ': '1', 'CORE511_R57_COMBAT_CONTINUATION': '1', 'CORE511_R57_DEATH_BATCH': '1', 'CORE511_R57_COMPLETE_LOCAL_REWARDS': '1', 'CORE511_R58_MOUNT_COMBAT': '1', 'CORE511_R58_MOUNT_RENDER': '1', 'CORE511_R58_DUNGEON_WORLD_CONTROLS': '1', 'CORE511_R58_ADMIN_ACCESSORIES': '1', 'CORE511_R58_MIST_LEVEL_REWARDS': '1', 'CORE511_R59_CASTLE': '1', 'CORE511_R60_MOUNT_MATERIALS': '1', 'CORE511_R60_MOUNT_STATE': '1', 'CORE511_R60_MOUNT_RENDER': '1', 'CORE511_R60_CASTLE_NOTICES': '1', 'CORE511_R60_REWARD_SECTIONS': '1', 'CORE511_R61_REMOTE_AUDIO': '1', 'CORE511_R61_CASTLE_TRAVEL': '1', 'CORE511_R61_COMBAT_CONTINUATION': '1', 'CORE511_R61_MIXED_BATCH': '1', 'CORE511_R61_BATCH_ACTORS': '1', 'CORE511_R61_BATCH_SNAPSHOT': '1', 'CORE511_R61_LOOT_PROFILE_CACHE': '1', 'CORE511_R61_POTION_STATEMENTS': '1', 'CORE511_R61_POTION_BATCH': '1', 'CORE511_R61_RESOURCE_FAIRNESS': '1', 'CORE511_R61_EAGER_REWARD': '1', 'CORE511_R61_STATEMENT_BOOT': '1', 'CORE511_R61_EAGER_CHANNELS': '1', 'CORE511_R61_BATCH_REFRESH': '1', 'CORE511_R61_COMPACT_SECTIONS': '1', 'CORE511_R62_AZRAIL': '1', 'CORE511_R62_CHEST_MARKET': '1', 'CORE511_R62_INVENTORY': '1', 'CORE511_R62_VERIFICATION': '1', 'CORE511_R62_REWARD_RECOVERY': '1'}
R62_INSTALL_FLAGS = {'CORE511_R62_AZRAIL': '1', 'CORE511_R62_CHEST_MARKET': '1', 'CORE511_R62_INVENTORY': '1', 'CORE511_R62_VERIFICATION': '1', 'CORE511_R62_REWARD_RECOVERY': '1'}
RUNTIME_FLAGS = dict(INSTALL_FLAGS)

def parse_flags(values):
    result = {}
    for text in values:
        name, sep, value = text.partition('=')
        require(sep and name in INSTALL_FLAGS, 'bilinmeyen_anahtar')
        require(name not in result, 'tekrarli_anahtar:' + name)
        require(value in ('0','1'), 'anahtar_degeri_0_veya_1:' + name)
        result[name] = value
    require(result, 'anahtar_listesi_bos')
    return result

def print_flags(live):
    env = read_json(live.config_file).get('environment', {})
    print(json.dumps({'anahtarlar': {name: str(env.get(name,RUNTIME_FLAGS[name])) for name in INSTALL_FLAGS},
                      'kurulumVarsayilanlari': INSTALL_FLAGS},ensure_ascii=False,indent=2))

def set_flags(live, values, revision, archive, spec):
    requested = parse_flags(values)
    with install_lock(), scheduled_backup_lock(live):
        live.active_binding()
        live.maintenance(revision)
        directory = latest_backup(live)
        record = read_json(directory/'journal.json')
        require(record['status']=='installed', 'yarim_kurulum_var_once_rollback')
        row = next((r for r in record['files'] if r['file']==str(live.config_file)), None)
        require(row is not None, 'kurulum_ayar_yedegi_yok')
        st = regular(live.config_file)
        before = live.config_file.read_bytes()
        require(digest(before)==row['after'], 'config_disaridan_degisti')
        config = json.loads(before)
        after = encoded(dict(config,environment={**config.get('environment',{}),**requested}))
        if before == after:
            print_flags(live)
            return
        # Record the two authorized config digests before touching the file.
        # A killed flag command can still use --rollback-latest safely.
        startup_target, startup_row, startup_before, startup_after = startup_flag_change(live, record, json.loads(after))
        record['approvedConfigHashes'] = [digest(before),digest(after)]
        atomic(directory/'journal.json',encoded(record))
        stopped = False
        try:
            stopped = True
            live.stop_services()
            if requested.get('CORE511_R60_MOUNT_MATERIALS')=='0':rollback_mount_current(live,archive,spec)
            require(live.config_file.read_bytes()==before, 'config_islem_sirasinda_degisti')
            require(startup_target.read_bytes() == startup_before, 'R61_baslatma_islem_sirasinda_degisti')
            atomic(live.config_file,after,stat.S_IMODE(st.st_mode),st.st_uid,st.st_gid)
            atomic(startup_target,startup_after,0o644,0,0)
            startup_reload(live)
            live.same_database()
            live.start_services(revision)
        except BaseException:
            if stopped:
                live.stop_services()
                atomic(live.config_file,before,stat.S_IMODE(st.st_mode),st.st_uid,st.st_gid)
                atomic(startup_target,startup_before,0o644,0,0)
                startup_reload(live)
                live.same_database()
                live.start_services(revision)
            record.pop('approvedConfigHashes',None)
            record.pop('approvedStartupHashes',None)
            atomic(directory/'journal.json',encoded(record))
            print('Anahtar değişikliği başarısız; önceki ayarlar geri yüklendi. BAKIM / ÖN KAYIT AYARINIZ KORUNDU.',file=sys.stderr)
            raise
        row['after'] = digest(after)
        startup_row['after'] = digest(startup_after)
        record.pop('approvedConfigHashes',None)
        record.pop('approvedStartupHashes',None)
        atomic(directory/'journal.json',encoded(record))
        print(json.dumps({'degisenAnahtarlar':requested,'kanallarSaglikli':4,'oyunBakimda':True,'kurucuDBYazimi':False},ensure_ascii=False))


def rollback_mount_current(live,archive,spec):
    """Both services stopped, current DB preserved; return new escrow safely."""
    import tempfile
    name='mount-materials-offline-r60.mjs'
    with tempfile.TemporaryDirectory(prefix='core511-r60-rollback-') as directory:
        for part in (name,'mount-material-reserve-r60.mjs'):
            key=CORE+part;row=next(r for r in spec['changes'] if r['path']==key);data=archive.read('payload/'+key)
            require(digest(data)==row['after'] and len(data)==row['bytes'],'R60_geri_donus_modulu_SHA256')
            (Path(directory)/part).write_bytes(data)
        file=Path(directory)/name
        script="import {DatabaseSync} from 'node:sqlite';import {rollbackMountMaterialsOfflineR60} from "+json.dumps(file.as_uri())+";const sql=new DatabaseSync(process.argv[1]);sql.exec('PRAGMA foreign_keys=ON;PRAGMA synchronous=FULL;PRAGMA busy_timeout=1000');try{console.log(JSON.stringify(rollbackMountMaterialsOfflineR60(sql)));}finally{sql.close();}"
        live.same_database()
        result=subprocess.run([str(live.node),'--no-warnings','--input-type=module','-e',script,str(live.database)],capture_output=True,text=True,timeout=45)
        require(result.returncode==0,'R60_guncel_DB_geri_donus_hazirligi:'+result.stderr[-600:])
        live.same_database()
        print('R60 malzemeleri: '+result.stdout.strip()+'. Fazla birikim R60 yeniden kurulunca çantaya döner.')


def main():
    global BASE_ARCHIVE
    global PATCH_FILES, LIVE_CONFIG_FILE
    parser = argparse.ArgumentParser(description='R63_RECOVERY: yerinde güncelleme, doğrulanmış geçici DB yedeği, oyun yalnız panelden açılır.')
    flags = parser.add_mutually_exclusive_group(required=True)
    flags.add_argument('--check', action='store_true', help='Yalnız oku; servis/dosya değiştirmez.')
    flags.add_argument('--apply', action='store_true', help='Bakım veya elle kapalı ön kayıt modunda, boş sunucuda güncelle.')
    flags.add_argument('--flags', action='store_true', help='Mevcut R63_RECOVERY ortam anahtarlarını gösterir.')
    flags.add_argument('--set-flag', action='append', metavar='AD=DEGER', help='Bakım veya elle kapalı ön kayıtta anahtar değiştirir; birden fazla verilebilir.')
    flags.add_argument('--rollback', metavar='YEDEK_DIZINI', help='Bu R63_RECOVERY yamasını geri al; güncel DB korunur.')
    flags.add_argument('--rollback-latest', action='store_true', help='Son R63_RECOVERY kurulumunu tek komutla geri al; güncel DB korunur.')
    parser.add_argument('--base-package', help='Mevcut, değiştirilmemiş CORE511_R46.zip yolu; yalnız istemci doğrulaması için okunur. Sunucu tabanı birebir doğrulanmış R61 veya R62 olmalıdır.')
    args = parser.parse_args()
    BASE_ARCHIVE = args.base_package
    if args.apply:
        installation_window()  # Duration budget only; shared backup lock governs exclusion.
    require(os.geteuid() == 0, 'root_gerekli')
    with zipfile.ZipFile(Path(sys.argv[0]).resolve()) as archive:
        spec = json.loads(archive.read('patch.json'))
        require(spec.get('version') == 'R63_RECOVERY', 'paket_surumu_uyusmuyor')
        PATCH_FILES = [row['path'] for row in spec['changes']]
        require(len(PATCH_FILES) == len(set(PATCH_FILES)), 'tekrarli_paket_dosyasi')
        require(all(payload_allowed(p) for p in PATCH_FILES), 'R63_RECOVERY_payload_kapsami')
        live = Live()
        LIVE_CONFIG_FILE = live.config_file
        regular(LIVE_CONFIG_FILE)
        if args.flags:
            print_flags(live)
            return
        if args.rollback or args.rollback_latest:
            with install_lock(), scheduled_backup_lock(live):
                directory = Path(args.rollback).resolve() if args.rollback else latest_backup(live)
                require(directory.parent == BACKUPS and re.fullmatch(r'\d{8}T\d{6}Z-[0-9a-f]{8}', directory.name), 'yedek_dizini_kapsami')
                record = read_json(directory / 'journal.json')
                require(record['root'] == str(live.root) and record['unit'] == live.unit, 'geri_donus_kurulum_uyusmazligi')
                require(prop(live.unit, 'ActiveState') in ('active', 'inactive', 'failed'), 'servis_gecis_halinde')
                if prop(live.accounts_unit, 'ActiveState') in ('inactive', 'failed'):
                    if prop(live.unit, 'ActiveState') == 'active':
                        live.active_binding(require_accounts=False)
                    revision = live.offline_maintenance()
                    live.empty()
                elif prop(live.unit, 'ActiveState') == 'active':
                    live.active_binding()
                    revision = live.maintenance()
                else:
                    revision = record['revision']
                    live.central(revision)
                    live.empty()
                restore(directory, record, validate_only=True)
                live.stop_services()
                restore(directory, record, validate_only=True)
                pass  # R61 audio rollback has no database mutation
                restore(directory, record)
                startup_reload(live)
                verify_restored(live)
                live.same_database()
                live.start_services(revision)
                record['status'] = 'rolled_back'
                atomic(directory / 'journal.json', encoded(record))
                remove_own_database_backup(directory, record)
                print('R63_RECOVERY geri alındı. Önceki doğrulanmış kod ve güncel DB korundu. BAKIM / ÖN KAYIT AYARINIZ KORUNDU.')
                return
        live.active_binding()
        revision = live.maintenance()
        runtime = runtime_activation(live, archive, spec)
        spec = select_base(live, spec, runtime)
        if args.set_flag:
            require(core_identity(live.root / CORE) == spec['afterCore'], 'once_R63_RECOVERY_kurulmali')
            verify_installed(live, spec)
            set_flags(live, args.set_flag, revision, archive, spec)
            return
        if core_identity(live.root / CORE) == spec['afterCore']:
            verify_installed(live, spec)
            if args.apply:
                with install_lock():
                    directory = latest_backup(live)
                    record = read_json(directory / 'journal.json')
                    require(record['status'] == 'installed', 'yarim_kurulum_var_once_rollback:' + str(directory))
                    live.ready(revision)
                    remove_own_database_backup(directory, record)
            print('R63_RECOVERY zaten kurulu. Yeni işlem yapılmadı; oyun durumu korundu.')
            return
        print(spec['installedBase'] + ' taban dosyaları ve canlı manifest doğrulanıyor...', file=sys.stderr, flush=True)
        updates = prepare(live, archive, spec)
        required = 4*sum(len(b) for b in updates.values()) + 16*1024*1024
        for folder in (live.root, STATE.parent):
            v = os.statvfs(folder)
            require(v.f_bavail*v.f_frsize > required, 'kucuk_yama_icin_bos_alan_yetersiz')
        db_bytes = database_space(live, STATE.parent)
        if args.check:
            print(json.dumps({'uygun': True, 'taban': spec['installedBase'], 'dosyaSayisi': len(updates), 'yazilacakBayt': sum(map(len, updates.values())), 'bakim': live._update_policy[0] == 'maintenance', 'onKayit': live._update_policy[0] == 'waiting', 'kaliciSchema': 'sema-ve-veri-degisikligi-yok', 'kurucuDBYazimi': False, 'geriAlmaDBYazimi': True, 'geciciDBYedegiBayt': db_bytes, 'kurulumDakikalari': 'her-dakika-ortak-yedek-kilidi', 'saatKisiti': False, 'DBYedegiSureSiniriSaniye': 1200, 'yerindeKurulum': True, 'beforeCore': spec['beforeCore'], 'afterCore': spec['afterCore'], 'manifesttenKimligeEklenenler': spec['liveIdentityFiles'], 'httpRuntimeDegisikligi': True, 'istemciDegisikligi': True, 'oncekiIstemciNamespace': runtime['oldNamespace'], 'yeniIstemciNamespace': runtime['namespace'], 'kopyalanmayanMedyaBagi': runtime['hardlinks']}, ensure_ascii=False))
            return
        with install_lock(), scheduled_backup_lock(live):
            # A scheduled backup may have taken time. Revalidate the live
            # binding and the same maintenance decision before any backup/write.
            live.active_binding()
            live.maintenance(revision)
            for old in BACKUPS.glob('*/journal.json'):
                require(read_json(old).get('status') in ('installed', 'rolled_back'), 'yarim_kurulum_var_once_rollback:' + str(old.parent))
            print('Kurulum öncesi son dosya doğrulaması yapılıyor...', flush=True)
            if runtime:
                refreshed = runtime_activation(live, archive, spec)
                require(refreshed == runtime, 'kurulum_oncesi_runtime_degisti')
            require(prepare(live, archive, spec) == updates, 'kurulum_oncesi_dosya_degisti')
            # Hashing 63k live files must not consume the DB-check budget.
            # A running scheduled backup has finished; the lock stays held.
            deadline = installation_window()
            directory, record = backup(live.root, updates, live.unit, revision, runtime)
            print('Yalnız değişen dosyalar yedeklendi: ' + str(directory), flush=True)
            stopped = False
            try:
                live.maintenance(revision)
                stopped = True
                live.stop_services()
                live.same_database()
                print('Servisler bakımda durdu. Güncel DB yedekleniyor...', flush=True)
                backup_database(live, directory, record, deadline)
                record['status'] = 'writing'
                atomic(directory / 'journal.json', encoded(record))
                for row in record['files']:
                    file = Path(row['file'])
                    current = digest(file.read_bytes()) if file.exists() else None
                    require(current == row['before'], 'kurulum_sirasinda_dosya_degisti')
                    if file not in (STATE, LIVE_CONFIG_FILE, startup_file(live.unit)):
                        prepare_parent(live.root, file, row['uid'], row['gid'])
                    apply_update(file, updates[file], row)
                startup_reload(live)
                verify_installed(live, spec)
                live.start_services(revision)
                record['status'] = 'installed'
                atomic(directory / 'journal.json', encoded(record))
            except BaseException as error:
                print('Kurulum hatası: ' + safe_error(error), file=sys.stderr, flush=True)
                if stopped:
                    live.stop_services()
                    restore(directory, record, validate_only=True)
                    pass  # R61 audio rollback has no database mutation
                    restore(directory, record)
                    startup_reload(live)
                    verify_restored(live)
                    live.same_database()
                    live.start_services(revision)
                record['status'] = 'rolled_back'
                atomic(directory / 'journal.json', encoded(record))
                remove_own_database_backup(directory, record)
                print('R63_RECOVERY uygulanamadı. Önceki kod korundu; oyun açılmadı.', file=sys.stderr)
                raise
            # Cleanup is outside the install try: a disk/permission failure here
            # must not revert a verified installation. --apply retries cleanup.
            remove_own_database_backup(directory, record)
            print('R63_RECOVERY kuruldu. Dört kanal sağlıklı. Kurulum DB yedeği silindi; günlük yedekler korundu. BAKIM / ÖN KAYIT AYARINIZ KORUNDU; oyunu yalnız panelden açın.\nPanel: https://r1.coreoflife.net/admin/oyun-durumu\nGeri alma: python3 /root/CORE511_R63_DUZELTILMIS.zip --game-only --rollback-latest')

if __name__ == '__main__':
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(Refused('islem_durduruldu')))
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        # Do not print subprocess stderr or configuration/token data.
        print('DURDU: ' + safe_error(error) + '. Bu çıktıyı paylaşın.', file=sys.stderr)
        sys.exit(1)
