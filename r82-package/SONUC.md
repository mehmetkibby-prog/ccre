# R82 — savaş sonrası hareket beklemeleri ve yeniden doğma istemcisi

R82, doğrulanmış R81_GAMEPLAY tabanındaki savaş sonucu beklemelerini hedefler. Kurulum paketi mevcut oyun veritabanını ve hesap hizmetini koruyarak uygulanır.

## Mevcut ölü karakter hakkında henüz doğrulanmayan nokta

Kullanıcı, tam sayfa yenilemesinden sonra da karakterin ölü kaldığını bildirdi. Eski istemcinin bellekte kalan bekleme işareti tek başına tam sayfa yenilemesinden sağ çıkmaz. R82'de doğrulanan istemci hatalarının giderilmesi, bu canlı karakterin ölüm kaydının doğru olduğu anlamına gelmez. Güncel `hp`, `max_hp`, `hp_revision`, `respawn_at_ms`, alan/kanal ve sunucu zamanı için salt okunur çıktı istenmiştir; paket hazırlanırken bu çıktı henüz alınmamıştır.

Eksik/sıfır ölüm zamanı, henüz dolmamış gerçek sunucu süresi, arena kuralı, sahiplik reddi veya kabul edilmiş fakat sonucu beklenen istek ayrı nedenler olabilir. Hiçbiri bu karakterin kesin nedeni olarak gösterilmez. Paket oyuncu canını uydurmaz, doğrudan SQL ile diriltmez, mevcut ölüm kaydını değiştiren veri geçişi içermez ve sonucu bilinmeyen bir işlemin korumasını kaldırmaz. Tam eşleşen canlı durum görülmeden “bu karakter kesin düzeldi” sonucu çıkarılamaz.

## Doğrulanmış test sonucu

Toplam **147 adlandırılmış test geçti**: kontrol noktası/kayıt sırası 32; gerçek native yeniden doğma SQL davranışı 4; sınırlı gecikme ölçümü 9; geçici bildirim 2; gerçek dağıtılan istemci fonksiyonlarıyla yeniden doğma 27; kurucu ve kurtarma 73. İlerleme/XP önbellek taslağının testleri bu sayıya dahil değildir. Testlerin gerçek ve kontrollü bileşen sınırları aşağıda ve `evidence/R82_KANIT.json` içinde açıklanır.

## Hedeflenen davranış

- Bir canavarın kayıt sonucu beklenirken ilgisiz başka canavarın kontrol noktası için gereksiz beklemeyi kaldırmak; aynı hedefteki kayıt sırasını ve kalıcılık koşullarını korumak.
- Savaş sonucunda hangi aşamanın beklettiğini sınırlı bellek ve çalışma maliyetiyle görünür kılmak.
- Sonuç kesinleşmediğinde gönderilen geçici durum yazısının sonradan ekranda kalmasını önlemek; kayıt ve ödül bekleme bayraklarını korumak.
- İstemcide kanal/döngü değişirken yeniden doğma isteğinin eski kilidinin kalmasını ve eski HP revizyonlu başarılı yanıt sonrası yeniden denemenin kaybolmasını düzeltmek. İlk yeniden doğma beklemesinde mevcut sunucu saati tahminini kullanmak; cihaz saati farkının fazladan uzun beklemeye dönüşmesini önlemek.
- Sağlık sürüm etiketini R82_GAMEPLAY olarak güncellemek ve kurulum tamamlanmadan bu etiketi doğrulamak.

Kesin üretim dosyaları ve SHA-256 değerleri `update.json` içindedir. Paketleyici bu dosya listesinin dışındaki kaynak değişikliklerini reddeder. Yeni `death-latency-r82.mjs` ve yeni hash adlı istemci kaynağı `before: null` kaydıyla açıkça tanımlanır; mevcut dosyalarda R81 başlangıç hash'i zorunludur. Aktör ilerlemesinin önbellekten hızlı tazelenmesi bu paketin kapsamına alınmamıştır.

## Kaynak ve çalışma zamanı kimliği

- Kaynak sürüm: `R81_GAMEPLAY`.
- Hedef sürüm: `R82_GAMEPLAY`.
- R81 kaynak listesi: 1164 dosya kaydı; tam liste korunur.
- R81 kaynak kimliği: `0fdd34be8b14f326166d24469c3b3c0a2e2a9ba84db839402598baa5e60ff0e8`.
- R81 paket kimliği: `46340f6459f85ccb07287e79b26efad52e2b0de052e8d878154e9fca681f2e21`.

R81'deki ödül sorgusu düzeltmesi korunur. R80 kayıt işçisi, Node 22.23.4 / SQLite 3.53.4 ve `runtimeDiagnosticsR80` tanılama protokolü korunur. Paket yeni Node çalışma zamanı taşımaz.

## İstemcinin değişmez sürüm grafiği

Yeni oyun varlığı `game-client-core511-r82-b75bd56f90806564.js`, yeni sürüm dizini `core511-022e5be3a720e972` şeklindedir. Eski R79 oyun varlığının baytları korunur. Güncel R79 HTTP girişinden tam 351 sürüm dizini ve 2 oyun dosyası adı değiştirilir. Ters değiştirme özgün R79 dosyasını bire bir geri üretir; eksik yerel kaynaklar kullanılarak HTTP yeniden derlenmez.

Kurulumdaki portal, SSR, HTML ve Vite manifest başvuruları yalnız doğrulanmış canlı sürüm satırlarından türetilir. Yeni dizindeki değişmeyen varlıklar diskte gövde kopyası oluşturmayacak şekilde journal kaydına alınan sabit bağlarla oluşturulur. Eski varlığın içeriği, inode'u, izinleri ve sahibi değiştirilmez. Geri alma yalnız yeni adları kaldırır ve özgün başvuruları geri getirir. Oyuncular kurulumdan veya geri almadan sonra sayfayı tamamen yeniden yüklemelidir.

## Kurucu davranışı

Kurucu bakım/ön kayıt ve boş oyun koşullarını, hesap hizmetinin kimliğini, kurulu kaynak dosyalarının bütünlüğünü, oyun veritabanının dosya kimliğini ve günlük yedek kilidinin aynı veri dizinine bağlı olduğunu doğrular. Kurulum ve geri alma, gerçek SQLite yedek API'siyle alınan doğrulanmış yedeği kullanır; eski yedek güncel oyun veritabanının üzerine yazılmaz.

Kod değişimi atomik dosya değiştirmeleri ve kalıcı işlem kaydıyla yürür. Kesinti sonrası kurtarma, yeni eklenen yardımcı dosyaları ve yeni istemci bağlarını da geri alabilir. Kurtarma izin verilen tam dosya ve yeni dizin listesini özgün manifest, doğrulanmış kod yedekleri ve aynı paket üzerinden yeniden türetir; journal içine eklenmiş farklı bir yol veya bağ kaynağı kabul edilmez. R82 kurucusu farklı sürümün işlem kaydını kendi kaydı gibi kabul etmez. Başlangıç sağlığı doğrulanamazsa önceki kod ve mevcut DB korunarak geri alma denenir; bunun da sağlığı doğrulanamazsa oyun servisleri başlatma korumasında kalır. Hesap servisi bu kurucu tarafından durdurulamaz.

## Doğrulamanın sınırı

Hedefli oyun testleri, kurucu testleri ve ölçülen sonuçlar `evidence/R82_KANIT.json` ve ilgili kanıt dosyalarında belirtilir. Kurucu testleri gerçek dosyalar, SQLite, kilitler, yedekler, hash'ler, atomik değişimler ve kalıcı kayıt/kurtarma kodunu çalıştırır. systemd ve hesap HTTP hizmetleri kontrollü test fixture'larıyla temsil edilir; ayrıca gerçek sabitlenmiş Node ikilisi ve gerçek üretim payload yükleyicisi doğrulanır.

Yerel kaynak ağacındaki güncel sürümü eksik modüller eski sürümden ikame edilmez. Tam manifest kimliği korunur. Bu nedenle bütün oyunun canlı VDS açılışı ve çok oyunculu kapasitesi burada ölçülmüş sayılmaz. R82'nin canlı oyundaki sonucu kurulumdan sonra doğrulanmalıdır; paket her tür ağ, cihaz çizimi veya sunucu kaynaklı takılmanın bittiği garantisini vermez.
