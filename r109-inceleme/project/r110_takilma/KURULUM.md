# R110 takılma düzeltmesi

Kaynak: kurulu **R109_LATENCY2** (R109 ZIP'i ile kurulmuş sunucu). Hedef:
**R110_HANDOFF1**. R109'daki bütün düzeltmeler (R106 captcha dahil) korunur.
Bu paket R105/R106 kurulu sunucuya uygulanmaz; önce R109 gerekir.

Yeni düzeltmeler:
- Oyuncu WebSocket bağlantıları, giriş katmanındaki aynı denetimlerden sonra
  doğrudan ilgili kanal sürecine verilir. Oyuncu trafiği artık kayıtları yazan
  ana süreçten geçmez; ana süreç kısa süre dursa bile kanallar oyunculara mesaj
  göndermeye devam eder. Bilet, Origin, IP, kabul sınırı, oto atak IP kuralı ve
  oyun kuralları aynıdır.
- Ana süreçte her çağrıda yeniden derlenen SQL sorguları önbellekten kullanılır
  (40 oyuncuda dakikada 12.902 → 5.248 derleme). Sorgular ve sonuçları aynıdır.
- Sağlık yanıtına R110 işareti eklenir: `realtimeHandoff: R110_HANDOFF1`.

Paket her iki sunucu içindir. Bakım ve Akademi açılış ayarları korunur.
Yalnız değişen 12 kod dosyası ve kurulum kimlik dosyası yedeklenir; tek
doğrulanmış önceki kod yedeği tutulur. Tam veritabanı taraması, sıkıştırma,
şema/veri geçişi yapılmaz. İki sunucu, sekiz kanal ve hesap servisi hazır
olmadan kurulum başarılı sayılmaz; açılış denetimi başarısız olursa R109 kodu
otomatik geri yüklenir, oyuncu verisi geri alınmaz.

Ölçümler ve sınırları PERFORMANS_RAPORU.md içindedir. Yerel sunucu testleri
canlı VDS'nin ağı, host CPU çalması veya oyuncunun cihazındaki FPS için garanti
oluşturmaz.

ZIP'i VDS'de `/root/r110-takilma.zip` olarak koyun ve kimliğini doğrulayın
(beklenen değer `r110-takilma.zip.sha256` dosyasındadır):

```bash
sha256sum /root/r110-takilma.zip
```

Ön kontrol (kurulum yapmaz):

```bash
python3 /root/r110-takilma.zip --check
```

Admin panelindeki bakım geri sayımı tamamlandıktan sonra:

```bash
python3 /root/r110-takilma.zip --apply
```

Başarı mesajı: R110 TAKILMA DÜZELTMESİ TAMAMLANDI.

Gerekirse R109'a dönüş (bakım açıkken):

```bash
python3 /root/r110-takilma.zip --rollback
```

Bu belge canlıya kurulum yapıldığı anlamına gelmez.
