# R67 — Giriş hızı ve İlk Adımlar toplu güncellemesi

Bu paket başarıyla kurulmuş R66 üzerine uygulanır. R66 hesap girişi, yönetim paneli ve site düzeltmelerini korur.

1. Oyundan ve oyun içindeki admin karakterinden çıkın; 45 saniye bekleyin.
2. Ön kayıt veya henüz açılış saati gelmemiş otomatik açılış modunda kalabilirsiniz. Ön kayıt hizmeti çalışmaya devam eder. Açık oyun modunda bakım gereklidir.
3. Paketi VDS’ye indirdikten sonra çalıştırın:

```sh
sudo python3 /root/CORE511_R67_TOPLU.zip --apply
```

`--apply` gerekli kaynak, servis, veritabanı kimliği, disk ve oyun durumu kontrollerini zaten yapar. Yalnız kontrol etmek için `--check` kullanılabilir.

Başarı mesajı: **R67 TAMAMLANDI. Giriş hızı ve İlk Adımlar düzeltmesi kuruldu. Dört kanal hazır; ön kayıt ayarı ve hesaplar korundu.**

Kurulum oyun süreçlerini yeniden başlatır. Hesap/kayıt servisini yeniden başlatmaz; veritabanı şeması, hesaplar, karakterler, ödüller, site dosyaları veya açılış ayarları değiştirilmez. Oyun veritabanı yedeği geri yüklenmez. Disk hesabı, gerçekten kopyalanacak benzersiz dosyalar üzerinden yapılır. Eski sürümler veya yedekler silinmez.

Gerektiğinde aynı paketle:

```sh
sudo python3 /root/CORE511_R67_TOPLU.zip --recover
```

Tamamlanmış R67’yi geri almak için (oyuncular çıktıktan sonra, ön kayıt/bakım durumunda):

```sh
sudo python3 /root/CORE511_R67_TOPLU.zip --rollback-latest
```

İndirme bağlantısı ayrıca sağlanır. Yukarıdaki uygulama komutu indirme yapmaz.
