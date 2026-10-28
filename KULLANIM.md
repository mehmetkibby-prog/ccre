# R67 disk temizliği

Bu ayrı bir temizlik aracıdır; R67 oyun kodunu kurmaz veya değiştirmez. Kurulu R67 kaynak kimliği ve çalışan dört kanal doğrulanır. Servisler durdurulmaz; ön kayıt açık kalabilir.

VDS’ye indirdikten sonra:

```sh
python3 -u /root/CORE511_R67_DISK_TEMIZLIK.zip --apply
```

Yalnız planı görmek için `--inspect` kullanın. İki seçenek de kurulum ve günlük yedek kilitleriyle çakışmayı önler; kilit meşgulse işlem durur, çalışan yedeği kesmez.

Temizlenenler:

- Tamamlanmış veya geri alınmış, aynı canlı veritabanlarına ait R63 sıfırlama işlemindeki `game-clean.sqlite` / `accounts-clean.sqlite` hazırlık kopyaları. Her iki `*-before.sqlite` geri dönüş yedeği yerinde tutulur; dosya türü ve SQLite başlığı denetlenir. Bu başlık kontrolü tam yedek sağlamlık kontrolü değildir.
- Artık kullanılmayan eski R63 kurulumunun `game.sqlite.partial` dosyaları; tamamlanmış/geri alınmış kurulumun kayıtlı kimlikle eşleşen geçici DB kopyası.
- Bilinen geçici indirme klasörlerindeki, `/root` altında birebir aynı SHA256 ile orijinali bulunan ZIP tekrarları (100 MiB altı).
- APT paket indirme önbelleği. Arşivlenmiş sistem günlükleri `journalctl` aracılığıyla 500 MiB hedefine azaltılır; aktif günlükler farklı yer tutabilir.

Korunanlar: canlı veritabanları ve WAL dosyaları, günlük oyun/hesap yedekleri, sıfırlama öncesi yedek çifti, oyuncu hesapları, E-Pinler, kod ve ayarlar, mevcut/önceki oyun sürümü, hesap servisi, `/root` orijinal kurulum paketleri ve tanınmayan dosyalar. Bu araç oyun DB’sini VACUUM etmez, silmez veya geri yüklemez.

Her silmeden önce dosya kimliği, açık dosya/servis referansları, işlem günlüğü ve canlı servis durumu tekrar kontrol edilir. Kayıtlar `/var/lib/core511/disk-cleanup-r67` altında tutulur; yarıda kesilirse aynı komut tekrar çalıştırılabilir. Boşalacak gerçek alan komut çalışırken gösterilir. Yeni sürümlerin temizliği ayrıca daha önce teslim edilen R67 TOPLU DISK kurucusunda vardır; gelecek paketler o kurucudan hazırlanmalıdır.
