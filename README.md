# R67 disk temizliği

[Temizlik aracını indir](https://github.com/mehmetkibby-prog/ccre/raw/refs/heads/r67-disk-cleanup/CORE511_R67_DISK_TEMIZLIK.zip)

Kurulu R67’de birikmiş geçici sıfırlama/kurulum kopyalarını, doğrulanmış tekrar indirmeleri ve sistem önbelleğini temizler. Sıfırlama öncesi yedek çifti ve günlük yedekler korunur. Oyun verisi ve kodu değişmez, servisler yeniden başlatılmaz. Arşivlenmiş sistem günlükleri 500 MiB hedefine azaltılır.

VDS’ye dosyayı indirdikten sonra:

```sh
python3 -u /root/CORE511_R67_DISK_TEMIZLIK.zip --apply
```

Yalnız plan için `--inspect`. Temizlenecek gerçek alan canlı dosyalara göre hesaplanır; belli bir GB kazanımı garanti edilmez. Bu araç yeni oyun sürümü kurmaz. Eski sürümlerin otomatik temizliği önceki R67 TOPLU DISK paketinde bulunur.

12 koruma/temizlik testi ve 3 R67 bütünleşik akış testi geçti. Testlerde dosyalar, SQLite ve hesap hizmeti gerçektir; systemd/oyun sağlığı ve sistem temizliği komutları taklit edildi. Canlı VDS’ye henüz uygulanmadı.

[Kapsam ve kullanım](KULLANIM.md) · [Test sonuçları](TEST_SONUCLARI.json) · [SHA256](SHA256.txt)

Özel depodan indirmek için GitHub hesabınızla oturum açın.
