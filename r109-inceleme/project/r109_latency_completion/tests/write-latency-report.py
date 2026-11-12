#!/usr/bin/env python3
"""R108 evidence report. Missing/failed runs stay visible, never silently replaced."""
import argparse
import csv
import hashlib
import json
import math
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EV = ROOT / 'evidence'
BASELINE_SHA = '6c8a931dfa7da3cdaf054d5c2c5715103abfa35024ff422402a9aaa734d22d2a'
EXPECTED = [f'{label}-r1-run{run}-{players}.json'
            for label in ('r106-tcp-baseline', 'r108-ready-candidate')
            for players in (30, 40) for run in (1, 2, 3)]
TARGETS = {'main', 'reader', 'world', *(f'channel-{n}' for n in range(1, 5))}


def read(path):
    return json.loads(Path(path).read_text())


def finite(value):
    return isinstance(value, (int, float)) and math.isfinite(value)


def raw_run(name):
    if Path(name).name != name or not name.endswith('.json'):
        raise ValueError(f'Invalid evidence filename: {name}')
    path = EV / name
    if not path.exists():
        return {'file': name, 'present': False, 'complete': False, 'issues': ['ölçüm dosyası yok']}
    data = read(path)
    loops = data.get('measurement', {}).get('measurement', {}).get('eventLoops', [])
    issues = []
    if data.get('passed') is not True:
        issues.append('işlev kontrolü geçmedi')
    if data.get('errors') or data.get('faults'):
        issues.append('komut veya native süreç hatası')
    actors = data.get('actors', [])
    if len(actors) != data.get('players') or any(a.get('ready') is not True or a.get('pendingKills', 0) for a in actors):
        issues.append('oyuncu/ödül son durumu tamamlanmadı')
    if data.get('webSocketTransport') != 'production-style-tcp-proxy':
        issues.append('gerçek TCP taşıması kullanılmadı')
    instrument = data.get('instrumentation', {})
    if instrument.get('cpuSampling') is not False or instrument.get('allocationSampling') is not False:
        issues.append('profil açık veya profilleme bilgisi eksik')
    requested = data.get('durationRequestedMs', 0)
    if requested < 60000 or not loops or any(x.get('durationMs', 0) < requested for x in loops):
        issues.append('tam 60 saniyelik ölçüm yok')
    if len(loops) != 7 or {x.get('target') for x in loops} != TARGETS:
        issues.append('yedi olay döngüsü birlikte ölçülmedi')
    if any(not finite(x.get('maxPauseMs')) for x in loops):
        issues.append('geçersiz olay döngüsü ölçümü')
    if any(not finite(x.get('pauseCountsOver50Ms', {}).get('timer')) or
           x.get('pauseCountsOver50Ms', {}).get('dropped', 0) != 0 for x in loops):
        issues.append('duraklama sayacı eksik veya örnek kaybı var')
    values = [x['maxPauseMs'] for x in loops if finite(x.get('maxPauseMs'))]
    summary = data.get('summary', {})
    steal = None
    host = data.get('host', {})
    if all(host.get(part, {}).get('procCpu') for part in ('before', 'after')):
        before, after = [list(map(int, host[part]['procCpu'].split()[1:9])) for part in ('before', 'after')]
        delta = [b - a for a, b in zip(before, after)]
        if len(delta) == 8 and min(delta) >= 0 and sum(delta) > 0:
            steal = 100 * delta[7] / sum(delta)
    return {'file': name, 'present': True, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'players': data.get('players'), 'realm': data.get('realm'),
            'passed': data.get('passed') is True, 'complete': not issues, 'issues': issues,
            'durationRequestedMs': requested, 'tickP95Ms': summary.get('tickP95Ms'),
            'tickP99Ms': summary.get('tickP99Ms'), 'maxTickMs': summary.get('maxTickMs'),
            'maxPlayerCommandP95Ms': max((a.get('latencyP95Ms', 0) for a in actors), default=0),
            'allEventLoopsMaxPauseMs': max(values, default=None),
            'loops': [{'target': x.get('target'), 'maxPauseMs': x.get('maxPauseMs'),
                       'over50': x.get('pauseCountsOver50Ms', {}).get('timer')} for x in loops],
            'cpuStealPercent': steal, 'maxGcMs': max((g.get('ms', 0) for g in data.get('mainGc', [])), default=0),
            'maxCommitMs': data.get('writerStalls', {}).get('maxCommitMs'),
            'socketCloses': data.get('counts', {}).get('socketCloses', 0),
            'socketErrors': data.get('counts', {}).get('socketErrors', 0)}


def collect(strict=False):
    path = EV / 'latency-summary.json'
    summary = read(path) if path.exists() else {'rows': [], 'groups': []}
    path = EV / 'latency-extra-runs.json'
    extras = read(path) if path.exists() else []
    if not isinstance(extras, list) or any(not isinstance(x, str) for x in extras) or len(set(extras)) != len(extras):
        raise ValueError('latency-extra-runs.json must be a unique list of filenames')
    if set(extras) & set(EXPECTED):
        raise ValueError('A matched run cannot also be an extra run')
    matched = [raw_run(name) for name in EXPECTED]
    additional = [raw_run(name) for name in extras]
    excluded = []
    declared = set(EXPECTED) | set(extras)
    # Inventory all other experiments independently of their outcome.
    for path in sorted(EV.glob('*.json')):
        if not path.name.startswith(('r106-', 'r108-')) or path.name in declared:
            continue
        try:
            data = read(path)
        except (ValueError, OSError):
            excluded.append({'file': path.name, 'reason': 'okunamayan tanı dosyası'}); continue
        if not isinstance(data, dict) or 'players' not in data:
            continue
        row = raw_run(path.name)
        row['reason'] = 'ilan edilmiş son sürüm ana/ek koşu listesinde değil; ara uygulama, pilot, kısa koşu veya tanı'
        excluded.append(row)
    for path in sorted(EV.glob('*.log')):
        if path.name.startswith(('r106-', 'r108-')) and not path.with_suffix('.json').exists():
            excluded.append({'file': path.name, 'reason': 'yalnız log var; tamamlanmış ölçüm kanıtı değil'})
    complete = (all(x['complete'] for x in matched) and bool(extras)
                and all(x['complete'] for x in additional))
    summary_files = [x['file'] for x in summary.get('rows', [])]
    if strict:
        if not extras:
            raise ValueError('The explicit latency-extra-runs.json list is required')
        if not complete:
            raise ValueError('Incomplete load evidence: ' + repr([x for x in matched + additional if not x['complete']]))
        if len(summary_files) != 12 or set(summary_files) != set(EXPECTED):
            raise ValueError('Summary must contain the exact twelve declared matched runs')
        keys = {(g['version'], g['players'], g['runs']) for g in summary['groups']}
        if len(summary['groups']) != 4 or keys != {(v, n, 3) for v in ('r106', 'r108') for n in (30, 40)}:
            raise ValueError('Each version/population must have exactly three samples')
        for group in summary['groups']:
            rows = [r for r in summary['rows'] if r['version'] == group['version'] and r['players'] == group['players']]
            if len(rows) != 3:
                raise ValueError('Summary group does not match its raw rows')
            for key, metric in group['metrics'].items():
                if metric != {'median': statistics.median(r[key] for r in rows), 'worst': max(r[key] for r in rows)}:
                    raise ValueError(f'Stale aggregate: {group["version"]}/{group["players"]}: {key}')
        for row in summary['rows']:
            raw = next(x for x in matched if x['file'] == row['file'])
            for key in ('tickP95Ms', 'tickP99Ms', 'maxTickMs', 'maxPlayerCommandP95Ms', 'maxGcMs'):
                if row[key] != raw[key]:
                    raise ValueError(f'Stale summary: {row["file"]}: {key}')
    candidates = [x for x in matched + additional if x['file'].startswith('r108-')]
    if strict:
        core = ROOT / 'working/core511-source/scripts/core511'
        for row in candidates:
            hashes = read(EV / row['file']).get('runtimeFiles', {})
            if set(hashes) != {'adventure-channel.mjs', 'native-http-bindings.mjs', 'process-stream.mjs', 'cold-world.mjs', 'read-worker.mjs', 'slim-reload.mjs', 'combat-checkpoint.mjs', 'coordinator.mjs'}:
                raise ValueError('Candidate measured runtime identity missing: ' + row['file'])
            for name, digest in hashes.items():
                if hashlib.sha256((core / name).read_bytes()).hexdigest() != digest:
                    raise ValueError('Candidate code changed after load: ' + row['file'] + ': ' + name)
    local_target = complete and all(x['allEventLoopsMaxPauseMs'] < 50 and x['maxGcMs'] < 50 for x in candidates)
    return {'matched': matched, 'extras': additional, 'excluded': excluded,
            'summary': summary, 'declaredRunsComplete': complete,
            'localAllProcessPauseTargetMet': local_target, 'zeroLagTargetMet': False}


def number(value, places=2):
    return f'{value:.{places}f}' if finite(value) else '—'


def pair(group, key, scale=1, places=2):
    value = group.get('metrics', {}).get(key, {})
    return ' / '.join(number(value.get(part) / scale if finite(value.get(part)) else None, places)
                      for part in ('median', 'worst'))


def write_report(strict=False, validation=None):
    evidence = collect(strict)
    complete = evidence['declaredRunsComplete']
    lines = ['# R108 — 30/40 oyuncu gecikme incelemesi', '',
             '**Durum: ' + ('ölçüm dizisi tamamlandı; sonuçlar aşağıda.' if complete else
                            'doğrulama sürüyor; bu rapor henüz yayın onayı değildir.') + '**', '',
             '**Bu aday 30–40 oyuncuda hiç takılma hedefini karşılamadı; tamamen sorunsuz yayın olarak önerilmez.**', '',
             'Bu rapor “sıfır lag” garantisi vermez. Sonlu yerel koşular, canlı VDS ve bütün oyuncu cihazlarını temsil etmez.', '',
             '## Değişiklikler', '',
             '- Kule/Sis Yarığı kontrolünde her oda için tüm dünya yeniden taranmıyor; bir turda ortak tarama yapılıyor.',
             '- Süreçler arası gönderimde gereksiz kopya; değişmeyen özel snapshot parçalarında ikinci kopya kaldırıldı.',
             '- Aynı okuma transaction’ında adventure verisi tekrar sorgulanmıyor; public/private veriler ayrı tutuluyor.',
             '- Cold-world kuralları yeniden kurulmadan kullanılıyor; saat, hesap ve ayar değişiklikleri güncel okunuyor.',
             '- Ortak boss katkı kaydında aynı canlı boss kontrolü, yalnızca bütün okumaların yazmadan önce tamamlandığı doğrulanmış toplu işlem içinde tur başına bir kez yapılır. Bilinmeyen tetikleyicilerde önceki sıra korunur.',
             '- Hasar, ganimet, sahiplik, kayıt biçimi ve veritabanı yazma garantileri değiştirilmedi. Efsane/Akademi aynı düzeltmeyi alır.',
             '- R106_READY1, sürekli canlı telemetri, swap veya yeni Node bellek bayrağı eklenmedi.', '',
             'Seçilen R106_CAPTCHA1 SHA256: `' + BASELINE_SHA + '`.', '',
             '## Karşılaştırma ve ortam', '',
             'R106 ve R108 için 30/40 oyuncuda üçer koşu planlandı: toplam 12 koşu. Gerçek dört kanal, dünya süreci, okuyucu worker, SQLite, HTTP ve TCP WebSocket akışı kullanılır; botlar ayrı süreçtedir. Veri sentetiktir. Canlı veritabanı veya üretim kabuğu kullanılmadı.', '',
             'Yerel ortam 4 çekirdek kotasını paylaşır; canlı VDS 8 çekirdek/12 GB olduğundan eşdeğer donanım değildir. İnternet gecikmesi ve istemci GPU/FPS ölçülmez. Ana koşular karma harita/kule/Solo/Sis trafiğidir; eşyalı/skill ve ortak boss koşuları ayrıca gösterilir.', '',
             'Hücreler **medyan / en kötü koşu**. Tick = kanalın çalışma süresi; komut p95 = en yavaş oyuncunun yerel gönderim–yanıt p95’i. “>50” olay döngüsü duraklamasıdır; GC ile aynı şey değildir. Süreçlerin sayaçları aynı fiziksel duraklamayı tekrar sayabilir.', '',
             '| Sürüm | Oyuncu / tekrar | Tick p95 ms | Tick p99 ms | Ana >50 / 60 sn | Kanal >50 / 60 sn | Komut p95 ms |',
             '|---|---:|---:|---:|---:|---:|---:|']
    groups = evidence['summary'].get('groups', [])
    for group in groups:
        lines.append(f'| {group["version"].upper()} | {group["players"]} / {group["runs"]} | ' +
                     ' | '.join(pair(group, k, places=0 if 'Pauses' in k else 2) for k in
                                ('tickP95Ms', 'tickP99Ms', 'mainPausesOver50Ms', 'channelPausesOver50Ms', 'maxPlayerCommandP95Ms')) + ' |')
    if not groups:
        lines.append('| Ölçümler tamamlanmadı | — | — | — | — | — | — |')
    lines += ['', '| Sürüm / kişi | Ana azami ms | Kanal azami ms | Reader azami ms | Dünya azami ms | Ana ELU % | Ana RSS MiB | Kota bekleme ms / olay |',
              '|---|---:|---:|---:|---:|---:|---:|---:|']
    for g in groups:
        worlds = [loop['maxPauseMs'] for row in evidence['matched']
                  if row['file'].startswith(g['version'] + '-') and row.get('players') == g['players']
                  for loop in row.get('loops', []) if loop['target'] == 'world' and finite(loop['maxPauseMs'])]
        world = f'{number(statistics.median(worlds))} / {number(max(worlds))}' if worlds else '—'
        lines.append(f'| {g["version"].upper()} / {g["players"]} | {pair(g,"mainMaxPauseMs")} | {pair(g,"maxChannelPauseMs")} | {pair(g,"readerMaxPauseMs")} | {world} | {pair(g,"mainElu",.01)} | {pair(g,"mainMaxRssBytes",1048576,1)} | {pair(g,"throttledUsec",1000)} / {pair(g,"nrThrottled",places=0)} |')
    lines += ['', 'Kota beklemesi `cpu.stat` nr_throttled/throttled_usec farkıdır. Gecikmenin tamamının kotadan kaynaklandığı sonucu çıkarılmaz.', '',
              '## Bütün süreçler ve olumsuz sonuçlar', '']
    declared = evidence['matched'] + evidence['extras']
    steals = [r['cpuStealPercent'] for r in declared if finite(r.get('cpuStealPercent'))]
    if steals:
        lines.append(f'CPU steal sayacı bulunan koşularda ölçülen aralık %{min(steals):.2f}–%{max(steals):.2f}. Kullanıcının canlı VDS ölçümünde bu değer sıfırdı. Ortam farkı önemlidir; bütün duraklamaları tek başına açıklamaz ve ham sonuçlardan hiçbir bekleme çıkarılmadı.')
    slow = [(r['file'], loop['target'], loop['maxPauseMs']) for r in declared
            for loop in r.get('loops', []) if finite(loop['maxPauseMs']) and loop['maxPauseMs'] >= 50]
    if not complete:
        lines.append('Ana/ek koşular eksik veya başarısız; performans hedefi doğrulanmış sayılamaz.')
    elif not evidence['localAllProcessPauseTargetMet']:
        lines.append('R108’de en az bir süreçte/GC ölçümünde 50 ms ve üzeri duraklama var. İyi tick yüzdelikleri bu uzun duraklamaları ortadan kaldırmaz; hedefin tamamı sağlanmadı.')
    else:
        lines.append('Tamamlanan ilan edilmiş koşul pencerelerinde yedi süreç/worker için azami duraklama 50 ms altında. Bu sınırlı sonuç canlıda hiç takılma olmayacağı garantisi değildir.')
    for version in ('r106-', 'r108-'):
        for file, target, ms in sorted((s for s in slow if s[0].startswith(version)), key=lambda x: -x[2])[:8]:
            lines.append(f'- `{file}` · {target}: **{ms:.2f} ms**.')
    for players in (30, 40):
        before = next((g for g in groups if g['version'] == 'r106' and g['players'] == players), None)
        after = next((g for g in groups if g['version'] == 'r108' and g['players'] == players), None)
        if before and after:
            worse = [k for k in ('tickP99Ms', 'mainPausesOver50Ms', 'channelPausesOver50Ms', 'readerMaxPauseMs', 'maxPlayerCommandP95Ms')
                     if after['metrics'][k]['median'] > before['metrics'][k]['median']]
            lines.append(f'- {players} kişide artan medyan ölçütler: ' + (', '.join(worse) if worse else 'bu seçilmiş ölçütlerde yok') + '.')
    lines += ['', '## İlan edilmiş ek gerçekçi koşular', '',
              'Ek liste `evidence/latency-extra-runs.json` içindedir. Tek koşular üç tekrarlı karşılaştırmanın yerine geçmez; başarısız koşular saklanır.', '',
              '| Dosya | Realm / kişi | İşlev / tam ölçüm | Tick p99 ms | Tüm süreçler azami ms | Komut p95 ms | Ana GC / commit azami ms |',
              '|---|---|---|---:|---:|---:|---:|']
    for row in evidence['extras']:
        lines.append(f'| `{row["file"]}` | {row.get("realm","—")} / {row.get("players","—")} | {"geçti" if row.get("passed") else "geçmedi"} / {"tam" if row["complete"] else "eksik"} | {number(row.get("tickP99Ms"))} | {number(row.get("allEventLoopsMaxPauseMs"))} | {number(row.get("maxPlayerCommandP95Ms"))} | {number(row.get("maxGcMs"))} / {number(row.get("maxCommitMs"))} |')
    if not evidence['extras']:
        lines.append('| Liste henüz oluşturulmadı | — | eksik | — | — | — | — |')
    lines += ['', 'GC ve commit azamileri ayrı sayaçlardır; daha uzun ana döngü duraklamasının nedenini tek başına açıklamazlar. Küçük GC/commit ölçümü, kalan uzun duraklamanın giderildiği anlamına gelmez.']
    lines += ['', '## Ara sürümler, eksik ve karşılaştırma dışı kanıtlar', '', 'Başlangıç sırası düzeltmesinden önceki `r108-tcp-candidate`, `r108-final-*` ve `r108-*-control` koşuları aşağıda korunur. Son kodun karşılaştırması `r108-ready-*` dosyalarıdır; ara sürüm sonuçları son sürüm diye gösterilmez.', '']
    for row in declared:
        if row['issues']:
            lines.append(f'- `{row["file"]}`: ' + '; '.join(row['issues']) + '.')
    for row in evidence['excluded']:
        detail = '; '.join(row.get('issues', []))
        if finite(row.get('tickP99Ms')):
            detail += f'; tick p99 {row["tickP99Ms"]:.2f} ms'
        if finite(row.get('allEventLoopsMaxPauseMs')):
            detail += f'; tüm süreçler azami {row["allEventLoopsMaxPauseMs"]:.2f} ms'
        lines.append(f'- `{row["file"]}`: {row["reason"]}' + (f' ({detail.lstrip("; ")})' if detail else '') + '.')
    lines += ['', '## Kök neden ve ölçüm sınırı', '',
              'İlk yoğun kanal koşusu `r108-ready-packed-1` bitişinde iki istemci öldürme gözlemi sonuçlanmamıştı; bu koşu son ödüllerin tamamlandığını kanıtlamaz. Ham 48,37 ms tick p99 ve bütün duraklamaları yukarıdaki ara/eksik kanıtlarda korundu. Testin yalnız bitiş işlemi, yeni saldırı üretmeden mevcut dünya güncellemeleri ve native ödül yanıtlarını sınırlı sürede bekleyecek biçimde düzeltildi; aynı üretim koduyla `r108-ready-packed-settled` yeniden ölçüldü. Üretim kodu, ölçülen 60 saniyelik trafik ve sayaçlar bu düzeltmede değişmedi.', '',
              'Ayrı `experiments/boss-prewarm` taslağının sekiz sorgu ve üç açılış sırası testi geçti; performans yükü ölçülmedi ve bu taslak pakete alınmadı. Kullanıcının çalışmayı sonuçlandırma talebi üzerine yeni deney dizisi başlatılmadı.', '',
              'CPU tanısında ortak boss katkı kaydı sırasında aynı canlı-boss sorgusunun her katkı satırı için canavar tablosunu tekrar taradığı görüldü. 40 katkıda 40 sorgu, yalnızca onaylı toplu işlem içinde tur başına 1 sorguya indirildi. Bilinmeyen tetikleyicilerin sıralı davranışı korunur; önbellek başka işleme taşınmaz.', '',
              'Hedefli `combat-boss-validation` testleri gerçek SQLite üzerinde satır/yanıt eşitliği, ölü boss, eksik oyuncu, iki boss turu, yinelenen katkı ve MAIN/TEMP tetikleyicilerin geri alınmasını denetler. Gerçek GameWriter sahiplik ve tekrar oynatma testleri ayrıca çalışır. Bileşen süresi bütün oyun gecikmesi değildir.', '',
              'İlk boss ölümünde ayrıca SQL derleme/şema onayı maliyeti gözlendi. Ödül worker’ının kalıcı lonca tetikleyicisini yeniden kurması, hemen önce hazırlanan parent sorgu havuzunu geçersiz kılıyordu. Son sürümde önce worker hazırlanır, ardından sorgu havuzu kurulur. İşlemler ve şema geçersizleştirme kontrolleri korunur. Performans hedefinin tüm koşularda karşılandığı söylenemez.', '',
              'Bazı uzun beklemeler, boş kanallar ve dünya süreci dahil yedi ayrı olay döngüsünde aynı zaman aralığında görülüyor. Bu, ortak makine zamanlamasının katkısını destekler; her GC veya beklemenin yalnızca dış ortamdan kaynaklandığını kanıtlamaz. Eski temel ölçümler ile son ölçümler arasında ortam yeniden hazırlandı; ham sonuçlar korunur, son ortamda ilave eski/yeni kontrol çifti rapora dahil edilir.', '']
    lines += ['', '## Yayın doğrulaması', '']
    if validation and validation.get('functionalChecksPassed'):
        lines.append('R108 kayıtlı doğrulama zinciri geçti. Sayılar TAP/installer loglarından doğrulandı; performans hedefi ayrı değerlendirildi:')
        for check in validation['tests']:
            lines.append(f'- {check["name"]}: {check["pass"]}/{check["tests"]}; `{check["log"]}`.')
        lines.append(f'- Kurulum/geri dönüş: {validation["installerTests"]}; Efsane PC, Akademi mobil ve üç bağımsız tarayıcı raporları kontrol edildi.')
    else:
        lines.append('Yayın doğrulaması henüz tamamlanmadı. Test geçmişi veya planlanan kontroller “geçti” sayılmadı.')
    lines += ['', 'Ham ölçümler `evidence/latency-summary.json`, `latency-measurements.csv` ve yukarıdaki koşu dosyalarındadır. Yayın kontrol kaydı `evidence/release-validation.json` oluşturulduğunda ayrıca okunmalıdır. Canlıya kurulum yapılmış değildir.', '']
    (ROOT / 'PERFORMANS_RAPORU.md').write_text('\n'.join(lines))
    fields = ['category', 'file', 'present', 'passed', 'complete', 'players', 'realm', 'tickP95Ms', 'tickP99Ms', 'maxTickMs', 'allEventLoopsMaxPauseMs', 'maxPlayerCommandP95Ms', 'maxGcMs', 'maxCommitMs', 'cpuStealPercent', 'socketCloses', 'socketErrors', 'issues', 'reason']
    with (EV / 'latency-run-inventory.csv').open('w', newline='') as out:
        writer = csv.DictWriter(out, fieldnames=fields, extrasaction='ignore'); writer.writeheader()
        for category, rows in [('matched', evidence['matched']), ('extra', evidence['extras']), ('excluded', evidence['excluded'])]:
            for row in rows:
                writer.writerow({**row, 'category': category, 'issues': '; '.join(row.get('issues', []))})
    return evidence


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--strict', action='store_true', help='Require twelve matched runs and explicit extras')
    args = parser.parse_args()
    result = write_report(args.strict)
    print(json.dumps({key: result[key] for key in ('declaredRunsComplete', 'localAllProcessPauseTargetMet', 'zeroLagTargetMet')}, indent=2))
