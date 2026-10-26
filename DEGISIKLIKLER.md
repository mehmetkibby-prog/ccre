# R62 ödül kurtarma düzeltmesi

Üretim kaynak kimliği: `1f5a1448de970e13651817789e539a063ddc6dc0ce0cd0f21ce487470e83859d`.

R62'ye göre 7 üretim dosyası değişir/yeni eklenir:

| Dosya | Değişiklik |
|---|---|
| reward-recovery-r62.mjs | Yeni anahtar ve sabit sınırlar:16 hedef,45 saniye öncelik. |
| reward-recovery-r52.mjs | Aynı imleç ve SQL filtreleriyle6/16 hedef seçimi. |
| heartbeat-maintenance-reader.mjs | Heartbeat/aktif admission gerektirmeyen kalıcı kayıt taraması; özel katalogların mevcut global yolunu koruyan ayrı seçim. |
| read-worker.mjs | Salt okunur normal recovery sorgusunun yönlendirilmesi. |
| heartbeat-jobs.mjs | Boş heartbeat kuyruğunda da ödül keşfi; erteleme/başarı için sınırlandırılmış tekrar bilgisi; arena tanımlayıcılarının korunması. |
| shared-world-jobs.mjs | Sadece bekleyen ödül işi varsa50/250ms tekrar; ödül ipucunu global world transition olarak çalıştırmama. |
| abandoned-normal.mjs | En fazla16 hedef; gruptaki en eski kayıt45s'yi geçtiğinde mevcut draining freeze; geçiş/epoch/permanent/SQL denetimlerini koruma. |

Yeni anahtar: `CORE511_R62_REWARD_RECOVERY`.

- Kaynak varsayılanı: **0** (yalnız ortam değeri `'1'` ise açık).
- Kurulum ve yeni aday test profili: **1**.
- Kapatınca: R62'nin önceki heartbeat tabanlı,6 hedeflik ve idle denetimli normal recovery davranışı. Önceden kazanılmış ödül/claim geri alınmaz. Kaynak/süreç yeniden başlatma politikası mevcut kurucuyla aynıdır.

Daha önceki R62'nin Azrail sandığı, pazar, envanter, doğrulama, ön kayıt/sandık tanıtımı değişiklikleri aynı pakette korunur. R61→son R62 kurulum paketi23 dosya içerir; tüm metin farkı `R61_R62_TAM.diff`, bu ödül düzeltmesinin farkı `R62_ODUL_DUZELTMESI.diff` içindedir. Dosya SHA listeleri yanındaki JSON'lardadır. Web sitesi paketi ve yerleşikR46salt okunur doğrulayıcı önceki teslimle aynı baytlardır.

Veritabanı şema göçü veya toplu ödeme/işaret silme işlemi yoktur. Ödül native tekil claim kayıtlarıyla mevcut sole writer işlemi içinde üretilir. Yerel test kaynaklarının Node/test fixture/observer değişiklikleri üretim7dosyadan ayrıdır; kaynak paketleri ve her koşunun testFilesSHA256 kaydı bunları açıkça içerir.
