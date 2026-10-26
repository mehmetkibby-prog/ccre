# Birebir yeniden çalıştırma

Gereken Node 22.22.0 ve node_modules dosyaları kaynak ZIP'lerinde hazırdır. Linux x86_64/glibc 2.28+ ve Python 3.10+ kullanın. Canlı yapılandırma/DB olmayan boş bir çalışma klasöründe, iki ZIP'i yan yana açın. R61 kurulu olması veya R57–R61 kurulum ZIP'leri gerekmez.

```bash
unzip CORE511_R61_KAYNAK.zip
unzip CORE511_R62_KAYNAK.zip
(cd R61 && sha256sum -c FILES.sha256 && python3 validation/run.py verify)
(cd R62 && sha256sum -c FILES.sha256 && python3 validation/run.py verify)
```

## 30/50/70/100 karşılaştırması

Aşağıdaki komutlar burada kullanılan sırayla, aynı makinede, aynı anda yalnız bir test olacak şekilde çalıştırılır:

```bash
python3 R61/validation/run.py matrix --players 30 --repeat 1
python3 R62/validation/run.py matrix --players 30 --repeat 1
python3 R61/validation/run.py matrix --players 50 --repeat 1
python3 R62/validation/run.py matrix --players 50 --repeat 1
python3 R61/validation/run.py matrix --players 70 --repeat 1
python3 R62/validation/run.py matrix --players 70 --repeat 1
python3 R61/validation/run.py matrix --players 100 --repeat 1
python3 R62/validation/run.py matrix --players 100 --repeat 1
```

Her koşu CORE_MS=60000; CORE_PER sırasıyla 8/13/18/25, gerçek toplam 30/50/70/100'dür. İlk üçünde kanallara dengeli dağıtım sürücü adaptöründedir (sırasıyla [7,8,8,7], [12,13,13,12], [17,18,18,17]); 100'de [25,25,25,25]. CORE_SCENARIO=real, CORE_PARTY=1, CORE_AOE=1, CORE_COLLECT=1, CORE_BAGFILL=35, CORE_COLLECT_RETRY=1, RC_SHARED=1, CORE_CLAIM_CAP=1, CORE_MON_HP=200, CORE_FIGHTERS=1, CORE_WEAPONS=1, CORE_MOUNT=1, CORE_MOUNT_QUEST=1, CORE_MOUNT_NOTOGGLE=1, CORE_MONS=60, CORE_MONSTER_POOL=channel, CORE511_STAGE_TIMING=1.

## İstenen çökme ve düz yoğun öldürme koşuları

```bash
python3 R62/validation/run.py crash --repeat 1
python3 R62/validation/run.py crash --repeat 2
python3 R62/validation/run.py crash --repeat 3
python3 R62/validation/run.py plain --repeat 1
python3 R62/validation/run.py plain --repeat 2
```

Crash profili: CORE_SCENARIO=real, CORE_PARTY=1, CORE_AOE=1, CORE_COLLECT=1, CORE_BAGFILL=35, CORE_COLLECT_RETRY=1, RC_SHARED=1, CORE_PER=20, CORE_MS=50000, CORE_MON_HP=500, CORE_CLAIM_CAP=1, CORE_GEAR_AT=15000, CORE_POKE_AT=25000, CORE_HIT_N=3, CORE_RELOGIN=1, CORE_RELOGIN_RETRY=60000. Plain profili aynıdır; GEAR/POKE/HIT_N/RELOGIN/RELOGIN_RETRY tanımlı değildir. Her iki yoğun profilde MONSTER_POOL tanımlı değildir; sürücü varsayılanı oyuncu başına 60 canavardır. Diğer varsayılanlar özgün my-load-real.mjs içinde görülebilir.

## Bütün ortam değişkenleri ve Node komutu

Her sürümde `profiles/features.env` bütün seçili oyun anahtarlarını; `profiles/{matrix,crash,plain}.env` senaryo ayarlarını içerir. Çalıştırıcı bunlara yalnız yalıtılmış fixture ayarlarını, toplam oyuncu sayısını, süreyi, paketin içindeki acorn/eslint-scope yollarını ve çıktı klasörünü ekler. Bunların tümünü çalıştırmadan görmek için:

```bash
python3 R62/validation/run.py matrix --players 100 --dry-run
python3 R62/validation/run.py crash --dry-run
```

Node `--no-lazy` ile başlar. NODE_OPTIONS test loader'ını ve tüm ödül gözlemcisini yükler. Bu teslimin her ham koşu klasöründe `command.sh` birebir çalıştırılan Node komutudur; `source.json.environment` tüm eklenen değişkenleri, profil/driver/helper SHA'larını, makinenin CPU/bellek sınırlarını ve zamanı içerir. Başka makinede mutlak yollar farklı olacağı için yukarıdaki runner komutları tercih edilir. `command.sh` doğrudan çalıştırılacaksa eski CORE_* ayarlarını ortamdan temizlemek de gerekir; runner bunu kendisi yapar.

Kanıt ZIP'indeki `profiles/R61` ve `profiles/R62` aynı profil dosyalarının kopyalarıdır. `driver/my-load-real.mjs` birebir ortak sürücüdür; kaynak ZIP'lerinde de `working/core511-source/scripts/core511/benchmark/my-load-real.mjs` konumundadır. Her çalıştırmadaki loader değişiklikleri `result.json.driver-proof.json` içinde, ters dönüş kanıtıyla verilmiştir.

Yeni denemede aynı kanıt klasörü varsa `--repeat 2` veya farklı `--out /mutlak/yol` kullanın. Başarısız testin ham kaydını silmeyin. Runner FAIL sonucu için çıkış kodu 1 verir; çoklu deneme betiğimiz bütün istenen koşuların sonucunu toplayabilmek için sonraki bağımsız koşuyu çalıştırmaya devam eder.

Ham sonuç nüfusu notu: Özgün sürücünün `result.json.players=PER*4` alanı 30/50/70 için 32/52/72 gösterir. Gerçek nüfus kanal ölçümlerinin `channels[].players` toplamı ve adaptörün dağıtım kanıtıyla 30/50/70 olarak doğrulanmıştır. Ham dosya sonradan değiştirilmedi; raporda gerçek nüfus esas alınır.
