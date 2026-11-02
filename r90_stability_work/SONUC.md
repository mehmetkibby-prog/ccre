# R90 — kule ve zindanda doğrulamanın savaşı kesmesi

Oyuncu, Kadim Kulesi 10. kattayken doğrulamayı yanıtladıktan sonra Pazar Köyü'ne döndüğünü bildirdi. Hangi doğrulamanın çıktığı ve canlıdaki dönüşün ölümden mi, süre bitiminden mi kaynaklandığı doğrulanamadı.

**Yerelde doğrulanan hata:** R89'un eski, metin kodlu doğrulaması aktif kule seferinde de zorunlu oluyordu. Bu kontrol hareket/saldırı komutlarını durdururken seferin savaş ve süre kuralları devam ediyordu. R89 davranışı gerçek yerel kanal sürecinde yeniden üretildi; düzeltmeden önce ilgili test `required: true` nedeniyle başarısız oldu.

R90 değişiklikleri:

- Eski metin doğrulaması Kadim Kulesi, Sis Yarığı ve mevcut zindan üyeliği sırasında ertelenir. Sunucunun kendi harita/üyelik bilgisi kullanılır. Normal haritaya dönüşte süresi gelmiş doğrulama tekrar zorunlu olur; `bot_due` uzatılmaz veya silinmez. Dört görselli sistemin mevcut korumalı haritalarıyla uyum için Lonca Kalesi de aynı harita politikası kapsamındadır.
- HTTP kontrolü ve kanalın oturum kontrolü aynı kuralı uygular. Kanalın hareket yoluna SQLite sorgusu veya yeni zamanlayıcı eklenmez; mevcut bellek verisi okunur.
- HTTP yanıtı oluşturulurken doğrulama gerekliliği yeniden kontrol edilir. Böylece ilk okuma ile yanıt arasına giren oda giriş işlemi eski bir soruyu açmaz.
- Dört görselli doğrulamada, kanaldan gecikmiş `eligible=true` isteği gelse bile soru oluşturulmadan önce güncel harita/üyelik tekrar kontrol edilir. İstek uygun yere dönüşe ertelenir.
- Yanlış cevap sınırı, iki dakikalık kilit, doğru cevap kontrolü, oturum/hesap yasakları ve bakım denetimleri korunur. Doğrulama normal haritada geldiğinde hareket/saldırının durması kuralı korunur.

## Kontroller

15 hedefli davranış/uyumluluk kontrolü ve 10 kurulum/geri alma kontrolü geçti.

- Gerçek yerel ana süreç, dört kanal süreci ve WebSocket üzerinde kuleye giriş; doğrulama süresinin dolması; aynı oturumda hareket ve saldırı; çıkışta doğrulama; yanlış ve doğru cevap kontrol edildi. Bu senaryoda kanal hatası yoktu. Yerel kule oynanışı 1. kattaydı; 1–10. kat harita kimliklerinin tamamı ayrıca politika testinden geçti.
- Sis haritası ve solo/grup/eski kule üyelikleri politika ve gerçek SQLite sorgularıyla kontrol edildi. Bu sürümde bu haritaların her birinde uçtan uca tarayıcı oynanışı yapılmadı.
- Gecikmiş dört görselli soru isteği gerçek kule oturumu içindeyken reddedilip ertelendi. Dört görselli doğrulamanın yanlış cevap, iki dakikalık sayaç, yeniden bağlanma ve doğru cevap kontrolleri geçti.
- Kurulum, aynı paketin tekrar çalıştırılması, yanlış taban dosyasının reddi, kesilmiş yazmadan kurtarma, sağlık kontrolü başarısızlığında otomatik dönüş ve elle geri alma yerel dosya/SQLite düzeninde denendi. Systemd ve canlı sağlık yanıtları bu kurulum testinde benzetildi; gerçek VDS kurulumu yapılmadı.

API testi gönderilecek HTTP dosyasını kullandı. Devir arşivinde eksik olan SSR varlık manifesti, yalnız API testi için boş bir test manifestiyle karşılandı; sayfa çizimi/tarayıcı testi iddiası yoktur. Geniş eski test seçimi gereksiz süreç testlerini de seçtiği için durduruldu; tamamlanan iki hedefli uyumluluk testi ayrıca kaydedildi.

R90 yalnız doğrulanmış R89 üzerine uygulanır. 7 sunucu dosyası değişir; oyuncu verisi, veritabanı şeması, istemci grafiği ve Node çalışma zamanı değiştirilmez. R89 hareket/ödül iyileştirmeleri korunur. Canlı VDS'ye yükleme yapılmadı; bu dar düzeltme için yeni 50 oyuncu yük testi yapılmadı. Bütün olası Pazar Köyü dönüşlerinin veya tüm oyun hatalarının bittiği iddia edilmez.
