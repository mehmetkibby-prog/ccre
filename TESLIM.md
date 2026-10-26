# R62 — Kalıcı ödül kurtarma teslimi

Üç arızalı ve iki düz koşunun tamamında istenen kabul sağlandı:120s sonrasında yarım ödül0,çift anahtar0,CHILD_EXIT0; üç arızalı koşuda24/24yeniden giriş+hareket. Aynı son üretim kaynağı kullanıldı. Kaynak/kurulum ve ham kanıtlar aşağıdadır. Canlı VDS'ye kurulmadı; Claude incelemesi için hazırlandı.

Üretim `sourceCore`: `1f5a1448de970e13651817789e539a063ddc6dc0ce0cd0f21ce487470e83859d`.

| Son aday koşusu | t=0 | +30s | +60s | +120s |
|---|---:|---:|---:|---:|
| accept-crash-1 | 564 | 215 | 0 | 0 |
| accept-crash-2 | 951 | 791 | 106 | 0 |
| accept-crash-3 | 527 | 476 | 0 | 0 |
| accept-plain-1 | 1020 | 879 | 238 | 0 |
| accept-plain-2 | 1043 | 1201 | 546 | 0 |

Bu komut 80 oyuncu / 4.800 canavar arıza yüküdür. Ayrı normal 100 oyuncu / 240 canavar / 60 saniye ölçümleri:

| Kontrol | Ölüm + tüm ödüller p95 | Örnek sayısı |
|---|---:|---:|
| accept-matrix-1 | 865.0 ms | 46 |
| accept-matrix-2 | 321.6 ms | 43 |
| baseline-R62-matrix | 286.5 ms | 46 |

İlk 865 ms sonucunu sonraki iyi koşuyla değiştirmedik. Bu ölçümlerden 100 oyuncuda sürekli 520 ms altında kalma garantisi çıkarılamaz. Ödül kurtarmanın beş kabul koşusu tamamlandı; gecikme değişkenliği ayrıca raporlandı. Ayrıntılı p50/p95/p99 ve ham istek/yanıt sayıları rapordadır.

Arızalı koşuların eski kapalı soketlerinde cevaplanmamış istekler korunmuştur; bir koşuda yeniden giriş denemesi `permanent_actor_fenced` ile geçici reddedilip sonraki deneme başarılı oldu. Bu yüzden eski runner ek denetimlerde FAIL yazabilir. İstenen kabul ve bu ek bulgular ayrı gösterilir; hamFAIL sonuçları değiştirilmedi. İlk düz denemenin gözlemci çıktı sınırı hatası da ayrı, geçersiz koşu olarak arşivlendi.

| Dosya | İçerik |
|---|---|
| [CORE511_R62.zip](https://github.com/mehmetkibby-prog/ccre/blob/r62-reward-recovery/CORE511_R62.zip) | R61 üzerine R62+ödül düzeltmesi, site ve yerleşikR46kanıtı |
| [CORE511_R62_KAYNAK.zip](https://github.com/mehmetkibby-prog/ccre/blob/r62-reward-recovery/CORE511_R62_KAYNAK.zip) | Yeni tam mevcut kaynak, Node, bağımlılıklar, fixture ve tekrar üretim sürücüsü |
| [CORE511_R61_KAYNAK.zip](https://github.com/mehmetkibby-prog/ccre/blob/r62-reward-recovery/CORE511_R61_KAYNAK.zip) | GerçekR61karşılaştırma kaynağı |
| [CORE511_R56_KAYNAK.zip](https://github.com/mehmetkibby-prog/ccre/blob/r62-reward-recovery/CORE511_R56_KAYNAK.zip) | GerçekR56karşılaştırma kaynağı |
| [CORE511_R62_BASE_KAYNAK.zip](https://github.com/mehmetkibby-prog/ccre/blob/r62-reward-recovery/CORE511_R62_BASE_KAYNAK.zip) | Düzeltme öncesi gerçekR62kaynağı |
| [TEST_SONUCLARI.md](https://github.com/mehmetkibby-prog/ccre/blob/r62-reward-recovery/TEST_SONUCLARI.md) | Karşılaştırma, kök neden, kabul ve ek hata ayrıntıları |
| [KOMUTLAR.md](https://github.com/mehmetkibby-prog/ccre/blob/r62-reward-recovery/KOMUTLAR.md) | Birebir komut üretimi, profiller ve kaynak kimlikleri |
| [DEGISIKLIKLER.md](https://github.com/mehmetkibby-prog/ccre/blob/r62-reward-recovery/DEGISIKLIKLER.md) | Dosyalar, bayraklar, kaynak/kurulum varsayılanları |
| [KURULUM.md](https://github.com/mehmetkibby-prog/ccre/blob/r62-reward-recovery/KURULUM.md) | Kontrol, kurulum ve geri alma komutları |
| [KALICI_MAKBUZ_SINIFLANDIRMA.json](https://github.com/mehmetkibby-prog/ccre/blob/r62-reward-recovery/KALICI_MAKBUZ_SINIFLANDIRMA.json) | Kalan her ölümün kalıcı makbuza eşleşmesi |

`KANIT_*.zip` dosyaları her koşunun ham sonucu,120s anlık görüntüleri, işlem izleri, komutu, kaynak doğrulaması ve SQLite kopyasını içerir. Bunlar sentetik test verileridir; canlı oyuncuDBsi yoktur. Her ZIP için.sha256dosyası vardır. CSVler ölüm×ödenmemiş alıcı satırlarıdır. KaynakZIPlerinde bulunmayan eski üretim medyası/build dosyaları NATIVE_EXPORT.json içinde açıkça listelidir; yük testi bağımsız çalışır, sıfırdan canlı oyun kurulum arşivi olduğu iddia edilmez.

Önceki teslim değiştirilmedi: [r62-claude-handoff ](https://github.com/mehmetkibby-prog/ccre/tree/r62-claude-handoff). Yeni teslim ayrı daldadır; depo görünürlüğü ve main değiştirilmez. Özel depoda dosyaları açmak için yetkili GitHub hesabıyla giriş gerekebilir.
