R111_COMBAT1 yalnız kurulu R110_HANDOFF1 üzerine uygulanır. Efsane ve Akademi birlikte güncellenir.

Ön kontrolü çalıştırın. Başarılıysa Efsane yönetim panelinden bakımı başlatıp 10 saniyelik geri sayımın tamamlanmasını bekleyin; ardından kurulumu uygulayın. Mevcut bakım ve Akademi ön kayıt ayarları korunur.

```bash
python3 /root/r111-savas.zip --check
python3 /root/r111-savas.zip --apply
```

Ön kontrol başarılı olmadan --apply çalıştırmayın. Kurulum yalnız değişen kodu yedekler; oyuncu veritabanını taramaz veya değiştirmez. İki sunucu ve sekiz kanal hazır olmadan başarı yazmaz. Başarısız kurulumda R110 koduna döner; oyuncu ilerlemesini geri almaz.
