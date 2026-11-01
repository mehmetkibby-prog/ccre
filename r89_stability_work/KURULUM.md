# Core of Life R89 kurulumu

Bu paket **kurulu R86 üzerine** uygulanır; R87 veya R88'i ayrıca kurmayın. Rün Sahili iksir/kayıt yolu, ödül işçisindeki tekrarlar, ilk toplu kayıt zamanlaması ve katalog dışı Rün canavarının kanal çökmesi düzeltilmiştir. Devirdeki R87–R88 hareket ve istemci iyileştirmeleri de dahildir.

1. `CORE511_R89_TOPLU.zip` ve `.zip.sha256` dosyalarını VDS'nin `/root` dizinine koyun.
2. Oyunu panelden bakıma alın. Oyundaki oyuncu ve admin karakterleri çıktıktan sonra 45 saniye bekleyin.
3. Terminalde çalıştırın:

```bash
cd /root &&
sha256sum -c CORE511_R89_TOPLU.zip.sha256 &&
python3 -u /root/CORE511_R89_TOPLU.zip --apply
```

`R89 TAMAMLANDI` yazısını bekleyin. Kurucu dört kanalın sağlık yanıtını doğrular. Ardından oyunu panelden açın; açık tarayıcılar yenilensin.

Kaynak dosyaların SHA-256 değerleri kurulu R86 ile eşleşmelidir. Kurulum mevcut sürümün üzerine uygulanır; başka bir tam oyun kopyası oluşturmaz. Güncel veritabanı önce SQLite yedekleme API'siyle yedeklenip kontrol edilir. Hesap servisi, oyun kayıtları ve yönetim ayarları korunur. İstemci dosyaları yeni ve değişmez bir dizinde hazırlanır; eski istemci dizini geri alma için tutulur.

## Yarım kalan kurulum

```bash
python3 -u /root/CORE511_R89_TOPLU.zip --recover
```

## R86 koduna geri dönme

Bakım açık ve oyun oturumları kapalıyken:

```bash
python3 -u /root/CORE511_R89_TOPLU.zip --rollback-latest
```

Geri alma **güncel oyun veritabanını korur**; oyuncuların son ilerlemesi eski yedekle değiştirilmez. Farklı kaynak sürümü, bilinmeyen dosya veya yarım işlem uyarısında kurucunun kontrollerini atlamayın.

GitHub deposu özeldir; indirme bağlantısı yetkili GitHub oturumu gerektirir. VDS'ye dosyayı aktardıktan sonra yukarıdaki komut kullanılır. Bu çalışma ortamından canlı VDS'ye kurulum yapılmamıştır. Ölçümlerin kapsamı ve sonuçları `SONUC.md` dosyasındadır.
