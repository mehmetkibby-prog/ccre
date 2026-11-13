# R114 — Rün haritaları ve topluluk forumu

Bu paket **R113_ENGINE1** üzerine kurulur. `--check` iki sunucunun gerçek kod
kimliğini doğrular. Farklı sürüm üzerine zorla kurulmaz.

1. ZIP'i sunucuda `/root/r114.zip` adıyla kaydet; verilen SHA256 ile doğrula.
2. `python3 /root/r114.zip --check`
3. Efsane yönetim panelinden bakımı başlat, geri sayım bitince:
   `python3 /root/r114.zip --apply`
4. Forum yöneticisini oluştur:
   `python3 /root/r114.zip --forum-admin`
   Komut kullanıcı adı, e-posta ve gizli parola ister. Forum yönetici bilgileri
   oyun yönetici bilgilerinden ayrıdır. Varsayılan veya ortak parola yoktur.
5. `https://coreoflife.net/forum` → Giriş yap. Yönetici resmî bölümlerde
   **Yeni konu aç** düğmesiyle duyuru, bakım, güncelleme ve etkinlik paylaşır.
6. Kontrolden sonra Efsane'yi panelinden aç. Akademi ön kayıt/bakım ayarları korunur.

## İçerik

- İki rün haritasında özel kıyı/iç yürüme engelleri kaldırılır. Harita dışı
  hareket, hız, giriş seviyesi ve ödül/sahiplik korumaları aynı kalır.
- Ana site bilgisayar/telefon menüsü ve alt menüye Forum bağlantısı eklenir.
- Forumda ayrı üyelik, güvenlik kodu, giriş, konu, yanıt, arama, sayfalama,
  yöneticiye özel resmî bölümler ve konu sabitleme/kilitleme/gizleme vardır.
- Üyeye kayıt sırasında tek kullanımlık kurtarma anahtarı gösterilir.
  Parola unutulursa bu anahtar ve güvenlik kodu gerekir. E-posta gizlidir;
  e-posta doğrulama/gönderme hizmeti veya e-postayla sıfırlama yoktur.
- Forum bağımsız servis, ayrı SQLite dosyası ve ayrı CAPTCHA worker kullanır.
  Oyun veritabanlarını açmaz; R113 motoru, dört kanal ve bütün geçmiş
  performans/ödül/sahiplik korumaları korunur.

## İşletim ve geri dönüş

- Forum servisi: `systemctl status coreoflife-forum.service --no-pager`
- Forum logu: `journalctl -u coreoflife-forum.service -n 40 --no-pager`
- Verisi: `/var/lib/coreoflife-forum/forum.sqlite`
- Yedek: `/var/lib/coreoflife-forum/backups/`; her gün 03:20 sunucu saati
  civarında tutarlı SQLite yedeği, SHA256 ve bütünlük kontrolü. Son 7 doğrulanmış
  yedek saklanır. Şüpheli yedek otomatik silinmez. Oyun DB yedeği çalıştırılmaz.
- Elle forum yedeği: `systemctl start coreoflife-forum-backup.service`
- Forum servisinde %50 tek çekirdek CPU ve 512 MB bellek sınırı vardır;
  oyun servislerine herhangi bir kaynak kısıtlaması eklenmez.
- Kurulum durumunu okumak: `python3 /root/r114.zip --status`
- Elektrik/bağlantı kesintisiyle yarıda kalan kurulumu geri almak:
  `python3 /root/r114.zip --recover`
- Tamamlanmış R114'ten R113'e dönmek için önce Efsane'de bakım başlat:
  `python3 /root/r114.zip --rollback`
  Oyun kodu/site yönlendirmesi geri alınır; oyuncu ilerlemesi ve forum üyelikleri,
  yazıları, yedekleri silinmez. Geri döndükten sonra aynı paket tekrar kurulabilir.

İki sunucu ve sekiz kanal, ayrıca forumun yerel/HTTPS açılışı doğrulanmadan
kurulum tamamlandı denmez. Önceki R113 şema/kurtarma kayıtları ve eski ZIP'ler
silinmez. R114 oyun veritabanı veya şema değişikliği içermez.
