# Core of Life R84 — kurulum

Bu paket doğrulanmış **R83_GAMEPLAY** üzerine uygulanır. Kurtarmanın bitişi,
kurtarma sırasında açılan kanalların doğrulanması, kanal listesinin okunması ve
geç tamamlanan oyuncu girişinin ekranda uygulanması için hazırlanmıştır.

## Hazırlık ve kurulum

1. Yönetim panelinden bakım veya ön kayıt durumunu kaydet.
2. Oyuncular ve oyun içindeki yönetici çıktıktan sonra 45 saniye bekle.
3. `CORE511_R84_TOPLU.zip` ve `CORE511_R84_TOPLU.sha256` dosyalarını VDS'nin
   `/root` dizinine yükle.
4. Aşağıdaki bloğu terminalde çalıştır.

```bash
(
  set -euo pipefail
  cd /root
  sha256sum -c CORE511_R84_TOPLU.sha256
  python3 -u /root/CORE511_R84_TOPLU.zip --check
  python3 -u /root/CORE511_R84_TOPLU.zip --apply
)
```

Başarılı kurulum sonunda **R84 TAMAMLANDI** yazmalıdır. Yönetim panelinden
oyunu açıp oyun sayfasını bir kez yenile. Bu yenileme yeni giriş ekranı kodunu
yükler. Sağlık yanıtında `updateVersion: R84_GAMEPLAY` ve dört hazır kanal
bulunmalıdır.

## Kurulumun doğruladığı koşullar

- Kurulu sürümün R83 olması ve tam 1166 satırlı kaynak kimliğinin eşleşmesi.
- Paket ve değişecek dosyaların önceki/sonraki SHA-256 değerleri.
- Mevcut Node 22.23.4, SQLite 3.53.4 ve kayıt işçisi kimliği.
- Bakım/ön kayıt durumunun ve boş oyuncu oturumlarının doğrulanması.
- Kurulum ve günlük yedeklemenin aynı veritabanı için kilitlenmesi.
- SQLite yedekleme API'siyle yedek alınması ve `quick_check` sonucu.
- Ayrı hesap servisi ile oyun veritabanının kimliğinin korunması.
- Yeni tarayıcı dosyasının, değişmeyen eski dosyalarla birlikte hazırlanması.
- Kurulum sonrası sürüm ve dört kanalın hazır olduğunun doğrulanması.

Kurucu oyun durumunu kendiliğinden açık duruma getirmez. Açma işlemi yönetim
panelindedir. Güncelleme veritabanı şeması veya oyuncu verisi değişikliği içermez.

## Yarım kalan kurulum ve geri alma

Bir adım hata verirse terminal çıktısını koru. Yalnız bu R84 kurulumu yarıda
kaldıysa aynı paketle devam et:

```bash
python3 -u /root/CORE511_R84_TOPLU.zip --recover
```

Tamamlanmış R84 kurulumunu R83 koduna geri almak gerektiğinde, yönetim
panelinde bakım/ön kayıt ve boş oyuncu koşullarını sağladıktan sonra:

```bash
python3 -u /root/CORE511_R84_TOPLU.zip --rollback-latest
```

Geri alma eski kodu **güncel veritabanıyla** çalıştırır. Eski veritabanı yedeği
canlı oyuncu ilerlemesinin üzerine yazılmaz. Eski tarayıcı dosyaları korunur.

## Olayın kapsamı

31 Ekim 2026 12:33:36.424 ve 12:33:55.723 UTC kayıtları,
`shared_command_outcome_unknown` nedeniyle ortak dünya kurtarmasının iki kez
başlatıldığını gösterir. Arkasından gelen `global_world_busy`, kurtarma sırasında
girişin korunmasıdır. İlk kayıt işleminin neden doğrulanamadığını gösteren hata
bu filtrelenmiş görüntüde bulunmuyor.

R84, kaynak kodunda yeniden üretilmiş giriş ve kurtarma sorunlarını düzeltir.
Bu kayıtların ilk nedeninin bulunduğu veya bütün lag türlerinin sona erdiği
iddiasını taşımaz. Özgün `core511_fault` kayıtları yaklaşık 12:33:26 ve
12:33:45 UTC civarındadır; bunlar ayrıca incelenmelidir. Test kapsamı ve
sınırlamaları `SONUC.md` ve `evidence/R84_KANIT.json` dosyalarındadır.
