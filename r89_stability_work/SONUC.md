# R89 — Rün Sahili ve hareket düzeltmesi

Canlıdaki R86 üzerine kurulan güncelleme. R88 devir kodu ve tamamlanan R87 iyileştirmeleri dahil; ayrıca R87/R88 kurulmaz. Canlı sunucuya bu çalışma ortamından bağlanılmadı ve kurulum yapılmadı.

## Düzeltilen yollar

- **Rün Sahili iksirleri:** normal haritalardaki güvenli birleşik kayıt ve en fazla 10 oyunculu iksir işlemi Rün Sahili'ndeki uygun oyunculara da uygulanır. İksir sonrası tam karakter okuması yerine doğrulanmış değişen alanlar yenilenir. Ölüm, ekipman/sahiplik değişimi ve uygun olmayan durumlar tam doğrulamaya döner.
- **Hareket ve ödül beklemesi:** devralınan R88 sınırlı hareket izni ve geç gelen yanıtların yeni konumu geri almamasını sağlayan düzeltme dahil. Ödül/iksir sonucu kalıcı kayıttan önce onaylanmaz; saldırı, can ve ödül kontrolleri korunur.
- **Toplu kayıt yığılması:** aynı anda oyuna alınan veya yenilenen karakterlerin ilk periyodik kaydı 1000–1500 ms aralığına dağıtılır. Sonraki dönem 1500 ms kalır. İki saniyelik güvenlik sınırı uzatılmaz.
- **Ödül işçisindeki tekrarlar:** yedi sabit ayar tablosunun tam satırları her işlem öncesi karşılaştırılır. Değişmediklerinde JSON yeniden ayrıştırılmaz. Aynı revizyonda içerik değişmesi, ayar kaydı ve geri alınan işlem yeniden okumayı zorunlu kılar. Etkinlik Adası gibi dinamik durumlar her seferinde yenilenir.
- **Rün kanal hatası:** katalogda bulunmayan bir Rün canavarı kaydında yeniden doğma süresi okunurken oluşan boş değer hatası giderildi. Tanımlı canavarların mevcut süreleri ve ödül kuralları korunur.
- **İstemci:** R87 oyuncu/canavar indeksleme ve kanat çizimi iyileştirmeleri ile R88 iksir beklerken tek hareket komutunu ilerletme değişikliği pakette bulunur.

## Son kaynakla 50 oyunculu ölçüm

İki kanalda 25'er oyuncu, dört gerçek kanal süreci, gerçek TCP/WebSocket ve Core511Transport/hareket tahmini. Normal harita ve Rün Sahili ayrı ayrı 180 saniye. Yerel ortamın işlemci kotası 4 çekirdektir; canlı VDS donanımıyla aynı ortam değildir. Hedefler ve iksir stokları kontrollü test verisidir.

| Senaryo | Toplam komut | Hareket p99 | En yavaş hareket | Saldırı p99 | Tahmin sınırı / kırpılan kare |
|---|---:|---:|---:|---:|---:|
| Normal harita | 58,797 | 99.3 ms | 358.5 ms | 96.3 ms | 0 / 0 |
| Rün Sahili | 52,668 | 83.3 ms | 252.6 ms | 89.4 ms | 0 / 0 |

Her iki koşuda hata, kanal arızası, kaybolan/onaysız kalan komut ve iptal edilen hareket: **0**. İksir tüketimi, can kazanımı, canavar ölümü ve ödül kayıtları SQL sonuçlarıyla doğrulandı. p99, işlemlerin %99’unun altında kaldığı süredir; en kötü durum değildir.

## Oyun sürerken yeni oyuncu girişi

49 oyuncu oynarken aynı haritaya 50. oyuncu normal giriş yoluyla katıldı. İki bağımsız 30 saniyelik son koşu:

- Koşu 1: girişten bağlantının hazır olmasına 105.9 ms; hareket p99 187.3 ms, en yavaş hareket 342.1 ms. Giriş penceresinde hareket p99 339.4 ms. Hareket tahmin sınırı/kırpılan kare 0/0; iki oyuncu grubunun ekonomi doğrulaması geçti.
- Koşu 2: girişten bağlantının hazır olmasına 129.4 ms; hareket p99 181.4 ms, en yavaş hareket 386.2 ms. Giriş penceresinde hareket p99 203.1 ms. Hareket tahmin sınırı/kırpılan kare 0/0; iki oyuncu grubunun ekonomi doğrulaması geçti.

İlk adayın ayrı giriş koşusunda, oyuncu katılmadan önce toplu ilk öldürme sırasında **5 kısa tahmin sınırı olayı ve 5 kırpılan kare** görülmüştü. Bu aday yayımlanmadı; ödül işçisindeki ayar tekrarları da azaltılıp son kod yeniden ölçüldü. Önceki başarısız ölçüm kanıt paketinde tutulur. Bu sonlu koşular her çalışma anında sıfır gecikme garantisi değildir.

## Doğruluk ve kurulum

- **45 native doğruluk testi** geçti: Rün öldürme/ödül tekrarı, 10'lu iksir ve son işlemde SQL hatasıyla tüm grubun geri alınması, geç kalıcı onay sırasında hareket, eski onayın yeni konumu bozmaması, ayar değişimi/rollback, normal/solo/grup zindanı, kule ve sis savaş akışları.
- **36 kurucu testi** geçti: gerçek R86→R89 dosya planı, üç istemci modülünün bağlantıları, sürüm sınırları, sağlık yanıtı, yarım işlemden kurtarma ve güncel veritabanını koruyan geri alma. Testler izole dosyalarda yapıldı; VDS kurulumu değildir.
- Veritabanı şeması ve hesap servisi değiştirilmez. Kurucunun sürüm/oturum/sağlık kontrolleri atlanmaz.

## Ölçümün sınırları

Bu testler gerçek sunucu/taşıma kodunu kullanır; 50 adet çizim yapan tarayıcı değildir. İnternet gecikmesi, canlı veritabanının büyüklüğü, tüm medya yükü, cihaz FPS’i, her haritada 50 kişilik boss/lonca/arena karışımı ve saatler süren yük bu koşularla doğrulanmış sayılmaz. `fullGameAcceptance: false` bilinçli olarak korunmuştur.

Son çekirdek SHA-256: `8d145357746321e2376013af405de65cdf82b173206556a119d03505465aa75a`. Ölçülen kod ile kurulan paket dosyaları SHA-256 ile bağlanır. Ham sonuçlar ve kontrol günlükleri ZIP içindeki `evidence/` dizininde, kurulum adımları `KURULUM.md` dosyasındadır.
