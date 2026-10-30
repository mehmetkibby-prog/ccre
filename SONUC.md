# R78 — gereksiz durdurmalar ve sunucu ölçüm yükü

## Doğrulanan takılma nedeni

Pazarın ürün listesini getiren salt okunur HTTP isteği, oyuncuyu durdurma, kayıtlarını boşaltma ve yeniden yükleme yoluna giriyordu. Liste okuması uzadığında hareket de bu işlemin tamamlanmasını bekliyordu. R78, yalnız bu okumadaki gereksiz durdurmayı kaldırır. Kimlik doğrulama, tek anlık veritabanı görüntüsü, kanal/görünürlük/süre kontrolleri, işlem sıralaması ve kalıcılık beklemesi korunur.

Gerçek yerel HTTP sunucusu ve dört kanal kullanılan karşılaştırmada aynı pazar okumasına 400 ms bekleme eklendi. R77'de oyuncu dondu, hareket yeniden denendi ve 463,59 ms'de işlendi. R78'de oyuncu donmadı; hareket, liste cevabı beklenirken 36,09 ms'de işlendi. Bu ölçüm canlı sunucu pingi veya iki ekran arası gecikme ölçümü değildir.

Kimliksiz erişim, geçersiz kimlik, başka kanal, kapanmış/süresi dolmuş/eksik pazar ve Pazar Köyü dışından erişim kontrolleri geçti. Kalıcılık beklemesi sürerken hareket devam etti; kalıcılık hatası HTTP 500 ile sonuçlandı ve oyuncu kilitli kalmadı. Gerçek satın alma testi alıcı/satıcı kilitlerini, kayıt tamamlanmadan sonuç verilmemesini ve aynı isteğin tekrarında tek ödeme yapılmasını doğruladı.

## Ödül verilmişken tekrar durdurulan kanallar

Arka plan ödül kontrolü bir iş seçtikten sonra oyuncunun gerçek `claim_rewards` işlemi ödülü tamamlayabiliyordu. Eski seçim yine de dört kanalı durduruyor, hiçbir oyuncu/veri değişmemesine rağmen tamamlama yolunu tekrar çalıştırıyordu. Gerçek dört kanallı test bu yarışı doğruladı.

R78, kabul edilmiş ortak işler bittikten sonra ve kanalları durdurmadan önce aynı yetkili okuyucuyla iş kalıp kalmadığını yeniden denetler. Yalnız açıkça boş sonuçta eski işi iptal eder. Testte gereksiz kanal durdurma sayısı 1 → 0 oldu. Başka bir ödül veya bakım işi varsa, okuma belirsizse ya da hata oluşursa kontrol atlanmaz. Dünya/oyuncu sahipliği değişirse eski seçim kullanılamaz.

7 odaklı denetim ve 2 gerçek süreç testi geçti. Ödülün önceden alındığı senaryoda gereksiz durdurma kalktı; gerçekten bekleyen ödül senaryosunda mevcut durdurma, tek ödeme, kalıcılık ve devam ettirme korumaları çalışmaya devam etti.

## Ana işlemde gereksiz ölçüm maliyeti

Genel işlem sürelerini kaydeden iki iç çağrı, kullanmadıkları ayrıntılı SQL sayaçlarını da hesaplıyordu. R78 yalnız bu çağrılarda gereksiz ayrıntıyı atlar. Kuyruk, işlem, COMMIT ve kalıcılık süreleri ile açıkça istenen ayrıntılı SQL ölçümleri korunur. Başarılı sorgularda kullanılmayan hata etiketi ve SHA256 hesabı da artık yalnız gerçek SQLite hatasında yapılır.

Yerel, bellek içi SQLite karşılaştırmasında 5 × 5.000 korumalı komut çalıştırıldı. Ortanca duvar süresi 290,09 → 170,60 ms, CPU süresi 317,66 → 174,98 ms oldu. Bu, ölçüm maliyetini öne çıkaran dar bir mikrotesttir; canlı oyunun CPU kullanımında veya oyuncu gecikmesinde aynı oranda iyileşme vaat etmez.

14 odaklı test geçti: eski/yeni ayrıntılı sayaçların eşitliği, iç içe ölçümler, gerçek LocalDatabase kayıt yolu, işlem sırası, başarısız işin geri alınması, disk kalıcılığı tamamlanmadan onay verilmemesi, hata kimliği/etiketi, sahte hata kodunun reddi ve yinelenen isteğin aynı işlemi yeniden uygulamaması. SQL yetki kontrolleri, COMMIT, fsync ve ekonomi kuralları değiştirilmedi.

## Hareket ve saldırı incelemesi

Normal haritada gerçek yerel WebSocket sunucusuyla iki ayrı 30 saniyelik yapay trafik deneyi yapıldı. Dört kanala dağılan 24 oyuncuda atak onayı p95 57 ms / en yüksek 220 ms, hareket onayı p95 64 ms / en yüksek 105 ms ölçüldü. Tek kanaldaki 22 oyuncuda atak onayı p95 64 ms / en yüksek 160 ms, hareket onayı p95 59 ms / en yüksek 60 ms oldu. Tek kanal testinde 875/875 girdi tamamlandı; hata, kopma ve biriken girdi kuyruğu görülmedi. Bunlar kısa yerel testlerdir; canlı VDS kapasitesini veya bir saatlik kesintisiz akıcılığı kanıtlamaz.

Kalıcı saldırı/ölüm/ödül işlemleri, gerekli sahiplik koruması altında kayıt onayını bekler. Tek bir yavaş SQL işi veya COMMIT bu beklemeyi uzatabilir. Bu korumalar kaldırılmadı. Yerel Node/SQLite tabanında ayrı checkpoint işçisi sürüm güvenlik kontrolünden dolayı kullanılamıyor; bu durumun canlı sunucuda geçerli olup olmadığı ve bildirilen olayla ilişkisi doğrulanmadı. Güvenlik kontrolü veya kayıt garantileri devre dışı bırakılmadı.

## Kurulum ve geri alma

Kurucu için 3 odaklı yaşam döngüsü testi geçti: R77 üzerine kurulum/tekrar kurulum/geri alma, açılış sağlık kontrolü başarısızlığında otomatik geri dönüş, yanlış sürüm veya değiştirilmiş native ölçüm dosyasında işlemden önce durma. Veritabanı SHA256 değeri, hesaplar, mevcut ödül defteri/tetikleyicisi, HTTP dosyası ve istemci dosyalarının korunduğu denetlendi. Bu testlerden sonra yalnız üç ek sunucu modülü ve belgeler pakete eklendi; ek modüller yukarıdaki ayrı 7 denetim ve 2 gerçek süreç testiyle doğrulandı. Kurulum mantığı değiştirilmedi; son arşivin tüm içerik hashleri ayrıca denetlenir.

## Kapsam ve sınırlar

R78, doğrulanmış R77 üzerine uygulanır. Hesap servisi, veritabanı şeması, istemci hareket çizimi ve mevcut ödül/ekonomi kuralları değiştirilmez. Önceki güncellemeler korunur. Bu çalışma yerel test ortamında yapılmıştır; canlı sunucuya erişilmemiş ve kurulum yapılmamıştır.

Paylaşılan 60 saniyelik CPU profili, kullanıcının bildirdiği üzere lag yaşanmayan sırada alınmıştır. Önceki günlüklerdeki 1.169 ms sunucu cevabı gerçek bir gecikme işaretidir; kayıt istek türünü içermediği için doğrudan bu pazar hatasına bağlanamaz. Yukarıdaki test bir takılma mekanizmasını kanıtlar; tüm canlı gecikmelerin tek nedeni olduğunu kanıtlamaz. Paneldeki ana işlem yüzdesi son iki saniyelik olay döngüsü kullanımını gösterir, VDS toplam CPU yüzdesini göstermez.
