# Core of Life R81 — ana işlem ödül sorgusu

Kullanıcının canlı ana işlem profilinde en ağır yol olan abandonedActors sorgusuna yönelik R80_GAMEPLAY → R81_GAMEPLAY güncellemesi.

## Değişiklik

- Ön kontrol ve yazıcı tekrar kontrolünde aynı taze veriyi okuyarak derlenmiş SQL'i mevcut senkron prepared-statement kapsamında yeniden kullanır.
- Kaynak oyuncunun gerekli 10 alanını seçer.
- sources AS MATERIALIZED ile hedef canavar/tura ait ödenmemiş katılımcı ilişkisini sorgu boyunca korur; geniş oyuncu-oyuncu join planını önler.
- İkinci üretim dosyasında yalnız sağlık sürümü etiketini R81_GAMEPLAY yapar. Mevcut R80 tanılama protokolü korunur.
- Ödül alıcısı, claim, sahiplik, dondurma, yazıcı tekrar kontrolü, şema ve istemci davranışları korunur.

## Dosyalar

- r81-package/: kurucu, iki dosyalı payload, R80 taban kimliği, kurulum/sonuç belgeleri ve kanıtlar.
- r81-build.py: exact R80 ZIP kimliğinden tekrarlanabilir paket oluşturur.
- r81-tests/: 73 hedefli testin kaynakları, çıktıları, profil çözümleyici ve sentetik performans karşılaştırması.

Ham kullanıcı CPU profili bu dala eklenmez. Sonuçlar ve input SHA256 profile-evidence.json içinde bulunur. İndirilebilir ZIP/SHA/TXT, kullanıcıya ayrı teslim edilir; koddan yeniden üretilebilir.

## Doğrulama

56 kurucu + 12 sorgu + 2 mevcut cache + 3 kaynak sağlık metodu = 73 geçen hedefli test. 120 karışık fixture ve 17 kesinti alt durumu bu sayıya dahildir. Tam canlı sunucu/kanal kapasite denemesi değildir.

Yerel ağır örnekte 600 oyuncu kaydı, 16 güncel katılımcı ve 30.000 tarihsel katılım kullanıldı. Cached sorgu 92,8903 ms → 0,2556 ms ortanca; gerçek VDS CPU yüzdesi veya eşzamanlı oyuncu kapasitesi için tahmin değildir. Ayrıntı r81-tests/abandoned-r81-benchmark.json.

## Geliştirme ortamı

Node22.23.4 / SQLite3.53.4, R80 ile aynı sabit runtime. Yerel test tabanı r79-audit kaynaklarına exact R80 altı dosyalık deltayı uygulayarak r81-work altında hazırlanır; sonra bu dalın iki payload dosyası uygulanır. Builder exact CORE511_R80_TOPLU.zip, r80-package/update.json, r79-audit ve r81-work dizinlerini bekler. Bu kaynakların kimlikleri manifestle eşleşmelidir. Yerel incelemede 42 güncel modül eksiktir; eski sürümlerle doldurulmadı. İlgili abandoned-normal modülü ve hedefli test bağımlılıkları gerçekten içe aktarılıp çalıştırılmıştır.

Node testleri bu ortamda doğrudan dosya olarak çalıştırılır; --test alt süreç sarmalayıcısı yalnız dosya düzeyi bir sonuç gösterebildiği için adlandırılmış testlerin TAP çıktısı esas alınmıştır:

```bash
core511_node22=/workspace/scratch/68fd588af980/r79-audit/runtime/node-v22.23.4-linux-x64/bin/node
"$core511_node22" r81-tests/abandoned-r81.test.mjs
"$core511_node22" r81-work/core511-source/scripts/core511/tests/writer-statements.test.mjs
"$core511_node22" r81-tests/runtime-health-http.test.mjs
python3 r81-tests/installer-inplace.test.py
python3 r81-tests/installer-gates.test.py
python3 r81-build.py
```

Yeni bir CPU profilini karşılaştırmak için:

```bash
python3 r81-tests/profile-summary.py INPUT.cpuprofile.json OUTPUT.json
```

## Hareket takılması için kalan inceleme

Normal hareket kanal sürecindedir. Ana işlem sorgusunun hızlanması, ödül alıcısı dondurma/yenileme yolunu hafifletebilir; bütün düz koşu takılmalarının nedenini tek başına kanıtlamaz. Güncel mobil istemcide 50 FPS varsayılanı 60/120 Hz çizim döngüsünde düzensiz kare aralığı üretir; kullanıcı mevcut ayardan 60 FPS ile karşılaştırabilir. Bu dal istemciyi değiştirmez.

Kurulum sonrası aynı cihaz/kanal/bölgede ana işlem profili ve yürüyüş karşılaştırılmalı. Sorun sürerse kullanılan kanalın profili ve istemci çizim aralıkları incelenir. Ayrıntılar r81-package/SONUC.md içindedir.

## Paket kimliği

CORE511_R81_TOPLU.zip — 139829 byte

SHA-256: `46340f6459f85ccb07287e79b26efad52e2b0de052e8d878154e9fca681f2e21`

Canlı VDS'ye otomatik kurulum yapılmadı.
