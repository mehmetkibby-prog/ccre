# R115 — ortak saldırıda tüm kanalları durduran kapsam hatası

13 Kasım 2026 oyuncu bildirimi ve paylaşılan journal ekranı: 17:48:03 UTC,
`shared_prepare` → `shared_partition_actor_changed` → dört kanal + dünya
sürecine SIGKILL; ardından `global_world_busy`. Disk bakım işi daha sonraki
18:02 kaydında başarıyla tamamlanıyor; o kayıt bu kesintinin nedeni sayılmadı.

R114 içindeki R113 bölümleme kodu, kiralama başında güncel harita sakinleri ve
paylaşılan dünya belleğinin katkılarını alıyordu. Sonlandırma/ödül kapsamı ise
aynı haritadaki yerel canavarların geçmiş katılımcılarını da içeriyor. Harita
veya kanal değiştiren önceki katılımcı bu iki kümeyi farklılaştırıyordu.

Tam R114 ZIP'inin kendi kurucusuyla oluşturulmuş ağaçta iki gerçek kanal
istemcisiyle aynı hata ve beş süreçlik kurtarma yeniden üretildi
(`evidence/exact-r114-reproduction.log`). Bu tetikleyici doğrulandı; canlıdaki
oyuncunun tam komutu/tüm journal dosyası elimizde olmadığından aynı veri
kombinasyonunu kullandığı iddia edilmiyor.

Düzeltme: başlangıç ve terminal kapsamı aynı yetkili alıcı hesabını kullanır.
Geçerli turdaki yerel/paylaşılan katkılar, oda üyeleri, parti/lonca bağlantıları
başlangıçtaki atomik oyuncu kilidine dahildir. Bellekte henüz yazılmamış ortak
katkılar ayrıca korunur. Son kapsam doğrulaması, sahiplik/epoch, SQLite COMMIT,
RNG, makbuz/tek ödül ve belirsiz sonuçta kurtarma korumaları kaldırılmadı.

Aynı hata testinin düzeltilmiş sürümünde ölüm tamamlanır, beş süreç aynı
kimlikle çalışır, tekrar edilen makbuz ödülü çoğaltmaz. Alıcısı ortak olan iki
harita sıralanır; bağımsız harita çalışmaya devam eder. Eski tur/başka yerel
kanal kayıtları fazladan yetki vermez; kapsam sınırı korunur.

Paket üç oyun kaynak dosyası değiştirir; kaynak tam R114_RUNE_FORUM1,
hedef R115_SHARED_SCOPE1. İki realm birlikte güncellenir, sekiz kanal ve yeni
sağlık işareti doğrulanır. İstemci, rün geometrisi, forum/Caddy ve oyun
veritabanı/şeması değişmez. Uzun DB yedeği/taraması yoktur.

Test verileri sentetiktir. 50 kişilik yük koşulları 4 CPU kotasına sahip bu
ortamdadır; canlı VDS kapasitesi veya bütün olası lag nedenlerinin sıfırlandığı
anlamına gelmez. Ham başarısız ölçümler de saklanır. İlk test geliştirmesindeki
iki hatalı fikstür varsayımı ayrı günlüklerde tutuldu (undefined/false ve
ödül vermeyen test canavarı); nihai test gerçek normal canavar ödülünü sınar.

Kurulum ve geri dönüş: [KURULUM.md](KURULUM.md).

## Tamamlanan ölçüm — 50 kişi, üçer karma yük tekrarı

Her hücre medyan / en kötü koşu. Yerel 4 CPU kota, sentetik veri; canlı ölçüm değil.

| Ölçü | R114 | R115 |
|---|---:|---:|
| Kanal tick p99 (ms) | 28.14 / 48.14 | 21.22 / 23.98 |
| En uzun ana duraksama (ms) | 71.43 / 138.94 | 97.58 / 100.53 |
| Ana >50 ms duraksama / dk | 4.00 / 17.00 | 4.00 / 4.00 |
| Ana ELU (%) | 31.67 / 35.83 | 31.64 / 31.86 |
| Ana tepe RSS (MiB) | 720.60 / 723.05 | 719.30 / 743.62 |

Bütün karma koşular işlevsel olarak geçti. R115'te tick p99 üç koşuda da
30 ms altında, fakat >50 ms ana duraksama hedefi her koşuda sağlanmadı.
En uzun ana duraksamanın medyanı kötüleşti; tek en kötü değer düştü.
Bu değişken sonuçlardan genel performans artışı veya kesin nedensellik
çıkarılmıyor. Bağımsız kontrol/kota ölçümleri ham dosyalarda korunur.

Ek 50 kişilik geçmiş katılımcılı ortak saldırı koşusu: 1.089 ortak kiralama,
188 ölüm, sıfır hata ve sıfır toplu kurtarma. Tick p99 24,14 ms, ana en uzun
duraksama 112,07 ms, >50 ms ana duraksama 3/dk. Ölümün oyuncuya teslimi
p99 487,42 ms, en uzun 650,89 ms; genel gecikme hedefi çözülmüş sayılmıyor.

Zorunlu testler: focused 60, native 29, captcha 20, R110 16 Python + 3 Node,
R113 142; yeni regresyon r1 4/r2 4; yeni kurucu 7; gerçek kurulu runtime 3
(iki realm/sekiz kanal ve WebSocket devir). Hepsi geçti.
