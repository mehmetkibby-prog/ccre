# R122 disk bakımı ve kayıt temizliği

Kaynak: tam R121_CLEANUP1, R120 istemcisi korunmuş kurulum. Eski paketler değişmez.

1. `python3 paket.zip --check` ve `python3 paket.zip --check-disk` salt okunur ön kontroldür.
2. Ana panelden bakımı başlatıp 10 saniyelik geri sayımın bitmesini bekleyin.
3. `python3 paket.zip --apply`: iki sunucuya iki backend dosyasını yükler; kayıt temizliğini hızlandırır ve sağlık çıktısına ilerleme sayaçlarını ekler. Bakım ayarı korunur.
4. `python3 paket.zip --compact`: yalnız Efsane'nin büyük veritabanını oyun dururken hazırlar ve küçültür. Orijinal dosya silinmez veya değiştirilerek yeniden adlandırılmaz; SQLite backup işlemi aynı dosya kimliğine yazar. Süre canlı kayıt ve disk hızına bağlıdır. Başarıdan sonra panelden oyunu açın. Hazırlık kopyası alana sığmazsa asıl veritabanı değiştirilmeden servis yeniden açılır; üçüncü adımdaki kayıt temizliği düzeltmesi kurulu kalır.

Kopyada yalnız mevcut saklama kurallarına göre süresi dolmuş çekirdek aktarım makbuzları/bağlı taşma kayıtları, türetilmiş görüntüler ve tüm alıcıları onaylanmış eski bildirimler ayıklanır. Eşik çalışan oyunun saklama süresidir (varsayılan 15 dakika); yapılandırma ve süreç ortamındaki değerlerden daha uzun olanı korunur. Kesim zamanı oyun kapatılmadan önce sabitlenir, kopyalama süresince ilerletilmez. Oyuncular, eşyalar, ödül kayıtları, sahiplik ve sıra sınırları aynen kopyalanır. Henüz alıcı tarafından onaylanmamış bildirimler korunur. Tüm korunacak satırlar türleriyle birlikte hash/sayı olarak karşılaştırılır; şema, foreign key, sıra ve bütünlük kontrolleri zorunludur. Oyun dışarıdan tekrar açılmışsa eski kopya uygulanamaz.

Çıkacak dosya mevcut alana sığmazsa orijinal veritabanına yazılmadan durur. Tam kopya disk alanını dolduramaz; 2 GiB acil alan ve kurulum payı ayrılır. Eski 9 GB yedek korunur. Doğrulanmış yeni kopya `/var/lib/core511/r122-disk/run-*/verified.sqlite` altında root erişimiyle saklanır; geçmişi ayıklanmış bu kopya bütün eski makbuzların arşivi değildir.

Yarıda kalmış küçültme: `python3 paket.zip --recover-disk`. Yarım kod kurulumu: `python3 paket.zip --recover`. Disk bakımı SQL commit sırasında kesilirse servis koruması kalır; doğrulanmış kopyadan ileri tamamlama yapılır. Oyuncu dosyalarını/WAL'ı elle silmeyin. Kod geri alma komutu `--rollback`, kodu R121'e döndürür; oyuncu kayıtlarını veya küçültmeyi geri almaz.

Düzenli temizlik 100 ms aralıklarla boşluk arar, eski kayıt varken 2 ms hedefli küçük işlemler yürütür, iş kalmadığında saniyede bir taramaya döner. Her kayıt türünün parti boyutu bağımsızdır. Oyuncu işi ve dayanıklılık kontrolleri korunur. Senkron SQLite I/O'su süre hedefini aşabilir; bu bir gecikmesizlik garantisi değildir. 60 saniyede bir `core511_retention_r122` özeti ve `/api/vds-health` içinde `retentionMaintenance` alanı okunur. Sürekli dolu yazıcıda temizlik ertelenebilir; canlı ilerleme doğrulanmalıdır. Eski sayfa alanı SQLite içinde tekrar kullanılır; mevcut büyük dosyayı işletim sisteminde küçülten adım ayrı `--compact` işlemidir.
