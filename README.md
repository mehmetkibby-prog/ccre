# R67 — otomatik eski sürüm temizliği

[Paket indir](https://github.com/mehmetkibby-prog/ccre/raw/refs/heads/r67-disk-fix/CORE511_R67_TOPLU_DISK.zip)

R66 üzerine uygulanan toplu R67 paketi. Önceki R67 ile oyun dosyaları birebir aynıdır; giriş hızı ve İlk Adımlar düzeltmeleri dahildir. Kurucuya disk temizliği eklendi.

Kurulum öncesi ve başarılı kurulum sonrası kullanılmayan eski sürümler temizlenir. Çalışan oyun, bir önceki oyun, hesap servisi ve gereken dosya bağımlılıkları korunur. Veritabanları, yedekler ve diğer kurulum dizinleri silinmez. Bir önceki oyun sürümüne geri dönüş korunur.

12 temizlik + 12 kurulum/geri alma testi geçti. Canlı VDS’ye henüz uygulanmadı. Testlerde gerçek dosya/SQLite/kayıt servisi ve silme işlemleri kullanıldı; systemd/oyun sağlığı ve düşük disk kapasitesi taklit edildi.

[Kurulum](KURULUM.md) · [Disk teşhisi ve kapsam](DISK_NOTLARI.md) · [Test sonuçları](TEST_SONUCLARI.json)

Özel depodan indirmek için GitHub hesabınızla oturum açın. Bu dosya eski R67 paketiyle aynı ada sahip değildir. Eski paketi yeniden çalıştırmak temizlik özelliğini eklemez.
