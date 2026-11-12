# R109 inceleme dosyaları

## Hızlı başlangıç

Linux, Python 3.10+ ve **Node.js 22.23.4** kullan. Bu Node sürümü SQLite
davranışını ve önceki ölçümlerle karşılaştırmayı sabitler. `nvm install 22.23.4`
ve `nvm use 22.23.4` kullanılabilir. Ayrı Node dosyası kullanıyorsan
`REVIEW_NODE=/tam/yol/node` tanımla.

```bash
git clone --branch r109-claude-inceleme --single-branch https://github.com/mehmetkibby-prog/ccre.git
cd ccre/r109-inceleme
npm ci
npm run setup
npm run verify
npm test
npm run test:captcha
npm run test:native
npm run test:installer
python3 scripts/check.py runtime
```

Bu komutlar yerel ve geçici sentetik hesap/veritabanı üretir. Canlı sunucuya
bağlanmaz. `npm ci` geliştirme bağımlılıklarını kurar; `setup` yalnız checkout
içindeki bağımlılık bağlantılarını ve test varlık kayıtlarını oluşturur.
R109'un 2.054 asıl runtime dosyası kopyalanırken bayt bayt doğrulandı;
ortamdan bağımsız çalışması için test/derleme yolları uyarlandı.
`runtime` kontrolü iki gerçek realm servis girişini ve sekiz kanalı geçici
veritabanlarıyla başlatır. Eski `vds-server/src/app.mjs` girişini kullanma;
üretim girişi `core511-source/scripts/delivery511/runtime-entry.mjs` dosyasıdır.

Tarayıcı kontrolü:

```bash
npx playwright install chromium
R102_TEST_REALM=r1 TOWER=1 PREVIEW_NAME=review-pc npm run test:browser
R102_TEST_REALM=r2 MODE=mobile TOWER=1 PREVIEW_NAME=review-mobile npm run test:browser
```

Sistem Chromium'u kullanmak için `REVIEW_CHROMIUM=/usr/bin/chromium` eklenebilir.
Ekran görüntüleri ve sonuçlar `project/r109_latency_completion/evidence` altına
yazılır. Testler gerçek R109 istemcisini ve yerel native oyun motorunu kullanır;
merkezi hesap sınırı ve başlangıç verileri test fikstürüdür.

Tek seferde bir yük testi çalıştır:

```bash
npm run load -- --players 10 --seconds 60 --realm r1 --mode mixed
npm run load -- --players 40 --seconds 60 --realm r1 --mode shared_boss_terminal
npm run load -- --players 40 --seconds 60 --realm r2 --mode mixed
npm run load -- --players 50 --seconds 60 --realm r1 --mode mixed
npm run load -- --players 100 --seconds 60 --realm r1 --mode mixed
```

Karma senaryoda haritalar, kule, Solo, Sis, ekipman, sohbet ve yardımcı HTTP
okumaları var. Dört kanal ayrı süreç, botlar ayrı süreç, 6.000 arka plan canavarı
kullanılır. Bu bir anonim canlı DB kopyası değildir; pazar/lonca yazma trafiğinin
bütün olasılıklarını temsil etmez. Canlı loglardan gerçek oran çıkarılmış değildir.
Yeni karşılaştırmalarda aynı donanım/kota, veri, senaryo ve en az üç tekrar kullan.

**R110 (canlıya kurulmadı).** Bu dalda iki gecikme düzeltmesi, ek testler ve
R109 kurulu sunucu için kurulum paketi `project/r110_takilma/delivery/r110-takilma.zip`
var (adımlar: `project/r110_takilma/KURULUM.md`). Rapor ve ölçümler
`measurements/r110-aday/RAPOR.md`. Ek kontroller (`test:r110` kurucuyu ve
kurduğu ağacı doğrular):

```bash
npm run test:handoff
npm run test:r110
BROWSER_WS_TRANSPORT=handoff R102_TEST_REALM=r1 TOWER=1 PREVIEW_NAME=r110-pc npm run test:browser
```

`npm run verify` yalnız R109 tabanını doğrular; bu dalda değişen 10 runtime
dosyasını ve çekirdek kimliğini bilerek "farklı" listeler.

Ham canlı profili yeniden analiz etmek için:

```bash
python3 scripts/analyze-profile.py measurements/live-r109/six-players-60s.cpuprofile.json /tmp/r109-analysis.json --label R109-six-players
```

## Nerede ne var?

| Dizin | İçerik |
|---|---|
| `project/r109_latency_completion/working/core511-source/scripts/core511` | Oyun motoru, kanallar, savaş, kule/zindan, SQL, ödül, oturum, client transport ve 311 test/fikstür dosyası |
| `.../scripts/delivery511` | Servis başlangıcı, realm bağlama, HTTP, paketleme yardımcıları |
| `.../working/native510-bb3a6cc689c6` | Native sunucu, realtime, ortak TypeScript kuralları, migration/şema, özgün bağımlılık kilidi |
| `.../working/http-runtime` ve `accounts-runtime` | Güncel oyun/hesap/admin HTTP derlenmiş girişleri |
| `.../core511/generated/client` | Dağıtılmış oyun, giriş, admin ve yan istemci modülleri; eski dosyalar kimlik grafiği için korunur |
| `.../evidence/chat-browser-assets` | Test edilmiş güncel portal/oyun JS/CSS varlık grafiği |
| `.../tests`, `build`, `deployment` | R109 regresyonlar, yük testleri, kurucu ve geri dönüş kodu |
| `.../delivery` | Değiştirilmemiş R109 ZIP, rapor ve CSV |
| `project/r105_*`, `r106_*`, `r104_*`, `r61_*` | Önce/sonra ve kurulum testlerinin sabit tarihsel girdileri |
| `measurements/live-r109` | Kullanıcının 6 oyunculu ham CPU profili, analiz ve ayrı sağlık kaydı |
| `measurements/not-installed` | R110/R111'in canlıya kurulmamış deney raporları |
| `website` | Güncel ana site HTML/JS/CSS, görseller/video ve eski site kaynak referansı |
| `docs` | Mimari, sürüm kimlikleri, açık sorunlar, kaynak biçimi ve test doğrulaması |

R109 asıl kaynak commit'i: `56a17f1cb2ffb432dc3fca9808c03974d11801a7`.
Core kimliği: `1fb1a5cd28cbeec3a0b33bd1a262ecc165e07cf6a239d13f668a8b22f79a91df`.
ZIP SHA256: `1ba96d415891f8d474188edb64331b87b7bc12fdfb54733f49918a906e6ef068`.

## Derleme ve kaynak sınırlaması

Bu, sıfırdan özgün TSX kaynak ağacı olan bir Vite uygulaması değildir. Mevcut
oyun sunucu `.mjs` kaynakları ve dağıtılmış JS paketleri üzerinden geliştirilmiştir.
`working/native.../package.json` tarihsel özgün paket bilgisidir; oradaki eski
`build` komutu bu kopyanın giriş noktası değildir. Yukarıdaki kök komutları kullan.

`build/package.py` sabit R105/R106 kaynaklarını karşılaştıran **tarihsel R109**
üreticisidir. Yeni R109-sonrası yama için kaynak/hedef sözleşmesi, dosya kimlikleri,
asset grafiği ve geri dönüş testleri yeni sürüme uyarlanmalıdır. Mevcut ZIP'in
adı/içeriği değiştirilerek yeni yama yayımlanmaz. `build/client.mjs` ise tarihsel
R105 istemci üretim adımını saklar; R109 sunucu yaması için yeniden çalıştırılmaz.

Orijinal manifestteki bütün eski SSR chunk'ları ve kullanılmayan sanat arşivi
bu çalışma alanında bulunmuyor. Güncel runtime/istemci, test edilen giriş grafiği
ve önbellekte mevcut oyun medyası dahil edildi. Bu bir kod inceleme/geliştirme
checkout'udur; sıfır VDS'ye tek başına tam üretim kurulumu veya canlı DB yedeği değildir.

Canlı oyuncu kayıtları ve anahtarlar yerine sentetik fikstürler kullanılır.
Gizli yapılandırma gerektiğinde aynı şemadan yeni yerel değerler üret; test
anahtarlarını üretimde kullanma. `npm run verify` başlangıç kaynak kimliğini kontrol
eder; kodu bilinçli değiştirdikten sonra kimlik farkı çıkması beklenir.
