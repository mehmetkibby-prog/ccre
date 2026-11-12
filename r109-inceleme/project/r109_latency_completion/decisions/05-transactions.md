# 5 — Küçük yazmalar zaten gruplu

Canlı etkin R53 yolu en fazla 8 işi ve 8 ms callback bütçesini bir native
BEGIN/COMMIT altında toplar; taban drainWrites ayrıca 3 ms kontrolü kullanır.
Her komut için bağımsız COMMIT varsayımı mevcut kodda doğru değildir.

SAVEPOINT her ödül/komutun hata halinde yalnız kendi yazılarını geri almasını
sağlar. Kaldırılması aynı gruptaki başka oyuncuların yazılarını bozar.
Grup toplama ve fsync öncesi ACK yasağı korundu. sql-timing.test.mjs iki
başarılı iş arasındaki başarısız işi ve gecikmiş disk onayını doğrular.
