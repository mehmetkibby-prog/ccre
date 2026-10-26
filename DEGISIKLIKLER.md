# R61 → R62 değişiklikleri

Üretim oyun kodu bu bağımsız teslim hazırlanırken değiştirilmedi. Önceki R62 oyun/site iç paketleri aynıdır; yeni dış kurucu, SHA ile doğruladığı eski taban arşivini kendi içinde taşır. Ayrı kaynak ZIP'leri, sabit Node ve bağımlılıklar, taşınabilir test çalıştırıcısı ve yeni ölçümler eklendi. Yeni testlerin başarısızlıkları TEST_SONUCLARI.md içindedir.

| Anahtar | Kaynakta tanımsız/0 | R62 kurulum profili | 0 olduğunda |
|---|---|---|---|
| CORE511_R62_AZRAIL | Kapalı | 1 | R61 ikonu/açıklaması; yeni sandık dünya duyurusu üretilmez. Daha önce kaydedilmiş mesajlar silinmez. |
| CORE511_R62_CHEST_MARKET | Kapalı | 1 | R61 pazar listeleme ve native malzeme tanıma yolu. Mevcut satış kayıtları silinmez; açık ilan varken kapatılacaksa ayrıca değerlendirilmelidir. |
| CORE511_R62_INVENTORY | Kapalı | 1 | R61 ekipman/çanta CSS düzeni. Eşya bilgileri ve detay penceresi veri olarak değişmez. |
| CORE511_R62_VERIFICATION | Kapalı | 1 | Altı rakamlı doğrulamanın R61'deki iki koordinatör/yazıcı kuyruk geçişi. |

Testlerde kullanılan diğer bütün anahtarlar iki kaynak ZIP'indeki `profiles/features.env` dosyalarında sabittir. Bu test profili, herhangi bir canlı VDS'nin bütün mevcut ayarlarının yerine yazılacak dosya değildir.

Değişiklikler:

- Ön kayıt: gerçek başlangıç hediyesi açıklaması (3 günlük tilki, 50 mücevher, 10 kırmızı iksir; tilki bonusları +10 saldırı, +350 can). Admin kontrollü ön kayıt/sayaç davranışı korunur.
- Azrail: yeni 96×96 WebP ikon (4.726 bayt), yeni açıklama; açılışta gerçekten çıkan eşyalar mevcut işlem/receipt ve outbox üzerinden Dünya/Sunucu mesajına gider. Tekrar isteği ikinci ödül/duyuru üretmez. Dünyadaki mesajları yeniden tarayan döngü eklenmedi.
- Sandık pazarı: native malzeme escrow/satın alma/iptal/receipt yolu kullanılır.
- Envanter: kutuda isim ve artı; tıklama/dokunma detay penceresinde efsun ve taşlar görünür. PC'de dört işlem düğmesi aynı satırdadır; dar mobil ekranda 2×2 düzen kullanılır.
- Online kontrol: oyun içi altı rakamlı doğrulamada yanıt mevcut dayanıklı doğrulama işleminde hazırlanır. Oturum/CSRF, yanlış deneme sayacı, tek kullanım, disk kalıcılığı ve kanal ACK kontrolü korunur. Ağ veya başka doğrulama ekranlarının bütün bekleme sebeplerinin çözüldüğü iddia edilmez.

Oyun çekirdeğinde 16 dosya değişmiştir. `DEGISEN_DOSYALAR.json`, kaynak ağaçları ve web sitesi dahil her değişikliğin önce/sonra SHA ve boyutunu; `R61_R62_TAM.diff` metin farkını içerir. Üretilmiş istemci dosyaları da dahil edilmiştir; ikili ikon farkı hash ile gösterilir. Native kaynak ağacı R61/R62 arasında aynıdır.

## Kapsam ve bilinen sınırlar

- Kaynak ZIP'leri mevcut core511 kaynaklarının tamamını, native kaynak dışa aktarımını, fixture'ları, kilitli bağımlılıkları ve Node'u içerir. Eski oyun ZIP'ine ihtiyaç duymadan verilen yük testini çalıştırır.
- Native dışa aktarımında orijinal üretim manifestinin 2.469 medya/derleme/bildirim dosyası yoktur (817.795.929 bayt). Eksik yollar `NATIVE_EXPORT.json` içinde açıkça listelenmiştir. Bunlar mevcut olmayan dosyalar gibi gösterilmedi. Bu kaynak teslimi bütün eski medya dosyalarıyla sıfırdan canlı oyun kurulum arşivi değildir.
- Test adaptörleri eksik derlenmiş lonca modülü için native kaynak eşdeğerini, eksik .d.mts bildirimleri için kaynak dışa aktarımı uyarlamasını kullanır. Mevcut native dosyaların SHA kontrolleri korunur. Geçici DB/oyuncular testte oluşturulur; gerçek hesap/DB/parola içermez.
- Yerel sunucu yükü ölçülür. İnternet gecikmesi, oyuncu cihazı/FPS veya kullanıcının 8 CPU/8 GB VDS'si ölçülmedi. Bu ortamın cgroup sınırları ham source.json dosyalarında bulunur.
- İlk saldırı yanıtı ile ölümün ve tüm ödüllerin kalıcı tamamlanması ayrı metriklerdir. Ham sonuçlarda düşük örnek sayısı ve bitmemiş ödül varsa yalnız tamamlanan örneklerin yüzdeliği bütün işlemlerin tamamlandığını göstermez.
- Yeni yoğun testlerde görülen kabul başarısızlıkları korunmuştur. Bu teslim canlıya hazır onayı değildir; Claude inceleyip karar verecek.
