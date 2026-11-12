# Claude için başlangıç

Kullanıcı oyundaki donma/gecikme sorunlarını bulup düzeltmeni istiyor. Başlangıç
**R109_LATENCY2**, kod `r109-inceleme/project/r109_latency_completion/working`.
Diğer `project/r*` dizinleri eski karşılaştırma/kurulum girdileridir; onları güncel
oyun sanma. R110/R111 denemeleri uygulanmış sürüm değildir.

Önce `r109-inceleme/README.md`, `docs/ARCHITECTURE.md`, `docs/KNOWN_ISSUES.md`
ve `measurements/live-r109/RAPOR.md` dosyalarını oku. Kurulum için README'deki
Node 22.23.4 ve `npm ci` / `npm run setup` adımlarını uygula. Sonra testleri çalıştır.
Klasördeki eski WORK_STATE raporlarının tarihe bağlı canlı durum cümlelerinin
yerine bu güncel giriş belgesini esas al.

## İşin amacı ve sınırları

- Normal haritalar, Kadim Kule, Solo Zindan, Sis Yarığı ve ortak boss dahil,
  30–40 gerçekçi oyuncuda takılmayı azalt; 10/50/100 testlerini ayrıca ölç.
  Kullanıcı 200 kişilik test istemedi. Sentetik testi canlı kapasite garantisi sayma.
- Efsane/r1 ve Akademi/r2 aynı oyun düzeltmesini almalı. Dört kanal korunmalı.
  Mevcut test sınırı r1: 4×25, r2: 4×10. Test için giriş sınırını devre dışı bırakma.
- Oyun davranışı, kayıt biçimi, RNG/seed, ödül/ÇP/eşya sahipliği ve tek seferlik
  işlem garantileri korunmalı. İstemci tahmini kalıcı ödül onayı değildir.
- SQLite commit/kalıcılık, makbuz/idempotency, epoch/sahiplik, güvenlik veya
  işlem korumalarını sırf profilde pahalı göründüğü için kaldırma.
- Ayrı tarayıcılarla kule, kat geçişi, bağlantı kopma/yenileme ve tekrar giriş
  senaryolarını test et. Oto atak IP kuralıyla çoklu normal hesap girişini karıştırma.
- Her bağımsız değişikliği ayrı commit'le. Aynı koşullardaki önce/sonra ölçümü,
  regresyon testleri ve olumsuz sonuçları raporla. Tick, event-loop, komut yanıtı,
  CPU, RSS, GC, host steal/kotalama birbirinden farklı ölçülerdir.
- Son canlı profil 6 oyunculu, 60.433 saniyedir. Harita ve hangi realm olduğu
  kullanıcı tarafından ayrıca belirtilmedi. Örneklenmiş CPU'yu oyuncu sayısına
  bölüp kapasite tahmini yapma; CPU örnekleri kesin tick/donma sayacı değildir.
- Yeni kurucu üretirsen `docs/GUNCELLEME_KURALLARI.md` uygulanmalı. Eski ZIP'leri
  veya SHA256 kimliklerini değiştirme. Mevcut R109 ZIP'i sadece R105/R106'dan
  güncelleme içindir; R109 kurulu sunucuya tekrar uygulanmaz.

## Kaynak biçimi

Sunucu mantığı düzenlenebilir `.mjs` dosyalarında; ortak kuralların özgün `.ts`
dosyaları da var. Ana oyun/admin/portal UI, bu projede dağıtılmış ve üzerine
yamalar uygulanmış JavaScript paketleriyle tutuluyor. Eski özgün `app/` ve
`components/` TSX projesi bu çalışma alanında yok. Mevcut paketleri, kaynak
modüllerini, üretim/yama betiklerini ve doğrulama kayıtlarını kullan. Sıradan
`npm run build` ile sıfırdan Vite projesi varmış gibi davranma. Bu sınırlama
performans motoru, protokol, SQL ve mevcut istemci kodunu incelemeye engel değildir.

İlk adımın yeni bir sürüm yayımlamak değil, mevcut kod ve ölçümler üzerinde
yeniden üretilebilir bir bulgu çıkarmak olmalı. Canlı erişim bilgileri bu repoda yok.
