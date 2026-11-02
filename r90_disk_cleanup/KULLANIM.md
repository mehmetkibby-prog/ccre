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

Oyun ve hesap servislerinin sağlıklı, mevcut kurulumun R90 veya R91 olması gerekir. Kurulum ve günlük yedek kilitleri alınır. Devam eden/yarım kurulum, değişen ayar, çalışan yedek, eksik geri alma dosyası veya kullanım değişikliği görülürse işlem durur. Servis durdurma/yeniden başlatma ve SQL yazma işlemi yapmaz. Denetim kayıtları `/var/lib/core511/release-retention` altındadır. Kesilirse aynı komut tekrar çalıştırılabilir; tamamlanan silmeler yinelenmez.

Yerel doğrulama gerçek geçici dosyalar, SQLite veritabanları ve `flock` kilitleriyle yapılmıştır; systemd, sağlık uçları ve canlı süreç bağları testlerde benzetilmiştir. VDS'de uygulanmış değildir. Klasörlerin görünen toplamı paylaşılan dosyalar nedeniyle kesin boşalacak alan değildir.
