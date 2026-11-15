# R118 — Kraliyet ve Şampiyonlar Diyarı

Tam R117_HOOK10 üzerine hazırlanır. Kaynak ZIP ve SHA256 değişmez:
`R117_HOOK10_28ecda32950b.zip`,
`420135643eddb53f8b81fc490014d31fb877d7513077716c792fba92a5658996`.

Bu sürüm yalnız kod yaması değildir. Yeni Kraliyet tabloları/tetikleyicileri,
Şampiyonlar Diyarı ayarı ve dört kanalda 192 başlangıç canavarı ekler. Üç mevcut
set tetikleyicisi Kraliyet ailesini tanıyacak biçimde değiştirilir. Yeni haritanın ödülleri yalnız kendi panelinden ayarlandığı için
mevcut yılbaşı çorabı tetikleyicisi de bu haritada ek ödül vermeyecek şekilde
sınırlandırılır; diğer haritalar korunur. Oyuncuların
var olan eşya veya bakiye satırları kurulumda değiştirilmez.

Kurucu iki dünya durdurulduğunda ilgili şema tanımlarını, önceki üç set
tetikleyicisini ve çorap tetikleyicisini ve başlangıç dengesi için kullanılan mevcut rün ayarını ayrı,
küçük bir SQLite kapsam yedeğine tutarlı olarak alır. Yedek geri okunur,
`quick_check` ve içerik özeti doğrulanır. Ana oyuncu veritabanının tamamı
kopyalanmaz, taranmaz veya sıkıştırılmaz. Yeni şema/başlangıç kayıtları tek
transaction içinde oluşturulur; kaynak/hedef ve bütün paket baytları sabittir.

Oyuna açılmadan, yeni içerik henüz kullanılmamışsa önceki kod ve şema güvenle
geri döner. Yeni eşya/malzeme, dönüşüm/salvage makbuzu, yeni haritada oyuncu veya
canavar ilerlemesi varsa R117'ye dönüş engellenir. Bu durumda yeni kayıtları
silmek yerine R118 ile ileri kurtarma yapılır. Eski kodun tanımadığı Kraliyet
rarity'si veya `champions` bölgesi eski oyuna bırakılmaz.

İki realm, sekiz kanal, önceki güvenlik işaretleri ve R118 hazırlığı doğrulanmadan
kurulum tamamlanmaz. Bakım ve Akademi ön kayıt ayarları korunur. Geçmiş schema
kurtarma arşivleri otomatik temizlenmez. Yeni sanat ve istemci modülleri ayrı,
içerik kimlikli dosyalardır; eski medya ve ZIP'ler değişmez.

Kurulum: [KURULUM.md](KURULUM.md).

```bash
python3 project/r118_royal_champions/build/package.py
python3 project/r118_royal_champions/tests/installer_test.py -v
python3 project/r118_royal_champions/tests/stage-runtime.py
python3 project/r118_royal_champions/tests/installed-runtime.py
python3 project/r118_royal_champions/tests/installed-combat.py
```

Node 22.23.4 için `REVIEW_NODE` kullanılır. Paket oluşturulmadan önce bütün
runtime değişiklikleri `build/reviewed-files.json` ile açıkça incelenir. Kabul
sonuçları `evidence` altındadır. Bu dosya kendi başına kurulum veya test başarısı
iddiası değildir.

Yük karşılaştırması yalnız 50 oyuncuyla, dört kanala 13/13/12/12 dağılımıyla
hazırlanır. Aynı R118 kaynakları üzerinde Kuzey Ormanı ve Şampiyonlar Diyarı
seri karşılaştırılır. Yerel ortamın cgroup kotası **4 CPU** (`400000/100000`),
affinity alanı 5 CPU ve bellek üst sınırı 32 GB'dır. Botlar ile sunucu aynı
makinededir ve veritabanı sentetiktir. Bu ölçümler 8 çekirdek/12 GB canlı VDS'de
50 oyuncu veya sıfır gecikme garantisi değildir; ham gecikmeler, hatalar ve
cgroup throttling farkları birlikte raporlanır. Tek CPU affinity ile alınan
başlangıç tanısı yük/kabul karşılaştırmasına dahil edilmez.

Başlangıç tanısında `reliable-stream.mjs` içindeki 5 saniyelik doğrulama
sayacının özel kanal başlangıcını 5001/5003 ms'de kestiği çağrı iziyle görüldü.
Özel kanal pipe'ı artık mevcut 20 saniyelik supervisor başlangıç bütçesini
kullanır; normal bağlantıların 5 saniyelik süresi ve kimlik doğrulaması korunur.
İlk aralıklı hataların çağrı izi bulunmadığı için onların birebir aynı nedenden
geldiği kesinleştirilmiş sayılmaz. İlk başarısız ölçümler silinmez.

Son kurulum provasında ayrı bir başlangıç sırası hatası da yakalandı:
kanal kimliği kaydedilmiş, fakat çocuk süreç henüz hazır değilken dünya
güncellemeleri gönderilebiliyordu. R118 dünya yayınına yalnız gerçek
`kernel511-ready` sonrasındaki açık abonelikle katılır; önce tam güncel görünüm,
ardından sıralı değişiklikler gönderilir. Olağan 5 saniyelik yanıt sınırı
değiştirilmez. Kurulum provası iki dünyayı eşzamanlı başlatmaya devam eder ve
sonradan toparlansa bile başlangıçta hata/kurtarma kaydı üretmesini reddeder.


Yük sürücüsü ayrıca üretim tetikleyici imzalarının sertifikalı olduğunu ölçüm
öncesinde doğrular. Eski sentetik fikstürün yalnız bilinen savaş-alanı test
sarmalayıcısı, yazar başlamadan gerçek üretim SQL tanımına çevrilir; bilinmeyen
tetikleyiciler kabul edilmez. Botlar gerçek eşya gücü ve efsun ayarlarıyla tam
Kadim Zümrüt seti kullanır; canları türetilen gerçek sınırdadır, hareketleri
sunucu yanıtıyla eşitlenir ve canları azaldığında normal iksir kullanırlar.
İlk eski-sürücü ölçümü ve başarısız yeni-harita kontrolü ayrı ham kanıtlarda
korunur. İşlevsel doğrulama başarılı olsa bile gecikme hedefi ayrıca raporlanır.

Son teslim durumu: kurucunun 13 testi, kapsam geçişinin 9 testi, kurulan
arşivden iki sunucu/sekiz kanal ve WebSocket kontrollerinin 3 testi geçti.
Kurulan çekirdekte Efsane ve Akademi için gerçek saldırı, kalıcı ölüm, tekrar
ödül talebi ve taç/öz toplama da geçti. Ayrıntılar `evidence/installed-acceptance.json`.

50 oyunculu yük doğrulaması **tamamlanamadı**. Sentetik sürücünün yürüyüşü
orman duvarlarına takıldı; sonraki sabit hedef denemesinde test karakterlerinin
türetilmiş can sınırı 100 kaldı ve bağlantılar hazırlanırken öldüler. Son deneme
ölçüm süresi başlamadan katı kontrolde durdu; o denemede runtime hatası veya
bağlantı kopması yoktu. Kullanıcının süre/kredi sınırı üzerine isteğe bağlı
düzenek genişletilmedi. İki harita için tamamlanmış karşılaştırma, üç tekrar
medyanı, canlı kapasite veya sıfır takılma iddiası yoktur. Başarısız ham kayıtlar
korundu: `evidence/load-validation.json`.

## R118 kurulum kapsamı düzeltmesi

İlk teslim edilen `640cf76b…` arşivinin ön kontrolü, çalışma ortamına ait
`core511-source/scripts/perf-r11/tests/reward/fixture.mjs` dosyasının canlıda
aynı olmasını yanlışlıkla şart koşuyordu. Bu dosyaya R117 güncellemeleri
dokunmamıştı; çalışan servisler bu test fikstürünü kullanmaz. Hata kaynak
doğrulamasında, servis durdurma / kod değiştirme / şema geçişinden önce oluştu.

Yeni arşiv bu geliştirme dosyasını dağıtım kapsamından çıkarır. Geri kalan
113 payload dosyasının içerikleri, kaynak/hedef çekirdek kimlikleri, istemci
ad alanı ve şema geçişi ilk teslimle birebir aynıdır. Üretim dosyalarındaki
yabancı değişiklikler hâlâ reddedilir. Çekirdek kimliğinin parçası olan
mevcut test dosyaları topluca çıkarılmamıştır; kimlik sözleşmesi korunur.

Eski arşiv ve özeti değiştirilmez. Düzeltmenin yeniden üretimi, eski/yeni
paket karşılaştırması, farklı/eksik test dosyasıyla kurulum-geri dönüş ve
gerçek iki dünya başlangıç kanıtları `evidence/installer-scope-fix` altındadır.
Güncel indirilecek arşiv `evidence/package.json` ile seçilir. Eski kabul
kaydı `evidence/installer-scope-fix/original-evidence` içinde korunur.
