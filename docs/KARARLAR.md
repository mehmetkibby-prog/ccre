# Kararlar ve gerekçeler

Bu dosya, şartnamedeki referans davranıştan bilinçli ayrılışları ve yeni tasarım kararlarını kayıt altına alır.

## Altyapı
1. **Kanal = worker thread.** Her kanal ayrı bir Node.js worker thread'inde 20 Hz sabit adımla çalışır. Bir kanalın yükü veya çökmesi diğerlerini etkilemez; çöken kanal artan beklemeyle (0,5 → 30 sn) yeniden başlatılır.
2. **Varsayılan 6 kanal × 120 kişi = 720 kapasite** (8 çekirdek / 8 GB VDS hedefi). Referanstaki 4×25 profil `CHANNELS=4 CHANNEL_CAPACITY=25` ile kurulabilir. *Yeni tasarım kararı:* hedef 500–600 eşzamanlı oyuncu.
3. **Görüş alanı (AOI) sınırı:** Oyuncuya yalnız yakın varlıklar gönderilir (yaklaşık 2500×1800 birimlik pencere). Kalabalıkta en yakın 48 oyuncu gösterilir (`AOI_MAX_PLAYERS`). Böylece 150 kişilik meydan bile paket boyunu ve istemci çizimini patlatmaz.
4. **İkili delta protokolü:** Konum, can ve animasyon değişimleri ikili (binary) kodlanır, JSON yalnız seyrek olaylar içindir.
5. **Yavaş istemci koruması:** WebSocket tamponu 256 KB'ı aşarsa ara snapshot'lar atılır ve tam yeniden eşitleme (reset) istenir. Sunucu döngüsü hiçbir istemciyi beklemez.
6. **Kalıcılık write-behind:** Durum worker bellekte tutulur. Kayıt 15 sn'de bir ve önemli olaylarda (seviye, satın alma, artı basma, ölüm) hemen kuyruğa girer. Kuyruk karakter başına birleştirilir, 4 paralel bağlantıyla yazılır. Oyun döngüsü veritabanını asla beklemez.
7. **save_version koruması:** Geç gelen eski kayıt yeni durumu ezemez (`UPDATE ... WHERE save_version < $v`).

## Hile / dupe önleme
8. **Hesap başına tek oturum; karakter başına tek sahip.** Yeni giriş eskisini düşürür. Yeni oturum, eski worker son durumu teslim etmeden karakteri yüklemez (kanal değiştirme dupe'u kapalı).
9. **Eşya kimliği UUID birincil anahtar:** Bir eşya veritabanında aynı anda iki karakterde bulunamaz.
10. **İşlem makbuzu (req id):** Satış, satın alma, artı basma, beceri ve bağış istekleri karakter başına son 64 işlem kimliğiyle tekrarlanmaya karşı korunur. Hesap düzeyindeki tek seferlik haklar (Başlangıç Sandığı) `receipts` tablosunda benzersiz anahtarla tutulur.
11. **Hareket bütçesi:** İstemci saniyede en fazla 20 adım komutu işletebilir (gerçek zaman bütçesi). Hız hilesi işe yaramaz; menzil, bekleme süresi, hasar ve fiyatları sunucu hesaplar.
12. **İki karakter arası aktarımlar** (takas, pazar) tek veritabanı işleminde yazılacak. *Henüz uygulanmadı; bkz. DEVAM_NOTU.*

## Oyun kuralı kararları
13. Seviye atlayınca can tamamen dolar (*yeni tasarım kararı*). Statü dağıtımında max can artışı bedava iyileşme vermez (şartnameye uygun).
14. Ölümde "Burada doğ" seçeneği 5 sn sonra açılır ve %50 canla doğurur. "Pazar Köyü'nde doğ" hemen kullanılabilir ve tam canla doğurur. 3 dk ölü kalan oyuncu otomatik olarak köye döner; ölü ekranında takılı kalınmaz.
15. Mücevher ve Öz öldürme anında doğrudan cüzdana eklenir (yere düşmez). Ekipman ve malzeme kişisel ganimet olarak yere düşer: 30 sn yerde kalır; ilk 5 sn yalnız elle alınabilir, sonra sahibine otomatik toplanır. Sahiplik şartı hiç kalkmaz.
16. Kara Bölge'ye girişte %5 Mücevher kaybı uyarısı onaylatılır. Kural yalnız PvP ölümünde uygulanır; ekipman korunur.

## Görsel
17. **2B → 3B geçişi:** Kullanıcı isteğiyle Drakensang tarzı izometrik 3B'ye geçildi (Three.js, WebGL2). Bütün modeller, dokular ve ikonlar kodla üretilir; dış görsel yoktur.
18. Kalite profilleri (Düşük/Orta/Yüksek) yalnız görselliği değiştirir: gölge, çimen, ortam gölgelemesi (GTAO), parıltı ve çözünürlük. Oyun kuralları her profilde aynıdır.
