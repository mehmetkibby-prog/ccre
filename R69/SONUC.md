# R69 toplu oyun düzeltmeleri

R68 üzerine kurulur. Canlı VDS'ye buradan kurulmadı; aşağıdaki sonuçlar yerel ve yalıtılmış test ortamına aittir.

Sis Yarığı ganimeti henüz teslim edilmeden çalışan kontrolde tur numarası yanlış alan adıyla okunuyordu. Bu hata dünya sürecini yeniden başlatıp «Çekirdek açılışa hazır değil» giriş kapısını geçici olarak kapatabiliyordu. Hata gerçek kanal/dünya süreçleriyle yeniden üretildi ve alan eşleşmesi düzeltildi. Canlı olayın kesin eşleştirmesi için sunucu günlükleri ayrıca gerekir.

Aynı bilgisayar/IP konusu özellikle kontrol edildi: aynı IP'yi kullanan iki ayrı Chromium oturumunda iki farklı hesap açıldı. İlk hesap savaşırken ikincisi giriş yaptı, ışınlandı ve hareket etti. Oturum yenileme görevleri açıkken normal haritada 75, Sis Yarığı'nda 75 kesim/ganimet işlemi tamamlandı; dünya hatası ve giriş kapısının kapanması görülmedi. Normal haritadaki 75 ödülün her biri veritabanında tek teslim kaydıyla doğrulandı. Bu, canlı VDS kapasite ölçümü değildir; merkezi hesap doğrulaması test ortamında sağlanır.

İksir satın alma koruması korunur. Sunucunun henüz kabul etmediği tekrarlar oyun işlem kotasını tüketmez. Alışveriş bekleme süresi yalnız alışverişe uygulanır; yeniden bağlantı 429/503 bekleme süresine uyar. PC ve mobil dokunmatik görünümünde 45 satın alma, ardından sınır cevabı ve 12 tekrar tıklama sınandı: tekrar tıklamalar yeni istek göndermedi, hareket sürdü ve bağlantı yenilenince oyun komutu başarılı oldu.

Sis sandığı, gecikmeli ganimet tesliminden önce de kaydedilmiş savaş katılımını tanır. Tamamlanmış, canavarsız yarıkta tek yaşayan üye sandığı açabilir. Yaşayan başka üye varken katılmamış oyuncu ödül alamaz; ölüm, süre, konum, kanal ve tek ödül kontrolleri korunur.

Kadim Kat Mührü, Ruh Zinciri Halkası, Sinsi Taş Çekirdeği, Matem İpeği, Azrail Sandığı ve Azrail Kancası yeni ortak görsel setini kullanır. İlk açılışta eski görsele dönen seçenek kontrolü giderildi. Altı görsel PC ve mobil envanterinde doğrulandı. R68'deki özel kırmızı Azrail bildirimi, opak eşya pencereleri, sınıf/seviye bilgisi ve üç aşamalı binek edinme kontrolleri de geçti.

Kurulum/geri alma/hesap koruma/eski sürüm temizliği için 12 senaryo geçti. Son görsel paketiyle kurulum, tekrar çalıştırma, geri alma ve değişen dosya sınırı yeniden doğrulandı. Bu kontroller gerçek dosyalar ve SQLite üzerinde, taklit systemd ve sağlık uçlarıyla yapıldı.

R69'a özel 5 kontrol ve güncel protokol bildirimiyle 14 hareket/sıra kontrolü geçti. Tarihsel testlerdeki iki eski konum/sıra beklentisi ve 14 eski protokol bildirimi beklentisi değişmemiş R68'de de başarısızdı; tüm tarihsel testlerin geçtiği iddia edilmiyor. Ayrıntılı sonuç: `FINAL_REPORT.json`.
