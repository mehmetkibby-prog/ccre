# R116 — büyük oyuncu giriş kaydının süreçler arasında aktarılması

Kaynak tam R115_SHARED_SCOPE1, hedef R116_ADMISSION_TRANSFER1. Kaynak ZIP:
`R115_SHARED_SCOPE_a668b021b2e3.zip`, SHA256
`791858ebddc240c5330e663b569982305fb5acb0c8645adde77e86ed1a6603ea`.
Kaynak çekirdek:
`95dd77f5e5a15ceb5d5afa752545a8bd6483ab95bf2fa466265fd294e1eb4039`.

Üç sunucu dosyası değişir: güvenilir süreç aktarımı, yeni parça birleştirme
yardımcısı ve sağlık sürüm işareti. Büyük giriş kaydı sınırlı boyutlu parçalara
ayrılır; alıcı tam kaydı doğrulamadan giriş komutunu çalıştırmaz. Giriş,
sahiplik, makbuz/tek işlem ve kalıcılık kuralları korunur. İstemci, forum,
rün haritaları, oyuncu veritabanı ve şema bu paketin kapsamı dışındadır.

Kurucu iki realm üzerinde aynı kodu kurar; R116 ve önceki sağlık işaretleri,
sekiz kanal ve kaynak kimlikleri doğrulanır. Yalnız değişen kod yedeklenir;
SQLite taraması, sıkıştırma veya oyuncu ilerlemesini geri alma yoktur.
Bakım, Akademi kapalı durumu ve ön kayıt tercihleri korunur. Geri dönüş yeni
yardımcı modülü kaldırır ve tam R115 koduna döner. Başka sürümün yarım kurulum
kaydı bu paketle kurtarılmaz.

Yedek temizliği R115 şablonunun koruyucu sınırını sürdürür: yalnız doğrulanmış,
aynı sürüme ait eski kod günlükleri temizlenebilir. R115 ve daha eski sürümlerin
ayrı kurtarma sözleşmesine bağlı arşivlerine dokunulmaz. Tarihsel ZIP'ler
değişmez; her farklı R116 içeriği ayrı, içerik kimlikli ZIP üretir.

Kurulum: [KURULUM.md](KURULUM.md). Paket üretimi:
`python3 project/r116_admission_transfer/build/package.py`.
Kurucu testi: `python3 project/r116_admission_transfer/tests/installer_test.py`.
Gerçek kurucu çıktısı: `python3 project/r116_admission_transfer/tests/stage-runtime.py`.
Kurulu çıktının gerçek iki realm/sekiz kanal ve WebSocket kontrolü:
`python3 project/r116_admission_transfer/tests/installed-runtime.py`.
Paket ve test sonuçları `evidence/` altında kaydedilir. Sentetik yerel test
canlı VDS kurulumu veya bütün gecikme nedenlerinin çözüldüğü anlamına gelmez.

Kurulum kabulü Node.js 22.23.4 ile geçti: 11 kurucu testi, gerçek runtime üzerinde
3 test; iki realm ve sekiz kanal R116 sağlık işaretini yayımladı. Yeni yardımcı
modülün geri dönüşte kaldırılması, oyuncu ilerlemesinin korunması, bakım/kapalı
ve ön kayıt ayarları, bozuk kaynak/payload reddi ve diğer sürümün yarım işleminin
reddi doğrulandı. Ayrıntı: `evidence/installer-verification.json`.

Kabul tamamlandı: `evidence/verification.json`. Son kaynakla 60 odaklı, 29
native ve 20 CAPTCHA testi geçti. Değiştirilmemiş R110 kurucusunda 16 kurulum
ve 3 çalışma testi; R116 için 31 aktarım, 1 gerçek büyük-veri geri yükleme,
11 kurulum/geri dönüş ve 3 gerçek kurulmuş çalışma testi geçti. İlk yerel
adaydaki komut sıralaması hatası teslimden önce bulundu ve düzeltildi.

Eski gerçek geri yükleme hatası `evidence/restore-before.log`, nihai düzeltme
`evidence/admission-after-final.log` içinde korunur. İlk kopmayı başlatan
daha eski olay bu günlük görüntüsünde bulunmadığından ayrıca istenmiştir.
