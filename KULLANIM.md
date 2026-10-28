# R67 veritabanı küçültme

Bu paket yalnızca kurulu R67 oyununun veritabanındaki boş SQLite sayfalarını kaldırır. Oyun sürümü, hesap veritabanı, ayarlar, günlük yedekler ve sıfırlama öncesi yedekler değiştirilmez. Mevcut oyun veritabanının yolu, inode kimliği ve izinleri korunur.

## Çalıştırma

Ön kayıt/scheduled modu açık kalabilir. Oyunda ve oyun içi admin panelinde oturumunuz varsa çıkıp 45 saniye bekleyin. Paket dolu oyunla çalışmayı reddeder. Oyun servisleri kısa süre durur; hesap/ön kayıt servisi yeniden başlatılmaz. Genel açılış modu ve tarihi değiştirilmez. İlgili oyun sunucusunun giriş kapısı işlem süresince kapatılır ve sağlık kontrolünden sonra eski durumuna getirilir.

    python3 -u CORE511_R67_DB_KUCULT.zip --apply

Yalnızca boyut ölçümü:

    python3 -u CORE511_R67_DB_KUCULT.zip --inspect

Elektrik kesintisi/yarım işlem sonrası aynı `--apply` komutu önce kurtarmayı çalıştırır. Açıkça kurtarma da istenebilir:

    python3 -u CORE511_R67_DB_KUCULT.zip --recover

## Doğrulama ve alan

- İşlem ortak kurulum kilidini ve mevcut oyun günlük yedek kilidini alır.
- Çalışan oyunlar durmadan veritabanı küçültülmez. Yeniden açılmayı engelleyen systemd koruması işlem kaydıyla birlikte kalıcıdır.
- Özel bir çalışma kopyası hazırlanır. Gizli `rowid` değerlerini korumak için gereken geçici indeksler sadece bu kopyada oluşturulur. Küçük kopyadan bu indeksler kaldırılır.
- Bütün tabloların bütün satırları (gizli kayıt numaraları dahil), şema, tetikleyiciler, indeksler, sayaçlar ve yabancı anahtar kontrolü karşılaştırılır; SQLite bütünlük kontrolü çalıştırılır.
- Doğrulanmış küçük kopya SQLite yedekleme API'siyle mevcut oyun dosyasına aktarılır. Dosya yeniden adlandırılmaz/değiştirilmez. Oyunun WAL dosyasına yalnızca oyun durdurulmuşken ve özel SQLite kilidi eldeyken SQLite üzerinden checkpoint uygulanır; WAL elle silinmez.
- Büyük geçici çalışma kopyası kaldırılır; küçük doğrulanmış kurtarma kopyası `/var/lib/core511/db-compact-r67/` altında saklanır. Diğer yedekler silinmez.
- Oyun yeniden çalıştırılmaya başladıktan sonra kurtarma hiçbir eski DB kopyasını geri yüklemez; yeni dünya/oyuncu kayıtlarını korur.

6,49 GiB boş sayfa ölçülen veritabanında yaklaşık bu kadar alanın geri kazanılması beklenir; gerçek sonuç son boyut ve `df -h /` çıktısıyla görülür. İşlem için geçici boş alan da gerekir ve başlamadan denetlenir. Sonraki günlük yedekler küçülmüş dosyadan alınır; mevcut eski yedekler bu paketle değişmez.

Bu bir periyodik görev değildir. Güncelleme sırasında eski sürüm temizliği R67 TOPLU DISK kurucusundaki ayrı özelliktir. Canlı sunucuda uzaktan işlem yapılmadı; test kapsamı TEST_SONUCLARI.json dosyasında belirtilir.
