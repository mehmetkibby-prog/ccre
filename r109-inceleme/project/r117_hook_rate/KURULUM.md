# R117 — Azrail Kancası %10

Yalnız tam R116_ADMISSION_TRANSFER1 üzerine. Efsane ve Akademi birlikte
güncellenir. Kanca olasılığı %10, miktarı 1 olur. Diğer ödüller, oyuncu
ilerlemesi, veritabanı ve şema değişmez.

1. Teslim edilen ZIP'in SHA256 değerini doğrulayın.
2. `python3 /root/r117.zip --check`
3. Efsane panelinde bakımı başlatıp geri sayımı tamamlayın.
4. `python3 /root/r117.zip --apply`
5. İki realm ve sekiz kanal doğrulandıktan sonra Efsane bakımını kaldırın.
   Akademi kapalı/ön kayıt ayarı korunur.

Kesinti: aynı ZIP ile `--status`; gerçekten bekleyen R117 işlemi varsa
`--recover`. Başka sürümün yarım işlemi kendi paketiyle kurtarılır.
Tamamlanmış kurulumdan geri dönüş: bakımda aynı ZIP ile `--rollback`.
Oyuncu ilerlemesi geri alınmaz; önceki %6 kuralı ve arayüzü geri gelir.
