# R64 sonucu

R64, kayıt servisinin çalışmasını koruyan yeni oyun güncelleme düzeni ve site düzeltmesidir. Oyun çekirdeği R63 olarak kalır; karakter/hesap silme veya yeni SQL şema değişikliği içermez. Canlı VDS'ye kurulmadı.

## Ön kayıt ve izinli giriş

Önceki ön kayıt sayfası genel/anonim `/api/site-launch` yanıtını kullanıyor, `/api/auth/me` yanıtındaki hesaba özel `launch.canPlay/earlyAccess` bilgisini dikkate almıyordu. Bu yüzden kayıt listesinden verilen izin hem manuel hem otomatik açılışta görünmüyordu.

Düzeltme, yalnız oturumu doğrulanmış izinli hesapta Oyuna gir bağlantısını gösterir. Yetkiyi sunucunun mevcut SSO sistemi uygular. Sayfa görünürken izin 15 saniyede bir, ayrıca sekmeye dönüşte ve bağlantı geri geldiğinde kontrol edilir. Anonim ziyaretçiye bu ek sorgu döngüsü uygulanmaz. İzni kontrol et düğmesi vardır. İzin kaldırıldığında, oturum bittiğinde veya doğrulama hatasında bağlantı gizlenir. Genel açılış modu ve sayacı değişmez.

## Güncelleme sırasında kayıt

Hesap servisi, kaynağı, yapılandırması ve veritabanı kimliği değişmez. Oyun için bağımsız kaynak kopyası hazırlanır; program dosyaları hesap servisinin kaynağından ayrılır, değişmeyen medya bağları korunur. Yalnız oyun ve aktif realtime servisi durdurulup başlatılır. Geçici sunucu giriş kapısı mevcut imzalı merkezi API ile yönetilir; genel ön kayıt modu, saat ve izin listesi korunur. Kurtarma/geri alma yalnız dosya ve yapılandırma seçimidir; eski hesap veya oyun DB yedeği yüklenmez.

Güncelleme yalnız oyun boşken çalışır. Devam eden hesap sıfırlaması ve yeni oyuncu girişi denetimde engellenir. Hesap sunucusu veya SQL şeması değişecek gelecekteki paketler ayrı değerlendirilmelidir.

## Site

Ana sayfa ve ön kayıt sayfasında görünür Başlangıç Sandığı bölümü: 3 günlük Başlangıç Tilkisi, 50 Mücevher, 10 Kırmızı İksir. İçerik mevcut R63 starter-reward kaynağına dayanır. Yeni YouTube Shorts `KgtTQqdQFaU` tıklamayla yüklenir; eski 60 saniyelik genel tanıtım korunur. İlk açılışta YouTube isteği/video indirmesi yapılmaz. Küçük site paketinde mevcut medya yeniden kullanılır.

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| Gerçek R63 auth/launch/SSO + Chromium: manuel ve otomatik mod; izin verme/kaldırma; sayfayı yenilemeden 15 saniyede izin algılama | Geçti |
| İzinsiz ikinci hesap, API hatası, oturumun bitmesi; sunucuda gerçek SSO reddi | Geçti |
| Ana/ön kayıt sayfası 320, 390, 768, 1440 px; video tıklama/kapatma ve odak dönüşü | Geçti |
| Admin oyun durumu, özel açılış saati, sayaç ve yetkilendirme regresyonu | 17 kontrol geçti |
| Gerçek Caddy ile site delta ZIP kurulum, tekrar kurulum, geri alma, değiştirilmiş taban reddi, arıza geri dönüşü | 7 grup geçti |
| Oyun kurucusu: başarı/tekrar/geri alma, başlatma hatası, otomatik ön kayıt, admin mod değişikliği, yarım seçim kurtarma, sıfırlama/oyuncu reddi | 6 test geçti |
| Bu kurucu senaryolarında yeni hesapların korunması ve parola ile gerçek native login | 38/38 |
| Birleşik paket sırası, site ön kontrol hatası, oyun hatası, site hatasında yalnız yeni oyun seçiminin geri alınması | 7 test geçti |
| Değişmeyen R63 çekirdeğinde dört kanalın gerçek çocuk süreçlerle açılması, açık kanal seçimi ve oynanabilir bağlantı bileti | Geçti |

Kurucu entegrasyon testinde gerçek dosya kopyalama, R63 kaynak doğrulayıcıları, SQLite, hesap HTTP işleyicileri, hesap PID/config/inode kontrolleri ve imzalı merkezi çağrılar çalıştı. Systemd işlemleri ve kurucunun oyun sağlık yanıtı yerel testte taklit edildi; ayrı dört kanal açılış testi gerçek çekirdek süreçleriyle yapıldı. Bu sonuçlar canlı VDS veya 100 oyunculu performans ölçümü değildir.

YouTube iframe adresi/CSP/tıklamayla yükleme ve kapatılma test edildi; YouTube üzerinde videonun herkese açık oynatılabilirliği bu ortamda doğrulanmadı. YouTube'da aç bağlantısı ayrıca mevcut.

Eski `native-realm-startup` test dosyasındaki iki çıplak ticket isteği, R63'ün zorunlu kanal seçimi nedeniyle 409 verdi. Yeni açılış testi gerçek giriş ekranındaki gibi `character {channel:1}` kullanılarak geçirildi; bu eski testleri geçmiş gibi raporlamıyoruz. Oyun kaynak kodu bu nedenle değiştirilmedi.

Kanıtlar: `evidence/site-access.json`, `evidence/updater-roundtrip.json`, `evidence/updater-roundtrip.log`, `evidence/native-game-boot.log`, `evidence/bundle.log`, `site/evidence/admin-control.json`, `site/evidence/r64-site-install.log`.

## 27 Ekim — site erişim izni düzeltmesi
İlk R64 kurulumunda umask 077 nedeniyle yeni statik alt dizinler 0700 oluştu; Caddy ayrı kullanıcıyla CSS/JS okuyamadı. İlk testler Caddy'yi dosya sahibiyle çalıştırdığı için hata kaçmıştı. Kurucu artık doğrulanmış genel site dizinlerini 0755, genel dosyaları 0644 yapar; tekrar kurulum da mevcut izinleri onarır. Özel kurulum kayıtları 0700 kalır. Üretimdeki umask 077 ile ilk kurulum/tekrar onarım, POSIX diğer kullanıcı okuma-geçiş izinleri ve Caddy CSS/JS 200 yanıtları test edildi.
