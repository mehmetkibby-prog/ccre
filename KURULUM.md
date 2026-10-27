# Core of Life R64 — ön kayıt açıkken oyun güncellemesi

Önce varsa hesap sıfırlamasının **SIFIRLAMA TAMAMLANDI** mesajını bekleyin. R63 kurulu olmalı. Admin panelinde manuel ön kayıt veya gelecekteki açılışı gösteren otomatik ön kayıt seçili olabilir. İzinli oyuncular ve admin oyundan çıkmalı; 45 saniye sonra kurun. Bakım moduna geçmeniz gerekmez.

İndirdiğiniz paketin bulunduğu dizinde root terminalinden:

```bash
python3 -u CORE511_R64.zip --apply
```

Kurucu önce dosyaları ve oyun durumunu denetler. Kayıt servisini durdurmaz veya yeniden başlatmaz. Oyun dosyalarını ayrı sürüm dizininde hazırlar, yalnız oyun/realtime servislerini değiştirir. Kaynak doğrulaması ve kopyalama sırasında ilerleme yazar. İşlem bitince **R64 OYUN VE SITE TAMAMLANDI** görünür. Genel açılış saatini/modunu değiştirmez.

Ön kayıt yapılabilir; yeni hesaplar güncellemede ve geri almada korunur. Önceden verdiğiniz giriş izinleri silinmez. Güncelleme sırasında oyun girişi geçici olarak kapalıdır. İzinli oyuncuların da işlemden önce çıkması gerekir.

## İzin sorunu

Manuel ve otomatik ön kayıtta kayıt listesinden izin verilen hesabın kartında **Oyuna gir** görünür. Açık sayfa yaklaşık 15 saniyede izni algılar; **İzni kontrol et** hemen yeniler. Başka tarayıcıda oturum açmak için **İzinli hesabımla giriş yap** kullanılabilir. İzinsiz hesap genel açılışı bekler.

Mevcut sürümde geçici giriş yolu: https://accounts.coreoflife.net/early-access

## Ayrı site düzeltmesi

Yalnız sayfa düzeltmesini uygulamak için küçük `CORE_OF_LIFE_R64_SITE.zip` dosyası kullanılabilir:

```bash
python3 -u CORE_OF_LIFE_R64_SITE.zip --apply
```

Bu sadece siteyi günceller; kesintisiz oyun güncelleme kurucusunu kurmaz. Tam R64 paketi aynı site düzeltmesini de içerir. Tam pakette eşdeğer komut `python3 -u CORE511_R64.zip --site-only --apply`.

## Kurtarma ve geri alma

Yarım kalan oyun değişimini kurtarmak:

```bash
python3 -u CORE511_R64.zip --recover
```

Oyun ve siteyi önceki sürüme döndürmek (ön kayıt/bakım, oyun boş olmalı):

```bash
python3 -u CORE511_R64.zip --rollback-latest
```

Site için ayrıca `--site-only --rollback-latest`, oyun için `--game-only --rollback-latest` kullanılabilir. Yalnız denetim: `--check`. Eski hesap/veritabanı yedeğini geri yüklemez; bu arada oluşan yeni kayıtları silmez.

R64 hesap servisini mevcut kaynakta bırakır; oyun ayrı kaynakta çalışır. **Bundan sonraki oyun güncellemeleri bu düzene uyumlu paketlenmeli.** Önceki R63/R62 kurucularını yeni güncelleme amacıyla tekrar çalıştırmayın. Hesap sunucusunu/veritabanı şemasını değiştiren gelecekteki güncellemeler ayrı değerlendirilir; her türlü gelecek güncelleme için kesintisizlik garantisi değildir.

Bu paket oyun veritabanında şema/veri temizliği yapmaz. Yeni karakter veya hesap sıfırlaması içermez. Canlı VDS'ye otomatik kurulmamıştır.
