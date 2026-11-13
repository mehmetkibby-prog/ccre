# R113 oyun motoru — kurulum adayı

Bu paket henüz canlıya kurulmadı. Kaynak sürüm **R110_HANDOFF1** olmalıdır.
Efsane ve Akademi birlikte güncellenir; dört kanal ve bakım tercihi korunur.

Son kaynak kod, 50 sentetik oyuncuyla üç karma ve üç ortak boss koşusunda
oyun işlemlerini hatasız tamamladı. Üç karma koşuda döngü p99 hedefi 30 ms'nin
altında kaldı; 50 ms üzeri duraklamayı dakikada en fazla bir kez görme hedefi
tüm koşularda sağlanmadı. Bu bir kontrollü kurulum adayıdır; sıfır takılma veya
canlı kapasite garantisi verilmez. Test ortamı dört CPU kotasına sahipti ve
canlı oyuncu veritabanını içermiyordu. Akademi'nin mevcut 40 kişilik giriş
sınırı test amacıyla kaldırılmadı; 50 kişilik yük Efsane'de sınandı.

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
