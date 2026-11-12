# 2 — Sorguları yeniden hazırlama

Profilde native prepare self yaklaşık515 ms. Bunun yaklaşık138 ms kısmı
AdventureService.award,97 ms kısmı world-jobs.settings çağrı zincirinde.
Bu, tüm önbelleğin bozuk olduğunu göstermez: bu iki yol doğrudan prepare
kullanıyordu. Receipt yolu zaten önbellek kullanıyor ve değiştirilmedi.

Sabit SQL ve bağlı parametreler aynen korunarak kule ödülü/material/gear ayar
sorguları, dünya işi ayarları ve native presence lease sorgusu mevcut bounded
writer statement önbelleğine alındı. İlk kullanımda hazırlanır; şema hazır
olmadan açılışta zorla hazırlama yapılmaz. Sorgu SONUÇLARI önbelleğe alınmaz.
Schema/TEMP/rollback/reentrancy/large binding kontrolleri korunur; writer
scope dışındaki çağrılar önceki ham prepare davranışına döner.
