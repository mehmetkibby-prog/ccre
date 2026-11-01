# R85 — düzeltmeler ve kalan gecikme

Bu paket, doğrulanmış oyun ve toparlanma düzeltmelerini içerir. **50 oyuncuda tam kararlılık hedefi henüz sağlanmadı.** Canlıda bütün gecikmelerin bittiği veya kapasite garantisi verilmiyor.

Son kaynak `47e7486138ceb488d645e78c20c5c297d3ea423a7acb5cb4215a828ca17c6759`; R84 üzerine uygulanacak güncelleme 46 dosyadır. Canlı VDS’ye kurulum yapılmadı.

## Paketteki düzeltmeler

- İşlem sonrası oyuncunun kilitli kalması, geç gelen onaylar ve kayıt sonucundan toparlanma.
- Boss/Sinsi ödülünde ilgisiz oyuncuyu bekleme; gereksiz oyuncu ve malzeme envanteri okumaları.
- Bekleyen komutun istemcide çoğalması, haritalar arası yeniden doğuş bildirimi ve kanal TCP mesaj gecikmesi.
- Bağımsız Sis/Kadim odalarının birbirini beklemesi.
- Uygun bağımsız normal öldürmelerde en fazla 10 saldırının atomik kaydı; uygun tek oyunculu malzeme toplamasında konum/savaş kaydının aynı işlemde tamamlanması.

Oyuncu hakkı, komut sırası, rastgele ödül akışı, kalıcı kayıt onayı ve geri alma korumaları korunur. Ekipman, grup ve tanınmayan yan etkiler mevcut güvenli yolu kullanır. Bu kaynak için 99 kurulum/geri alma ve sekiz yerel oyun modu kontrolü geçti; gerçek yerel ekonomi eşitliği, toplu geri alma ve kesin kayıt sonrası süreç kesintisinde çift ödül verilmemesi ayrıca sınandı.

## Aynı kaynakta iki uzun 50 oyuncu ölçümü

| 50 oyuncu, 180 saniye | İlk ölçüm | İkinci ölçüm |
|---|---:|---:|
| Ölçülen yanıt | 58.935 | 58.979 |
| Ağ yanıtı p95 | 61,48 ms | 62,02 ms |
| Ağ yanıtı p99 | 104,39 ms | 113,72 ms |
| En yüksek ağ yanıtı | 469,19 ms | 539,71 ms |
| 300 ms üzerindeki yanıt | 49 | 84 |
| Tahmin sınırı işareti | 0 | 3 |
| Gerçek kısıtlanan kare / girdi süresi | 0 / 0 ms | 0 / 0 ms |
| Veri bütünlüğü ve ekonomi | Geçti | Geçti |

İlk ölçüm kayıtlı koşulları geçti. İkincide üç oyuncuda yaklaşık 599 ms’de sınır işareti oluştu. Gerçek kısıtlanan kare ve süre sıfırdı; yine de sıfır işaret koşulu sağlanmadığı için **uzun kampanya geçilmedi ve 100 oyuncu aşaması çalıştırılmadı.**

Periyodik kayıt zamanlaması için sonradan denenen iki değişiklik başarısız ölçümleri nedeniyle son paketten çıkarıldı. Son kısa denemede beş sınır olayı, beş kısıtlanan kare ve toplam 240,64 ms kısıtlanan girdi görüldü; ikinci kısa deneme durduruldu. Bu sonuçlar korunuyor. Paket, yukarıdaki iki uzun ölçümün yapıldığı kaynağa döndü; mevcut periyodik kayıt zamanlaması kullanılıyor.

## Ölçümün sınırı

Ağ yanıtı, kesin ödül kaydının tamamlanma süresi değildir; saldırının geçici `202` yanıtı bu ayrımı gerektirir. 300 ms üzerindeki bütün yanıtlar tutuldu; bu süre tek başına görüntü donması olarak adlandırılmadı.

Testler yerel, izole 4 CPU kotalı ortamda gerçek SQLite, oyun süreçleri ve WebSocket ile yapıldı. Tam oyun görselleri/FPS, fiziksel telefon, WAN ve uzun süreli canlı trafik ölçülmedi. Tarihsel tam 100 oyuncu kabulü geçilmiş sayılmıyor. Hesaplar, ödül oranları ve mevcut oyun verileri değiştirilmez.
