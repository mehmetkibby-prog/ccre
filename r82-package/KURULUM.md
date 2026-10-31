# R82: savaş sonrası beklemeler ve yeniden doğma istemcisi

Bu paket yalnız doğrulanmış **R81_GAMEPLAY** üzerine uygulanır. Kurucu mevcut oyun dizinini yerinde günceller ve R82 kaynak kimliğini doğrular. Yeni bir oyun veritabanı oluşturmaz.

## Kurulum

1. Yönetim panelinde bakım veya ön kayıt durumunu kaydet. Panel işlemin tamamlandığını göstermeli.
2. Oyuncular ve oyun içindeki yönetici çıkmalı. Son çıkıştan sonra en az 45 saniye bekle.
3. `CORE511_R82_TOPLU.zip` ve onunla verilen `CORE511_R82_TOPLU.sha256` dosyalarını VDS'de `/root/` dizinine yükle.
4. VDS terminalinde aşağıdaki komutları sırayla çalıştır. Her komut başarıyla tamamlanmadan sonrakine geçme.

```bash
cd /root &&
sha256sum -c CORE511_R82_TOPLU.sha256 &&
python3 -u /root/CORE511_R82_TOPLU.zip --check &&
python3 -u /root/CORE511_R82_TOPLU.zip --apply
```

`--check` kurulum koşullarını ve dosyaları doğrular; oyun servislerini durdurmaz. Oyuncu veya yönetici hâlâ oyundaysa kurucu güncellemeyi başlatmaz. Kaynak kimliği farklıysa kurulumu zorlamaz.

Başarılı sonuç: **`R82 TAMAMLANDI`**. Kurucu dört kanalın sağlıklı açıldığını, R82 sağlık etiketi ile tanılama uçlarının hazır olduğunu ve mevcut veritabanının korunduğunu doğrular. Ardından yönetici panelinden oyun durumunu istediğin şekilde açabilirsin; kurucu kendiliğinden oyunu açmaz.

**Kurulumdan sonra oyuncular oyun sayfasını tamamen yeniden yüklemeli.** Açık kalmış eski sekme önceki istemci kodunu kullanmaya devam edebilir. R82 istemcisi yeni, sürümlenmiş bir varlık adresinden yüklenir; eski tarayıcı dosyasının üzerine yazılmaz.

Kaynak doğrulaması sırasında ilerleme mesajları devam edebilir. Kurulum sürerken ikinci bir güncelleme komutu çalıştırma.

## Yarım kalan R82 kurulumu

```bash
python3 -u /root/CORE511_R82_TOPLU.zip --recover
```

Kurtarma, aynı R82 paketinin kendi işlem kaydını kullanır. R81 veya başka bir paketin yarım işlemi varsa o işlemi oluşturan paket gerekir.

## Tamamlanmış R82 sürümünü geri alma

Önce tekrar bakım veya ön kayıt durumunu kaydet, herkesin çıkmasını sağla ve en az 45 saniye bekle. Sonra:

```bash
python3 -u /root/CORE511_R82_TOPLU.zip --rollback-latest
```

Geri alma R81 kodunu getirir ve **güncel oyun veritabanını korur**. Oyun ilerlemesi eski veritabanı yedeğine döndürülmez. Hesap servisi yeniden başlatılmaz. Kurucu sağlıklı açılışı doğrulayamazsa oyun servislerini durdurur ve aynı paketle kurtarma yapılana kadar başlatma korumasını tutar.

## Kapsam

Paket, oyun kodunu, yeniden doğma zamanlayıcısını içeren yeni istemci varlığını ve bunların kaynak/kurulum manifestlerini günceller. Eski istemci grafiği korunur; portal, SSR ve manifest başvuruları yeni sürüm dizinine geçirilir. HTTP giriş dosyasındaki değişim yalnız doğrulanmış istemci adı ve sürüm dizini başvurularıdır; HTTP oyun kuralları ve yetkilendirme gövdeleri korunur.

Veritabanı şeması, hesap kodu, mevcut Node/SQLite çalışma zamanı ve R80 kayıt işçisi korunur. Güncelleme ve geri alma öncesinde SQLite yedek API'siyle doğrulanmış yedek alınır; geri almada bu eski yedek güncel DB'nin üzerine yazılmaz. Geri almadan sonra da oyuncular sayfayı yeniden yüklemelidir.

Uygulama ve test ayrıntıları `SONUC.md` ile `evidence/R82_KANIT.json` içindedir. Yerel hedefli testler, canlı VDS kapasite testi veya her cihazda bütün takılmaların giderildiği iddiası değildir.
