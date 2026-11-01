# R86 sonuçları

R85 üzerine uygulanır. Normal savaşta zamanı gelmiş canavar karşı vuruşu, saldırı planından önce mevcut native AI yoluyla işlenir. Grup ve ortak hedeflerde işlem sırası korunur. Periyodik karakter kayıtları oyuncuya göre 1–1,5 saniyeye yayılır; mevcut 2 saniyelik gecikme sınırı korunur. Kuyrukta bekleyen hareket, normal hareket yoluyla aynı gönderim zamanı kullanılarak değerlendirilir. Kalıcı ödül sonucu beklenirken uygun normal savaşlarda geçerli yürüyüş komutları işlenir. Gecikmiş kayıt yeni konumu ezmez; hızlı karakter yenilemesi korunur. Eşzamanlı otomatik iksirler en fazla 10 oyunculuk gruplarda, aynı hesaplama ve kalıcı onay kurallarıyla tamamlanır.

| Yerel 30 oyuncu ölçümü | Süre | Komut | Hareket p99 | Tüm yanıtlar p99 | Hareket duraklaması / kırpma | Hata |
|---|---:|---:|---:|---:|---:|---:|
| 1 |180 sn|35372|59.1 ms|86.0 ms|0 /0|0|

180 saniyelik koşuda native ödül/XP/eşya/iksir kontrolleri geçti. 14 hareket ve kayıt koruması, 9 native karşı vuruş ve sıra kontrolü, 3 kayıt zamanlaması/CAS kontrolü, 10 kurulum/geri alma kontrolü, 8 zindan/yeniden doğuş davranışı ve 2 işlem-kapanma kurtarma kontrolü geçti.

**Kapsam:** Bu yerel testtir; canlı VDS ve tarayıcı çizim FPS’i ölçülmedi. Erken 202 saldırı yanıtı kalıcı öldürme/ödül sonucu değildir. Bütün oyun modlarında ve ağ koşullarında sıfır lag garantisi verilmez. Canlıya kurulmadı.

Haritaya yeni oyuncu girince lag bildirimi ayrıca son kodla kontrol edildi: 29 aktif oyuncuya 30. oyuncu eklendi. Giriş 27.4 ms, bağlantı hazır 93.9 ms; hata ve hareket duraklaması 0. İlk kez yüklenen görsellerin tarayıcı üzerindeki etkisi ölçülmedi.

Kullanıcının son açıklamasına göre bildirilen sorun bağlantı kopması değil, oyun açıkken karakterin takılmasıdır. Hedef kullanıcı isteğiyle 50 oyuncudan 30 oyuncuya indirildi. Önceki 50 oyunculu başarısız sonuçlar korundu; bu paket için 50 oyuncu kabulü ileri sürülmüyor.

Kısa katılım testinde bütün işlemlerin p99 süresi 182.4 ms, hareket p99 süresi 79.1 ms oldu. İksir ve toplama yanıtları yaklaşık 220 ms’ye çıktı. 180 saniyelik ölçüme ait 150 ms genel p99 sınırı hazırlık sırasında yanlışlıkla bu kısa tanı ölçümüne de eklenmişti; bu ek kontrol geçmedi. Bağımsız incelemeyle özgün katılım kontrolüne (sıfır hareket kırpması/duraklaması, hata ve doğru ekonomi) dönüldü; ham veriler korunuyor. 180 saniyelik zorunlu 150 ms kontrolü geçti. Bu sonuç her işlemde sıfır gecikme anlamına gelmez.

Bu paket veritabanı şemasını, hesapları, R85 istemci dosyalarını veya ingress dosyasını değiştirmez. Kaynak ve ölçüm kimlikleri paketteki kanıtlarda bulunur.
