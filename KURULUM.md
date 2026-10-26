# R61 üzerine bağımsız R62 kurulum paketi

Bu teslim Claude incelemesi içindir. Yeni yoğun çökme testinin kabul şartları geçmedi; sayısal sonuçlar TEST_SONUCLARI.md içindedir. Canlıya kurulmadı. Aşağıdaki komutlar, inceleme ve düzeltme kararı sonrasında kullanılacak kurulum prosedürüdür.

`CORE511_R62.zip` oyun ve ön kayıt sitesi kurucusunu ve gerekli eski taban doğrulama arşivini kendi içinde taşır. R57–R61 ZIP'lerini veya ayrı R46 dosyasını istemez. İçteki eski arşivler yalnız SHA taban kontrolü içindir; eski sürümü canlıya kurmaz. Kurulum paketi R61 kurulu VDS içindir; boş klasörde yük testi için ayrı KAYNAK.zip dosyaları kullanılır.

## Ön kontrol ve kurulum

1. Admin panelinde oyunu bakıma alın. Bağlı oyuncuların çıkmasını bekleyin.
2. `CORE511_R62.zip` ve `CORE511_R62.zip.sha256` dosyalarını VDS'de aynı klasöre koyun. ZIP'i açmak gerekmez.
3. O klasörde root olarak:

```bash
sha256sum -c CORE511_R62.zip.sha256
python3 CORE511_R62.zip --check
python3 CORE511_R62.zip --apply
python3 CORE511_R62.zip --check
python3 CORE511_R62.zip --flags
```

Bir komut hata verirse devam etmeyin. `--apply` her iki bileşenin ön kontrolünü yeniden yapar. Kurucu değiştirilmiş veya farklı tabanın üzerine zorla yazmaz. Site için önceki admin kontrollü `20261026-4385eb249bd8` sürümü gerekir. Oyun ve site farklı VDS'lerdeyse oyun makinesinde `--game-only --check` ve `--game-only --apply`; site makinesinde `--site-only --check` ve `--site-only --apply` kullanılır.

Oyun kurucusu mevcut veritabanının geçici yedeğini ve bütünlük kontrolünü yapar; dört kanalı kontrol eder. Site kurulumu başarısız olursa önceki site geri getirilir; yalnız bu çalıştırmada yeni kurulmuş oyun güncellemesi de geri alınır. Önceki yönetilen kurulum kayıtları/yedekleri korunmalıdır. Paket her eski veya elle değiştirilmiş kurulumu desteklemez.

4. Oyun bakımda kalır. Admin hesabıyla giriş, ekipman detayları, Azrail sandığı açma/satma, doğrulama ve ön kayıt ekranını kontrol edin.
5. Kararınız olumluysa admin panelinden oyun durumunu açın. Ön kayıt, sayaç ve açılış saati mevcut admin ayarını izler.

## Anahtarlar

Kaynakta dört yeni anahtar da tanımsız/0 iken kapalıdır. Kurulum profilinde 1 ile etkinleşir. Mevcut R61 anahtarları korunur. Anahtar değişikliği de bakım gerektirir:

```bash
python3 CORE511_R62.zip --flags
python3 CORE511_R62.zip --set-flag CORE511_R62_VERIFICATION=0
python3 CORE511_R62.zip --set-flag CORE511_R62_VERIFICATION=1
```

Tam liste, varsayılanlar ve kapatma davranışı DEGISIKLIKLER.md içindedir. Ön kayıt sitesinin ödül açıklaması oyun anahtarıyla kapatılmaz; site geri alması ayrıdır.

## Geri alma

Oyunu tekrar bakıma aldıktan sonra:

```bash
python3 CORE511_R62.zip --rollback-latest
```

Birleşik komut önce siteyi, sonra oyunu geri alır. Ayrı kurulumda ilgili `--game-only --rollback-latest` veya `--site-only --rollback-latest` kullanılır. Güncel oyuncu verileri eski DB ile değiştirilmez; yeni kazanılan eşyalar/ilerleme korunur. R61'in `--no-lazy` başlangıç ayarı korunur. Bu komut önceki kurulumun yerel geri alma kaydını gerektirir; kaydı silmeyin.
