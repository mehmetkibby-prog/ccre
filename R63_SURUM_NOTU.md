# Core of Life R63

Karar doğrultusunda, burada test edilen kalıcı ödül kurtarma düzeltmesi R63 sürümü olarak paketlendi. Oyun kodu yeniden değiştirilmedi; sürüm, kurulum kaydı ve geri alma dizini R63 olarak düzenlendi.

Kaynak kimliği: `1f5a1448de970e13651817789e539a063ddc6dc0ce0cd0f21ce487470e83859d`.

Beş kabul koşusunda 120 saniye sonunda yarım ödül 0, çift anahtar 0, CHILD_EXIT 0; üç arızalı koşuda 24/24 tekrar giriş ve hareket. Önceki testlerin ham ek denetim bulguları korunur. R63 adlandırması yeni bir performans iyileştirmesi değildir: normal 100 oyuncu ölçümleri 322 ve 865 ms p95 olduğundan sürekli 520 ms altı garanti edilmez.

[Kaynaklar, kayıt sınıflandırmaları, bütün testler ve bilinen sınırlar](https://github.com/mehmetkibby-prog/ccre/tree/r62-reward-recovery)

Kurulum tabanı R61. Canlı VDS'ye bu paket hazırlanırken kurulmadı. Yeni paket için kurulum, bütünlük ve geri alma kontrolleri ayrıca çalıştırılır; sonuçlar R63_KURULUM_TESTI.json dosyasında yer alır. Yerel kurulum testlerinde servis sağlığı ve root yetkileri taklit edilir; gerçek ZIP, Node, dosyalar ve SQLite kullanılır.
