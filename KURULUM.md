R78 — gereksiz hareket durmaları ve sunucu ölçüm yükü

Pazar okumasındaki ve tamamlanmış ödül işindeki gereksiz hareket durdurmalarını düzeltir; sunucunun kullanılmayan ayrıntılı ölçüm yükünü azaltır.

Doğrulanmış R77 oyun sürümüne uygulanır. Önce bakım moduna alın; oyundan ve oyun yönetim panelinden çıkıp 45 saniye bekleyin.

```bash
python3 -u /root/CORE511_R78_TOPLU.zip --apply
```

`R78 TAMAMLANDI` yazınca bakım modunu kapatın ve oyuna girin.

Geri alma:

```bash
python3 /root/CORE511_R78_TOPLU.zip --rollback-latest
```

Geri alma R77 oyun koduna döner. Veritabanı yedeği geri yüklenmez; mevcut hesaplar, oyuncular ve ödül kayıtları korunur. R74 site ve hesap kodlarına dokunulmaz.
