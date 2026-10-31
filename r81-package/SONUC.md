# R81 — ana işlem CPU profilinden çıkan ödül sorgusu düzeltmesi

R81, kurulu R80_GAMEPLAY üzerine hazırlanmıştır. Ana işlemde pahalı çalışan bekleyen normal canavar ödülü hak sahibi sorgusunu düzeltir. Paket hedefli testlerden geçmiştir; canlı VDS'ye henüz uygulanmamıştır.

## Canlı kanıt

Kullanıcının 30 saniyelik VDS ölçümünde ana iş parçacığı ortalama bir çekirdeğin %40,768'ini, bütün Node süreci %82,703'ünü kullanıyordu. VDS toplamı ortalama %16,161; iowait %0,255 ve steal %0,246 idi. Bunlar farklı paydalardır. Ana thread'deki yük gerçektir; bu kısa pencerede bütün VDS'nin CPU doygunluğuna ulaştığı görülmemiştir.

Gönderilen ana işlem CPU profili 28.091 örnek ve 60,616 saniyelik örneklenmiş zaman içeriyor. Başlangıçtaki 616,73 ms inspector örneği ayrıca raporlanmıştır. `abandonedActors` ve alt çağrıları toplam 10,314541 saniye tutuyor: tüm profilin %17,016'sı, başlangıç ve boşta süre çıkarıldıktan sonraki zamanın %42,559'u. Bunun 5,490381 saniyesi native SQL `prepare`, 4,725279 saniyesi `all` yolundadır. Bu değerler örneklenmiş yığın zamanıdır; kesin çağrı sayısı, tek sorgu süresi veya oyuncu pingi değildir.

## Kök neden ve değişiklik

Ön kontrol, mevcut prepared-statement kapsamının dışında olduğu için karmaşık sorguyu tekrar derliyordu. Yeni sürüm yalnız senkron sorgu ve ID dönüşümünü mevcut `withPreparedStatements477` içine alır. Parametreler ve satırlar her çağrıda yeniden okunur; sonuçlar veya yetki kararları önbelleğe alınmaz. Scope hiçbir await, oyuncu dondurma veya ödül işlemini kapsamaz.

Eski sorgunun kaynak CTE'sinin düzleştirilmesi, yerel büyük veri örneğinde geniş oyuncu-oyuncu eşleştirmesine neden oldu. `sources AS MATERIALIZED`, ilgili canavar ve doğum turunun henüz ödenmemiş katılımcı kümesini SQL ifadesi boyunca ayrı tutar. `xp_sources` aynı bırakılmıştır. Kaynak oyuncudan yalnız mevcut koşulların kullandığı 10 sütun okunur. Yeni planda bazı oyuncu indeks taramaları hâlâ mümkündür; bütün oyuncu taramalarının yok olduğu iddia edilmez.

Materialization yalnız tek SQL ifadesinin yürütülmesi sırasında geçerlidir. SQLite'ın bu plan kontrolü, sabitlenmiş 3.53.4 sürümünde test edilmiştir. Resmî açıklama: https://www.sqlite.org/lang_with.html#materialization_hints

Canlı veritabanının EXPLAIN planı alınmadı. Canlı profilde sorgunun ağır olduğu doğrulandı; pahalı join planı aynı SQLite sürümündeki sentetik veride yeniden üretildi. Bu iki kanıt birbirinden ayrıdır. Eski plan kullanılmayan geniş payload sütunlarını zaten buduyordu; yalnız sütun daraltma ağır yürütmeyi düzeltmeye yetmedi. Çalışma planını iyileştiren ek adım materialization, tekrar derlemeyi gideren adım prepared scope oldu.

## Korunan davranış ve paket kapsamı

Canavar/tur kimliği; normal, XP, Sinsi ve boss claim kontrolleri; can, güncellik, bölge, kanal, arena ve mesafe koşulları; grup üyeliği; benzersiz/sıralı alıcı listesi korunur. `ordinaryDue` ve dosyanın bundan sonraki bütün kodu önceki sürümle aynıdır: ilk uygunluk kontrolü, sahiplik kilidi, dondurma, yazıcıdaki ikinci kontrol, ödül uygulama ve işlem sonrası denetim devam eder.

İki üretim dosyası vardır:

- `abandoned-normal.mjs`: derleme önbelleği kapsamı, dar sütun seçimi ve kaynak CTE planı.
- `native-http-bindings.mjs`: yalnız updateVersion sabitinin R80_GAMEPLAY'den R81_GAMEPLAY'e alınması. Paketleyici bu dosyada başka değişiklik olmadığını doğrular. Sağlık protokolü runtimeDiagnosticsR80 olarak devam eder.

Veritabanı şeması, hesaplar, istemci, Node/SQLite ve R80 checkpoint işçisi değişmez. Kurucu, iki dosyanın yanında zorunlu kaynak kimliği/manifest ve kurulum metaverisini günceller. R80 kaynak kimliği ve güncel veritabanı doğrulanır; eski kod ile güncel DB kullanılarak geri alma korunur.

## Doğrulama

73 hedefli test geçti: 56 kurucu/geri alma/kapı testi, 12 sorgu testi, 2 mevcut prepared-cache regresyon testi, 3 gerçek kaynak sağlık metodunun helper ile testi. 120 karışık veri karşılaştırması 12 sorgu testinin, 17 kurulum/geri alma kesinti aşaması 56 kurucu testinin içindedir; toplamın üzerine eklenmez.

Testler canlı veri okuması, paid/XP/Sinsi/boss/loadlab geçmişleri, ölü/uzak/eski alıcılar, sınır mesafeler, NULL değerler, grup değişiklikleri, rollback, main/TEMP/dış bağlantı şema değişiklikleri ve hata sonrası scope çıkışını kapsar. Gerçek yazıcı girişinin değişmiş alıcı listesini ödül servisine geçmeden reddettiği doğrulanmıştır. Bu testte yetki/servis sınırı kontrollüdür; tüm dondurma/commit entegrasyonunun testi değildir.

Yerel bellek içi SQLite örneğinde 600 oyuncu kaydı, 16 güncel katılımcı, 20 grup üyesi ve 30.000 tarihsel katılım kullanıldı. Tarihsel claim kayıtları ve büyük JSON sütunları da vardır. Önceden hazırlanmış yazıcı sorgusunun çağrı başına ortancası 92,8903 ms'den 0,2556 ms'ye indi; her sürüm için üç turda toplam 30 ölçülen çağrı kullanıldı. Küçük ön kontrol örneklerinde iyileşme yaklaşık 19–57 kattır. Küçük, zaten hazırlanmış yazıcı örneklerinde maliyet yaklaşık aynı kalır. Bunlar sorgu düzeyi ölçümlerdir; canlı CPU yüzdesi veya 600 eşzamanlı oyuncu kapasitesi sonucu değildir.

Kurucu testleri gerçek dosyalar ve SQLite üzerinde yedek, hash, kilit, atomik değişim, journal ve kurtarma kodunu çalıştırır. systemd ve hesap HTTP uçları kontrollü fixture kullanır. Yeni sürüm başlatılamazsa güncel veritabanı korunarak R80 koduna dönülür. Gerçek VDS açılışı ve oyuncu kapasitesi burada test edilmiş sayılmaz. Yerel kaynakta güncel sürümü eksik 42 modül için eski dosya ikamesi yapılmamıştır.

## Düz koşudaki küçük takılma

Normal hareket kanal sürecinde işler; her hareket adımı ana SQLite yazıcısını beklemez. Bekleyen ödül alıcısı geçici olarak dondurulduğunda, hareket kalıcı PvE işlemi gerektirdiğinde veya checkpoint geciktiğinde ana süreçteki bekleme harekete yansıyabilir. Bu profil kullanıcının gördüğü bütün takılmaların bu nedenle olduğunu kanıtlamaz.

Güncel mobil istemcinin varsayılan 50 FPS hedefi, 60/120 Hz çizim döngüsünde eşit olmayan kare aralıkları üretir. Gerçek zamanlayıcı işlevinin ideal 60 Hz örneğinde 16,67/33,33 ms aralıkları, 120 Hz örneğinde 16,67/25 ms aralıkları oluşur. 60 FPS hedefi aynı örneklerde 16,67 ms aralık verir. Mobil ayar 50 ise mevcut arayüzden 60 seçip aynı yerde 20–30 saniye yürümek kontrollü bir denemedir. Kullanıcının gerçek ekran hızı ve ayarı henüz bilinmiyor; cihaz ısısı ve çizim maliyeti ayrıca etkiler.

Mevcut istemcinin FPS ve 80 ms üzeri görüntü duraklama sayaçları çalışır; ping ve Konum kaydı alanları eski bağlantı yoluna bağlı kaldığından boş/sıfır değerleri bağlantının sağlıklı olduğuna kanıt olarak kullanılmamalıdır. 25–33 ms çizim düzensizliği de 80 ms eşiğinin altında kalır. R81 istemci çizimini veya hareket tahmini sınırlarını değiştirmez.

## Kurulum sonrası kabul

Aynı cihaz, bağlantı, karakter, kanal ve bölgede benzer koşullarda yürüyüş ve CPU profili karşılaştırılmalı. Ana işlem 60 saniyelik profilinde sorgunun payı ve gerçek CPU kullanımındaki değişim değerlendirilir. Takılma sürerse karakterin bulunduğu kanalın 60 saniyelik profili ve görüntü akışı incelenir. Canlı sonuç görülmeden bütün lag'in bittiği veya CPU'nun belirli bir yüzdeye düşeceği söylenemez.

Kurulum ve kurtarma komutları KURULUM.md içindedir. Ham hedefli test/profil/benchmark kanıtları evidence/ altındadır. Kullanıcının ham CPU profili pakete dahil edilmemiştir.
