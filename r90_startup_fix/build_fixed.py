"""Repair the R90 package's HTTP proof binding; never edit installed files."""
from pathlib import Path
import argparse
import hashlib
import io
import json
import re
import zipfile

ORIGINAL_SHA = '51f0c634b0b05bce1f6267b0ffca3218e4ea56141a912333741fafb336082e2b'
HTTP = 'http-runtime/dist-vds/server/index.js'
PROOF = 'core511-source/scripts/core511/generated/native-http-composition-proof.json'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('R90 paket yapisi farkli; degisiklik yapilmadi')
    return text.replace(old, new)


def repair(source, original_proof):
    if sha(source) != ORIGINAL_SHA:
        raise RuntimeError('Ozgun R90 SHA256 farkli; degisiklik yapilmadi')
    with zipfile.ZipFile(io.BytesIO(source)) as z:
        files = {name: z.read(name) for name in z.namelist()}
    plan = json.loads(files['update.json'])
    old = next(row for row in plan['baseCoreRows'] if row['path'] == PROOF.removeprefix('core511-source/scripts/core511/'))
    if sha(original_proof) != old['sha256'] or len(original_proof) != old['bytes']:
        raise RuntimeError('R89 HTTP kaniti dogrulanamadi; degisiklik yapilmadi')
    proof = json.loads(original_proof)
    if proof['generatedSha256'] != plan['files'][HTTP]['before']:
        raise RuntimeError('R89 HTTP eslesmesi farkli')
    proof['generatedSha256'] = sha(files['payload/' + HTTP])
    if proof['generatedSha256'] != plan['files'][HTTP]['after']:
        raise RuntimeError('R90 HTTP dosyasi dogrulanamadi')
    data = encoded(proof)
    plan['files'][PROOF] = {'before': old['sha256'], 'after': sha(data), 'bytes': len(data)}
    files['payload/' + PROOF] = data
    files['update.json'] = encoded(plan)

    key = 'modules/installer.py'
    code = files[key].decode()
    match = re.search(r'^PRODUCTION_PATHS=.*$', code, re.M)
    if not match:
        raise RuntimeError('R90 kapsam sabiti eksik')
    code = once(code, match[0], 'PRODUCTION_PATHS=' + repr(tuple(plan['files'])) + '\nHTTP_PROOF=' + repr(PROOF))
    # The original HTTP hash check stays in place. Bind its matching proof too.
    anchor = " require(len(http_updates)==1 and http_updates[0]==verification_http(original_http),'R90 HTTP yalnız doğrulama kararının güncel okunmasını değiştirebilir')"
    extra = """
 proof_row=by_name[HTTP_PROOF]
 before_proof=source_reader(proof_row) if source_reader else inplace.checked_path(live.root,HTTP_PROOF).read_bytes()
 expected_proof=json.loads(before_proof)
 require(expected_proof.get('generatedSha256')==hashlib.sha256(original_http).hexdigest(),'R89 HTTP ve acilis kaniti eslesmiyor')
 expected_proof['generatedSha256']=hashlib.sha256(http_updates[0]).hexdigest()
 proof_updates=[data for name,meta,data in updates if name==HTTP_PROOF]
 require(len(proof_updates)==1 and proof_updates[0]==encoded(expected_proof),'R90 HTTP acilis kaniti yalniz dogrulanmis yeni HTTP dosyasina baglanabilir')"""
    code = once(code, anchor, anchor + extra)
    anchor = ' return plan,updates\n'
    extra = """ proof_data=next(data for name,meta,data in updates if name==HTTP_PROOF)
 http_data=next(data for name,meta,data in updates if name==HTTP)
 require(json.loads(proof_data).get('generatedSha256')==hashlib.sha256(http_data).hexdigest(),'R90 paketi HTTP/acilis kaniti uyusmuyor; servisler durdurulmadi')
"""
    code = once(code, anchor, extra + anchor)
    # Check space before the long full-file verification, retaining later gates.
    code = once(code, ' live.empty();core=initial_core(live,plan);verify_release(live.root,core);live.account_stable(accounts)',
                ' live.empty();old.database_space(live,STATE.parent);core=initial_core(live,plan);verify_release(live.root,core);live.account_stable(accounts)')
    code = once(code, '  deadline=time.monotonic()+90;last=0', '  deadline=time.monotonic()+90;last=0;last_error=""')
    code = once(code, '   except (OSError,RuntimeError,ValueError):', '   except (OSError,RuntimeError,ValueError) as error:\n    last_error=str(error) if isinstance(error,RuntimeError) else type(error).__name__')
    code = once(code, "  raise RuntimeError('Dört kanalın açılması tamamlanamadı')", "  raise RuntimeError('Dört kanalın açılması tamamlanamadı; son kontrol: '+last_error)")
    files[key] = code.encode()

    for key in ('__main__.py', 'modules/installer.py'):
        code = files[key].decode()
        old = 'str(error) if isinstance(error,RuntimeError) else type(error).__name__'
        if code.count(old) != (2 if key == 'modules/installer.py' else 1):
            raise RuntimeError('R90 hata cikisi farkli')
        code = code.replace(old, "str(error) if isinstance(error,RuntimeError) or type(error).__name__=='Refused' else type(error).__name__")
        files[key] = code.encode()
    key = 'modules/r63_support.py'
    code = files[key].decode()
    code = once(code, "require(process.returncode == 0, 'komut_basarisiz:' + Path(args[0]).name)",
                "require(process.returncode == 0, 'Dogrulama cikis=' + str(process.returncode) + ' ' + ' | '.join(re.findall(r'(?m)^(?:[A-Za-z]*Error:|FATAL ERROR:)[^\\r\\n]{0,500}', error.decode('utf-8','replace'))[-3:]))")
    files[key] = code.encode()
    modules = json.loads(files['package-files.json'])
    files['package-files.json'] = encoded({name: sha(files['modules/' + name]) for name in modules})
    for name in ('__main__.py', *('modules/' + name for name in modules if name.endswith('.py'))):
        compile(files[name], name, 'exec')
    files['DUZELTME_R90.md'] = ("""# R90 acilis duzeltmesi

Ozgun R90 HTTP dosyasini degistiriyor fakat native-http-composition-proof.json dosyasini pakete almiyordu. Gercek HTTP sunucusu native_http_server_entry_changed ile acilisi reddediyordu.

Bu paket HTTP ile dogrulama kaydini birlikte gunceller. Acilis hash kontrolu korunur; paket yuklenirken eslesme ayrica denetlenir. Oyun degisiklikleri R90 ile aynidir. Istemci, hesaplar ve veritabani semasi degismez.

Once ozgun paketin geri almasi tamamlanmali ve R89 kurulu olmalidir. Tamamlanmamis eski kurulum kaydi varsa bu paketle kurtarmaya calismayin; ozgun R90 --recover kullanilir. Sonra bakimda ve oyuncular cikmisken bu paket --apply ile uygulanir. Normal yedek ve saglik kontrolleri korunur. Refused hatasinin gercek nedeni artik gorunur; disk kontrolu uzun dosya taramasindan once yapilir.
""").encode()
    return files


def archive_bytes(files):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w') as z:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, (2026, 11, 2, 0, 0, 0))
            info.external_attr = 0o100644 << 16
            z.writestr(info, data, compress_type=zipfile.ZIP_STORED)
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', default='/root/CORE511_R90_TOPLU.zip')
    parser.add_argument('--proof')
    parser.add_argument('--output', default='/root/CORE511_R90_DUZELTILMIS.zip')
    parser.add_argument('--stage')
    args = parser.parse_args()
    if args.proof:
        proof_file = Path(args.proof)
    else:
        state = json.loads(Path('/var/lib/core511/state.json').read_text())
        if state.get('r64Deployment', {}).get('version') != 'R89_GAMEPLAY':
            raise RuntimeError('Once R89 geri almasi tamamlanmali')
        if Path('/var/lib/core511/r64-updates/active.json').exists():
            raise RuntimeError('Once eski guncelleme tamamlanmali')
        proof_file = Path(state['releaseRoot']) / PROOF
    files = repair(Path(args.source).read_bytes(), proof_file.read_bytes())
    data = archive_bytes(files)
    destination = Path(args.output)
    if destination.exists() and destination.read_bytes() != data:
        raise RuntimeError('Cikti dosyasi zaten var ve farkli; uzerine yazilmadi')
    destination.write_bytes(data)
    destination.with_name(destination.name + '.sha256').write_text(sha(data) + '  ' + destination.name + '\n')
    if args.stage:
        for name, value in files.items():
            p = Path(args.stage) / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(value)
    print('DUZELTILMIS_PAKET:', str(destination))
    print('SHA256:', sha(data))


if __name__ == '__main__':
    main()
