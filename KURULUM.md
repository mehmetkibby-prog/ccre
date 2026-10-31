# Core of Life R80 — R79 üzerine yerinde güncelleme

Bu paket, doğrulanmış R79_GAMEPLAY üzerine hazırlanmıştır. Genel bakım işlerinin gereksiz tekrarını azaltır, geçici checkpoint arızalarından kontrollü toparlanma ekler ve yükün kaynağını ölçmek için sağlık yanıtını genişletir. Boss/Sinsi ön plan ödül bekletmesini daraltan ayrı taslak bu kurulumda etkin değildir; ayrıntı SONUC.md içindedir.

## Kurulum

1. CORE511_R80_TOPLU.zip dosyasını VDS üzerinde /root/CORE511_R80_TOPLU.zip konumuna aktarın. İndirilen dosyanın SHA-256 değerini beraberindeki CORE511_R80_TOPLU.sha256 ile doğrulayın.
2. Yönetim panelinden bakım modunu seçip kaydedin. Oyundan ve oyun içi yönetim oturumundan çıkın. Son etkinlikten sonra en az 45 saniye bekleyin.
3. Root terminalinde önce uygunluk kontrolünü çalıştırın:

```bash
python3 -u /root/CORE511_R80_TOPLU.zip --check
```

Bu kontrol, kurulu kaynakları ve çalışma zamanını doğrular. Oyunun boş ve bakımda olması gerekir. Bir uyuşmazlık varsa çıktıyı paylaşın; STATE, bakım bayrakları veya oyuncu kayıtlarını elle değiştirerek kontrolü aşmayın.

4. Kontrol başarılıysa kurun:

```bash
python3 -u /root/CORE511_R80_TOPLU.zip --apply
```

5. Terminalde R80 TAMAMLANDI mesajını gördükten sonra yönetim panelinde Oyun açık seçeneğini kaydedin. Kurucu oyun durumunu sizin adınıza açık konumuna getirmez.

## Kurulum davranışı

Oyun sürüm dizini yerinde güncellenir. Altı üretim dosyası ile bunlara bağlı kaynak kimliği/manifest/kurulum kaydı güncellenir. Node 22.23.4 / SQLite 3.53.4 mevcut R79 çalışma zamanından kullanılır. İstemci ve hesap servisi yeniden dağıtılmaz.

Kurucu R79 kaynak SHA değerlerini, bütün sürüm manifestini, gerçek Node/SQLite sürümünü ve canlı DB dosya kimliğini doğrular. Ortak kurulum kilidi ve günlük yedek kilidiyle çalışır. Oyun durduktan sonra SQLite backup API üzerinden güncel DB yedeği oluşturur; quick_check başarılı olmadan kodu değiştirmez. Yedek için DB büyüklüğü kadar ek alan ve güvenlik payı gerekir; bütün oyun klasörünün ikinci kopyası oluşturulmaz.

Dört kanal, kalıcı kayıt, kayıt işçisi ve R80 sağlık yanıtı doğrulanmadan kurulum tamamlanmış sayılmaz. Başarısız geçişte yalnız kod ve kurulum metaverisi R79'a alınır. Canlı DB daha eski bir yedekle değiştirilmez. Kurulum başarıyla tamamlandığında yalnız bu denemenin doğrulanmış geçici DB yedeği silinir; küçük kod geri alma kaydı korunur.

## Yarım işlem

Elektrik/terminal kesintisi veya kurtarma gerektiğini belirten bir hata varsa aynı dosyayı kullanın:

```bash
python3 -u /root/CORE511_R80_TOPLU.zip --recover
```

Yarım kod geçişi R79'a toparlanır. R80 doğrulanmış fakat son temizlik yarım kalmışsa R80 tamamlanır. Başka bir süreç dosyaları, ayarları veya DB kimliğini değiştirmişse kurucu üzerine yazmak yerine durur. active.json veya kurulum journal dosyasını elle silmeyin.

## Tamamlanmış R80'i geri alma

Önce yönetim panelinden bakım moduna geçin, oyundan çıkın ve 45 saniye bekleyin:

```bash
python3 -u /root/CORE511_R80_TOPLU.zip --rollback-latest
```

Geri alma öncesinde güncel DB'nin yeni bir yedeği doğrulanır. Ardından R79 koduna dönülür; oyuncuların güncel DB'si korunur. Başarı mesajından sonra oyunu panelden açabilirsiniz.

## Kurulum sonrası kısa ölçüm

CORE511_R80_CANLI_OLCUM.py dosyasını /root altına aktarın. Oyuncuların normal oynadığı sırada:

```bash
python3 /root/CORE511_R80_CANLI_OLCUM.py --duration 30 --interval 2 > /root/R80_OLCUM.json
```

Bu dosya veritabanını açmaz, bot üretmez ve servis/oyun ayarı değiştirmez. Yerel sağlık yanıtını ve /proc sayaçlarını okur. R80_OLCUM.json dosyasını inceleme için paylaşın. Mümkünse güncellemeden önce R79 üzerinde de aynı komutla farklı dosyaya ölçüm alın; R79'da yeni R80 alanları bulunmayacaktır. Boş sunucu ölçümü, oyuncuların yaşadığı takılmayı tek başına doğrulamaz.

## Boss/Sinsi doğrulamasını tamamlamak için kaynak

Mevcut arşivlerde güncel sürümü bulunamayan 42 kaynak dosyası için seçici dışa aktarıcı hazırlanmıştır. CORE511_R79_EKSIK_KAYNAK.py dosyasını /root altına aktarın ve çalıştırın:

```bash
python3 /root/CORE511_R79_EKSIK_KAYNAK.py
```

Oluşan /root/CORE511_R79_EKSIK_KAYNAK.zip dosyasını bu konuşmaya yükleyin. Araç yalnız sabit listedeki kaynak dosyalarını, beklenen R79 SHA değerleriyle eşleşiyorsa paketler. Oyuncu DB'si, .env, canlı yapılandırma, hesap verisi veya log toplamaz. Bu kaynak toplama işlemi için bakım ya da servis yeniden başlatması gerekmez. Çıktı dosyası önceden varsa üzerine yazmaz.
