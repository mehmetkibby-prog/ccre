# R61 / R62 bağımsız doğrulama sonuçları

Yeni ölçümler 26 Ekim 2026 tarihinde aynı bulut ortamında, eşzamanlı başka test çalıştırılmadan alındı. Cgroup CPU sınırı `400000 100000`, bellek sınırı `34359738368` bayt. Kullanıcının 8 CPU / 8 GB VDS'sinde çalıştırılmadı. Botlar da bu ortamda çalışır.

**Çökme senaryosu kabul edilmedi.** Üç koşuda kanal kapanmadı ve 24/24 yeniden giriş+hareket gerçekleşti; fakat sıfır olması istenen bitmemiş ödüller sıfır değildi. Bu sonuçlar canlıya hazır onayı vermez. Kaynak kodu bu teslim hazırlanırken değiştirilmedi. Başarısız koşular silinmedi veya daha hafif profille değiştirilmedi.

## İstenen yoğun senaryolar

Her koşu 80 oyuncu / 50 saniye / HP=500. MONSTER_POOL tanımsız: oyuncu başına 60, toplam 4.800 canavar. Diğer ayarlar KOMUTLAR.md ve ham `source.json.environment` dosyalarında. Düz yükte ekipman/HP müdahalesi ve yeniden giriş yok.

| Koşu | CHILD_EXIT | 4 incarnation sabit | Yeniden giriş + hareket | Bitmemiş ödül | Çift anahtar | Kopma | Cevapsız | Kullanıcı kabulü | Ek kontroller |
|---|---:|:---:|:---:|---:|---:|---:|---:|:---:|:---:|
| crash #1 | 0 | Evet | 24/24 | 667 | 0 | 18 | 11 | FAIL | FAIL |
| crash #2 | 0 | Evet | 24/24 | 1290 | 0 | 23 | 8 | FAIL | FAIL |
| crash #3 | 0 | Evet | 24/24 | 589 | 0 | 23 | 7 | FAIL | FAIL |
| plain #1 | 0 | Evet | Uygulanmadı | 1084 | 0 | 0 | 0 | FAIL | FAIL |
| plain #2 | 0 | Evet | Uygulanmadı | 2071 | 0 | 0 | 0 | FAIL | FAIL |

Crash testinde eski oturumun ekipman/HP uyuşmazlığı nedeniyle kopması ham kopma sayısına dahildir. Yeniden giren 24 hesabın bağlantı/hareket/12 saniye açık kalma kayıtları `result.acceptance.json` içindedir. `CHILD_EXIT` kanal sürecinin beklenmeyen çıkışıdır; bütün oturum kopmalarıyla aynı şey değildir. Cevapsız sayaç eski kapatılmış oturumların kalan isteklerini de içerir. Bitmemiş ödül, kabul ölçümü anında `normal_defeats.rewards_completed_at=0` bulunan kayıt sayısıdır; tek başına kalıcı veri kaybı kanıtı değildir, fakat verilen sıfır hedefine aykırıdır.

İlk koşuda ayrıca iki `permanent_actor_fenced` hata kaydı vardır; ham stack ve zamanlar korunmuştur. Yoğun yükte nedenin hangi ödül/oturum yolunda oluştuğunu çözümlemek için bu kayıtlar Claude'a verilmektedir. Kesin kök neden bulunduğu iddia edilmez.

## 30 / 50 / 70 / 100 oyuncu: p95 (ms)

Kontroller sütunu kanal/bağlantı/ödül/kod bütünlüğü kontrolleridir; p95 için 520 ms eşiğini otomatik PASS şartı olarak içermez. Gecikme değerleri ayrıca değerlendirilmelidir.

Ham result.json içindeki eski players=PER*4 alanı 30/50/70 koşularında 32/52/72 yazar. Gerçek nüfus channels[].players toplamıyla 30/50/70 olarak doğrulanır; test sürücüsünün dengeli dağıtım adaptörü ve komut/proof kayıtları bunu açıkça gösterir. Bu ham eski alan sonradan değiştirilmedi. TEST_SONUCLARI.json her ikisini ayrı tutar.

Her koşu 60 saniye; MONSTER_POOL=channel, kanal başına 60 (toplam 240) canavar, HP=200, oyuncuların tamamı savaşçı, parti/AOE/ganimet/silah/binek açık. R61 ve R62 aynı sırayla ve aynı profil ile ölçüldü. Bu koşular 4.800 canavarlı yoğun senaryoyla eşdeğer değildir.

| Sürüm | Oyuncu | Hareket | İlk saldırı | İksir | Ödül talebi | Ganimet | Kalıcı ölüm | Ölüm + bütün ödüller | Son metrik n | Kontroller |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---:|
| R61 | 30 | 90.0 | 57.0 | 135.0 | 179.0 | 118.0 | 298.6 | 298.6 | 30 | PASS |
| R62 | 30 | 65.0 | 55.0 | 147.0 | 118.0 | 188.0 | 241.9 | 241.9 | 32 | PASS |
| R61 | 50 | 148.0 | 61.0 | 186.0 | 241.0 | 237.0 | 272.1 | 272.1 | 36 | PASS |
| R62 | 50 | 73.0 | 59.0 | 167.0 | 328.0 | 527.0 | 325.6 | 325.6 | 44 | PASS |
| R61 | 70 | 111.0 | 64.0 | 260.0 | 137.0 | 154.0 | 309.6 | 309.6 | 39 | PASS |
| R62 | 70 | 202.0 | 65.0 | 320.0 | 317.0 | 136.0 | 327.2 | 327.2 | 41 | PASS |
| R61 | 100 | 248.0 | 78.0 | 414.0 | 208.0 | 120.0 | 330.6 | 330.6 | 42 | PASS |
| R62 | 100 | 285.0 | 75.0 | 481.0 | 182.0 | 171.0 | 406.7 | 406.7 | 42 | PASS |

Ölüm + bütün ödüller: istemcinin kalıcı ölümü görmesi ile ilgili bütün normal_defeat ödüllerinin SQL'de tamamlanıp o görünümü kapsayan durability sözünün çözülmesinden daha geç olanı. Envanterin ekranda çizilme süresini ölçmez. İlk saldırı yanıtı geçici 202 olabilir. Örnek sayısı düşük veya bekleyen ödül varsa tamamlanan işlemlerin yüzdelikleri bütün işlemler için garanti değildir.

| Sürüm | Oyuncu | Kopma | Cevapsız | Bitmemiş ödül | Çift anahtar | Gözlemcide bekleyen işlem | CHILD_EXIT |
|---|---:|---:|---:|---:|---:|---:|---:|
| R61 | 30 | 0 | 0 | 0 | 0 | 0 | 0 |
| R62 | 30 | 0 | 0 | 0 | 0 | 0 | 0 |
| R61 | 50 | 0 | 0 | 0 | 0 | 0 | 0 |
| R62 | 50 | 0 | 0 | 0 | 0 | 0 | 0 |
| R61 | 70 | 0 | 0 | 0 | 0 | 0 | 0 |
| R62 | 70 | 0 | 0 | 0 | 0 | 0 | 0 |
| R61 | 100 | 0 | 0 | 0 | 0 | 0 | 0 |
| R62 | 100 | 0 | 0 | 0 | 0 | 0 | 0 |

## Bütün p50 / p95 / p99 değerleri (ms)

Sıfır örnek: `—`. JSON ve CSV yuvarlanmamış değerleri içerir.

| Sürüm / koşu | Metrik | n | p50 | p95 | p99 |
|---|---|---:|---:|---:|---:|
| R62 crash-80-1 | Hareket | 1757 | 115.0 | 3161.0 | 8232.0 |
| R62 crash-80-1 | İlk saldırı yanıtı | 885 | 138.0 | 6654.0 | 13395.0 |
| R62 crash-80-1 | İksir | 193 | 326.0 | 4820.0 | 10285.0 |
| R62 crash-80-1 | Ödül talebi | 43 | 2123.0 | 11861.0 | 14957.0 |
| R62 crash-80-1 | Ganimet toplama | 17 | 1338.0 | 14152.0 | 14152.0 |
| R62 crash-80-1 | Kalıcı ölüm | 34 | 5286.6 | 11796.2 | 17506.5 |
| R62 crash-80-1 | Kalıcı ölüm + bütün ödüller | 28 | 4928.7 | 9710.6 | 17506.5 |
| R62 crash-80-2 | Hareket | 2216 | 93.0 | 1457.0 | 4443.0 |
| R62 crash-80-2 | İlk saldırı yanıtı | 1047 | 109.0 | 4180.0 | 12948.0 |
| R62 crash-80-2 | İksir | 173 | 357.0 | 3909.0 | 9806.0 |
| R62 crash-80-2 | Ödül talebi | 41 | 4880.0 | 12152.0 | 15047.0 |
| R62 crash-80-2 | Ganimet toplama | 15 | 1493.0 | 7955.0 | 7955.0 |
| R62 crash-80-2 | Kalıcı ölüm | 38 | 5587.8 | 16333.4 | 17182.2 |
| R62 crash-80-2 | Kalıcı ölüm + bütün ödüller | 23 | 3567.6 | 15523.1 | 16333.4 |
| R62 crash-80-3 | Hareket | 2272 | 85.0 | 1608.0 | 8027.0 |
| R62 crash-80-3 | İlk saldırı yanıtı | 1052 | 90.0 | 4755.0 | 10569.0 |
| R62 crash-80-3 | İksir | 181 | 248.0 | 2596.0 | 9829.0 |
| R62 crash-80-3 | Ödül talebi | 40 | 2533.0 | 10580.0 | 14499.0 |
| R62 crash-80-3 | Ganimet toplama | 13 | 241.0 | 14785.0 | 14785.0 |
| R62 crash-80-3 | Kalıcı ölüm | 31 | 4880.1 | 11499.7 | 16098.1 |
| R62 crash-80-3 | Kalıcı ölüm + bütün ödüller | 23 | 3810.5 | 11499.7 | 16098.1 |
| R62 plain-80-1 | Hareket | 3282 | 83.0 | 1230.0 | 3521.0 |
| R62 plain-80-1 | İlk saldırı yanıtı | 1593 | 92.0 | 2648.0 | 5085.0 |
| R62 plain-80-1 | İksir | 220 | 349.0 | 3456.0 | 5548.0 |
| R62 plain-80-1 | Ödül talebi | 145 | 1167.0 | 3789.0 | 6148.0 |
| R62 plain-80-1 | Ganimet toplama | 37 | 759.0 | 3520.0 | 4187.0 |
| R62 plain-80-1 | Kalıcı ölüm | 50 | 2182.7 | 5972.3 | 7807.0 |
| R62 plain-80-1 | Kalıcı ölüm + bütün ödüller | 38 | 1713.7 | 15216.8 | 16889.7 |
| R62 plain-80-2 | Hareket | 3135 | 78.0 | 1259.0 | 3456.0 |
| R62 plain-80-2 | İlk saldırı yanıtı | 1532 | 102.0 | 3311.0 | 5200.0 |
| R62 plain-80-2 | İksir | 229 | 350.0 | 3255.0 | 5284.0 |
| R62 plain-80-2 | Ödül talebi | 154 | 1494.0 | 5577.0 | 7263.0 |
| R62 plain-80-2 | Ganimet toplama | 30 | 283.0 | 3953.0 | 4897.0 |
| R62 plain-80-2 | Kalıcı ölüm | 52 | 2554.4 | 6617.7 | 7391.6 |
| R62 plain-80-2 | Kalıcı ölüm + bütün ödüller | 32 | 1557.4 | 13051.0 | 21208.3 |
| R61 matrix-30-1 | Hareket | 145 | 36.0 | 90.0 | 91.0 |
| R61 matrix-30-1 | İlk saldırı yanıtı | 1654 | 31.0 | 57.0 | 138.0 |
| R61 matrix-30-1 | İksir | 100 | 84.0 | 135.0 | 138.0 |
| R61 matrix-30-1 | Ödül talebi | 39 | 86.0 | 179.0 | 224.0 |
| R61 matrix-30-1 | Ganimet toplama | 26 | 79.0 | 118.0 | 128.0 |
| R61 matrix-30-1 | Kalıcı ölüm | 30 | 109.8 | 298.6 | 300.5 |
| R61 matrix-30-1 | Kalıcı ölüm + bütün ödüller | 30 | 109.8 | 298.6 | 300.5 |
| R62 matrix-30-1 | Hareket | 149 | 36.0 | 65.0 | 65.0 |
| R62 matrix-30-1 | İlk saldırı yanıtı | 1651 | 31.0 | 55.0 | 95.0 |
| R62 matrix-30-1 | İksir | 105 | 87.0 | 147.0 | 151.0 |
| R62 matrix-30-1 | Ödül talebi | 43 | 90.0 | 118.0 | 165.0 |
| R62 matrix-30-1 | Ganimet toplama | 28 | 85.0 | 188.0 | 339.0 |
| R62 matrix-30-1 | Kalıcı ölüm | 33 | 108.5 | 241.9 | 334.0 |
| R62 matrix-30-1 | Kalıcı ölüm + bütün ödüller | 32 | 107.6 | 241.9 | 334.0 |
| R61 matrix-50-1 | Hareket | 205 | 49.0 | 148.0 | 157.0 |
| R61 matrix-50-1 | İlk saldırı yanıtı | 2828 | 34.0 | 61.0 | 165.0 |
| R61 matrix-50-1 | İksir | 173 | 92.0 | 186.0 | 206.0 |
| R61 matrix-50-1 | Ödül talebi | 42 | 89.0 | 241.0 | 309.0 |
| R61 matrix-50-1 | Ganimet toplama | 31 | 78.0 | 237.0 | 252.0 |
| R61 matrix-50-1 | Kalıcı ölüm | 36 | 122.6 | 272.1 | 319.2 |
| R61 matrix-50-1 | Kalıcı ölüm + bütün ödüller | 36 | 122.6 | 272.1 | 319.2 |
| R62 matrix-50-1 | Hareket | 200 | 36.0 | 73.0 | 90.0 |
| R62 matrix-50-1 | İlk saldırı yanıtı | 2816 | 31.0 | 59.0 | 197.0 |
| R62 matrix-50-1 | İksir | 174 | 88.0 | 167.0 | 188.0 |
| R62 matrix-50-1 | Ödül talebi | 49 | 93.0 | 328.0 | 376.0 |
| R62 matrix-50-1 | Ganimet toplama | 33 | 84.0 | 527.0 | 527.0 |
| R62 matrix-50-1 | Kalıcı ölüm | 44 | 145.1 | 325.6 | 489.2 |
| R62 matrix-50-1 | Kalıcı ölüm + bütün ödüller | 44 | 145.1 | 325.6 | 489.2 |
| R61 matrix-70-1 | Hareket | 267 | 49.0 | 111.0 | 119.0 |
| R61 matrix-70-1 | İlk saldırı yanıtı | 3992 | 30.0 | 64.0 | 192.0 |
| R61 matrix-70-1 | İksir | 245 | 90.0 | 260.0 | 270.0 |
| R61 matrix-70-1 | Ödül talebi | 46 | 80.0 | 137.0 | 176.0 |
| R61 matrix-70-1 | Ganimet toplama | 32 | 79.0 | 154.0 | 165.0 |
| R61 matrix-70-1 | Kalıcı ölüm | 39 | 127.5 | 309.6 | 425.1 |
| R61 matrix-70-1 | Kalıcı ölüm + bütün ödüller | 39 | 127.5 | 309.6 | 425.1 |
| R62 matrix-70-1 | Hareket | 250 | 59.0 | 202.0 | 221.0 |
| R62 matrix-70-1 | İlk saldırı yanıtı | 3965 | 36.0 | 65.0 | 165.0 |
| R62 matrix-70-1 | İksir | 244 | 93.0 | 320.0 | 389.0 |
| R62 matrix-70-1 | Ödül talebi | 43 | 96.0 | 317.0 | 317.0 |
| R62 matrix-70-1 | Ganimet toplama | 22 | 79.0 | 136.0 | 142.0 |
| R62 matrix-70-1 | Kalıcı ölüm | 41 | 147.6 | 327.2 | 540.9 |
| R62 matrix-70-1 | Kalıcı ölüm + bütün ödüller | 41 | 147.6 | 327.2 | 540.9 |
| R61 matrix-100-1 | Hareket | 346 | 114.0 | 248.0 | 302.0 |
| R61 matrix-100-1 | İlk saldırı yanıtı | 5709 | 33.0 | 78.0 | 213.0 |
| R61 matrix-100-1 | İksir | 348 | 91.0 | 414.0 | 484.0 |
| R61 matrix-100-1 | Ödül talebi | 46 | 98.0 | 208.0 | 231.0 |
| R61 matrix-100-1 | Ganimet toplama | 26 | 79.0 | 120.0 | 161.0 |
| R61 matrix-100-1 | Kalıcı ölüm | 42 | 152.4 | 330.6 | 486.5 |
| R61 matrix-100-1 | Kalıcı ölüm + bütün ödüller | 42 | 152.4 | 330.6 | 486.5 |
| R62 matrix-100-1 | Hareket | 352 | 131.0 | 285.0 | 427.0 |
| R62 matrix-100-1 | İlk saldırı yanıtı | 5717 | 39.0 | 75.0 | 289.0 |
| R62 matrix-100-1 | İksir | 345 | 100.0 | 481.0 | 574.0 |
| R62 matrix-100-1 | Ödül talebi | 52 | 84.0 | 182.0 | 240.0 |
| R62 matrix-100-1 | Ganimet toplama | 23 | 92.0 | 171.0 | 180.0 |
| R62 matrix-100-1 | Kalıcı ölüm | 42 | 152.6 | 406.7 | 528.9 |
| R62 matrix-100-1 | Kalıcı ölüm + bütün ödüller | 42 | 152.6 | 406.7 | 528.9 |

## Kurulum ve taşınabilirlik

- Yeni dış ZIP ile harici taban arşivi olmadan gerçek oyun `--check`, `--apply`, `--flags`, dört anahtarı 0/1 yapma ve `--rollback-latest` geçti. Gerçek Node, dosya sistemi ve SQLite kullanıldı; root ve servis sağlığı test fixture'ı ile temsil edildi. Güncel DB baytları/inode ve yeni kazanılan bakiye geri almada korundu. Canlı servis çalıştırılmadı.
- İç oyun ve site ZIP'leri önceki R62 ile byte olarak aynıdır. Önceki site/tarayıcı/kurucu kanıtları `historical-r62/` altında ayrı tutuldu. Bunlar yeni yoğun yük başarısızlıklarını geçerli kılmaz.
- Kaynak ZIP'leri boş `/tmp` klasörüne açıldı; bütün dosya hash'leri eşleşti. İlk crash koşusu aynı kaynakların paketleme ağacında, kalan 12 koşu ZIP'ten açılan ağaçlarda çalıştırıldı. Tam sourceCore her koşu öncesi/sonrası aynı kaldı.
- ESM yükleme kaydı eski çalışma alanından dosya okunmadığını doğrular. Ağaç dışındaki modüller yalnız bu testin oluşturduğu geçici native runtime dizinidir. Kaynak ZIP'lerinde bağımlılıklar fiziksel kopyadır, dış dizine symlink yoktur.
- Verilen testler bağımsız çalışır; native dışa aktarımının eksik üretim medya/derleme dosyaları `NATIVE_EXPORT.json` içinde açıkça listelenir. Sıfırdan canlı oyun kurulumu vaat edilmez.

## Kanıt dizini

`CORE511_R62_TEST_KANITLARI.zip` içinde `runs/R61` ve `runs/R62` altında her koşunun result.json, acceptance, drain, shutdown, komut, tam ortam/source SHA, driver dönüşüm kanıtı, import kayıtları ve run.log dosyaları bulunur. Bütün sonuçlara TEST_SONUCLARI.json ve GECIKME_TABLOSU.csv üzerinden de erişilir.


## Ek kontrol: önceki testte neden görülmedi?

Kullanıcının sorusu üzerine aynı 4.800 canavarlı, 80 oyunculu plain senaryo R61'de de çalıştırıldı. Standart sonuç kaydedildikten sonra, o sonucu değiştirmeden ek tanı yapıldı:

| R61 ek kontrol aşaması | Bitmemiş ödül | Bot kuyruğundaki hedef | Bu kuyrukla eşleşen tekil bitmemiş hedef |
|---|---:|---:|---:|
| Standart koşu sonucu kaydedilince | 1216 | 1010 | 974 |
| Yeni talep göndermeden 15 saniye sonra | 1162 | 1010 | 920 |
| Kuyruktaki talepler normal protokolle gönderildikten sonra | 200 | 0 | 0 |

Son aşamada 109 normal claim_rewards talebi gönderildi; yeni saldırı veya doğrudan SQL yazımı yapılmadı. Claim başarısızlığı 0, kapanış temiz, kaynak SHA aynı. Ek aşama 38,2 saniye sürdü; ilk 15 saniyesi pasif bekleme. Standart gecikme tablosuna bu ek aşama katılmadı.

Bu kontrol, durumun R62'ye özgü olmadığını ve test sürücüsünün süre bitince göndermeyi durdurduğu ödül taleplerinin sayımı önemli ölçüde etkilediğini gösterir. Kalan 200 kaydın kesin nedeni bu teslimde çözülmedi. Ödüllerin kalıcı olarak kaybolduğu sonucuna varılamaz; bütün ödüller tamamlandı da denemez. Üç zorunlu crash ve iki plain koşusunun FAIL sonucu korunur. Normal 240 canavar havuzundaki bütün 30/50/70/100 koşularında bu sayaç sıfırdı.

Kanıt: `runs/R61/plain-diagnostic-2/result.backlog-diagnostic.json`, aynı klasördeki değiştirilmemiş standart result.json/acceptance, komut/env/source ve adaptör ters dönüş kanıtları. Teşhis kodu ve yeniden çalıştırma komutu `diagnostics/` altındadır. İlk ek tanı denemesi dışarıdaki gözlemci import'unu yalıtım kontrolünün reddetmesi nedeniyle oyun başlamadan durdu; bu kayıt da `runs/R61/plain-diagnostic/` altında saklandı. Gözlemci çıkarılan ağacın içine kopyalandıktan sonraki ikinci deneme yukarıdaki gerçek sonuçtur.
