# 3 — Şema kontrolleri korunuyor

LocalDatabase başka bağlantılarla aynı SQLite dosyasını paylaşır. Ana/TEMP
şema değişimi, rollback ve prepared statement sonuç sütunu eşlemesi için
kontrol gereklidir. preparedSchemaVersions477 zaten BEGIN IMMEDIATE kilidi
altında aynı işlemdeki şema sürümünü yeniden kullanır; her sorguda yeni
şema taraması yoktur. DDL veya rollback bu güvenli kopyayı geçersiz kılar.

Kontrolü yalnız başlangıca almak eski sütun eşlemeleri/izin korumalarıyla
devam etme riski getirir. Bu öneri uygulanmadı; davranış korundu. Mevcut
writer-statements ve native prepared cache testleri çalıştırılacak.
