# R70 toplu oyun güncellemesi

Kurulu R69 üzerine uygulanır. Oyundan ve oyun içi admin panelinden çıkıp 45 saniye bekleyin. Ön kayıt açık kalabilir; açılış ve ön kayıt ayarı korunur.

ZIP dosyasını `/root/CORE511_R70_TOPLU.zip` olarak yükledikten sonra:

```sh
python3 /root/CORE511_R70_TOPLU.zip --apply
```

Son satır **R70 TAMAMLANDI** olmalı. Oyun servisleri yeni sürüme geçer. Hesap servisi yeniden başlatılmaz. Hesaplar, karakterler, eşyalar ve mevcut görev ödülleri korunur. Sefer geçmişi üzerinde yalnızca üç sorgu indeksi eklenir; veri sıfırlanmaz.

Geri alma:

```sh
python3 /root/CORE511_R70_TOPLU.zip --rollback-latest
```

R70’in yeni hedef türleriyle görev kaydettiyseniz R69 bunları okuyamaz. Kurucu bunu oyun servisini durdurmadan denetler ve hangi görevleri panelden kaldırmanız gerektiğini söyler. Önce bu görevleri listeden kaldırıp kaydedin; alınmış ödüller geri alınmaz. Geri alma eski veritabanı yedeğini yüklemez.

Güvenli eski sürüm temizliği korunur: mevcut oyun, önceki oyun, hesap servisi ve kullanımda olan bağımlılıklar tutulur. Oyun veritabanı ve yedekler bu temizlikte silinmez.
