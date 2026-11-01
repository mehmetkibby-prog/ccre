# R86 devam çalışması

R85 kullanıcı tarafından kuruldu. R85 kaynak ve yayımlanmış paket korunuyor; canlı sunucuya erişilmedi/değişiklik yapılmadı.

## Kullanıcı bildirimi
Bir oyuncu, aynı haritaya başka oyuncu geldikten sonra hafif lag başladığını söyledi. 49 aktif oyuncuya 50. oyuncunun eklenmesi ayrı ölçüldü: giriş 42 ms, bağlantı hazır 70 ms. Giriş çevresinde mevcut oyuncularda prediction-cap görülmedi; aynı kanalda normal 200 ms hareket gönderim aralığına karşı en büyük ACK aralığı 254 ms. Bu, tarayıcı çizimindeki ilk atlas/raster masrafını dışlamaz; tam çizim ölçülmedi.

## Tamamlanan araştırma
- R85 gerçek worker tanılamasında ilk onlu ödül işi yaklaşık150 ms. Parent IPC, presence ve disk COMMIT tek başına ana neden görünmüyor.
- R86 ikincil frame öz-karşılaştırması kaldırıldı, saf etkinlik ayarı ayrıştırması sınırlı önbellekle paylaşıldı. Ekonomi/replay ve guard testleri geçti;50 oyuncu performans hedefi geçmedi.
- Uyumlu native ağaçta50×30 saniye: p99 318,60 ms,3 prediction-cap olayı,1 kırpılmış hareket karesi (47,71 ms); ekonomi ve iletişim doğruluğu geçti. Bu aday dağıtıma hazır sayılmıyor.
- Küçük GameWriter testindeki22,24 ms soğuk SQL hazırlaması gerçek worker için kalan sorun diye yorumlanmamalı: bu küçük test boot pool kullanmıyor; gerçek worker kullanıyor. Pahalı4SQL metni boot manifestinde zaten mevcut.
- hydrateAttack için factory kaldırma denemesi on okumada yalnız0,30 ms kazandırdı; üretime alınmadı.

## Aktif yapısal aday
Bağımsız normal öldürmelerde, güvenilir202 kabulü ve değişmez checkpoint yakalandıktan sonra yalnız konum hareketine sınırlı izin. Kalıcı ödül/HP sonucu disk ACK beklemeye devam eder. Gecikmiş commit yeni konumu ezmemeli; checkpoint tabanı gerçek kalıcı görüntüden ilerlemeli. Hasar, ölüm, kanal/alan değişimi, sahiplik ve doğrulama kilitleri aşılmayacak. Önce gecikmiş commit/rollback/sekonder sıra testleri, sonra aynı50 oyuncu yükü. Henüz bitmedi/test edilmiş sürüm değil.

## İlk yapısal deneme (dağıtıma uygun değil)
9b927e9d kaynak,50×30s: saldırı202/durable ayrımlı wire p99 138,50 ms; hareket p99 252,31 ms. 44 hareket409 yanıtı;0 fatal/iptal.146 eligibleactor,62 hareket kabulü,146 authoritativeCorrection. Ham SQL player satırında cycle/instanceId metadata bulunmadığı için geçerli konumun korunmadığı saptandı. Düzeltme ve yeniden test gerekli. Erken202 kalıcı ödül sonucu değildir.

## Son kaynak — R86

Kaynak kimliği: `fbbaa4e9026dd87898999ecc5d947f760ed5858c72be52586936b954d83fc087`. 16 sunucu dosyası değişti. Ödül COMMIT beklerken doğrulanmış konum hareketi, yeni konumu koruyan kanıtlı hızlı yenileme, 10 oyunculuk otomatik iksir grubu ve kuyrukta gecikmiş hareketin sunucuya geliş zamanıyla değerlendirilmesi tamamlandı. Ekonomi, doğrulama ve hasar kilitleri korunuyor.

14 hareket/kanıt testi ve 10 kurulum/geri alma kontrolü geçti. Önceki `167bc` kaynakta iki 50×180 saniyelik ölçüm geçti; ek 49+1 koşusunda girişten önce dört tek karede 1,56–1,93 ms hareket kırpması görüldü ve kayıt korundu. Bu iz, zamanlama hatasının tek başına sebebi sayılmıyor.

Son kaynakla 49+1 kontrolü: 0 hata, 0 prediction-cap, 0 kırpılmış kare. Giriş 35,92 ms, bağlantı hazır 97,55 ms. Genel hareket yanıtı p99 130,08 ms; giriş penceresinde p99 258,10 ms. Son iki 50×180 saniyelik ölçüm devam ediyor. Sonuçlar yalnız yerel native sunucu/ağ ve istemci tahmini içindir; canlı VDS ve tarayıcı çizimi ölçülmedi.

## Yeni R85 canlı bildirimi

Kullanıcının son ekran görüntüsü: “lag başladı oyuncu gelince” ve “reis sürekli oyun gidiyor ve fena lag var”. R85 kurulu; R86 yayımlanmadı. Yeni oyuncu katılma yerel kontrolü geçse de canlıdaki çizim/ağ etkisi dışlanmadı. “Oyun gidiyor” bağlantı kopması/kanal ekranına dönüş ihtimali olarak ayrıca incelenecek.

Son fbbaa 50×180 ölçümü: 58.951 komut, hareket p99 76,08 ms, tüm yanıtlar p99 111,15 ms; fakat ilk ölüm dalgasında 3 prediction-cap ve 15 kırpılmış kare, toplam 466,86 ms. Ekonomik bütünlük ve iletişim hatası kontrolleri geçti; SIFIR TAKILMA HEDEFİ GEÇMEDİ, paket kapalı. Ayrı tanı kopyasında 74/74 engelleme PvE vuruşunun zamanı gelmiş kontrolünden; eski native saldırı planının zaten hesaplayıp kalıcı kayıt öncesi sakladığı karşı vuruş ile sonraki hareketin aynı işi yeniden beklemesi araştırılıyor. Hasar kontrolü kaldırılmayacak.

## Native karşı vuruş düzenlemesi

Son kaynak `3580a313157d888a6812ae12d3533463e941a030da02af487e80319242a5ddae`, 18 üretim dosyası. Tahmini PvE saatini atlama önerisi uygulanmadı: değişen diğer canavarlar ve olumsuz batch sonucu güvenli değildi. Yerine mevcut gerçek native AI karşı vuruş yolu, normal tekli saldırı başında kendi sırasıyla çalıştırılıyor. İkincil hazırlık yalnız solo/bağımsız ve sıra kontrolü geçen girdilerde; ortak hedef, grup, eski bekleyen iş veya tick başlangıcından sonra gelen girdi varsa genişletme duruyor. Terminal hasar gerçek mevcut kalıcı bariyeri başlatıyor, saldırı kuyrukta kalıyor. Mevcut R53 kalıcı kayıt/çatışma düzeltme sözleşmesi korunuyor; ek bir dayanıklılık vaadi yok.

Son kaynak üzerinde temiz koşu: `evidence/pre-attack-final.log`, 23/23 geçti (14 hareket/kanıt + 3 native AI/SQLite + 6 ikincil sıralama). Kurulum 10/10 geçti. İlk 50×30 saniye: 9.875 komut, 0 hata/fault/cap/kırpma; hareket p99 164,71 ms, tüm yanıtlar p99 252,98 ms. Bu kısa koşu kapasite kabulü değil; 49+1 ve iki 50×180 saniye sırada. `disconnect-readonly-review.md` bağlantı kopması ihtimallerini içeriyor; canlı sebep doğrulanmadı. R86 bu aşamada yayımlanmadı.

## Kullanıcı hedefi 30 oyuncuya indirdi

50 oyunculu `6965a41f` kayıt zamanlama adayında 4 duraklama, 8 kırpılmış kare ve toplam 341,97 ms kırpma görüldü; 50 oyuncu kabulü geçmedi. Native veri bütünlüğü geçti. Kullanıcı aciliyet nedeniyle hedefi açıkça 30 oyuncuya indirdi ve “oyun gidiyor” ifadesinin bağlantı kopması değil oyun açıkken karakterin takılması olduğunu doğruladı. Kaynak aynı `6965a41f` olarak sabit. Kabul kontrolü bir yeni30×180s koşu +29 aktif oyuncuya30. oyuncu eklenmesi. Hata/cap/kırpma sıfır, tüm yanıt p99≤150ms şartları korunuyor. Önceki50 sonuçları silinmedi ve30 başarısı50 başarısı olarak sunulmayacak. Paket/yayım henüz yapılmadı.

## R86 yayımlandı — 2026-11-01 17:46 UTC

30×180s:35.372 komut, hareket p99 59,136ms, tüm yanıtlar p99 85,999ms,0 hata/fault/cap/kırpma.29+1/30s:5.950 komut, hareket p99 79,115ms, tüm yanıtlar p99 182,436ms;0 hata/fault/cap/kırpma. Giriş27,419ms, bağlantı93,922ms. Kısa katılım testine yanlışlıkla eklenen genel p99≤150 kontrolü başarısız; bağımsız incelemeyle özgün katılım kriterine dönüldü ve bu değişiklik gate/SONUC içinde açıkça kaydedildi. İksir/toplama uçları~220ms. Ham ölçümler pakette, veri silinmedi/yeniden iyi sonuç aranmadı.

Paket CORE511_R86_TOPLU.zip 1.562.829 bayt; SHA256 9eed28b0c88ee460d85ed329a577bb3fb8546c373bb4f1da383433ca42b579ac.19 üretim dosyası,42 ZIP üyesi, kurulum/geri alma10/10; bootstraphelp geçti. Github private r86-download commit8a6f56542b34e240e95c6718cebc3c48ae17f0f9; yeni authenticatedclone üzerinden dosyalistesi ve hashler doğrulandı. Canlıya kurulmadı.

Kapsam:gerçek native sunucu ve transport/prediction,4kanalda toplam30 oyuncu; DOM/canvas/WAN ve canlıVDS ölçülmedi. İlk kanatlı oyuncu görünümünde senkron piksel işleme ihtimali client-join-readonly-review.md’de; canlı neden doğrulanmadı, istemci bu pakette değişmedi.50 oyuncu sıfırtakılma hedefi geçmedi ve geçilmiş sayılmıyor.
