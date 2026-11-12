# Efsane — kısa canavar ölüm gecikmesi bildirimi

12 Kasım 2026. Kullanıcı, yaklaşık 45 dakika önce bir oyuncunun kısa süreli
lag yaşadığını ve canavarın yaklaşık iki saniye sonra öldüğünü bildirdi.
Sunucu **Efsane/r1**. Harita, kanal, saldırı türü ve aynı anda diğer oyuncuların
etkilenip etkilenmediği bilinmiyor. Akademi henüz açılmadığı için bu olay r2
olarak yorumlanmamalı.

## Salt okunur kontrol

`health-observations.json` iki güncel HTTP sağlık yanıtından seçilen tanı
alanlarını içerir. Canlı süreç veya ayar değiştirilmedi; profil başlatılmadı.

- 20:19:50 ve 20:21:15 UTC: R110_HANDOFF1, dört kanal hazır, toplam 14 oyuncu.
- Örnek anlarında bekleyen yazma sayısı 0; ana olay döngüsü meşguliyeti
  %40,91 ve %28,02; iki saniyelik pencerelerin gecikme göstergesi 23,9 ve 7,9 ms.
- Süreçte gözlenen ana SQLite COMMIT tepe süresi 26,64 ms; >50 ms sayacı 0.
  Bu sayaç bütün oyun işlemlerini veya worker COMMIT'lerini kapsamaz.
- Ödül worker yeniden başlatma/rollback/replay sayıları 0. Tamamlanan işler
  11.672 → 11.819; bu aralıktaki ilerleme güncel servisin çalıştığını gösterir.
- `maxReadyWaitMs=949,96` ve `maxExternalMs=952,58` iki örnekte de sabit.
  Bunlar zaman damgalı olay kayıtları değildir. `RewardWorkerR533.prepare()`
  kanal kabulünden önce aynı yazma sırasında `ready()` beklemesini ölçebilir;
  bu nedenle ilk açılış beklemesi de maksimumlara dahildir. Bu değerleri
  oyuncunun yaşadığı iki saniyelik gecikmenin kanıtı saymak yanlış olur.

## Henüz belirlenmeyen neden

Güncel sağlık yanıtları yaklaşık 45 dakika önceki olayın gecikmesini ölçmez.
İstemciden komuta, kanaldan kalıcı yazmaya ve sonuç bildirimine kadar geçen
süre bu olay için elimizde yok. Ana makine CPU'su, ağ veya oyuncu cihazı
hakkında bu verilerden kesin neden çıkarılamaz. Önceki 15 oyunculu CPU profili
de bu olayın zamanıyla eşleştirilmiş değil.

Kodda `runtime-performance.mjs` özetleri 5 dakika, `slow-work504.mjs`
yavaş iş/GC kayıtları 15 dakika tutuluyor; bunlar bu olay için geçmişe dönük
45 dakikalık kayıt sağlamıyor. VDS günlükleri bu ortamdan erişilebilir değil.
İlk sonraki adım: bildirimin tahmini saatini kapsayan servis günlüklerini
kontrol etmek. Günlükte hata olmaması, kısa bir gecikme olmadığı anlamına gelmez.

```bash
journalctl -u coreoflife-r1.service -u coreoflife-rt-r1.service \
  --since "2026-11-12 19:10:00 UTC" --until "2026-11-12 20:00:00 UTC" \
  --utc --no-pager -o short-iso
```

Bu turda oyun kodu, paket veya canlı kurulum değiştirilmedi. Neden henüz
belirlenmedi; doğrulanmamış bir performans düzeltmesi yayımlanmadı.
