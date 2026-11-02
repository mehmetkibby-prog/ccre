R91, düzeltilmiş R90_GAMEPLAY üzerine kurulur. R89 veya yarım kalmış başka bir kurulum varsa paket uygulanmaz.

Oyunu yönetim panelinden bakıma al; oyuncular ve yönetici oyundan çıktıktan sonra 45 saniye bekle. ZIP'i /root/CORE511_R91_DOGRULAMA.zip yoluna yükle ve yayımlanan SHA256 değeriyle doğrula. Ardından:

    python3 -u /root/CORE511_R91_DOGRULAMA.zip --apply

R91 TAMAMLANDI mesajını gördükten sonra bakımı kapat. Oyuncular oyun sekmesini bir kez yenilemeli; açık eski sekmeler önceki JavaScript kodunu çalıştırmaya devam eder.

Kurulum mevcut veritabanını yedekler ve quick_check ile doğrular. Önceki canlı yedek doğrulaması yaklaşık 11 dakika sürmüştü; toplam kurulum süresi bundan uzun olabilir. Başarısız açılışta kod geri alınır; oyuncu ilerlemesi eski yedeğe döndürülmez. Hesap servisi açık tutulur.

Yarım R91 kurulumu aynı ZIP ile --recover kullanılarak kurtarılır. Başka sürümün yarım kurulumuna bu paketle müdahale edilmez.
