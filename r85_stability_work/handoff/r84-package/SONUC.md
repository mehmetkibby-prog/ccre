# Core of Life R84 — bulgular ve değişiklikler

## Canlı kayıttan görülen durum

Oyuncu 15:34'te lag başladığını, sayfa yenilemesinden sonra kanal seçiminden
ilerleyemediğini; 15:43'te durumun kendiliğinden düzeldiğini bildirdi. Bu iki
mesaj, aradaki dokuz dakikanın tamamında aynı arızanın sürdüğünü tek başına
kanıtlamaz. Türkiye saati varsayımıyla incelenen sunucu kayıtları UTC'ye çevrildi.

Paylaşılan son terminal görüntüsündeki olaylar:

| UTC | Olay | Kayıt |
| --- | ---: | --- |
| 12:33:36.424 | 4 | `shared_command_outcome_unknown`, `shared_expireUnknown` |
| 12:33:36.440 | 5 | `global_world_busy`, `channel_recovery_request` |
| 12:33:55.723 | 6 | `shared_command_outcome_unknown`, `shared_expireUnknown` |
| 12:33:55.734 | 7 | `global_world_busy`, `channel_recovery_request` |

Kaynak koduna göre, yazma isteğinin sonucu hata verdiğinde önce kesin geri alma
kanıtı ve ardından kalıcı işlem makbuzu aranıyor. Sonuç hâlâ belirsizse yaklaşık
on saniye sonra yeniden kontrol ediliyor; yine doğrulanamazsa ortak dünya
kurtarması başlatılıyor. Son görüntü bu son aşamayı gösteriyor. İlk yazma
hatasının kodu ve çağrı izi görüntüde yok.

Sonraki `global_world_busy` kayıtları kurtarma zaten açıkken üretiliyor.
`game_instance_expired` kayıtları da aynı kurtarmadan sonraki oturum kontrolünde
görülüyor. Bunları ilk hatanın nedeni olarak sunmak için yeterli kanıt yok.

15:47 civarındaki yönetici ölçümü, oyuncunun bildirdiği olaydan sonraki durumu
gösteriyor. O anda yazma kuyruğu veya işlem döngüsünün düşük görünmesi önceki
kısa ya da uzun beklemeyi dışlamıyor. Paneldeki `busyPercent`, o çıktının
`process-event-loop-not-network-ping` kapsamına aittir; ağ pingi veya toplam
VDS CPU kapasitesinin doğrudan ölçümü değildir.

## R84'te yapılan düzeltmeler

### 1. Geç gelen kanal girişi ve karakter oluşturma cevabı

Mevcut tarayıcı kodu giriş isteğini sekiz saniye sonunda ekranda zaman aşımına
uğratabiliyor, fakat alttaki gerçek işlem sürüyordu. Kontrollü testte dokuzuncu
saniyede başarılı cevap gelse de kanal seçimi tamamlanmadı. Yeniden tıklama,
önceki işlemden sonra çalışacak ikinci bir istek de oluşturabiliyordu.

R84, aynı bağlantı üzerinde tek bir giriş işleminin sonucunu takip ediyor.
Sekiz saniyede gecikme mesajı gösteriyor ve geç gelen doğrulanmış cevabı aynı
karakter/kanal için uyguluyor. Art arda tıklama veya ekranın yeniden kurulması
ikinci bir karakter isteği oluşturmuyor. Karakter oluşturma da aynı akışı
kullanıyor; işlem sürerken ad ve sınıf alanları sabit kalıyor.

Sonucu kesin bilinmeyen bir bağlantı hatasında kullanıcıya **Yeniden bağlan**
düğmesi gösteriliyor. Bu işlem sayfayı yenileyip mevcut oturum/karakter okuma
akışını kullanıyor. Eski karakter isteği otomatik yeniden gönderilmiyor.
Doğrulanmış kanal retlerinde manuel yeniden seçim yapılabiliyor. Diğer ağ
isteklerinin mevcut sekiz saniyelik davranışı korunuyor.

### 2. Kanal listesinin uzun işlem kuyruğuna takılması

Kanal listesi ve giriş ekranındaki doluluk bilgisi yalnız mevcut durumu okumasına
rağmen değişiklik yapan işlemlerin sırasını bekliyordu. Testte bu liste, ortak
savaş işlemi veya başka bir bekleyen işlem bitmeden cevap veremedi.

R84 bu iki görüntüleme okumasını, açık veritabanı işlemi bulunmadığı ve ortak
dünya kurtarması sürmediği doğrulandıktan sonra eşzamanlı olarak yapıyor. Hesap
eşleştirmesi, kanal kapasitesi, kilit/ölüm/yeniden bağlanma kuralları ve gerçek
kanala girişin yetki kontrolleri korunuyor. Liste, tek başına giriş hakkı vermez.

### 3. Kurtarma bitişinde kaybolan yeni hata

Mevcut kod, kanallar hazır olduktan sonra eski kurtarma sözü henüz temizlenmeden
yeni bir hata alırsa girişin kapalı kalabildiği bir yarış içeriyordu. Testte
`recoveringWorld=true` olduğu halde aktif kurtarma veya planlı tekrar kalmadı.

R84 kurtarmanın tamamlandığını tek adımda yayımlıyor. Yeni hata tamamlanma
aralığında geldiyse mevcut geçişten sonra tek bir ek kurtarma yapılıyor.
Kapanış başlamışsa yeni süreçler açılmıyor. Mevcut süreçleri durdurma,
veritabanı kalıcılığını doğrulama ve yeni sahipleri kaydetme sırası korunuyor.

### 4. Kurtarma sırasında açılmış kanalın yeniden kapanması

Ek kontrolde yeni kanal 1, kanal 2 açılırken kapanınca hem R83 hem ilk R84
adayının bu hatayı devam eden kurtarmaya katıp daha sonra kurtarmayı tamamlanmış
sayabildiği gösterildi. Son durumda kanal 1 çevrimdışı, sağlık yanıtı 503 ve
planlı kurtarma tekrarı yoktu.

R84'ün son adayı, kurtarma sırasında açılan dünya ve kanal süreçlerinin aynı
kuşakta ve çalışır durumda kaldığını tamamlanmadan önce doğrular. Bu doğrulama
başarısızsa giriş koruması açık kalır ve mevcut kurtarma hata/tekrar politikasına
geçilir. Bu ek kontrol de ilk yazma hatasının nedenini açıklayan bir iddia değildir.

## Doğrulama ve sınırlar

Son paket üzerinde **200 kontrol geçti; başarısız ve atlanan kontrol yok**.
Bunun 19'u istemci girişi, 32'si kanal görüntüleme, 30'u kurtarma bitişi,
16'sı kurtarma sırasında süreç kaybı ve 103'ü kurulum/geri alma/paketleme
kontrolleridir. Sayı, özgün hatayı yeniden üreten beklenen kontrolleri de içerir.
Ayrı dört istemci başlangıç gösterimi kanıtta saklanır ve toplama eklenmez.

Testlerin ayrı sonuçları `evidence` dizinindedir. Son sayılar, her değişen üretim
dosyasının SHA-256 değeri ve kurucu kimliği `R84_KANIT.json` içinde birlikte
kaydedilir. Kurucu testleri gerçek yerel dosya işlemleri, SQLite yedeği,
kilitler, atomik değiştirme ve kesilmiş kurulum/geri alma günlükleri kullanır.
İşletim sistemi servisleri ve canlı VDS bu testlerde kontrollü bileşenlerle
temsil edilir. Tarayıcı testleri gerçek paket kodunu kontrollü saat, HTTP,
WebSocket ve arayüz durumlarıyla çalıştırır; tam tarayıcı ve canlı oyuncu yük
testi değildir.

Yerelde 1124 R83 çekirdek dosyasının tam kimliği doğrulandı. Mevcut sürüme ait
42 dosyanın baytları çalışma alanında yoktur; paket bunları değiştirmez ve tam
1166 satırlı kaynak kimliğinde kayıtlı değerlerini korur. Eski sürümden dosya
alarak eksik kaynak tamamlanmadı. Bu nedenle tüm sunucu için uçtan uca test
yapıldığı iddia edilmez.

Paket yedi üretim yolunu değiştirir; tek yeni üretim dosyası içerik adresli oyun
tarayıcı paketidir. HTTP ana dosyası yalnız tarayıcı ad alanı ve dosya adına
yönelik 351+2 referans değişikliği içerir; ters dönüşümü önceki dosyayı bayt
bayt geri üretir. Veritabanı şeması veya oyuncu verisi değişmez. Geri alma
önceki kodu güncel veritabanıyla kullanır.

## İlk hatayı ayırmak için kalan kayıt

`shared_command_outcome_unknown`, ilk hatayı açıklayan özel bir veritabanı
hata kodu değildir. 12:33:24–12:33:47 UTC aralığındaki sıradan
`core511_fault` kayıtlarında özgün hata ve çağrı izi aranmalıdır. Mevcut günlük
biçimi `sharedCommandPending` alanını yazmaz; yalnız kurtarma olaylarını
filtrelemek bu ilk hatayı dışarıda bırakır. Bu bilgi alınmadan R84'ü bütün
lag kaynaklarının kesin çözümü olarak tanımlamak doğru olmaz.

Hazırlanan paket canlı sunucuya bu çalışma sırasında uygulanmamıştır.
