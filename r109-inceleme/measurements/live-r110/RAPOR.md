# R110 sonrası canlı CPU profilleri — 3 ve 7 oyuncu

Kullanıcı R110_HANDOFF1 kurulumundan sonra (kurulum çıktısı: "R110 TAKILMA
DÜZELTMESİ TAMAMLANDI. Efsane ve Akademi hazır") iki 60 saniyelik ana süreç
profili gönderdi. Harita/etkinlik ve realm ayrıca belirtilmedi.

| Dosya | Oyuncu | SHA256 |
|---|---:|---|
| `three-players-60s.cpuprofile.json` | 3 | `9e7bea1bc9f5688e7a2893f778897fc9d3972307adb5ecb4ae4b9f1b446e11ed` |
| `seven-players-60s.cpuprofile.json` | 7 | `c5b46ba436feb90af3d7d6526464ff64fac243f4d803c14a529dffeb3a666729` |

## Karşılaştırma (örneklenmiş ana iş parçacığı; profiler başlangıcı hariç)

| | R109 · 6 oyuncu | R110 · 3 oyuncu | R110 · 7 oyuncu |
|---|---:|---:|---:|
| Meşguliyet | %21,96 | %9,51 | %23,51 |
| 1 sn pencere medyan / p95 / en yüksek | 22,1 / 32,1 / 35,4 | 8,4 / 16,8 / 35,5 | 23,4 / 33,7 / 35,6 |
| WebSocket aktarımı `ondata` (ms/dk) | 654 | 27 | 37 |
| Soket okuma `onStreamRead` (ms/dk) | 971 | 63 | 87 |
| `writeGeneric` (ms/dk) | 649 | 98 | 157 |
| Native SQL yaprak öz-süresi (ms) | 3.024 | 1.014 | 3.033 |
| Native `prepare` kapsayıcı (ms) | 411 | 100 | 305 |
| IPC paketleme `framed` (ms) | 741 | 140 | 1.086 |
| `drainWrites` kapsayıcı (ms) | 5.431 | 1.741 | 5.584 |
| GC örnekleri (ms) | 673 | 565 | 951 |
| En uzun kesintisiz GC örnek dizisi (ms) | 27,9 | 92,8 | 68,3 |

## Okuma

- **Devretme canlıda etkin:** ana süreçteki oyuncu WebSocket aktarımı 7
  oyuncuda bile 37 ms/dk (R109 6 oyuncu: 654). Kalan küçük pay HTTP istekleri
  ve diğer soketlerdir.
- **7 oyuncuda ana süreç yükü R109'daki 6 oyunculu kayıtla benzer**
  (%23,5 ↔ %22,0). Aktarımdan kazanılan ~1,3 s/dk; bu kayıtta IPC paketleme,
  GC ve yazma işleri daha yüksek. Oyuncu sayısı ve etkinlik farklı olduğu için
  bu tek kayıtla net hızlanma veya yavaşlama iddia edilemez.
- **Ana süreç doymuş değil:** hiçbir 1 sn pencere %36'yı geçmedi.
- **Uzun GC dizileri:** R110 kayıtlarında 68–93 ms'lik kesintisiz GC örnek
  dizileri görüldü (R109 6 oyuncu: 28 ms; R105 1 oyuncu kaydında da 103 ms
  vardı). CPU örnekleri GC olay zamanlayıcısı değildir. Aynı koşullu
  laboratuvar koşularında kesin GC zamanlayıcısıyla 50 oyuncuda R110 GC'yi
  değiştirmiyor (11 ↔ 10 koşu: dakikada GC 1.059 ↔ 998 ms, büyük GC medyanı
  13,4 ↔ 12,9 ms, en uzunu 45,7 ↔ 44,3 ms). 4 vCPU'nun doyduğu 100 oyuncuda
  (3 ↔ 3 koşu) en uzun büyük GC 28 ↔ 55 ms; olumsuz işaret olarak izlenecek.
  R110 kayıtları kurulumdan kısa süre sonra, yeni başlamış süreçte alındı;
  ısınan yığının etkisi ayrıca görülmeli.
- R110'da ana süreç GC duraklaması oyuncu hareketini ve kanal yayınlarını
  durdurmaz; yalnız ana sürece giden komut yanıtlarını (saldırı sonucu, ödül)
  kısa süre geciktirebilir.

## Sınırlar

Bu kayıtlar nedensel önce/sonra testi değildir; oyuncu başına bölünüp 30–40
oyuncuya kapasite tahmini yapılmaz. CPU örnekleri tick p95/p99, >50 ms donma
sayısı veya komut yanıt süresi değildir. 20–40 oyuncu varken, kurulumdan en az
birkaç saat sonra yeni profil ve `vmstat 1 60` gerekir.

Analiz: `evidence/profile-analysis-3p.json`, `evidence/profile-analysis-7p.json`
(`scripts/analyze-profile.py`); GC dizileri `gc-spans.py`, `gc-runs.py`.
