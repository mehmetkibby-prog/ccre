# Tekrar üretim

Her kaynak ZIP'ini ayrı boş klasöre açın. İlgili sürümün klasöründe:

```bash
python3 validation/run.py verify
python3 validation/run.py crash --repeat 1
python3 validation/run.py crash --repeat 2
python3 validation/run.py crash --repeat 3
python3 validation/run.py plain --repeat 1
python3 validation/run.py plain --repeat 2
```

Kaynak ZIP adları:

- CORE511_R56_KAYNAK.zip: yayımlanmış gerçekR56kaynağı ve kendi profili.
- CORE511_R61_KAYNAK.zip: gerçekR61kaynağı ve kendi profili.
- CORE511_R62_BASE_KAYNAK.zip: düzeltme öncesi gerçekR62kaynağı ve kendi profili.
- CORE511_R62_KAYNAK.zip: yeni kurtarma düzeltmesiyle tam mevcutR62kaynağı.

Gereken Node22.22.0, bağımlılıklar ve izole fixture'lar kaynakZIP'lerindedir; eski oyun paketleri ve npm indirmesi gerekmez. Native dışa aktarımında bulunmayan üretim medyası/build dosyaları NATIVE_EXPORT.json içinde listelidir. Test için geçiciDB oluşturulur; canlıDB kullanılmaz.

Yük değişkenleri (birebir):

```bash
CORE_SCENARIO=real CORE_PARTY=1 CORE_AOE=1 CORE_COLLECT=1 CORE_BAGFILL=35 CORE_COLLECT_RETRY=1 RC_SHARED=1
CORE_PER=20 CORE_MS=50000 CORE_MON_HP=500 CORE_CLAIM_CAP=1
CORE_GEAR_AT=15000 CORE_POKE_AT=25000 CORE_HIT_N=3 CORE_RELOGIN=1 CORE_RELOGIN_RETRY=60000
```

CORE_MONSTER_POOL tanımlı değildir; sürücü varsayılanı oyuncu başına60canavardır. Düz profil son satırdaki enjeksiyon/relogin değişkenlerini tanımlamaz. Sürümün CORE511 anahtarları `profiles/features.env` içinde eksiksizdir. Tam Node komutunu, bütün CORE_*/CORE511_*/fixture ortamı ve mutlak dosya yollarıyla üretmek için:

```bash
python3 validation/run.py crash --repeat 1 --dry-run
python3 validation/run.py plain --repeat 1 --dry-run
```

Her gerçek koşunun **command.sh** ve **source.json** dosyası çalıştırılmış kesin komutu içerir. Komut dosyalarının mutlak yolu başka makinede farklı olacağından taşınabilir runner kullanılır. Runner dışarıdan gelen CORE_* ayarlarını temizler, profile yeniden yükler. Orijinal sürücünün ve test adaptörlerinin hash/tersine çevirme kanıtı korunur.

Normal100oyuncu kontrolü yeni kaynakta:

```bash
python3 validation/run-matrix.py matrix --players 100
python3 validation/run-matrix.py matrix --players 100 --dry-run
```

Bu60s kontrol4kanal toplam240paylaşılan canavar içerir, bütün oyuncular savaşır. 4.800canavarlı arıza kabulünden ayrıdır ve120sobservereklemez. Geçmiş30/50/70/100R61/R62matrix sonuçları önceki `r62-claude-handoff` teslimindedir; yeni kaynak üzerinde yeniden koşulan100oyuncu sonucu bu teslimdedir.

Ham runner çıktısı ek `noUnacked`, tarihsel hata ve kapanış denetimleri nedeniyle FAIL olabilir; `TEST_SONUCLARI.md` istenen kabulü bu ek denetimlerden ayrı gösterir. HamFAIL dosyaları/çıkışkodları değiştirilmemiştir. Arızalı koşularda eski kapalı soketlerin isteklerini silip PASS üretmeyin.
