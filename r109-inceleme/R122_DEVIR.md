# R122 disk acil devamı — 16 Kasım 2026

Canlı kullanıcı çıktısı: Efsane game.sqlite 127,39 GiB; freelist 0,32 GiB; kullanılan 127,08 GiB. Ext4 ayrılmış alanı azaltılarak 7,62 GiB kullanılabilir alan sağlandı. Bu dosya temizliği değildir. Eski 9,2 GiB sıkıştırılmış yedek ve aktif sürüm korunur. Saatlik disk bakım görevi başarılı görünür; görev yedek bakımıdır, çekirdek makbuz temizliği değildir. 9–15 günlük makbuz uçları birikim gösterir; 127 GiB'nin tablo bazında dağılımı henüz canlıda ölçülmedi. Boş sayfa az olduğu için yalnız VACUUM yeterli değildir.

Yeni çalışma: `project/r122_disk_recovery`. Canlıya doğrudan erişim yok; yalnız paket hazırlanıp kullanıcıya verilir. Veri silme canlıda henüz uygulanmadı, kazanılacak miktar bilinmiyor.

## Paket

- Dosya: artifacts/R122_DISK_5623194d8819.zip
- SHA256: `d86e7b0e05e9f25c641e7b4d7dc913799f37666863108fc0d629eaa1355cef67`
- Hedef çekirdek: `714f7ecc701d5a6d3ec83b12031d7977e2f2fc2d4fff9a216101306e146620b3`
- Kaynak: tam R121_CLEANUP1, R120 istemci varyantı. Tüm önceki ZIP/SHA256 değerleri korunur.
- `--apply` iki runtime dosyasını Efsane ve Akademi'ye uygular. İstemci/domain/şema değişmez.
- `--compact` ayrı, bakım gerektiren Efsane veri bakımıdır; R121 veya R122 tamamlanmış kod kaydını doğrular. Kod yaması önce uygulanır; kopya hazırlığı başarısızsa temizlik düzeltmesi kurulu kalır.
- Kullanıcı ana panelden bakım başlatıp 10 saniyeyi beklemeli. Kurulum/bakım bunu zorlamadan kontrol eder. Açılış sonrası bakım korunur.

## Veri koruması

Oyunu durdurur, aynı DB inode üzerinde flock alır, yedek/kurulum kilitlerini kullanır; kalıcı systemd koşulu yarım işlemde yeni oyun açılışını engeller. Ayrı özel dosyaya korunacak satırları, orijinal rowid/64-bit INTEGER/BLOB/sequence/şema/trigger/view değerleriyle kopyalar. Sadece mevcut süreyi doldurmuş çekirdek aktarım makbuzları, bağlı overflow, türetilmiş committed image ve tüm alıcıları onaylanmış eski bildirimler ayıklanır. Diğer bütün tablolar aynen kalır. UnACK bildirimleri, sahiplik ve sıra sınırları, eşya/ödül kayıtları silinmez.

Eşik çalışan ortam ve config değerlerinin büyüğüdür, en az 15 dakika; kopyalama başlamadan sabittir. Çıkış dosyası boyutu sınırlıdır; 2 GiB acil boşluk ve SQLite kurulum payı ayrılır. Alan yetmezse orijinal DB'ye yazmadan durup oyunu yeniden başlatır. Korunacak her tablo SHA/sayım, metadata, şema, quick_check ve foreign_key_check ile karşılaştırılır.

SQLite backup API aynı orijinal inode'a atomik olarak uygular; DB/WAL elle silinmez, DB rename yapılmaz. Kurulum doğrulanınca izinler geri yüklenir ve iki realm sağlık kontrolü yapılır. Özel doğrulanmış kopya root erişiminde saklanır; eski makbuz geçmişinin tam arşivi değildir. Kesinti sırasında `--recover-disk` ileri tamamlar; farklı bir oyun boot incarnation'ı eski kopyanın yeniden uygulanmasını engeller. Kod için `--recover`/`--rollback` ayrıdır. Kod geri alımı oyuncu verisini geri almaz.

## Tekrar büyümeyi azaltma

Temizlikte ortak parti sayacı yerine aile başına uyarlama; birikim varken 100 ms takip, 2 ms SQL çalışma hedefi; bir ailenin boş geçişi diğer ailenin bilinen birikimini gizlemez. Oyuncu FIFO, WAL/transaction, sahiplik ve shared combat idle korumaları aynı. Dakikalık `core511_retention_r122` ve sağlık `retentionMaintenance` sayaçları eklendi. İlerleme yalnız başarılı commit sonrası sayılır. Çok meşgul yazıcıda erteleme ve soğuk I/O'da 2 ms aşımı hâlâ mümkündür; canlı ilerleme kontrol edilmeden kalıcı kapasite garantisi verilmez. Bu değişiklik ölçülmüş oyuncu gecikmesi iyileşmesi iddiası taşımaz.

## Doğrulama

23 odaklı JS, 7 offline orchestration, 2 gerçek native realm schema, 3 installer testi geçti. Tam arşivin kodu, kompakt edilmiş sentetik veritabanlarıyla gerçek iki realm ve sekiz kanal olarak açılıp temiz kapandı. `npm test`, `test:native`, `test:captcha`, `test:r110` geçti. Kurulum, başarısız sağlık kontrolünde kod geri dönüşünü ve yeni oyuncu ilerlemesinin korunmasını doğruladı.

Sentetik şişmiş fixture 168 MB civarından 100 KB altına, aynı inode ile küçüldü. Bu canlıda aynı miktar/oran kazanılacağını kanıtlamaz. Kapasite deneyi sanal zaman ve yapay sorgu maliyetiyle bir zamanlama regresyon testidir; canlı hız ölçümü değildir. İlk sınır testinde tek geçiş varsayımı, ilk gecikme testinde gerçek saate bağlı eşik ve ilk wrapper testinde root-only fixture beklentisi başarısız oldu; ham loglar korundu ve uygun test/fixture düzeltildi. `evidence/validation.json` sınırları ve nihai paket bağını kaydeder.
