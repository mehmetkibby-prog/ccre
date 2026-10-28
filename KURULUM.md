# R67 toplu paket — otomatik eski sürüm temizliği

R66 üzerine uygulanır. Önceki R67 ile aynı giriş hızı ve İlk Adımlar düzeltmelerini içerir. Oyun dosyaları değişmedi; yalnız kurucuya sürüm saklama politikası eklendi.

Oyuncu/admin karakterlerini oyundan çıkarın, 45 saniye bekleyin. Ön kayıt veya henüz açılmamış otomatik açılış modunda kalabilirsiniz. Açık oyun modunda bakım gereklidir.

Paketi VDS’ye indirdikten sonra:

```sh
python3 -u /root/CORE511_R67_TOPLU_DISK.zip --apply
```

Kurucu kurulum öncesinde eski sürümleri temizler; başarılı açılış doğrulamasından sonra tekrar temizler. Çalışan oyun, bir önceki oyun sürümü ve hesap servisi korunur. Başka servislerin/işlemlerin kullandığı veya bağlantıyla gereken klasörler de korunur. Bu yüzden toplam klasör sayısı ikiyi aşabilir. Kayıt servisi yeniden başlatılmaz.

Yalnız alan raporu (silme/kurulum yapmaz):

```sh
python3 -u /root/CORE511_R67_TOPLU_DISK.zip --disk-report
```

Kurulum yarım kalırsa `--recover`, tamamlanmış son güncellemeyi geri almak için `--rollback-latest` kullanılabilir. Bir önceki oyun sürümüne dönüş korunur; temizlenmiş daha eski sürümlere art arda geri dönüş desteklenmez. Veritabanı yedeği geri yüklenmez. Kurucu eski sürüm silme kayıtlarını `/var/lib/core511/release-retention/` altında tutar.

Veritabanları, günlük yedekler, R63 kurtarma/sıfırlama yedekleri, eski `coreoflife-realms` kurulumları, `/root` ve geçici klasörler temizliğe dahil değildir. Yer yine yetmezse kurucu boş/gerekli alanı bildirip durur. Eski paketleri tekrar çalıştırmak bu yeni temizlik özelliğini eklemez; sonraki paketler bu düzeltilmiş kurucudan hazırlanmalıdır.
