# R63 kurucu düzeltmesi

`kod_dogrulanmis_R61_ile_ayni_degil` hatasının nedeni eski R63 kurucusunun yalnız R61 tabanını kabul etmesiydi. Bu paket, kaynak ve dosya SHA kontrollerini koruyarak yayımlanmış R62 tabanını da kabul eder.

[**Düzeltilmiş R63 paketini indir**](https://github.com/mehmetkibby-prog/ccre/raw/refs/heads/r63-installer-fix/CORE511_R63_DUZELTILMIS.zip) · [Kurulum](KURULUM.md)

GitHub hesabınızla giriş yapmanız gerekebilir. Eski Drive bağlantısındaki dosya değiştirilmedi; bu yeni paketi kullanın.

Bakım veya **Elle kapalı · Ön kayıt** modunda güncelleme yapılabilir. Erken erişim izinleri ve ön kayıt ekranı korunur; izinli kişi oyundayken kurucu işlemi reddeder. Kurulum sonrası oyun durumu korunur. Planlı otomatik açılış seçimi bu kurulum için kabul edilmez; önce Elle kapalı · Ön kayıt seçilmeli, güncelleme sonrası tekrar Planlı seçilebilir. Açılış tarihi değiştirilmez.

Oyun kodu önceki R63 ile aynı: `1f5a1448de970e13651817789e539a063ddc6dc0ce0cd0f21ce487470e83859d`. Bu bir kurucu düzeltmesidir. Önceki performans ölçümleri aynen geçerlidir; bu çalışma için yeni performans iddiası yoktur.

```bash
sha256sum -c CORE511_R63_DUZELTILMIS.zip.sha256
sudo python3 CORE511_R63_DUZELTILMIS.zip --check && sudo python3 CORE511_R63_DUZELTILMIS.zip --apply
```

Canlı VDS’ye buradan kurulum yapılmadı. Kaynak kanıtı, test özeti ve kurulum/geri alma kanıtları aynı klasördedir.
