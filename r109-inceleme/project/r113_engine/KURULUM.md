# R113 oyun motoru — kurulum adayı

Bu paket henüz canlıya kurulmadı. Performans kabulü ve kurulum doğrulamaları
tamamlanmadan üretime önerilmez. Kaynak sürüm **R110_HANDOFF1** olmalıdır.
Efsane ve Akademi birlikte güncellenir; dört kanal ve bakım tercihi korunur.

Paketin SHA256 değeri `evidence/package.json` içindedir. Eski ZIP'ler değişmez.
Root terminalinde önce dosya kimliğini doğrula, sonra:

```sh
python3 /root/r113-motor.zip --check
```

Ön kontrol geçince ana panelden bakımı başlat ve geri sayımın bitmesini bekle:

```sh
python3 /root/r113-motor.zip --apply
python3 /root/r113-motor.zip --status
```

Yalnız değişen kod ve iki türetilmiş tablo tutarlı, hash ve SQLite bütünlük
kontrolüyle yedeklenir. Oyuncu veritabanının tamamı taranmaz/sıkıştırılmaz.
Ödül, eşya, ÇP veya sahiplik kayıtları eski bir yedekle değiştirilmez.

Yarım kurulumda aynı paketle `--recover`; tamamlanan kurulumu geri almak için
bakımdayken `--rollback` kullanılır. Geri dönüş R110 kodunu geri getirir,
uyumlu iki türetilmiş tabloyu korur. Oyuncunun son ilerlemesini geri almaz.
Her iki sunucu ve sekiz kanal doğrulanmadan eski kod yedeği temizlenmez.

Bu kurucu Dünya Canı, bakım, ön kayıt, kupon, ödül oranı ve otomatik av
kurallarını değiştirmez. Dünya döngüsü sıfırlama düğmesi kullanılmaz.
