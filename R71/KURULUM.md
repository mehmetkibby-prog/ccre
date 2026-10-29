# R71 oyun düzeltmeleri

Kurulu R70 üzerine uygulanır. Oyundan ve oyun içi admin panelinden çıkıp 45 saniye bekleyin. Ön kayıt açık kalabilir. Sunucu oyunculara açılmışsa panelden bakım moduna geçin; kurucu çevrimiçi oyuncu varken sürüm değiştirmez.

Dosyayı `/root/CORE511_R71_TOPLU.zip` adıyla yükledikten sonra:

```sh
python3 /root/CORE511_R71_TOPLU.zip --apply
```

Son satır **R71 TAMAMLANDI** olmalı. Oyun servisleri yeni sürüme geçer. Açılış ve ön kayıt ayarı korunur; hesap servisi yeniden başlatılmaz. Hesap, karakter, eşya ve görev verileri sıfırlanmaz. Veritabanı şeması değiştirilmez. Yeni istemci dosyaları sürümlü adreslerden yüklenir; açık oyun sekmesini normal şekilde yenileyerek yeniden girin.

Kontrol: iki farklı hesapla ayrı tarayıcılardan aynı kule/Sis haritasına girin; biri yürürken diğerinden izleyin. Grup zindanında da karşılıklı yürümeyi, kat geçişini ve güçlü silahla canavar öldürmeyi deneyin. Sis'te düşman adı kırmızı, grup arkadaşının adı mavi görünmeli.

Geri alma (R70'e döner, mevcut veritabanı korunur):

```sh
python3 /root/CORE511_R71_TOPLU.zip --rollback-latest
```

Yarım kurulumda aynı dosyayı `--recover` ile çalıştırın. Farklı bir sürümün yarım işlemi kendi paketiyle kurtarılmalıdır. R70'in yeni görev hedefleri R71'den R70'e geri dönüşte korunur.

Eski sürüm temizliği korunur: mevcut oyun, önceki oyun, hesap servisi ve kullanımda olan bağımlılıklar tutulur. Oyun veritabanı ve yedekler bu temizlikte silinmez.
