# R79 — ek gecikme nedenlerinin düzeltilmesi

R78'in üzerine hazırlanmıştır. Canlı VDS'de işlem yapılmadı; aşağıdaki doğrulamalar yerel, izole veritabanlarında ve gerçek Node/kanal süreçlerinde yapıldı.

1. **Veritabanı checkpoint işçisi etkinleştirildi.** Önceden mevcut işçi etkin CORE511 açılışına bağlanmıyordu. Ana işlem ve ödül yazıcısı artık yalnız ayrı işçi hazırsa otomatik checkpoint'i ona bırakıyor. İşçi kapanırsa güvenli eski yöntem geri geliyor. Kayıtların diske yazılma onayı korunuyor. Gerekli güvenli SQLite sürümü için paket, yalnız yeni oyun sürümünde kullanılacak Node 22.23.4 / SQLite 3.53.4 içeriyor.
2. **Eski metin doğrulamasının bağlantı koparma döngüsü düzeltildi.** Doğrulama beklerken hareket ve saldırı durur; yeni istemcide mevcut bağlantı açık kalır. Yanlış cevap doğrulamayı kaldırmaz. Doğru cevapla aynı bağlantıda devam edilir. Hesap, oturum, kanal sahipliği ve yasak kontrolleri korunur. Dört görselli doğrulamanın kuralları değiştirilmedi.
3. **Desteklenen arka plan ödül işlemlerinin bütün kanalları bekletmesi kaldırıldı.** Boss, Sinsi Taş, normal canavar, Etkinlik Adası, dünya ejderhası ve bekleyen eşya ödülleri, uygun olduğunda yalnız ilgili oyuncuların kayıt sırasını bekler. Ödül alıcıları yazma anında yeniden doğrulanır; tekrar denemede çift ödül verilmesini önleyen kayıtlar korunur. Adventure servis ödülleri ve tüm dünyayı etkileyen işlemler mevcut güvenli eşgüdümü kullanır; yönetimden gerçek dünya ayarı değiştirilirken gereken koruma kaldırılmadı.
4. **Son bildirdiğin eşya toplama takılması için ek düzeltme yapıldı.** Doğrulanmış normal/açık harita ganimetlerinde, Etkinlik Adası ve ejderha dahil, her eşya alımı için ilgisiz kanal savaş kayıtlarının bitmesini bekleme kaldırıldı. Oyuncunun ve grubunun kendi kayıtları, ödülün diske yazılması ve çift toplama koruması beklenmeye devam eder. Ayrı zindan/kule/sis odaları ve kanallar arası grup toplama mevcut güvenli yolu kullanır.

Yavaş ana işlem COMMIT'leri için sınırlı kayıt eklendi: 50 ms üzerindeki işlem sayısı ölçülür, en fazla beş saniyede bir tanı kaydı yazılır. Sorgu, hesap bilgisi veya gizli veri kaydedilmez. Sağlık yanıtı gerçek işçi durumunu ve çalışma zamanı sürümünü gösterir.

## Doğrulama

- İşçi başlangıcı, kapanması, sürüm güvenliği ve hata sonrası otomatik checkpoint'e dönüş; ana ve gerçek ödül yazıcısında kontrol edildi.
- Eski doğrulamada yanlış/doğru cevap, aynı bağlantıda devam ve yasaklanan hesabın yine bağlantısının kesilmesi kontrol edildi. Gerçek Chromium'da derlenmiş istemci köprüsü de denendi; bu tarayıcı kontrolünün sunucusu yerel benzetimdi, gerçek kimlik doğrulama ayrı yerel sunucu testinde kontrol edildi.
- Kontrollü ödül senaryosunda kayıt onayı 400 ms bekletilirken ilgisiz kanaldaki oyuncunun hareket ve saldırısı tamamlandı. Bu sayı canlı ping ölçümü değildir.
- Etkinlik Adası ve ejderhada iki oyuncunun ödülleri, birincilik ödülü ve tekrar ödeme koruması doğrulandı; canavar, dünya ve ilgisiz oyuncu kayıtları değişmedi.
- Yedi yerden toplama türü ve gerçek dört kanal/WebSocket grup toplama senaryosu geçti. İlgisiz savaş kaydı beklerken eşya alınabildi; oyuncu/grup kayıt kapıları ve çift toplama koruması korundu.
- Sağlık ve tanılama kontrolleri geçti; işçi güvenli yedek yönteme döndüğünde sağlık yanıtı sırf bu nedenle oyuncuları oyundan çıkarmaz.
- Kurulumun dört odaklı kontrolü geçti: uygulama, aynı paketi tekrar çalıştırma, elle geri alma, başarısız sağlık kontrolünde otomatik dönüş ve yanlış tabanın reddi. Bunlar ağsız yerel tmpfs düzeninde, gerçek dosya/SQLite işlemleri ve benzetilmiş systemd/sağlık yanıtlarıyla yapıldı; canlı disk performansı testi değildir. Son iki oyun kaynağı değişikliği ayrı hedefli testlerle doğrulandı; son arşivin kurulum modülleri, çalışma zamanı ve istemcisi bu kurulum kontrolündeki baytlarla karşılaştırılır.

Eski R21 test düzeninin eksik şeması/güncel istemci referansı ve R78'de de bulunan eski interpolation beklentisi ayrıca kaydedildi; bu testler başarılı diye raporlanmadı. Yukarıdaki güncel hedefli kontroller bunlardan ayrıdır.

Paket veritabanı şemasını veya oyuncu verilerini dönüştürmez. Yeni oyun çalışma zamanı ve güncel istemci içerdiği için R78'den büyüktür. Kurulum mevcut R78 dosyalarını doğrular; aday sürümün dört kanalı, doğru çalışma zamanı ve hazır kayıt işçisi doğrulanmadan başarılı sayılmaz. Geri alma veritabanı yedeği yüklemez.

Bu düzeltmeler belirlenen nedenleri giderir. Canlı olay anının tam ölçümü olmadığı için her ağ gecikmesinin veya her olası takılmanın bittiği iddia edilmez.
