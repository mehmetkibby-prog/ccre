# 7 — Süreçler arası yanıt kodlama

Her mesaj zaten tek, tam boyutta ve kendisine ait buffer kullanıyordu.
Yazma tamamlanmadan bu buffer'ı başka yanıt için yeniden kullanmak veri bozar;
bu nedenle buffer havuzu eklenmedi. Süreç protokolü değişmedi.

Doğrulanan tekrar: sıkıştırma denemesi JSON'u üretiyor, küçük veya sıkışmayan
mesaj ardından framed içinde aynı JSON'u tekrar üretiyordu. Hazırlanan metin
aynı senkron gönderimde kullanılır; global nesne cache'i yoktur. Boyutu aşan
metin tutulmaz, eski parçalı aktarım/failure/replay sınırları geçerlidir.
Mevcut sıkıştırma eşiği, SHA kontrolü ve decoder aynıdır. Testler Unicode,
bozuk/çok büyük paket, yeniden bağlantı, tek dispatch ve küçük yanıt başına
tek serialization durumlarını doğrular.
