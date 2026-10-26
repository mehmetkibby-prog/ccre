# Core of Life — Claude için bağımsız R61 / R62 teslimi

**İnceleme paketi. Canlıya kurulmadı.** Normal 100 oyuncu koşusunda R62 ölüm + tüm ödüller p95: **406,7 ms**, bitmemiş ödül 0. İstenen çok daha yoğun 3 çökme + 2 düz yük koşusu ise bitmemiş ödül şartını **geçmedi**; ham FAIL kayıtları dahildir. R61 kontrolünde de aynı yoğunlukta ödül birikmesi görüldü.

[**Bütün teslimi tek ZIP olarak indir**](https://github.com/mehmetkibby-prog/ccre/archive/refs/heads/r62-claude-handoff.zip)

Özel depoya erişimi olan GitHub hesabınızla giriş yapın. Ayrı indirmek için:

| İndir | İçerik |
|---|---|
| [R62 kurulum paketi](https://github.com/mehmetkibby-prog/ccre/raw/refs/heads/r62-claude-handoff/CORE511_R62.zip) | Gerekli doğrulama arşivi içinde; önceki ZIP'ler istenmez. |
| [R61 kaynakları — 97,8 MB](https://github.com/mehmetkibby-prog/ccre/raw/refs/heads/r62-claude-handoff/CORE511_R61_KAYNAK.zip) | Kaynaklar, website, Node, bağımlılıklar ve yük testi. |
| [R62 kaynakları — 98,3 MB](https://github.com/mehmetkibby-prog/ccre/raw/refs/heads/r62-claude-handoff/CORE511_R62_KAYNAK.zip) | Aynı kapsamda R62. |
| [Ham test kanıtları](https://github.com/mehmetkibby-prog/ccre/raw/refs/heads/r62-claude-handoff/CORE511_R62_TEST_KANITLARI.zip) | 13 zorunlu koşu, ek R61 teşhisi, komutlar ve kurucu kontrolleri. |

[Teslim kapsamı ve kaynak SHA'ları](TESLIM.md) · [Sonuçlar](TEST_SONUCLARI.md) · [Birebir komutlar](KOMUTLAR.md) · [Kurulum/geri alma](KURULUM.md) · [Değişiklikler](DEGISIKLIKLER.md) · [SHA-256](SHA256SUMS.txt)

Native ağacı eldeki kaynak dışa aktarımıdır; orijinal manifestte bulunup dışa aktarımda olmayan eski medya/derleme dosyaları açıkça listelenmiştir. Bu sınır, boş klasörde verilen yük testini çalıştırmaya engel değildir; kaynak ZIP'leri sıfırdan canlı oyun medya arşivi olarak sunulmaz.
