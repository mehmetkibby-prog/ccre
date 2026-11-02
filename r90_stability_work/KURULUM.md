# CORE511 R90 kurulumu

Bu paket **R89_GAMEPLAY üzerine** kurulur. R89 kurulu değilse uygulamayın; kurucu farklı tabanda işlemi durdurur. R89'u yeniden kurmanız gerekmez.

1. Oyunu bakıma alın; oyuncular ve yönetici karakterleri oyundan çıksın. En az 45 saniye bekleyin.
2. `CORE511_R90_TOPLU.zip` dosyasını VDS'ye `/root/CORE511_R90_TOPLU.zip` adıyla yükleyin. Yanındaki `.sha256` dosyasıyla özeti doğrulayın.
3. Çalıştırın:

```bash
cd /root
sha256sum -c CORE511_R90_TOPLU.zip.sha256 && python3 -u /root/CORE511_R90_TOPLU.zip --apply
```

Yalnız `R90 TAMAMLANDI` mesajından sonra kurulum tamamlanmıştır. Paket bakım durumunu kendiliğinden açmaz. Mevcut oyun veritabanı ve hesap servisi korunur; sürümün doğru kaynak dosyaları, dört kanal ve kayıt işçisi doğrulanır.

Elle geri alma:

```bash
python3 -u /root/CORE511_R90_TOPLU.zip --rollback
```

Geri alma güncel oyuncu ilerlemesini eski veritabanı yedeğiyle değiştirmez; R89 koduna döner. Yarım kalmış işlemin kurtarılması için paketin `--help` çıktısındaki seçenekleri kullanın.
