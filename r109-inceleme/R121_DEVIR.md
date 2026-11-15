# R121 — temizlik hatasının bütün kanalları kapatmasını sınırlama

15 Kasım 2026 olayı: canlı kayıtta `cleanup_execute` / `ipc_handler_failed`
sonrası dünya ve dört kanalın yeniden başlatıldığı görüldü. Önceki kayıt SQL
istisnasının sayısal kodunu saklamadığı için ilk SQL hatasının türü kanıtlanmadı.
Kullanıcının r1 servisini yeniden başlatmasından sonra dış sağlık kontrolü
HTTP 200 ve dört hazır kanal gösterdi. Canlıya R121 kurulduğu iddia edilmez.

Aktif kod `project/r109_latency_completion/working`, aday `R121_CLEANUP1`.
Yalnız beş runtime dosyası değişir. Ayrı commit'ler SQL hata kodunun güvenli
kaydı ve temizlik işleminin dar kapsamlı geri alma yoludur.

- Sadece aynı SQLite bağlantısında yakalanmış, geri alınabilir SQL hatası
  kabul edilir. SAVEPOINT geri alması ve RELEASE tamamlanmalıdır.
- Negatif sonuç mevcut SystemWriter makbuzuna yazılır; COMMIT/fsync bitmeden
  ACK veya kanal kilidi bırakılmaz. Eski satırlar ve sahiplikler korunur.
- Başarısız tablo 60 saniye ertelenir. Diğer temizlik tabloları devam eder.
- Sahiplik hatası, sahte SQL hatası, disk/bozulma hatası, başarısız ROLLBACK,
  belirsiz COMMIT/fsync veya kayıp ACK normal fail-closed kurtarmaya gider.
- Yeni kayıt SQL metni, hata mesajı veya oyuncu verisi içermez; sayısal kod,
  sorgu özeti ve temizlenmiş dosya/satır konumları vardır.

`project/r121_cleanup_isolation/tests` altındaki testler runtime kimliğinin
dışındadır. Gerçek SQLite, dört kanal, dünya süreci ve WebSocket testinde
önceki handler aynı enjekte edilen SQL hatasında bütün sahipleri kapatır;
yeni handler bağlantıyı ve PID'leri korur. Kayıp ACK için kurtarma korunur.

Kurucu R118_ROYAL1, R119_MOTION1 ve R120_2D_DEPOT1–4 kaynaklarının tam
dosya kimliklerini denetler. Kurulu istemci sürümünü korur. Veri/şema, DNS,
TLS, Caddy, hesap ve realtime kodu değişmez. Yalnız r1/r2 oyun servislerini
yeniden başlatır. Kullanıcı ana panelden bakımın 10 saniyelik geri sayımını
tamamlayarak `--check`, `--apply` çalıştırır; sonra panelden oyunu açar.

Arşiv ve SHA için `project/r121_cleanup_isolation/evidence/package.json`,
test sonuçları ve ilk başarısız denemeler için aynı yerde `validation.json`
esas alınmalı. Eski ZIP'ler ve SHA değerleri değiştirilmez. Bu çalışma yük
testi veya bütün olası donmalar için sıfır hata garantisi değildir.
