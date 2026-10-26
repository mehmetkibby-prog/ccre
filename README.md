# Core of Life R63

R63, burada doğrulanan kalıcı ödül kurtarma düzeltmesinin sürüm adıdır. Kurulum tabanı **R61**. Paket hazırdır; bu çalışma sırasında canlı VDS'ye kurulmadı.

- [R63 paketini indir](https://github.com/mehmetkibby-prog/ccre/raw/refs/heads/r63-release/CORE511_R63.zip)
- [Kurulum ve geri alma](KURULUM.md)
- [Sürüm notu ve testlerin kapsamı](R63_SURUM_NOTU.md)
- [R63 kurulum testi sonucu](R63_KURULUM_TESTI.json)
- [Oyun kodunun test edilmiş kaynakla birebir eşleşmesi](R63_KAYNAK_ESLESMESI.json)
- [Kaynaklar ve bütün ödül/performans kanıtları](https://github.com/mehmetkibby-prog/ccre/tree/r62-reward-recovery)

Paket VDS'de bulunduğu klasörde, oyun bakımdayken:

```bash
sha256sum -c CORE511_R63.zip.sha256
sudo python3 CORE511_R63.zip --check && sudo python3 CORE511_R63.zip --apply
```

23 oyun dosyası önceki doğrulanmış kaynakla aynı baytlardır. Paket, kurulum kaydı ve geri alma dizini R63 olarak düzenlendi. Yeni adla kurulum, tekrar kurulum, tüm beş anahtarın kapatılıp açılması ve güncel veritabanını koruyan geri alma testleri geçti. Yerel testte servis sağlığı/root yetkileri taklit edildi; ZIP, Node, dosyalar ve SQLite gerçekti.

Üç arızalı ve iki düz ödül koşusunun kabul sonuçları aynı kaynak kimliğine aittir. R63 adı, önceki raporda açıklanan normal 100 oyuncu gecikme değişkenliğini gidermiş yeni bir kod değişikliği anlamına gelmez.
