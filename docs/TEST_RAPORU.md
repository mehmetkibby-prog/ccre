# Test Raporu — 31 Ekim 2026

Bu rapordaki sayıların hepsi bu oturumda gerçekten çalıştırılmış testlerden alındı. Ölçüm ortamı hedef VDS değildir.

## Ortam
- Geliştirme konteyneri: **4 çekirdek**, 16 GB RAM, PostgreSQL 16, Node.js 22.
- Sunucu, botlar ve veritabanı **aynı makinede** çalıştı. Botların kendi CPU tüketimi sonuçları kötüleştirir; hedef VDS'te (8 çekirdek, botlar ayrı) değerler daha iyi olmalıdır. Hedef VDS'te yeniden ölçülmelidir.
- Sunucu üretim derlemesiyle çalıştı (`node packages/server/dist/main.js`), `CHANNELS=6`, `CHANNEL_CAPACITY=120`, `LOADTEST=1` (yalnız IP giriş sınırını kapatır).

## Birim / tutarlılık testleri (`npm test`) — 15/15 geçti
- Aynı satış isteği iki kez → tek satış, tek ödeme
- Kilitli eşya satılamaz; NPC uzaktaysa alım-satım reddi
- Sahte fiyatla alım → reddedilir, bedel alınmaz
- Aynı canavar iki kez öldürülse → ödül bir kez
- Başkasının ganimeti alınamaz; kendi ganimeti bir kez alınır
- Hız hilesi: 1 sn'de 200 adım komutu → en fazla gerçek hız kadar ilerleme
- Ölüyken ışınlanma reddi; dirilme tam can ve köye dönüş
- Statü: eski revizyon ve bütçe aşımı reddi; can bedava dolmaz
- Artı basma: beklenen artı uyuşmazsa malzeme harcanmaz; +1 doğru maliyet
- Kara Bölge: seviye şartı + PvP onayı
- İkili snapshot kodlama/okuma
- Ayrılışta son durum teslimi ve sürüm artışı
- **Veritabanı:** geç gelen eski kayıt yeni durumu ezmez (save_version); eşya başka karaktere geçince tek sahipli kalır (UUID)

## Yük testleri (gerçek protokol botları: giriş, kanal kabulü, hareket, hedefleme, saldırı, beceri, ganimet, sohbet, ışınlanma, ölüm/dirilme)

| Senaryo | Çevrimiçi | Kanal tick p99 (ms) | Kanal tick max (ms) | Kanal CPU (ELU) | RTT p95 | Hata |
|---|---|---|---|---|---|---|
| 300 bot, 6 kanal (50/kanal) | 300 | 1,3 – 1,7 | 2,9 – 5,1 | %3,5 – %5 | 50 ms | 0 |
| 600 bot, 6 kanal (100/kanal), %40'ı köy meydanında | 600 | 3,3 – 5,3 | 5,9 – 18,3 | %6 – %9 | 56 – 85 ms | 0 |
| Kalabalık: 150 bot tek kanal, hepsi köy meydanında | 120 (kapasite) | 10,5 | 24 | %16 | 55 ms | 30 bot "Kanal dolu" (beklenen) |

Tick bütçesi 20 Hz'de 50 ms'dir. 600 oyuncuda en kötü kanal p99 değeri bütçenin yaklaşık %10'u, en kötü anlık tepe %37'sidir. Hiçbir senaryoda tick taşması (overrun) olmadı.

Diğer ölçümler (600 bot):
- **Ana süreç event-loop gecikmesi:** p99 ~23 ms, tek seferlik tepe 421 ms (giriş dalgası sırasında; aynı 4 çekirdekte 3 bot süreci + 7 sunucu thread'i + PostgreSQL çalışıyordu).
- **Kalıcı yazma:** p50 7 ms, p95 ~46 ms, p99 ~150 ms, max 774 ms. Kuyruk 0–4'te kaldı. Yazma oyun döngüsünü beklemediği için tick'e yansımadı.
- **Bant genişliği:** kanal başına ~0,3 MB/s çıkış; 600 oyuncuda toplam ~2 MB/s (≈16 Mbit/s).
- **Bellek:** ana süreç RSS ~290 MB; worker heap'leri küçük.

## Tarayıcı uçtan uca (Playwright, GPU'suz yazılım render)
- Kayıt → 3B sınıf önizlemesi → karakter oluşturma → kanal seçimi → oyuna giriş → HUD → ışınlanma paneli → Kuzey Ormanı'na geçiş → yürüme: **çalıştı**, konum veritabanına kaydedildi.
- Tarayıcıda dövüş otomasyonu, yazılım render ≈1 fps olduğu için tamamlanamadı. Dövüş, aynı protokolü kullanan botlarla doğrulandı (600 bot testinde binlerce öldürme ve ganimet).

## Bilinen riskler / eksikler
1. Ana süreçteki 421 ms tepe: hedef VDS'te ayrı makineden çalışan botlarla tekrar ölçülmeli. Gerekirse WebSocket geçidi birden çok sürece bölünebilir (mimari buna uygun).
2. İstemci FPS'i gerçek cihazlarda ölçülmedi (bu ortamda GPU yok). Düşük/Orta/Yüksek profiller hazır.
3. 60 dakikalık uzun karma yük testi henüz yapılmadı.
