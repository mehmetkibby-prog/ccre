# R90 / R91 disk temizliği

Bu paket yalnızca diski inceler veya kullanılmayan eski klasörleri temizler. R91 oyun güncellemesi ayrı dosyadır.

İnceleme (silme yapmaz):

```bash
python3 -u /root/TEMIZLIK.zip --inspect
```

Kontrolleri yapıp uygun eski klasörleri temizleme:

```bash
python3 -u /root/TEMIZLIK.zip --apply
```

Kapsam: `/opt/core511/releases` içindeki kullanılmayan, manifesti tanınan eski sürümler ve `/root`, `/var/tmp` altındaki tanınan eski kurulum klasörleri. Önce adayları ve korunan klasörleri gösterir. Her silmeden önce kontrolleri tekrarlar. Sonunda silinen klasör sayısını ve gerçek kullanılabilir boş alanı gösterir. Dosya sistemi kullanımı oyun çalışırken değişebileceği için boş alan farkı yalnız bu işlemin kesin kazancı sayılmaz.

Aktif oyun ve hesap klasörleri, servis/süreç/ayar/bağlantı bağımlılıkları ve kurulu R90/R91'in doğrulanmış kod geri alma dosyaları korunur. Mevcut veritabanları, SQLite WAL/SHM dosyaları, günlük yedekler, sıfırlama öncesi yedekler, `r64-updates` ve `/root` içindeki ZIP/arşivler temizlenmez. Veritabanı ya da sınıflandırılamayan arşiv içeren aday klasörler korunur. Bilinmeyen veya bağlı dosya sistemi içeren klasörler korunur.

İkinci sürümde, eski R78 klasörünün yanlışlıkla korunmasına yol açan şema dosyası filtresi düzeltildi. Orijinal `native510-bb3a6cc689c6/drizzle` paketindeki 61 SQL kaynak dosyası ve 61 şema JSON dosyası yalnızca sabit tam yolları, byte boyutları ve SHA256 değerleri eşleşirse kod olarak tanınır. Dosya adı/uzantısı tek başına yeterli değildir. Değiştirilmiş içerik, başka konumdaki SQL dökümü, gerçek SQLite veya başka yedek yine korunur. Kullanılan 698 sürümü servis/süreç kontrolüyle korunmaya devam eder. Korunan eski sürümlerin nedenleri ve ilk beş engelleyici dosya adı işlem sonunda da gösterilir.

Üçüncü sürümde aynı filtrenin sunucudaki dört bağımlılık harita dosyasını ve bir test raporunu engellemesi düzeltildi. Next.js 16.3.6 ve Lucide React 1.31.0 arşivleri, projenin `package-lock.json` SHA512 bütünlük değerleriyle doğrulandı; harita dosyalarının tam yolları, boyutları ve SHA256 değerleri sabitlendi. TAP raporu için özgün sürüm manifestinde doğrulanan `evidence-file-index.json` kaydı kullanılır. Genel `.map` veya `.tap` istisnası yoktur. Değişmiş/başka bir dosya, yedek, SQLite içeriği veya kullanılan sürüm korunur. Önceki yerel test kopyasında bu bağımlılık dosyalarının bulunmaması VDS'de ikinci koruma engelinin gözden kaçmasına yol açmıştı; yeni testlere gerçek npm harita dosyaları eklendi. TAP raporunun içeriği yerelde mevcut değildir; VDS'de kayıtlı SHA256 ile karşılaştırılır.

Oyun ve hesap servislerinin sağlıklı, mevcut kurulumun R90 veya R91 olması gerekir. Kurulum ve günlük yedek kilitleri alınır. Devam eden/yarım kurulum, değişen ayar, çalışan yedek, eksik geri alma dosyası veya kullanım değişikliği görülürse işlem durur. Servis durdurma/yeniden başlatma ve SQL yazma işlemi yapmaz. Denetim kayıtları `/var/lib/core511/release-retention` altındadır. Kesilirse aynı komut tekrar çalıştırılabilir; tamamlanan silmeler yinelenmez.

Yerel doğrulama gerçek geçici dosyalar, SQLite veritabanları ve `flock` kilitleriyle yapılmıştır; systemd, sağlık uçları ve canlı süreç bağları testlerde benzetilmiştir. VDS'de uygulanmış değildir. Klasörlerin görünen toplamı paylaşılan dosyalar nedeniyle kesin boşalacak alan değildir.
