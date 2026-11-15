# R118 kurulumu

Yalnız doğrulanmış R117_HOOK10 üzerine. Efsane ve Akademi birlikte güncellenir.

1. Teslim edilen ZIP'in SHA256 değerini doğrula.
2. `python3 /root/r118.zip --check`
3. Efsane panelinde bakımı başlat ve geri sayımın tamamlanmasını bekle.
4. `python3 /root/r118.zip --apply`
5. İki realm ve sekiz kanal doğrulandıktan sonra Efsane bakımını kaldır.
   Akademi kapalı/ön kayıt ayarı korunur.

Kesinti olursa aynı paketle `--status`; bekleyen R118 işlemi varsa `--recover`.
Başka sürümün yarım işlemi kendi paketiyle kurtarılır. `--check` kurulumu
uygulamaz; şema geçişi bakım altında, tutarlı kapsam yedeğinden sonra yapılır.

Yeni içerik kullanılmamışsa bakımda `--rollback` önceki kodu ve ilgili şemayı
geri getirir; eski oyuncu ilerlemesi silinmez. Kraliyet eşyası/malzemesi veya
yeni harita ilerlemesi oluştuktan sonra geri dönüş engellenir. Bu durumda
R118 kayıtlarını koruyan ileri kurtarma gerekir; veritabanını elle silme veya
eski yedeği oyuncu verisinin üzerine kopyalama.
