# 4 — Presence bellekte, gerekli doğrulamalar korunuyor

ResidentPresence.seen ve WriterPresence.receive zaten sadece RAM kullanır;
ping başına SQLite transaction açılmaz. Kirli last_seen kayıtları mevcut
zorunlu oyun transaction'ı içinde, online uygunluk sorgularından önce yazılır.
Başarılı fsync sonrasında eski ACK yeni ping'i silmeyecek biçimde temizlenir.

Bu doğrulamayı körlemesine 30 saniye geciktirmek online ödül/katılım hesabını
ve oturum sahipliği kontrolünü değiştirebilir. Portalın 10 saniyelik farklı
game_presence lease yenilemesi de güvenlik/tek pencere davranışıdır. Bunlar
kaldırılmadı. Sabit lease sorgusunun tekrar hazırlanması 2. maddede azaltıldı.
Yerel ping/owner değişimi/rollback testleriyle mevcut davranış korunur.
