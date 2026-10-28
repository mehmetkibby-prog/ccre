# Disk teşhisi ve kapsam

Kullanıcının VDS çıktısı: `/opt` 38 GB, `/var` 42 GB; `/opt/core511/releases` 29 GB. Beş büyük sürüm klasörü görüldü: temel sürüm, R64, R65, R66 accounts ve R66 panel. `/var/lib/core511/r63-recovery-backups` 6,6 GB ve `launch-reset-r63` 13 GB. `/var/lib/coreoflife-realms-417/r1` 14 GB; canlı veri olabilir, silinmez. R63 klasörlerindeki dosyaların tamamı ayrıca incelenmedi.

Kurucu yalnız `/opt/core511/releases` altındaki tanınan, artık kullanılmayan sürüm ağaçlarını silebilir. Aktif kurulum/geri dönüş günlüğü, servis yolları, çalışan süreçler, sembolik bağlantı bağımlılıkları, kalıcı veriler, mount noktaları ve bilinmeyen klasörler denetlenir. Alan hesabı paylaşılan hardlinkleri serbest kalacak bayt olarak saymaz. Silme başlangıcı kalıcı günlüğe yazılır; yarım silme sonraki çalıştırmada yeniden denetlenir. Belirsizlikte temizlik durur.

Temizlenecek alanın miktarı canlı servis ve bağlantı kontrollerine bağlıdır. Buradan VDS’ye erişilmedi veya dosya silinmedi. Paket yerel testlerden sonra teslim edilir. Oyun yük testi sonuçları SONUC.md’deki önceki R67 ölçümleridir; oyun yükü yeniden değiştirilmedi.
