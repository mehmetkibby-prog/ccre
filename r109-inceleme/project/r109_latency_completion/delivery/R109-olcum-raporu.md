# R109 — kalan gecikme incelemesi ve düzeltmeler

R106_CAPTCHA1 üzerine önceki R108 düzeltmeleri ve üç yeni dar değişiklik eklendi.
R106_READY1, swap, canlı telemetri veya deneysel Node bellek ayarı eklenmedi.
Canlıya kurulmadı. Oyun kuralları, kayıt biçimi ve ödül/sahiplik garantileri korundu.

## Yeni düzeltmeler

1. Ayrı yazıcıya uygun olmayan saldırılar ana yola döndüğünde sorgu önbelleği
   kapsamı eksikti. Normal yoldaki sınırlı, şema denetimli önbellek bu senkron
   işlemde de kullanılıyor. Commit ve kalıcı onay sırası değişmiyor.
2. İlk boss ölümünün özgün sorguları açılışta derleniyor. En fazla sekiz sınırlı
   sorgu kalabiliyor; kullanılınca veya şema değişince bırakılıyor. Ödül verisi,
   sonuç satırı veya oyuncu bilgisi önbelleğe alınmıyor.
3. Toplu ölümlerde ana saldırının yanına en fazla bir kabul edilmiş saldırı
   ekleniyor. Sonraki kuyruk başları tüketilmiyor; sıra, seed, sahiplik ve kayıt
   korumaları aynı. Bir tek atomik işlemde uzayan işlem yükü azaltıldı.

## Dağıtılacak kodun 60 saniyelik ölçümleri

Dört gerçek kanal, ayrı bot süreci, TCP bağlantıları, 6.000 arka plan canavarı;
üç sınıf/uzmanlık, eşya/efsun, pet/kanat ve çanta. Karma senaryo normal harita,
Kadim Kule, Solo, Sis Yarığı, Kara Harita ve Rün Sahili içeriyor. Sohbet,
iksir, lonca/görev/pazar okuma istekleri de var. Boss dört kanalın gerçek
katkı/ölüm/XP ve ganimet kontrollerini çalıştırıyor. Bot IP'leri ayrı;
IP başına oto atak güvenliği değiştirilmedi. Akademi gerçek 10 kişi/kanal
sınırında; Efsane yoğun koşusu 25+15 kişi şeklinde.

| Senaryo | Oyuncu | Tick p95/p99 (ms) | Ana >50 ms/dk | Kanal >50 ms/dk (toplam) | En uzun ana/kanal (ms) | Ana ELU | Toplam RSS (MiB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| r1 / packed-1 | 40 | 18.94 / 29.40 | 0 | 0 | 30.4 / 43.6 | %21.2 | 1304 |
| r1 / boss-1 | 40 | 7.55 / 14.11 | 3 | 4 | 70.6 / 57.4 | %22.7 | 1139 |
| r1 / balanced30 | 30 | 10.41 / 17.14 | 1 | 5 | 60.3 / 75.6 | %24.7 | 1252 |
| r2 / academy40 | 40 | 12.13 / 19.82 | 0 | 1 | 45.9 / 98.2 | %28.0 | 1227 |
| r1 / packed-2 | 40 | 18.50 / 30.13 | 1 | 0 | 67.7 / 34.1 | %21.8 | 1157 |
| r1 / boss-2 | 40 | 8.09 / 17.97 | 3 | 17 | 121.8 / 186.9 | %23.1 | 1134 |

Her satır ayrı bir 60 saniyelik pencere. Tick p95/p99, dört kanal içindeki en yüksek kanal değeridir. Ana ve kanal sayıları aynı fiziksel duraklamada örtüşebilir; toplanarak benzersiz donma sayısı sayılmaz.

**Tüm süreçlerde 50 ms altı hedefi:** sağlanmadı; tekil uzun duraklamalar devam ediyor.
**Tick p99 <30 ms, ana süreçte ve kanalların toplamında en fazla bir >50 ms kontrolü:** bütün koşularda geçmedi.

### Botun komut yanıtını beklediği süre

Tick süresi bir komutun yanıt süresi değildir. Aşağıdaki ölçüm botun gerçek
istemci transportuna komutu vermesi ile HTTP/WebSocket yanıtını alması
arasındadır; istemci/sunucu kuyruğunu ve protokol beklemesini de içerir.
202 geçici yanıtı kalıcı ödül onayı sayılmaz; son olay ve ödül tamamlanması
ayrıca denetlendi. Bunlar toplu komut p95'i değil, oyuncu başına p95'lerin
medyanı ve en yüksek değeridir. Bot, test sunucusuyla aynı makinededir;
internet ve çizim süresi dahil değildir.

| Senaryo | Oyuncu başına yanıt p95 medyanı (ms) | En yüksek oyuncu p95 (ms) | En uzun tek yanıt (ms) |
|---|---:|---:|---:|
| r1 / packed-1 | 135.9 | 254.1 | 578.8 |
| r1 / boss-1 | 486.0 | 783.0 | 1310.0 |
| r1 / balanced30 | 111.9 | 176.3 | 557.3 |
| r2 / academy40 | 120.7 | 225.6 | 418.1 |
| r1 / packed-2 | 131.7 | 337.3 | 509.6 |
| r1 / boss-2 | 622.9 | 763.3 | 1172.6 |

Özellikle ortak boss koşusunda bir saniyeyi aşan tekil komut yanıtları da var. Düşük tick p99 sonucu, bütün etkileşimlerin gecikmesiz olduğu anlamına gelmiyor. Bu paket tüm kalan gecikmelerin giderildiği bir sürüm olarak sunulamaz.

Test makinesi 4 CPU kotasını paylaşır; canlı VDS 8 çekirdektir. Sentetik veri
kullanıldı; anonim canlı DB kopyası yok. CPU steal ve kotalama ham JSON host
alanında korunur. Birkaç süreçte aynı anda görülen duraklamalar rapordan
çıkarılmadı; bunların tamamını işletim sistemine yüklemek doğru değildir.
Sunucu tick ölçümü oyuncunun ağ gecikmesini veya GPU/FPS değerini ölçmez.
Sıfır lag ve canlı kapasite garantisi verilmez. İlk boss koşusunda 59,3 ms
süren bir native kayıt işlemi diğer döngülerdeki duraklamayla çakışmadı;
bu kalan süreyi yalnız donanıma bağlamıyoruz.

## Önce/sonra ve olumsuz bulgular

Aynı 40 kişilik eşyalı, yoğun kanal senaryosunda bu çalışma içindeki ilk
önbellek koşusu p99 43,71 ms ve ana >50 ms 8; küçük grup denemesi p99 32,76 ms
ve ana >50 ms 2 verdi. Bunlar farklı zamanlardaki tekil pilotlardır; kesin
nedensel yüzde veya canlı kapasite artışı olarak yorumlanamaz. Son kodun
tekrarları yukarıdaki tabloda, değişkenlik dahil gösterildi.

Önceki R108 ölçümleri ve arşivi değiştirilmedi. Eski dengeli/eşyasız R106
ölçümleri yeni eşyalı/yoğun kanalla doğrudan karşılaştırılmadı.

Bir tanı koşusu yanlış senaryo adıyla çalıştı ve başarısız sayıldı; test artık
bilinmeyen adları başlangıçta reddediyor. İlk kanal profili dosya dizini yokluğu
nedeniyle yazılamadı; ayrı tanı tekrarında düzeltildi. Profil ve SQL planı açık
koşular kabul ölçümlerine dahil değil, oyuna da eklenmedi.

İlk son-paket koşusunda geçici bir 202 ölüm tahmini kapanışta bekledi. O koşuda
son olaylar kaydedilmediğinden kesin neden belirlenemedi; başarısız sonuç korundu.
Gözlemci artık aynı oyuncu/intent için monster_result veya monster_reject
olayını izliyor; yalnız gerçek killed=true sonucunda ödül istiyor. Eksik son
olay veya cevapsız istek hâlâ testi başarısız yapıyor. Yeni gözlemciyle tüm
kabul koşularında komutlar, ödül istekleri ve bekleyen ölümler tamamlandı.
Ölçüm bittikten sonraki kapanış süresi 60 saniyelik tick istatistiğine eklenmedi.

## İşlev ve kurulum doğrulaması

- 54 odaklı, 8 boss sorgusu, 2 okuma worker, 29 native oyun ve 20 captcha testi.
- Test gözlemcisinde son olay/cevap sırası ve bitmeyen işlemler: 7 test.
- 26 gerçek dosya kurulum/geri dönüş testi; yarım yazma, yanlış kimlik ve
  sağlık başarısızlığı; oyuncu verisinin ve tek önceki kod yedeğinin korunması.
- Taşınmış kurulumla 2 runtime kontrolü; iki sunucu ve sekiz kanal.
- Paketin kesin JS/CSS dosyalarıyla Efsane PC ve Akademi mobil giriş/HUD;
  üç ayrı tarayıcıyla on kule katı. Eksik dosya veya native hata yok.

Yalnız değişen 20 kod dosyası; 13'ü seçili R106'ya göre farktır. Tam DB
kopyası, taraması veya sıkıştırması yok. Bakım/ön kayıt ayarları korunur.
Kesin ham kimlikler evidence/release-validation.json dosyasında.
