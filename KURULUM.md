# Core of Life R85 kurulumu

Bu paket **kurulu R84_GAMEPLAY üzerine** uygulanır. R84'ü yeniden kurmayın. Paket bir kod ve istemci güncellemesidir; veritabanı şeması, hesaplar, karakterler, eşyalar ve yönetim ayarları değiştirilmez.

1. `CORE511_R85_TOPLU.zip` ve `CORE511_R85_TOPLU.zip.sha256` dosyalarını VDS'nin `/root` dizinine koyun.
2. Oyunu yönetim panelinden bakıma alın. Oyuncuların ve oyuna girmiş admin karakterlerinin çıkmasını bekleyin; son çıkıştan sonra en az 45 saniye geçsin. Kurucu bakım ve boş oturum koşullarını ayrıca denetler.
3. VDS terminalinde çalıştırın:

```bash
cd /root &&
sha256sum -c CORE511_R85_TOPLU.zip.sha256 &&
python3 -u /root/CORE511_R85_TOPLU.zip --apply
```

`R85 TAMAMLANDI` görülmeden kurulum tamamlandı sayılmaz. Kurucu dört kanalın açılmasını ve kaynak kimliğini kontrol eder. Oyun açma/bakım tercihi yönetim panelinde kalır; kurulumdan sonra panelden açın. Oyuncular yeni istemciyi almak için sayfalarını yenilesin.

Kurucu yeni bir tam oyun kopyası üretmez. Mevcut Node/SQLite çalışma zamanını korur; değişmeyen istemci varlıklarını doğrulayıp sabit bağlantılarla paylaşır. Hesap servisini yeniden başlatmaz. Canlı veritabanını kurulum öncesi güvenli API yedeğiyle kontrol eder; başarılı kurulumun geçici yedeğini temizler.

## Kesinti sonrası kurtarma

Aynı R85 ZIP dosyasıyla:

```bash
python3 -u /root/CORE511_R85_TOPLU.zip --recover
```

## R84 koduna geri dönme

Oyunu panelden bakıma alıp oturumların boşalmasını bekledikten sonra:

```bash
python3 -u /root/CORE511_R85_TOPLU.zip --rollback-latest
```

Geri alma **R84 kodu + güncel oyun veritabanı** ile çalışır. Eski veritabanı oyuncuların yeni ilerlemesinin üzerine yazılmaz. Geri alma sonrası oyuncular sayfayı yenilemelidir.

Kurucu farklı kaynak kimliği, hâlâ açık oturum veya bilinmeyen yarım işlem bildirirse korumaları kaldırmayın; hata metni korunmalıdır. Bu çalışma sırasında canlı VDS'ye kurulum yapılmadı.
