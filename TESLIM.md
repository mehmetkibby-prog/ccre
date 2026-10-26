# Claude için R61 / R62 bağımsız teslim

Bu teslim inceleme içindir; canlı VDS'ye kurulmadı. Oyun kaynakları önceki R62 ile aynıdır.

**Sonuç:** ortak havuzla 30/50/70/100 oyuncu koşularında iki sürüm de bağlantı ve ödül bütünlüğü kontrollerini geçti. R62'nin 100 oyuncu ölüm + tüm ödüller p95'i **406,7 ms** (42 örnek). Belgedeki 4.800 canavarlı üç çökme ve iki düz yoğun yük koşusunda ise bitmemiş ödül sayısı sıfır olmadı; bu beş koşu **FAIL** olarak teslim ediliyor. Ayrıntılı yüzdelikler, ham kayıtlar ve ek teşhis TEST_SONUCLARI.md içindedir.

## İndirilecek dosyalar

| Dosya | İçerik |
|---|---|
| [CORE511_R62.zip](CORE511_R62.zip) | R61 üzerine oyun + ön kayıt sitesi kurucusu; doğrulama arşivi içeride. Eski kurulum ZIP'i gerekmez. |
| [CORE511_R61_KAYNAK.zip](CORE511_R61_KAYNAK.zip) | R61 kaynak ağacı, native dışa aktarımı, website, Node, kilitli bağımlılıklar, fixture ve yük sürücüsü. |
| [CORE511_R62_KAYNAK.zip](CORE511_R62_KAYNAK.zip) | Aynı kapsamda R62 kaynakları. Delta değildir. |
| [CORE511_R62_TEST_KANITLARI.zip](CORE511_R62_TEST_KANITLARI.zip) | İstenen 13 koşunun ham sonuçları, bütün komut/env/SHA kayıtları, ek teşhis ve kurucu kanıtları. |
| [SHA256SUMS.txt](SHA256SUMS.txt) | Dört ZIP ve teslim belgelerinin SHA-256 değerleri. |

[KURULUM.md](KURULUM.md) · [KOMUTLAR.md](KOMUTLAR.md) · [TEST_SONUCLARI.md](TEST_SONUCLARI.md) · [DEGISIKLIKLER.md](DEGISIKLIKLER.md) · [CSV](GECIKME_TABLOSU.csv) · [Tam diff](R61_R62_TAM.diff)

Kaynak ZIP'leri boş klasöre açılarak test edildi. İçindeki `validation/run.py`, internet/npm install/eski R61 paketi olmadan yük testini çalıştırır. Linux x86_64, glibc 2.28+, Python 3.10+ gerekir; Node 22.22.0 dahildir. İki kaynak ZIP'inin her biri yaklaşık 98 MB'dır.

Native ağacı eldeki **kaynak dışa aktarımının tamamıdır**; orijinal üretim manifestindeki bütün eski medya/derlenmiş web dosyaları mevcut değildir. Eksik 2.469 dosya `NATIVE_EXPORT.json` içinde açıkça listelenmiştir. Kaynak/test bağımlılıkları dahildir; bu kaynak ZIP'leri sıfırdan canlı oyun kurulumu veya eksiksiz eski medya arşivi olarak sunulmaz. Yük testi bu eksikler için açıkça verilen kaynak fixture'larını kullanır. Önceki R57–R61 paketleri kullanıcıdan istenmez.

## Kaynak kimlikleri

- R61 sourceCore: `cdaffd0d1297c1ef49248bffb39226e966f1195148a808a480dee36bee5961a9`
- R62 sourceCore: `1957760ba0a499db494d7a06daee6cedd925c77704cca6baedbf837c35b7def4`
- Native manifest: `bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b`
- Her iki sürümde aynı my-load-real.mjs: `ec41a39aa124fdae08671b5ed2fd79885c9d23f75936727c8a0c4259e9dc4e42`

sourceCore, kaynak adayının kimliğidir. Kurucunun canlıya göre birleştirdiği runtime için raporladığı beforeCore/afterCore farklı olabilir; kaynak ağacı SHA'sıyla karıştırılmamalıdır. Tam dosya farkı ve önce/sonra SHA'ları ayrı verilmiştir.

## Önceki testle yeni yoğun testin farkı

Önceki R62 ölçümünde CORE_MONSTER_POOL=channel, dört kanalda toplam 240 canavar vardı. İstenen yeni çökme/plain komutunda MONSTER_POOL verilmediği için özgün sürücü oyuncu başına 60, toplam 4.800 canavar oluşturur. Ayrıca yoğun senaryoda HP=500, savaşçı oranı varsayılan %60; önceki ortak havuzda HP=200, savaşçı oranı %100 ve silah/binek açık. Çökme koşulunda ekipman ve HP değişimleri de uygulanır. Bu nedenle eski başarılı tabloyu yeni komutun sonucu gibi sunmak doğru değildir. Kod bu teslim sırasında değiştirilmedi.

Önceki 80 oyuncu koşusu 40 saniyeydi; yeni normal matris 60 saniye, yoğun koşular 50 saniyedir. Süre bitiminde test botunun gönderilmemiş ödül kuyruğunu durdurması da ayrıca incelenmiştir; standart FAIL sonuçlarının üzerine yazılmamıştır. Ek R61 kontrolünde 1.216 bekleyen ödül, 15 saniye pasif bekleme ve sırada kalmış normal istemci taleplerinin gönderilmesi sonrasında 200'e düştü. Tamamen sıfırlanmadı; bu yüzden asıl FAIL sonuçları korunur. Ayrıntı TEST_SONUCLARI.md'dedir.

Çalışma yerel bulut ortamındadır (4 CPU kotası / 32 GiB bellek sınırı); 8 CPU/8 GB canlı VDS ölçümü değildir. Kaynaklar ve ham kanıtlar Claude'un aynı makinede karşılaştırması için hazırlanmıştır.
