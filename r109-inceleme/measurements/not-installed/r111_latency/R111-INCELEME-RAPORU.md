# R111 incelemesi — yayın kararı: uygun değil

12 Kasım 2026. Kullanıcı R110 karşılaştırmasını yeterli bulmadı. Bu çalışma
R110'u kurmadan, ayrı `r111-latency` dalında yapıldı. Canlıya erişilip kod veya
ayar değiştirilmedi. Yeni kurulum ZIP'i üretilmedi; önceki ZIP'ler değişmedi.

## Sonuç

Bu adayın bütün oyunda daha iyi olduğu kanıtlanmadı. Sorgu önbelleğinin
sınırsız büyümesi engellendi ve yalnız okuma için tekrar kurulan savaş kuralı
nesneleri azaltıldı. Ancak uzun saldırı yanıtları giderilmedi, bellek tepe değeri
yükseldi. Sıfır takılma, 100 oyuncu kapasitesi veya canlıda aynı sonucu vaat etmiyoruz.

## Arka arkaya 40 oyuncu, üçer dakika

| Ölçüm | R110 | R111 denemesi |
|---|---:|---:|
| En kötü kanal tick p99 (ms) | 27.95 | 27.14 |
| Ana süreçte >50 ms duraklama / 3 dakika | 10.00 | 7.00 |
| Dört kanaldaki >50 ms duraklama toplamı / 3 dakika | 22.00 | 24.00 |
| En uzun ana süreç duraklaması (ms) | 115.02 | 107.54 |
| Ana süreç ELU (%) | 19.99 | 19.77 |
| Ana süreç CPU (%) | 45.01 | 43.94 |
| En yüksek ana süreç RSS (MiB) | 554.13 | 580.29 |
| En uzun GC (ms) | 22.84 | 24.44 |
| Host steal (%) | 3.75 | 3.20 |
| Kota kısıtlaması sayısı | 1.00 | 1.00 |
| Kota kısıtlaması toplamı (ms) | 42.91 | 7.45 |
| En uzun eşleşen nihai saldırı yanıtı (ms) | 520.08 | 540.71 |

Tick p99 en yavaş kanalın yüzdeliğidir. Kanal duraklamaları farklı süreçlerin
toplamıdır; tek oyuncunun yaşadığı ayrı donma sayısı değildir. Nihai saldırı
ölçümü ilgili intent için gerçek sonuç olayıyla eşleşir; 202/bekliyor yanıtı
başarı sayılmaz. Her iki koşu da bekleyen komut/ödül bırakmadan tamamlandı.
Ölçüm sırasında CPU/SQL/allocation profili yoktu; test amaçlı sorgu-kalıbı
sayacı ve saniyelik bellek örneklemesi açıktı.

## Yapılan iki dar değişiklik

1. `dirtyWriter` değişen sütun birleşimleri için sonsuza kadar tuttuğu
   hazırlanmış sorguları en fazla 64 kalıpla sınırlar. En son kullanılan kalıp
   korunur, çıkarılan gerekirse yeniden hazırlanır. UPDATE sütunları, değerler,
   sürüm koşulu, UPDATE OF tetikleyicileri, transaction ve geri alma aynı.
   Eski üç dakikalık koşuda ana oyuncu kalıbı 24→76; adayda 26→64 oldu.
   Bu, sınırsız tutmayı düzeltir; bütün RSS farkının sebebi olduğunu kanıtlamaz.
2. Her saldırı/karşı saldırı okumasında tüm kural fabrikasını tekrar kurmak
   yerine yalnız saf okuyucu fonksiyonları yeniden kullanılır. Veritabanı,
   oyuncu, eşya, ayar satırı veya sonuç önbelleğe alınmaz. Ayarlar ve satırlar
   her çağrıda güncel okunur. İşlem başına RNG ve ödül kuralları değiştirilmez.

Ayrı commit'ler: `99ee1d6`, `66b3669`. Bunlar araştırma dalındadır; kurulum
payload'ına dönüştürülüp dağıtılmadı.

## Üç R110 değişikliğini tek tek kaldırma denemesi

Her biri 40 oyuncu/60 saniye, aynı sentetik senaryo. İlk ve son kontrol de
R110'un kendisidir. Bütün koşuların komut/ödül doğruluğu geçti.

| Deneme | Tick p99 ms | Ana >50 ms | En uzun nihai saldırı ms | Host steal % |
|---|---:|---:|---:|---:|
| R110 ilk kontrol | 27.13 | 0 | 523.53 | 2.57 |
| R110 son kontrol | 82.14 | 18 | 2418.19 | 9.07 |
| Boss kısa doğrulaması kapalı | 24.40 | 2 | 523.39 | 2.31 |
| SQL erişim nesnesi önbelleği kapalı | 26.67 | 0 | 468.00 | 2.06 |
| Yeni mesaj birleştirici kapalı | 28.11 | 2 | 412.36 | 3.07 |

Son kontroldeki 2,4 saniyelik olumsuz sonuç saklandı. Bu denemelerden bir
R110 özelliğinin tek başına bütün kötüleşmeye sebep olduğu sonucu çıkmıyor.
Makine etkisi büyük; tek iyi koşu seçilerek hızlanma yüzdesi verilmedi.

## Kalan bekleme hakkında bulunanlar

- Üç dakikalık aday koşusunun yedi ana >50 ms aralığından dördünde, dört
  kanal ve dünya süreci de aynı aralığın en az %75'inde bekledi; üçünde WAL
  okuyucusu da aynı şekilde bekledi. Bunların hepsini ana süreç GC'si veya
  tek SQL sorgusu olarak tanımlamak doğru değil. Host/kota etkisi ayrılmalı.
- Yalnız yerel testte açılan aşama ölçümünde saldırı yazıcısının tek iş süresi
  en çok 44,66 ms; COMMIT en çok 1,27 ms idi. Kalıcı onay beklemesinden sonra
  yapılan durum yenileme de gecikmeye katkı veriyor. Bu 30 saniyelik tanı
  koşusu genel kapasite veya önce/sonra performans kanıtı sayılmaz.
- Durum yenilemedeki bazı tam okumalara hareket/konum revizyonu ve root
  etkisinin değişmesi yol açıyor. Bu kontroller silinmedi: eski konum/can,
  yanlış ödül veya sahiplik riski yaratacak bir hızlandırma yapılmadı.
- Aşama ölçümündeki 623 ms reward-worker açılışı başlangıcı da kapsayan
  süreç ömrü sayacıdır; bunu ölçüm penceresinde yaşanmış yeni donma saymadık.

## Davranış doğrulaması

78 odaklı test, 29 native oyun/ödül/sahiplik testi ve 20 captcha testi geçti.
Ek boss açılışı ve soğuk okuyucu regresyon kontrolleri de geçti. Yeni sorgu
sınırı 511 farklı sütun birleşiminde eski kayıtlarla ve UPDATE OF tetikleme
sayısıyla karşılaştırıldı; geri alma ve eski sürüm koşuluyla yazı reddi korundu.
Yeniden kullanılan okuyucular güncel DB satırları, farklı bağlantılar, ayar
değişimi ve transaction geri alma üzerinde eski sonuçlarla eşleşti.
Bu doğruluk testleri, performans hedefinin geçtiği anlamına gelmez.

## Test ortamı ve sınırlar

Dört gerçek kanal süreci, ayrı bot süreci, TCP/WebSocket, SQLite WAL;
40 donanımlı karakter, 6.000 arka plan canavarı. Orman, Kadim Kule, Solo
Zindan, Sis Yarığı, Kara Orman ve Rün Sahili; saldırı, hareket, iksir, sohbet,
lonca/görev/market HTTP okumaları. Gerçekçi sıklıklar canlı logdan çıkarılmadı;
market/lonca mutasyonları yük senaryosunda yoktur. Test verisi sentetiktir.

Test makinesinin kotası 4 CPU; canlı VDS 8 çekirdek. Canlı veritabanı kopyası,
gerçek oyuncu hareketlerinin oranı ve aynı kaynaklı izole test ortamı yok.
Bu yüzden canlı 30–40 oyuncuda takılma olmayacağı kanıtlanmış değildir.
R111 için kurucu, dağıtılan PC/mobil dosyalar ve taşınmış runtime doğrulaması
çalıştırılmadı: yayın adayı seçilmedi, yeni ZIP oluşturulmadı.

## İlerlemek için ölçümden çıkan somut sıra

1. Aynı kaynak sınırında ve anonimleştirilmiş gerçek veriyle 30/40 oyuncu
   tekrarlarını karşılaştırmak; makine kaynaklı eşzamanlı beklemeleri ayırmak.
2. Uzun saldırıların yazıcı kuyruğu, tek atomic iş ve sonrası yenileme sürelerini
   eşleşen işlemle takip etmek. Güvenlik kontrollerini kaldırmadan yalnız
   kanıtlanan tekrarları azaltmak; geniş worker/mimari değişikliğini ayrı
   tasarım olarak değerlendirmek.
3. Ortalama kadar en kötü yanıt/RSS/ödül doğruluğu da kötüleşmeyen adayı
   seçmek; sonra iki realm kurulum/geri dönüş ve exact istemci testlerinden
   geçirerek paketlemek. Bu çalışma o eşiği geçmedi.

Ham kanıtlar `evidence/r111-load-summary.json`, `r111-long-*-40.json`,
`r111-ablate-*-40.json` ve `r111-stages-enabled-40.json` içindedir.
