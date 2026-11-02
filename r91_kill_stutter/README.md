Canavar ölümü sırasında ödül çalışanı, her işlemden önce `kernel511_channel_owners` tablosunun tamamını okuyup yeni bir oyuncu haritası oluşturuyordu. Çıkış yapan oyuncuların sahiplik kayıtları tabloda kaldığı için işlem maliyeti geçmiş oyuncu sayısıyla büyüyordu. Ödül çalışanı bu sırada ortak yazma sırasını tuttuğundan bekleme diğer yazma işlemlerine de yansıyordu.

R91 eklemesi, ödül çalışanında yalnız o işlemle gelen çevrimiçi durum kayıtlarının oyuncu anahtarlarını okur. Sahiplik ve giriş bilgileri her işlemde veritabanından yeniden alınır. Ana sunucunun kanal değişimi ve kurtarma için kullandığı tam oyuncu haritası korunur. Değişen sunucu dosyaları `writer-runtime.mjs` ve `reward-worker-runtime-r533.mjs` dosyalarıdır.

**R91 beklemede.** Önceki doğrulama düzeltmesi bu toplu pakete dahildir. Eski `CORE511_R91_DOGRULAMA.zip` korunmuştur. Yeni paket canlıya kurulmadı; oyun veya bakım durumu değiştirilmedi. Disk temizliği ayrı iş olarak bekliyor.

50 etkin oyuncu ve 5.000 geçmiş sahiplik kaydıyla, aynı 30 saniyelik yük senaryosunun önce/sonra sonuçları:

| Ölçüm | Önce | Sonra |
| --- | ---: | ---: |
| Saldırı yanıtı p99 | 989,7 ms | 214,5 ms |
| En uzun saldırı yanıtı | 1.787,1 ms | 408,5 ms |
| Hareket yanıtı p99 | 403,4 ms | 210,9 ms |
| En uzun ölüm işlemi beklemesi | 1.455,2 ms | 341,5 ms |

Doğrudan sorgu ölçümünde, 20.000 geçmiş kayıt ve 50 gerekli oyuncuyla sahiplik yenileme ortancası 100,8 ms'den 0,33 ms'ye indi. Sorgu planı oyuncu anahtarı indeksini kullanıyor. Tam tablonun okunmadığı ayrıca test edildi.

Son 90 saniyelik koşu aynı 50 oyuncu ve 5.000 geçmiş kayıtla 29.400 yanıtı kapsadı. 6.342 saldırıda p99 124,8 ms, en uzun saldırı 345,7 ms; 21.602 harekette p99 134,7 ms idi. Hata ve süreç arızası sıfırdı. Bu daha uzun koşu ayrı bir sağlamlık kontrolüdür; önce/sonra tablosu eşit süreli koşuları karşılaştırır.

Kuzey Ormanı ve Karanlık Rün Sahili için gerçek sunucu süreçleriyle öldürme, tamamlanmış işlem tekrarı, ödül talebi tekrarı ve hareket kontrolleri geçti. Aynı ölüm için ikinci ödül oluşmadı. Eski oturum/kanal sahipliğiyle çevrimiçi durum yazılamadığı doğrulandı. Yeni paketin gerçek HTTP açılışı dört hazır kanal, hazır kalıcı kayıt çalışanı ve HTTP 200 ile geçti. Kurulum, yarım yazma sonrası kurtarma ve geri alma dahil 10 kurucu testi geçti.

Ölçümler yerel yapay verilerle, gerçek sunucu/istemci taşıma koduyla yapıldı. Canlı VDS profili ve canlıdaki geçmiş oyuncu sayısı mevcut değil. Tarayıcı çizimi, oyuncunun cihazı ve internet hattı bu yük testine dahil değil. Bu sonuçlar bulunan tarama maliyetinin giderildiğini gösterir; canlıdaki bütün takılmaların bittiği henüz doğrulanmış değildir. Karanlık Rün ödüllerini başka çalışana taşıma denemesi belirgin kazanç sağlamadığı için teslim edilen koda alınmadı.

Paket: [CORE511_R91_TOPLU.zip](artifacts/CORE511_R91_TOPLU.zip), 4.851.486 bayt.

SHA256: `40e38d258f1b7ba027ec492f1f6170cca537648726b44dcf472335c3084d17ef`

Paket düzeltilmiş `R90_GAMEPLAY` üzerine hazırlanmıştır. Kaynak kimliği `b8045ab52349200d99be5906857870b6898e8c74614e9c5f62a1525b11bf810b`; hedef kod kimliği `795d3f2d7ff4aaa4028264dfba4d8e842520b1f749a09221256b918e15268a62`. Önceki R91 zaten uygulanmışsa bu paket tekrar R90 tabanı varsayımıyla kullanılmamalıdır. Kullanıcının R91'i bekletme isteği sürüyor; bu belge kurulum çağrısı değildir.

Ölçüm özeti `evidence/measurements.json`, paket doğrulaması `evidence/validation.json` içindedir. Önce/sonra ve son uzun koşunun ham sonuçları aynı dizinde `.json.gz` olarak korunur. Test günlükleri de eklenmiştir. Önceki R91 istemci dosyaları ve açılış kanıtları bayt düzeyinde korunmuştur.

Tam yerel test ağacı `/tmp/core511-r91-kill-work/working` konumundadır. Bu teslim klasörü paket kaynaklarını içerir; çalışma ağacı gerektiğinde `prepare_workspace.py` ile korunan `/tmp/core511-r90-startup-fix` ağacından oluşturulur. Testler mevcut R85 yerel test altyapısını ve sabit Node 22.23.4 sürümünü kullanır. `prepare_package.py` aynı çalışma ağacından ZIP'i üretir. Canlı veritabanı hiçbir teste kopyalanmadı.
