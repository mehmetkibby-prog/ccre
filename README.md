# R67 veritabanı alan düzeltmesi

Oyun veritabanında sıfırlamadan kalan boş sayfaları küçültür. Mevcut kayıtlar, ayarlar, gizli satır kimlikleri ve dosya inode kimliği doğrulanarak korunur.

Oyun ve oyun içi admin panelinden çıkıp 45 saniye bekleyin. Ön kayıt açık kalır; oyun servisleri küçültme süresince durur. Açılış modu/tarihi değiştirilmez.

[Paketi indir](CORE511_R67_DB_KUCULT.zip) · [Kullanım](KULLANIM.md) · [Test sonuçları](TEST_SONUCLARI.json)

```bash
python3 -u CORE511_R67_DB_KUCULT.zip --apply
```

10 SQLite koruma testi, 8 kurulum/kurtarma senaryosu ve dört gerçek kanal sürecinde üç sınıfla giriş/ışınlanma/ödül/tekrar giriş kontrolü geçti. Bunlar yerel testlerdir; canlı sunucuya uygulanmadı. Günlük yedekler ve sıfırlama öncesi yedekler korunur.
