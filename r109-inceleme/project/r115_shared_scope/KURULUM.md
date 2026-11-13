# R115 — saldırı kapsamı onarımı

Yalnız tam R114_RUNE_FORUM1 üzerine. İki sunucunun üç oyun kaynak dosyasını günceller.
Forum, haritalar, istemci, oyuncu veritabanı/şeması ve ödül kuralları değişmez.

1. SHA256 doğrulamasından sonra `python3 /root/r115.zip --check`.
2. Efsane panelinde bakımı başlatıp geri sayımı tamamlayın.
3. `python3 /root/r115.zip --apply`. Sekiz kanal ve doğru sürüm doğrulanır.
4. Tamamlandıktan sonra panelden Efsane bakımını kaldırın. Akademi ön kayıt ayarı korunur.

Kesilen kurulum: aynı ZIP ile `--status`, gerçekten bekleyen işlem varsa `--recover`.
Tamamlanmış kurulumda önceki koda dönüş: bakımda aynı ZIP ile `--rollback`.
Geri dönüş oyuncuların ilerlemesini geri almaz; eski kod hatası geri gelir.
