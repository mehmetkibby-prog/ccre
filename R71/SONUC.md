# R71 inceleme ve doğrulama

Canlı VDS'ye bağlantı yoktur; aşağıdaki sonuçlar gerçek yerel oyun motoru, SQLite yazıcısı, HTTP hesap/giriş yolları, dünya süreci, dört kanal süreci ve bağımsız tarayıcılarla alınmıştır. Canlı sunucunun disk/ağ gecikmesi ölçülmemiştir. Tarayıcı denemeleri iki bağımsız Chromium sürecidir; Edge ve Firefox ile yapılmış olarak sunulamaz. Firefox kurulum kaynağı ortamın ağ politikası tarafından 403 ile engellenmiştir.

## Bulunan nedenler ve düzeltmeler

- Kule/Sis'e ışınlanma soketi açık tutuyor, ancak hareket dağıtıcısının eski harita kimliği değişmiyordu. Sunucu yeni hareket örneklerini reddediyor, diğer oyuncu daha yavaş yedek akıştan yürüyüş görüyordu. Artık geçerli oturum, karakter sahipliği ve güncel sunucu konumu doğrulandıktan sonra akış yeni haritaya bağlanır; eski örnekler temizlenir. İstemci kendi haritasını veya yetkisini seçemez.
- Kule ve Sis canavarı ölümü/ödül kaydı normal haritalardaki sınırlı işlem yolundan dışlanmıştı; tek vuruşlu öldürme tüm kanalları bekletebiliyordu. Geçerli sefer ve katılımcıları doğrulanan bu öldürmelerde ölüm ile ödül aynı kalıcı işlemde yazılır. Karışık PvP, yabancı katılımcı, değişmiş sahiplik, kale ve arena güvenlik denetimleri korunur. “Vuruş hesaplandı; ölüm sonucu kaydediliyor” ön yanıtı gizlenmemiştir; bildirimin beklediği işlem yolu düzeltilmiştir.
- Grup zindanına girişin kalıcı kayıt yanıtıyla aynı anda başka üyeden gelen hesap isteği, oda üyelerini ayrı dondurarak `dungeon_drain_pending` hatasına ve kanal kurtarmasına yol açabiliyordu. Sunucu, mevcut odanın üyelerini birlikte duraklatıp kaydeder; yazım/oturum kilitleri kaldırılmamıştır.
- Zindan çizimi durup tekrar başladığında karakter görüntüsü güncel konumun yaklaşık 300 piksel gerisinden yavaşça yetişiyordu. Taze sunucu görüntüsü geldikten sonra yalnız çizim konumu yeniden bağlanır; saldırı sırası, hareket yetkisi ve ödül verisi değiştirilmez.
- Sis'te düşman/arkadaş ayrımı ad yazısına aktarılır. Seviye/rütbe biçimleyicisinin adı yeniden beyaza boyaması giderilir; rütbe başlığının görünümü korunur.

## Tamamlanan kontroller

- Gerçek R70 ile iki bağımsız tarayıcıda kule/Sis hareket hatası üretildi; normal alanda kabul edilen hareketler bu haritalarda `entry_scope` gerekçesiyle reddediliyordu. Düzeltme sonrası yerel karşı ekran yürüyüş gecikmesinin %95 değeri 31–50 ms aralığına indi; önceki denemelerde yaklaşık 350–470 ms idi. Bu, VDS veya ev interneti ölçümü değildir.
- 50 oyuncu, dört kanal, 90 saniye savaş: kopma, kanal çökmesi, yanıtsız işlem, tamamlanmamış ödül ve çift ödül kaydı sıfır. Hareket yanıtı p95 69 ms, en yüksek 113 ms. Ölüm ve tüm ödüllerin kalıcı kaydı p95 yaklaşık 323 ms, en yüksek 401 ms. Ağ RTT'si bu yerel değerlere dahil değildir.
- Grup zindanı üç aşaması ve iki ayrı solo zindanın üç aşaması güçlü silahla tamamlandı. Grup oyuncularının aynı canavar ölümünü görme zamanları arasındaki en büyük fark 35 ms. Hata ve oyun kapısı kapanması yok.
- Grup/solo sürekli yürüyüşte durma veya geriye çekilme örneği yok. Çizimi 1,2 saniye kasıtlı durdurup açma denemesinde 300 ms sonra konum farkı yaklaşık 300 pikselden 11 piksele indi.
- Kule, normal Sis ve altın Sis gerçek kalıcı ödül işlemleri; tekrar ödül isteme; COMMIT'ten hemen önce/sonra süreç sonlandırma ve kurtarma: ödül kaybı/çift ödül yok. Yabancı tarihsel katılımcı güvenli ortak işleme yönlendirilir.

- Sıralı WebSocket bağlantısına her yönde 20 ms ve her yedinci parçada ilave 40 ms gecikme eklenen son iki tarayıcı denemesi: kulede karşı ekran yürüyüş p95 119–125 ms; normal Sis 78–115 ms; altın Sis 81–113 ms. 28 ölümün hepsi sınırlı ve birleşik kalıcı işlem yolunu kullandı. Karşı ekranda ölüm görünmesi en fazla 250 ms; kanal hatası/kapanması yok.
- Aynı gecikmeli ağda grup zindanı yürüyüş p95 115–165 ms. Grup ve iki solo zindan tamamlandı; sürekli tuşla yürüyüşte toplam 1.495 hareketli karede sıfır durma/geriye çekilme. Grup canavar ölümünün iki ekrana ulaşması arasındaki fark en fazla 51 ms.
- Normal ve altın Sis'te düşman adı kırmızı, grup adı mavi gerçek Canvas çiziminden ve ekran görüntülerinden doğrulandı. Seviye/rütbe ad biçimleyicisi altı ek testten geçti.
- Hareket kapsamı, eski oturum/örnek reddi, sefer/katılımcı doğrulama, oda üyeliği ve çizime dönüş: 24 birim testi geçti. Gerçek süreç/oyun işlemleri ve güncel zindan karşılaştırmaları: 50 senaryo geçti. Ek altı sefer ödülü/süreç kesintisi testi geçti.
- Kurulum, tekrar uygulama, oyuncu/yanlış kaynak koruması, açılış ayarlarının korunması, kayıtların sürmesi, başarısız açılıştan dönüş, kesinti kurtarma, eski sürüm temizliği, R70 görevleriyle geri alma ve farklı sürümün kurtarma kaydını reddetme: 14 kurulum testi geçti. Gerçek dosyalar ve SQLite kullanıldı; systemd/sağlık/disk kapasitesi bu testlerde kontrollü olarak benzetildi.

## Test uyumluluğu ve ölçüm sınırları

Eski `dungeon-native.test.mjs`, güncel kurulumun kule tablosunu/çanta indeksini oluşturmadan V510 gövdesiyle karşılaştırıyordu; 10 testi hem değişmemiş R70'te hem adayda başarısızdı. Yerel test uyarlaması gerçek kurulum şemasını oluşturup R70 oyun kurallarını karşılaştırma kaynağı yaptı; 10/10 geçti. Başka bir eski test zindan Kanal 2'deyken Kanal 3'e giriş bekliyordu. Güncel test hem yanlış kanalın güvenli reddini hem doğru kanaldan aynı odaya dönüşü doğruladı. Bu uyarlamalar oyun paketindeki kuralları değiştirmez; başarısız ilk denemeler kanıt klasöründe tutulmuştur.

Yürüyüş gecikmesi ekrandaki konum farkından hesaplanır; kat ışınlanması bu formülle yürüyüş gibi yorumlanamaz. Ham kayıttaki bir 3,15 saniye eşdeğer fark, üçüncü kata geçişte diğer ekranın yeni doğuş noktasını 3 ms önce göstermesidir; karakterin 3 saniye beklemesi değildir. Yürüyüş ve kat geçişi kayıtları ayrı incelenmiştir.

Yük testi tarayıcı çizimini değil yerel gerçek sunucu işlemlerini ölçer. Tarayıcı kontrolleri ayrıca yapılmıştır. Son ad rengi değişikliği ve kullanılmayan üretilmiş dosyaların temizliği yük testinden sonradır; yük testinin yürüttüğü sunucu işleyicileri aynı kalmıştır. Son tarayıcı denemesi son istemci dosyasıyla yapılmıştır.

Bu paket canlı sunucuya buradan kurulmamıştır. İnternet gecikmesi, kullanıcının cihazı ve canlı VDS performansı bu yerel sonuçlardan garanti edilemez. Instagram video işi kullanıcı isteğiyle beklemededir.
