# R63 — ön kayıt modunda güncelleme

Bu pakette yalnız kurucu değişti. Oyun, istemci, site ve performans kodu önceki R63 ile aynı baytlardır.

Admin paneli → Oyun Durumu bölümünden **Bakım** veya **Elle kapalı · Ön kayıt** seçin. Oyuna erken erişimle girmiş oyuncular ve yöneticiler oyundan çıksın; son oyuncudan sonra 45 saniye bekleyin. Web sitesinde ön kayıt yapan kişiler oyun oyuncusu sayılmaz.

```bash
sha256sum -c CORE511_R63_DUZELTILMIS.zip.sha256
sudo python3 CORE511_R63_DUZELTILMIS.zip --check
sudo python3 CORE511_R63_DUZELTILMIS.zip --apply
```

Kurulumdan sonra seçtiğiniz bakım/ön kayıt modu, kayıt tarihleri, sayaç ve erken erişim listesi korunur. Oyun kendiliğinden açılmaz. Servislerin yeniden başlatıldığı kısa sırada ön kayıt gönderimi de geçici olarak kesilebilir; kurucu hesap verilerini silmez veya eski yedeğe döndürmez.

**Açık/normal oyun ve otomatik açılış için “Planlı” seçimi güncelleme kabul etmez.** Planlı açılış kullanıyorsanız güncelleme süresince “Elle kapalı · Ön kayıt” seçin; kurulumdan sonra planlı seçiminizi tekrar etkinleştirin. Seçtiğiniz açılış tarihi değiştirilmez.

Doğrulanmış R61 ve R62 tabanları desteklenir; önceki kurucunun R62'yi reddetmesi düzeltildi; mevcut R63 üzerinde tekrar kurulum güvenle “zaten kurulu” sonucunu verir. Bu bir oyun sürümü yükseltmesi değildir. Eski Drive dosyası ve eski R63 ZIP'i değişmedi; ön kayıt desteği için bu yeni kurucuyu kullanın.

Geri alma (aynı bakım/ön kayıt kontrolleri uygulanır):

```bash
sudo python3 CORE511_R63_DUZELTILMIS.zip --game-only --rollback-latest
```
