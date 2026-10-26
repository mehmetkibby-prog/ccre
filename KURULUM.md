# R62 ödül kurtarma düzeltmesi

Bu paket doğrulanmış R61 kurulumu üzerine R62 değişikliklerini ve ödül kurtarma düzeltmesini birlikte uygular. Önceki R62 kuruluysa bu R61 tabanlı paket doğrudan o kuruluma uygulanmaz; kurucu tabanı doğrulamadan dosya değiştirmez. Canlı VDS'ye bu çalışma sırasında bağlanılmadı.

Oyun bakımdayken, paketin bulunduğu klasörde:

```bash
sudo python3 CORE511_R62.zip --check
sudo python3 CORE511_R62.zip --apply
```

Yalnız oyun sunucusu için `--game-only --check` ve `--game-only --apply` kullanılır. Site bileşeni önceki R62 ile aynıdır. R46 salt okunur doğrulama paketi içeridedir; ayrıca eski paket indirmek gerekmez.

Yeni düzeltme `CORE511_R62_REWARD_RECOVERY=1` ile kurulur. Kod varsayılanı kapalıdır; bağımsız yük testinin `profiles/features.env` dosyasında açıktır. İşlem başına okunur; kurucunun bayrak komutu gerekli yeniden başlatmayı uygular. Veritabanı şeması veya mevcut oyuncu verisi değiştirilmez. Ödül normal oyun işlemleri sırasında mevcut tekilleştirme ve kalıcı yazıcı yolu ile verilir.

```bash
sudo python3 CORE511_R62.zip --flags
sudo python3 CORE511_R62.zip --rollback-latest
```

Geri alma güncel veritabanını korur; geri alma anına kadar kazanılmış ödülleri eski DB kopyasıyla değiştirmez. Yerel kurulum testleri servis denetimlerini taklit eder; canlı VDS sağlık testi yerine geçmez.

Claude incelemesi ve VDS üzerindeki bakım kontrolleri tamamlanınca oyunu admin panelindeki Oyun Durumu ayarıyla açın. Açılış zamanı/ön kayıt tercihini mevcut admin ayarı belirler.
