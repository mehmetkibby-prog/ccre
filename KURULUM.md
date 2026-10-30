R79 — kayıt işçisi, doğrulama akışı ve toplu ödül işlemleri

Doğrulanmış R78 oyun sürümüne uygulanır. Önce yönetim panelinden bakım moduna alın; oyundan ve oyun yönetim panelinden çıkıp 45 saniye bekleyin.

```bash
python3 -u /root/CORE511_R79_TOPLU.zip --apply
```

`R79 TAMAMLANDI` yazınca bakım modunu kapatın. Oyuncular sayfayı yenileyerek güncel istemciye geçebilir.

Paket, oyun için Node 22.23.4 ve SQLite 3.53.4 çalışma zamanını içerir. Bu nedenle R78 paketinden büyüktür; VDS üzerinde ek indirme yapmaz. Yeni çalışma zamanı yalnız hazırlanan oyun sürümüne bağlanır. Hesap servisi, önceki oyun sürümü ve veritabanları yerinde korunur.

Kurulum, yeni sürümün dosyalarını, dört kanalını, kayıt işçisinin hazır oluşunu ve çalışma zamanı sürümlerini doğrular. Hazırlıkta hata olursa mevcut oyun sürümü korunur; geçişten sonra sağlık kontrolü başarısız olursa R78'e döner. Mevcut ve önceki sürüm ile hesap/çalışan servislerin kullandığı sürümler korunur; doğrulanmış kullanılmayan eski sürümler temizlenir.

Geri alma için tekrar bakım moduna alın, oyundan çıkıp 45 saniye bekleyin:

```bash
python3 -u /root/CORE511_R79_TOPLU.zip --rollback-latest
```

R78 koduna ve önceki oyun çalışma zamanına dönülür. Veritabanı yedeği geri yüklenmez; mevcut hesaplar, oyuncular ve ödül kayıtları korunur. Yarım kalmış kurulum bildirilirse aynı paketle `--recover` kullanın.
