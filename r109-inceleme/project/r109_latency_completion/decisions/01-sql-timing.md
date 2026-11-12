# 1 — SQL ölçüm maliyeti

61 saniyelik kullanıcı profilinde statement wrapper self süresi yaklaşık543 ms.
Bu, sorgu sürelerinin toplamından büyük değil; yine de normal oyunda gereksiz
çağrı ve hazırlanırken üç closure maliyeti var. R78 zaten etiketleri erteliyor
ve detay tüketmeyen scope'ları atlıyor, fakat tüm SQL metodlarını hâlâ sarıyor.

R105 normal bağlantıda detay sarmalayıcılarını kurmaz. Sorgu/parametre/hata,
transaction, savepoint, COMMIT ve WAL fsync değişmez. Kuyruk/job/commit/durable
süreleri ve CPU profili korunur. Ayrıntılı SQL tanılaması, bağlantı açılmadan
CORE511_SQL_TIMING_R105=1 veya testte enabled:true ile açıkça etkinleştirilebilir.
Kapalıyken sonuçta sqlTimingModeR105=disabled belirtilir; sahte sıfır ölçüm yok.

Yerel native SQLite regresyonu kapalı modun ham metodları değiştirmediğini,
açık tanılamanın eski sayımları koruduğunu ve rollback/durable ACK'ı kontrol eder.
