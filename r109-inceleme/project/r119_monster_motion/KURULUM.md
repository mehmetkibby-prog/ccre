# R119 Şampiyonlar Diyarı animasyonları

Yalnız tam R118_ROYAL1 üzerine, Efsane ve Akademi birlikte.

1. ZIP SHA256 değerini doğrula.
2. `python3 /root/r119-animasyon.zip --check`
3. Efsane panelinden bakımı başlat; geri sayımı bekle.
4. `python3 /root/r119-animasyon.zip --apply`
5. R119 TAMAMLANDI mesajından sonra Efsane bakımını kaldır. Akademi ayarı korunur.

Yalnız istemci animasyonu ve değişmez istemci dosyaları değişir. Yeni tablo,
veri dönüşümü, hasar/ödül/düşüş değişikliği yok. Yerel perf-r11 test dosyaları
dağıtılmaz. Eski R118 ZIP'leri değiştirilmez. Oyuncu veritabanı kopyalanmaz
ve taranmaz; değişen kodların tek önceki sürüm yedeği tutulur. R118'in şema
kurtarma kayıtları korunur.

Kesintide aynı ZIP ile --status; bekleyen R119 varsa --recover. Bakımda
--rollback önceki R118 koduna döner; Kraliyet verilerini ve şemasını silmez.
