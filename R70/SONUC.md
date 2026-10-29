# R70 değişiklikleri ve test kapsamı

## Diğer oyuncunun hareketi

Başarısız ilk hareket ayarı isteğinin yenilemeye kadar kapalı kalması giderildi. Zaman aşımı ve geçici hata sonrası sınırlı yeniden deneme yapılır; yönetici tarafından kapatılmış ayarlar kapalı kalır.

Tarayıcı çizimi duraklayıp yeniden başladığında güncel sunucu verisi varken eski konumun uzun süre takip edilmesi giderildi. Binekli oyuncunun sunucuda onaylanmış hızı da görüntüleme hesabına katılır; önceki 300 px/sn takip sınırının gerisinde biriken gecikme önlenir. Sunucunun hareket hızı, çarpışma, hasar ve işlem sınırları değiştirilmez.

Aynı IP, iki bağımsız Chromium süreci ve gerçek yerel oyun/hesap/kanal servisleri ile ölçüldü. Binekli harekette bağlantıya 20 ms tek yön gecikme ve dönemsel 40 ms ek gecikme verilince ortanca görüntü konumu gecikmesi R69’da 203 ms, R70’te 37 ms oldu (p95: 343 → 102 ms). 2,2 saniyelik çizim duraklamasından sonra biriken takip gecikmesi de giderildi. Yön değiştirme, durma, bağlantının yeniden kurulması ve kanal değiştirme sınandı. Bunlar yerel test sonuçlarıdır; canlı VDS veya gerçek Firefox/Edge ölçümü değildir.

## Sis ödülleri ve grup kulesi

Normal ve Altın Sis Sandığı açılınca yalnız açan oyuncuya gerçekten verilmiş ödüller ikon ve adetleriyle gösterilir. Pencere 5 saniye sonra kapanır; kapatma düğmesi bulunur. Aynı isteğin tekrarında ödül ikinci kez verilmez.

Aynı kanaldaki grup üyeleri tek Kadim Kulesi seferine katılır. En fazla beş kişi, kat geçişi, sonradan katılım ve yeniden giriş kontrol edilir. Başka kanaldaki üyeye grubunun bulunduğu kanal gösterilir; mevcut seviye ve savaş kontrolleri korunur.

## Görev paneli

17 gerçek hedef türü: normal canavar, balık, pazar öğretisi, ilk evrim, seviye, rütbe, yetenek, ekipman artısı, silah evrimi, ekipman kuşanma, yoldaş, binek, lonca, grup, Sis sandığı, altın Sis sandığı ve Azrail zaferi. Her hedefin neyi saydığı panelde açıklanır. Mevcut durum/toplam hedefleri daha önceki kazanımları da sayar; av ve balık görevleri önceki ödül sonrası ilerleme kuralını korur.

Görev arama, sıralama, kopyalama, kaldırma, hazır şablonlar, gruplu hedef seçimi, ödül arama ve oyuncu önizlemesi eklendi. Eski görev kimlikleri ve alınmış ödüller korunur. Mevcut görevin türü değiştirilmez; farklı tür için kopyalanıp yeni kimlikle kaydedilir. Erken ödül, tekrar ödül ve eski panel sürümüyle kaydetme reddedilir.

İki gerçek tarayıcıda ortak kule odası/kat ilerlemesi, normal/altın sandık ödül teslimi, pencere süresi, özel görünürlük ve kapanma; gerçek admin HTTP üzerinden görev kaydetme/yeniden yükleme ile mobil taşma denetlendi. Kurulum, kayıtların korunması, başarısız kurulumdan dönüş, kesinti kurtarma, eski sürüm temizliği ve yeni görevler varken güvenli geri alma denetimleri ayrı kurulum testindedir.

Instagram video işi kullanıcı isteğiyle beklemededir. Bu paket canlı sunucuya buradan kurulmamıştır.
