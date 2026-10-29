# R68 toplu açılış düzeltmeleri

Kurulu R67 üzerine uygulanır. Instagram görselleri ayrı teslim edilir.

Oyundan ve oyun içi admin panelinden çıkıp 45 saniye bekleyin. Ön kayıt açık kalabilir; mevcut ön kayıt/açılış ayarı korunur.

ZIP dosyasını `/root/CORE511_R68_TOPLU.zip` olarak yükledikten sonra:

```sh
python3 /root/CORE511_R68_TOPLU.zip --apply
```

Başarılı son satır **R68 TAMAMLANDI** olmalı. Kurucu hesap servisini yeniden başlatmaz. Oyun servisleri yeni sürüme geçer; hesap ve oyun veritabanları korunur. Hata varsa durur veya önceki oyun sürümüne döner. Eski veritabanı yedeği geri yüklenmez.

Gerektiğinde son güncellemeyi geri alma:

```sh
python3 /root/CORE511_R68_TOPLU.zip --rollback-latest
```

R67'deki güvenli sürüm temizliği devam eder: mevcut ve bir önceki oyun sürümü, hesap servisi ve hâlâ kullanılan bağımlılıklar korunur. Veritabanları ve günlük yedekler bu sürüm temizliğinin dışında kalır.
