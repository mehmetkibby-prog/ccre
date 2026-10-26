# R61 — Sesler, kale girişi ve performans düzeltmeleri birlikte

Bu yönerge, doğrulanmış **CORE511_R61_AUDIO.zip** güncellemesi içindir.
Yalnız final ZIP'i kullan; TEST adlı ZIP kurulum için değildir.
Birleşik paket doğrudan doğrulanmış **R60** üzerine kurulur. Önceki R61 ses
paketini ayrıca kurmak gerekmez. Site/ön kayıt güncellemesi ayrıdır.

1. Admin panelinden oyunu bakım durumuna al; oyuncular çıktıktan sonra yaklaşık
   45 saniye bekle. Kurulum admin bağlantısının da boşaltılmasını isteyebilir.
2. Son doğrulanmış ZIP'i VDS'ye `/root/CORE511_R61_AUDIO.zip` olarak yükle.
3. VDS terminalinde root olarak kontrolü ve kurulumu sırayla çalıştır:

```bash
python3 /root/CORE511_R61_AUDIO.zip --check && \
python3 /root/CORE511_R61_AUDIO.zip --apply && \
python3 /root/CORE511_R61_AUDIO.zip --flags
```

Kurucu R60 kaynaklarını, mevcut istemci dosyalarını ve kurulu Node yolunu
SHA-256/kaynak kimliğiyle doğrular. Kurulumun kullandığı orijinal R46 kanıt
arşivi erişilebilir olmalıdır. Farklı taban veya değiştirilmiş dosyada durur.
Güncel SQLite veritabanının geçici yedeğini ve bütünlük kontrolünü alır; kurulum
hatasında önceki dosyalara döner. Günlük yedekleri korur. Oyunu otomatik açmaz.

İlk mücadeledeki derleme maliyetini azaltan `--no-lazy` ayarı için yalnız oyun
servisine `91-core511-r61-eager.conf` eklenir. Mevcut sahipliği doğrulanmış
`90-core511.conf`, accounts servis dosyaları ve diğer başlatma ayarları korunur.
Özel ExecStart argümanı/öneki, bekleyen unit değişikliği veya sahiplik uyuşmazlığı
varsa kurucu bunu sessizce silmez; kontrollü biçimde durur. Böyle bir hata
çıktısını paylaş; servis dosyalarını elle değiştirme.

Kurulum sonrası oyun sayfasını yeniden açıp yakın oyuncunun vuruş/beceri sesini
ve **Işınlanma → PvP → Lonca Kalesi Adası** girişini kontrol et. Kale için
pazarda bulunmak gerekmez; lonca üyeliği ve mevcut savaş/arena/zindan kilitleri
geçerlidir. Kontrolden sonra oyunu admin panelinden aç.

## Anahtarlar ve geri alma

Mevcut anahtarları `--flags` gösterir. Bakımdayken gerekirse tek özelliği kapat:

```bash
python3 /root/CORE511_R61_AUDIO.zip --set-flag CORE511_R61_REMOTE_AUDIO=0
python3 /root/CORE511_R61_AUDIO.zip --set-flag CORE511_R61_CASTLE_TRAVEL=0
```

Başlangıç derlemesini ve SQL havuzunu birlikte kapatmak gerekirse:

```bash
python3 /root/CORE511_R61_AUDIO.zip \
  --set-flag CORE511_R61_EAGER_REWARD=0 \
  --set-flag CORE511_R61_EAGER_CHANNELS=0 \
  --set-flag CORE511_R61_STATEMENT_BOOT=0
```

Anahtar değişikliği bakımda servisleri yeniden başlatır. EAGER_REWARD kapalıyken
kurucunun drop-in'i ExecStart'ı değiştirmez; başarısız başlatmada önceki ayarlar
geri gelir. Diğer performans anahtarlarının bağımlılıklarını rastgele değiştirme.

Tam güncellemeyi geri almak için:

```bash
python3 /root/CORE511_R61_AUDIO.zip --rollback-latest
```

Geri alma önceki kodu/ayarları ve kurucuya ait servis değişikliğini geri yükler;
`daemon-reload` çalıştırır. **Güncel veritabanını ve yeni kazanımları korur**;
eski DB yedeğini oyuncuların yeni ilerlemesinin üstüne yazmaz. R60 binek
malzemeleri, envanter ve kale hakları dönüştürülmez. Bu çalışma sırasında
canlı VDS'ye kurulum yapılmamıştır.
