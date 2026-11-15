# 2D geçişi — canlı uygulama ve kontrol

## Doğrulanmış / bekleyen durum

- Kullanıcı 2d A kaydını eklediğini bildirdi (15 Kasım 2026).
- Bu ortamda Cloudflare oturumu/API yetkisi veya VDS SSH erişimi yok.
- Yeni adrese bağlantı, çalışma ortamının HTTP CONNECT aracında 403 ile engellendi.
  Bu, origin'in HTTP yanıtı veya sitenin çalışmadığına dair kanıt değildir.
- Kullanıcı ekranında SSL modu **Full**, otomatik mod açık; sonraki tarama Dec 8.
- Canlı Caddy dosyası/çalışan ayar eşit. Apex sertifikası otomatik, adı
  coreoflife.net ve bitişi 25 Aralık 2026. 2d için mevcut TLS el sıkışması başarısız.
- Etkin Cloudflare yönlendirme/Worker/cache/SaaS kurallarının envanteri bekliyor.
- Mevcut apex ana sayfası temiz tarayıcıda HTTP 200 verdi; service worker kaydı
  ve tarayıcı hatası görülmedi. Bu kontrol eski kullanıcı profillerini kapsamaz.
- Apex/www DNS kesimi kullanıcıya aittir. Bu paket DNS API çağrısı yapmaz.

## 1. VDS / sertifika

`tools/tls-short-audit.py` sonucu Caddy'nin **varsayılan otomatik HTTPS**
kullandığını doğruladı. `certificates: []` sadece elle yüklenen sertifikaların
olmadığını gösterir; sertifika yok demek değildir. 2d hostu henüz tanımlı değil.

V2 kurucudaki `--check-web` salt okunurdur. Bakım sırasında `--prepare-web`
eski apex kurallarını koruyarak 2d eşlerini ekler. Caddy mevcut sertifika
sağlayıcısıyla yeni hostname sertifikasını otomatik alır. Elle sertifika/key
listesi eklenmez, ACME/Cloudflare TLS doğrulaması kapatılmaz. Hazırlık hem
localhost origin'i hostname/CA doğrulamasıyla hem Cloudflare ana sayfasını
HTTPS ile kontrol eder; hata halinde eski Caddy ayarına döner.

Kontrol bu çalışma ortamında gerçek Caddy + izole yerel CA ile yapıldı;
canlı ACME sertifikası ancak kullanıcı VDS'te hazırlığı çalıştırınca doğrulanır.
Caddy ayar yüklemesi WebSocket yeniden bağlanması yaratabileceğinden aynı bakım
aralığında yapılır. `server_name` karşılığı Caddy host eşleştiricisidir.

## 2. SSL/TLS modu ve yalnız 3D hostlarına Full

Etkin mod ekranla **Full** olarak doğrulandı; şu an Full (strict) istisnası
zorunlu değil. Otomatik mod açık olduğu için ileride seçilen mod değişebilir.
3D'nin Full gereksinimini yalnız apex/www için sabitlemek istenirse aşağıdaki
dar kural kullanılabilir. Bölge genelindeki modu değiştirmeyin. Bu paket
Cloudflare kuralı oluşturmaz; mevcut kural envanteri önce incelenmelidir:

1. Rules → Configuration Rules → Create rule.
2. Ad: `3D apex TLS Full`.
3. Custom filter expression:
   `(http.host in {"coreoflife.net" "www.coreoflife.net"})`
4. SSL ayarı / SSL encryption mode: **Full**.
5. Diğer ayarları eklemeyin. Kural kapsamının yalnız iki host olduğunu kontrol edin.
6. Aynı SSL ayarını sonradan değiştiren çakışan kurallar varsa sıralamayı inceleyin;
   bu dar kuralın iki host için etkili olduğunu Cloudflare Trace ile doğrulayın.

`2d`, accounts, r1, r2, realtime, rt1, rt2 ve rt-r2 bu ifadeye girmez; bölgedeki
mevcut TLS ayarı onlar için korunur. Panelinizde SSL ayarı sunulmuyorsa
bölgeyi düşürmeyin; ekran/plan desteği incelenerek hosta özgü seçenek belirlenmeli.

## 3. Kural envanteri

Henüz mevcut kuralların listesi elde edilmedi; aşağıdakiler gerçekten boş diye
varsayılmayacak. `tools/cloudflare-readonly.py` salt okunur token ile SSL, DNS,
Page Rules, Rulesets ayrıntıları, Workers routes ve custom hostnames toplar.
Yetki/plan hataları `unavailable` olarak ayrılır; bunlar "kural yok" değildir.
Tokenı sohbete veya repoya koymayın. Script hiçbir POST/PATCH/DELETE yapmaz.

Panelden eşdeğer kontroller:

- Rules → Page Rules: `coreoflife.net/*`, `www.coreoflife.net/*` ve kapsayan wildcard.
- Rules → Redirect Rules: Single Redirects ve varsa Bulk Redirects + bağlı listeler.
- Workers & Pages → ilgili Worker → Settings → Domains & Routes: apex/www eşleri.
- Rules → Cache Rules: host koşulları, eski 2D içerik/HTML cache kuralları.
- Rules → Transform/Origin/Configuration Rules: host/path/CSP/SSL değişiklikleri.
- SSL/TLS → Custom Hostnames (Cloudflare for SaaS) ve DNS'teki `_cf-custom-hostname`
  TXT kayıtları: sahiplik/hedef bağımlılıkları. TXT kayıtları otomatik silinmez.

Yalnız 2D'ye ait kuralları yeni 2d hostuna daraltın. Bir kural accounts veya r1/r2
hostlarını da kapsıyorsa önce ayırın; diğer hostların davranışı aynen korunmalı.
Worker route'unda aynı script ancak gerekli host denetimleri yenilenince 2d'ye
bağlanmalı. Cache temizliği gerekiyorsa yalnız taşınan 2D URL'lerini hedefleyin.
Korunan DNS/e-posta kayıtları önce/sonra eşit olmalı. SSL dar kuralı bir 3D ayarıdır;
2D'ye taşınacak içerik yönlendirmeleriyle karıştırılmamalı.

## 4. Canlı kabul — telefon ve bilgisayar

Her cihazda `https://2d.coreoflife.net` başlangıç noktası olmalı:

- Ana sayfa, logo/Ana site, canonical ve og:url; robots, sitemap, varsa manifest.
- Kayıt ve giriş; yeni/var olan hesap, çıkış ve yeniden giriş. accounts adresi korunur.
- Kendi CAPTCHA'sı, yanlış kod ve yenileme. Kaynakta Turnstile/reCAPTCHA veya Discord
  OAuth entegrasyonu bulunmadı. Cloudflare hesabında ayrıca widget varsa hostname
  listesine 2d eklenir; gizli anahtarlar değiştirilmez.
- Efsane oyun girişi, hareket/saldırı ve sağlıklı WebSocket; Akademi açılış/izin kuralı.
- Ses yetkisi ve iki yetkili kullanıcı arasında gerçekten ses iletimi.
- Rehber, forum üyelik/giriş/mesaj/çıkış, ön kayıt ve Akademi geri sayımı.
- Tanıtım videosu: oynatma, ses, ileri sarma (Range), kapak; CSP hatası olmamalı.
- Gerçek kayıt doğrulama/parola sıfırlama e-postası: bağlantı doğru hosta gitmeli,
  token çalışmalı. Yerelde e-posta URL oluşturucu test edilir; e-posta gönderilmez.
- Depo: 1. ve 2. bölüm açılışta görünür, eşya alma/koyma, varsa ek bölümler.
- Çerezlerde Domain olmamalı; __Host- çerezleri host-only kalır.
- DevTools → Application → Service Workers: mevcut apex kapsamlı kayıt varsa
  bildirilmeli. İncelenen kaynakta kayıt kodu bulunmadı; eski kullanıcı profilleri
  bu nedenle "kesin yok" sayılmaz. 3D adına SW silen kod eklenmez.

Bütün canlı adımlar geçmeden **2D hazır** sonucu verilmez.

## 5. Kullanıcının apex DNS kesiminden SONRA

Kullanıcı apex/www'yi 3D VDS'ine taşıdıktan sonra yukarıdaki testler tekrarlanır.
DevTools Network → Preserve log açıkken 2d'den başlayın; giriş, oyun, ses, forum ve
video akışlarını gezin. Request URL hostu TAM `coreoflife.net` veya
`www.coreoflife.net` olan HTTP, fetch, medya veya WebSocket isteği kalmamalıdır.
`accounts.coreoflife.net`, `r1.coreoflife.net` vb. aynı şey değildir, korunur.
`tools/check-har.py` dışa aktarılan HAR'ı yerelde denetler; kimlik/token değerlerini
çıktıda gizler. HAR dosyasını sohbete/GitHub'a yüklemeyin (oturum içerebilir).

3D'nin koruyacağı yönlendirme sınırı kullanıcı tarafından uygulanır: yalnız
`/rehber`, `/forum`, `/on-kayit`, `/akademi-kayit`, `/col-site`, `/_game`, `/game`,
`/voice` ve bunların alt yolları. Yol ve sorgu korunur. `/api`, `/ws`, `/assets`,
`/` ve diğer yollar 3D'ye aittir. Bu paket 3D VDS'ine dokunmaz.
