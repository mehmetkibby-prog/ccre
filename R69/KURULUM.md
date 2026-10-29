# R69 toplu oyun düzeltmeleri

Kurulu R68 üzerine uygulanır. Oyundan ve oyun içi admin panelinden çıkıp 45 saniye bekleyin. Ön kayıt açık kalabilir; açılış ve ön kayıt ayarı korunur.

ZIP dosyasını `/root/CORE511_R69_TOPLU.zip` olarak yükledikten sonra:

```sh
python3 /root/CORE511_R69_TOPLU.zip --apply
```

Başarılı son satır **R69 TAMAMLANDI** olmalı. Oyun servisleri yeni sürüme geçer. Hesap servisi, oyun/hesap veritabanları ve mevcut kayıtlar korunur. Hata halinde önceki oyun koduna döner; eski veritabanı yedeği geri yüklemez.

Geri alma:

```sh
python3 /root/CORE511_R69_TOPLU.zip --rollback-latest
```

R67'de eklenen güvenli eski sürüm temizliği korunur: mevcut oyun, önceki oyun, hesap servisi ve kullanımda olan bağımlılıklar tutulur. Bu işlem veritabanlarını ve yedekleri silmez.
