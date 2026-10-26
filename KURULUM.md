# R63 kurulumu

Bu sürüm, beş ödül kurtarma kabul koşusunu geçen kodun R63 olarak paketlenmesidir. Doğrulanmış taban R61'dir. Kurucu tabanı, bakım durumunu ve dosya bütünlüğünü kontrol eder; farklı veya değiştirilmiş bir kuruluma yazmaz. Bu çalışma canlı VDS'ye kurulum yapmaz.

Paketi VDS'ye indirdikten sonra bulunduğu klasörde, oyunu admin panelinden bakıma alın. İndirilen ZIP'in SHA-256 değerini yanındaki `.sha256` dosyasıyla karşılaştırın:

```bash
sha256sum -c CORE511_R63.zip.sha256
sudo python3 CORE511_R63.zip --check && sudo python3 CORE511_R63.zip --apply
```

Oyun ve mevcut site bileşeni aynı pakettedir. Yalnız oyun kurulacaksa:

```bash
sudo python3 CORE511_R63.zip --game-only --check && sudo python3 CORE511_R63.zip --game-only --apply
```

Kurulumdan sonra oyun bakımda kalır. Admin panelinde ve oyunda kontrol ettikten sonra Oyun Durumu bölümünden açın.

```bash
sudo python3 CORE511_R63.zip --flags
sudo python3 CORE511_R63.zip --rollback-latest
```

Yalnız oyun geri alınacaksa `--game-only --rollback-latest` kullanın. Geri alma, güncel veritabanını ve sonradan kazanılmış eşyaları korur. R63 kurulum yedekleri kendi `r63-recovery-backups` dizinindedir. Günlük yedeklere dokunulmaz.

Teknik uyumluluk için ödül düzeltmesinin anahtarı `CORE511_R62_REWARD_RECOVERY=1` adını korur. Paket ve kurulum kaydı R63'tür; bayrak adındaki R62 eski kod çalıştığı anlamına gelmez. Kaynak kodu ve native istemci dosyaları önceki doğrulanmış ödül düzeltmesiyle aynı baytlardır.
