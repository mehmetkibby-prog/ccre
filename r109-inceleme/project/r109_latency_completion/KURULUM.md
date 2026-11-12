# R109 gecikme düzeltmesi

Kaynak: R105_PERF1 veya seçtiğiniz R106_CAPTCHA1. Hedef: R109_LATENCY2.
R106 captcha düzeltmesi ve önceki R108 oda/okuma/iletişim iyileştirmeleri dahildir.
R106_READY1 metrik/swap değişiklikleri ve yeni Node bellek ayarları dahil değildir.

Yeni düzeltmeler:
- Ana kayıt yoluna dönen saldırılarda sınırlı sorgu önbelleği de kullanılır.
- İlk boss ölümünde gereken mevcut SQL sorguları açılışta hazırlanır.
  Oyuncu/ödül verisi önbelleğe alınmaz, ödül hesabı değiştirilmez.
- Bir ölüm işleminin arkasına eklenen saldırılar küçültülür. Sonraki kabul
  edilmiş komutlar sırada kalır; sahiplik, sıra ve kalıcı onay korunur.

Paket her iki sunucu içindir. Bakım ve Akademi açılış ayarları korunur.
Yalnız değişen kod yedeklenir; tek doğrulanmış önceki kod yedeği tutulur.
Tam veritabanı taraması, sıkıştırma, şema/veri geçişi yapılmaz.
İki sunucu, sekiz kanal ve hesap servisi hazır olmadan kurulum başarılı sayılmaz.

Ölçümler ve sınırları PERFORMANS_RAPORU.md içindedir. Yerel sunucu testleri
canlı VDS'nin ağı veya oyuncunun cihazındaki FPS için garanti oluşturmaz.

ZIP'i Drive'a yükleyip bağlantısını gönderin; paketin doğrulanmış SHA256
kimliğiyle kısa indirme komutu verilir. VDS'ye indirdikten sonra:

```bash
python3 /root/r109-gecikme.zip --check
```

Admin panelindeki bakım geri sayımı tamamlandıktan sonra:

```bash
python3 /root/r109-gecikme.zip --apply
```

Başarı mesajı: R109 GECİKME DÜZELTMESİ TAMAMLANDI.
Bu belge canlıya kurulum yapıldığı anlamına gelmez.
