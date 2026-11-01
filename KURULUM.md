# Core of Life R86 kurulumu

Bu paket **kurulu R85 üzerine** uygulanır. R85'i yeniden kurmayın. Sunucu kodu güncellenir; mevcut istemci, hesap servisi, oyun verileri ve yönetim ayarları korunur.

1. ZIP ve SHA-256 dosyasını VDS'nin `/root` dizinine koyun.
2. Oyunu panelden bakıma alın. Oyuncular ve oyundaki admin karakterleri çıktıktan sonra en az 45 saniye bekleyin.
3. Terminalde çalıştırın:

```bash
cd /root &&
sha256sum -c CORE511_R86_TOPLU.zip.sha256 &&
python3 -u /root/CORE511_R86_TOPLU.zip --apply
```

**`R86 TAMAMLANDI`** yazısını bekleyin. Kurucu kaynak kimliğini, dört kanalı ve sağlık yanıtını denetler. Ardından oyunu yönetim panelinden açın; oyuncular yeniden bağlansın.

Kurucu yeni bir tam oyun kopyası oluşturmaz. Mevcut çalışma zamanını ve istemci dosyalarını korur. Kurulum öncesi veritabanı yedeğini doğrular; başarılı işlemden sonra geçici yedeği temizler. Hesap servisini yeniden başlatmaz.

## Yarım kalan kurulumu kurtarma

Aynı ZIP dosyasıyla:

```bash
python3 -u /root/CORE511_R86_TOPLU.zip --recover
```

## R85 koduna geri dönme

Oyunu bakıma alıp oturumların kapanmasını bekledikten sonra:

```bash
python3 -u /root/CORE511_R86_TOPLU.zip --rollback-latest
```

Geri alma R85 kodunu geri getirir ve **güncel oyun veritabanını korur**. Oyuncuların yeni ilerlemesi eski yedekle değiştirilmez.

Farklı kaynak kimliği, açık oturum veya bilinmeyen yarım işlem uyarısı çıkarsa kurulumun güvenlik denetimlerini atlamayın; hata metnini paylaşın.

## Test kapsamı

Kullanıcının güncel hedefi 30 oyuncudur. Sonuçlar `SONUC.md` ve paket içindeki kanıt dosyalarındadır. Doğrulama, 30 oyuncuyla 180 saniyelik ölçümü ve oyun sürerken 29 oyuncuya bir oyuncunun katıldığı 30 saniyelik ölçümü kapsar. Yerel test, gerçek sunucu kodunu ve dört kanalın ağ yolunu kullanır; canlı VDS, internet gecikmesi ve tarayıcıdaki çizim performansı aynı ölçümün parçası değildir. Canlı VDS'ye bu çalışma ortamından kurulum yapılmamıştır.
