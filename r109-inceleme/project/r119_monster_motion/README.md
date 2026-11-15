# R119 — Şampiyonlar Diyarı canavar animasyonları

Kullanıcı yeni haritadaki canavarların Kuzey Ormanı ile aynı animasyon sistemini
kullanmasını istedi. Dört canavarın mevcut görselleri korunarak doğrudan Kuzey
Ormanı'nın `Zy` / `Ud` çizicisine bağlandı. Ayrı animasyon zamanlayıcısı kaldırıldı:
dururken ilk kare sabit, yürüyüş mesafesi başına 19 birimde bir kare, saldırı
ilerlemesine bağlı beş kare ve yataya yakın yön değişim eşiği artık ortaktır.
Gölge, seçim, darbe efekti, isim ve can çubuğu da aynı çiziciden gelir.
Ölüm davranışı mevcut ortak akışta kalır; yeni ölüm karesi üretilmedi.

## Dağıtım sınırı

- Kaynak: tam `R118_ROYAL1`, düzeltilmiş değişmez R118 arşivi
  `R118_ROYAL_61ba37784ffb.zip` (SHA256: `8a41b77d3cc136729468f0951ce651da56a01d8b71852b730de8e7f26c3c78e5`).
- Hedef: `R119_MOTION1`. Yalnız beş istemci/kaynak/varlık kaydı dosyası değişir.
- Yeni resim, sunucu savaş kuralı, düşüş/hasar, SQL veya şema değişikliği yoktur.
- Oyun sağlık uç noktası sunucu mantığı değişmediği için R118 işaretini korur;
  kurulum kaydı ve yeni hash'li oyun/portal dosyaları R119'u belirler.
- Her iki realm birlikte güncellenir. Akademi erişim ve bakım ayarı korunur.
- Eski R118 şema kurtarma arşivleri korunur. R119 geri dönüşü yalnız önceki
  kodu döndürür; oyuncu ilerlemesini veya Kraliyet verilerini geri almaz.
- Son ZIP ve SHA256: `evidence/package.json`. Kurulum: `KURULUM.md`.

## Doğrulama

- Üç animasyon testi: eski orman için 3.024 çizim durumu işlem işlem aynı;
  bekleme/yürüme/saldırı kare seçimi ve dört yeni türün ortak çiziciye geçişi.
- Altı kurulum testi: gerçek R118 kurulumu üzerine R119, geri dönüş, sağlık
  hatası geri dönüşü, değişmiş kaynak reddi, önceki yerel test dosyası hatasının
  dışlanması, sekiz kanal ve Kraliyet hazırlık zorunluluğu.
- Efsane masaüstü ve Akademi mobil: gerçek derlenmiş oyun, yerel native HTTP,
  SQLite, dört kanal ve WebSocket devretme; dört tür çizimi, bekleme karesi,
  canavara yaklaşma/saldırı ve Kuzey Ormanı'na dönüş. Tarayıcı hatası,
  eksik varlık veya native fault görülmedi.
- ZIP'in kurduğu ayrı dizinden iki realm/sekiz gerçek kanal açılışı; başarılı
  hazırlık ve temiz kapanış. Yalnız kendi sentetik verileri kullanılır.

Bunlar yerel işlev doğrulamasıdır; canlı kurulum veya kalabalık performans
ölçümü değildir. Masaüstü testinin ilk komutu runner'ın çalışma dizini yüzünden
test dosyasını bulamadı; mutlak test yolu kullanılarak düzeltildi. İlk çıktı
`evidence/browser-desktop-initial-path.log` içinde korunur.

## Yeniden üretme

Repo Node 22.23.4 kurulumu ve `npm ci` / `npm run setup` sonrası:

```bash
node build/client.mjs
python3 build/package.py
node --test tests/motion.test.mjs
python3 tests/installer_test.py
python3 tests/stage-runtime.py
```

Yerel native tarayıcı betiğini `r109-inceleme/scripts/run.py` ile **mutlak dosya
yolundan** çağır. `R102_TEST_REALM=r1 MODE=desktop` ve `r2 MODE=mobile`,
`BROWSER_WS_TRANSPORT=handoff`; varlık önbelleği için mevcut
`../r118_royal_champions/tests/stage-browser.mjs` betiğini ve `AUDIT_ASSETS`
değişkenini kullan. Sonuçlar bu projenin `evidence` dizinine yazılır.

Ayrı kurulum açılış testinde mevcut R118 `tests/relocated-entry.test.mjs` dosyası
`--test-name-pattern='exact installed server'` ile kullanılır;
`RUNTIME_STAGE_FILE`, `RUNTIME_EVIDENCE_DIR`, `RUNTIME_LABEL=relocated-r119`
bu projenin yollarını belirtmelidir. R110–R115 beklenti bayrakları açıktır.

Paket oluşturucu önceki arşivi değiştirmez; aynı girdiler aynı yeni ZIP'i üretir.
`R119_MOTION_c5d883b9c260.zip` ilk yayımlanmamış adaydır; teslim edilmez.
