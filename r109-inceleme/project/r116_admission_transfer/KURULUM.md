# R116 — oyuncu giriş aktarımı onarımı

Yalnız tam R115_SHARED_SCOPE1 üzerine. Efsane ve Akademi birlikte güncellenir.
Oyuncu veritabanı, şema, forum, istemci ve ödül kuralları değişmez.

1. ZIP'in SHA256 değerini teslim edilen değerle doğrulayın.
2. `python3 /root/r116.zip --check`
3. Efsane panelinde bakımı başlatıp geri sayımı tamamlayın.
4. `python3 /root/r116.zip --apply`
5. İki realm ve sekiz kanal doğrulandıktan sonra panelden Efsane bakımını kaldırın.
   Akademi kapalı/ön kayıt ayarı korunur.

Kesilen kurulum: aynı ZIP ile `--status`; gerçekten bekleyen R116 işlemi
varsa aynı ZIP ile `--recover`. Başka sürümün yarım işlemi kendi paketiyle
kurtarılmalıdır. Tamamlanmış R116 kurulumundan önceki koda dönüş için bakımda
aynı ZIP ile `--rollback` kullanılır. Oyuncu ilerlemesi geri alınmaz; R115'in
büyük giriş kaydı sorunu geri gelir. Tamamlanan kuruluma `--recover` uygulanmaz.
