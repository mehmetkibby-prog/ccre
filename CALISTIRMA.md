# Yerel geliştirme ve test ortamı

Bu dalı klonlayın:

```bash
git clone --branch r87-claude-handoff --single-branch https://github.com/mehmetkibby-prog/ccre.git
cd ccre
python3 tools/verify_snapshot.py
```

Özel depo için kullanıcının GitHub yetkisi gerekir. R87'nin tamamlanması için yeni bir dal açın; devir commit'ini karşılaştırma amacıyla koruyun.

## Sabit yollar ve Node

Tarihsel fixture/harness dosyaları `/workspace/ccre` ve `/tmp/core511-build-deps` yollarını kullanıyor. Oyun kaynaklarının veya eski kanıt dosyalarının içindeki yollar devir sırasında değiştirilmedi. En kolay yol izole Linux x64 container içinde repo'yu `/workspace/ccre` konumuna bağlamak:

```bash
docker build -f Dockerfile.handoff -t core511-handoff .
docker run --rm -it --platform linux/amd64 -v "$PWD:/workspace/ccre" core511-handoff
python3 tools/setup_local.py
```

Docker yoksa ayrı bir Linux x64 ortamda `/workspace/ccre` içine klonlayıp aynı setup komutunu çalıştırın. Var olan başka bir projeyi bu yola taşımayın/silmeyin. Setup gereken Node 22.23.4 arşivini resmi kaynaktan indirir ve sabit SHA-256 ile doğrular; mevcut doğru binary için `python3 tools/setup_local.py --node /path/to/node` kullanılabilir. Setup yeni sürüm kurmaz, VDS'ye bağlanmaz, oyun testi başlatmaz. Vendor bağımlılıklarını ve tarihsel test symlink'lerini yerel olarak kurar. Docker tarifi bu devirde build edilmedi; veri/sunucu devri yerine fixture çalıştırma yoludur.

## R87 dar doğruluk testleri

```bash
export R85_RUNTIME_TREE=/workspace/ccre/r87_stability_work/working
python3 r87_stability_work/tests/run.py --test --test-concurrency=1 \
  /workspace/ccre/r87_stability_work/tests/settings-cache.test.mjs \
  /workspace/ccre/r87_stability_work/tests/attack-secondary/native-economy.test.mjs
```

Rune süreç testi:

```bash
R87_EXPECT_JOINED=1 python3 r87_stability_work/tests/run.py --test --test-concurrency=1 \
  /workspace/ccre/r87_stability_work/tests/rune-native.test.mjs
```

Rune testi sabit `evidence/rune-candidate.json` yoluna yazar. Tekrar koşmadan önce bu kanıtı ayrı adla kopyalayın veya testin yerel kopyasındaki çıktı yolunu değiştirin. `R87_EXPECT_JOINED=1`, ödülün saldırı commit'inde tamamlanmasını ayrıca doğrular. Testler canlı DB kullanmaz; geçici fixture oluşturur.

## 50 oyunculu mevcut ölçümü yeniden üretme

Yeni kod değiştiğinde beklenen SHA'yı kaynak kimliğinden yeniden üretin; aşağıdaki değer yalnız bu devir içindir. Kaynak testi sürerken değişmemeli. Aynı makinede başka yük testi/profil/browser koşusu çalıştırmayın.

```bash
export R85_RUNTIME_TREE=/workspace/ccre/r87_stability_work/working
export R85_RUNTIME_LABEL=claude-first-review
export R85_EXPECT_CORE_SHA=e2226a62f64d51c4b60d2ec0efbbd609473bfebaf17e42406d41f11c2e81db22
export R85_EXPECT_INGRESS_SHA=325bd1caa7c52df9df159b63afa3cd7faf470f2cdae3f513a5c4ca29f655cec9
python3 r87_stability_work/tests/run.py \
  /workspace/ccre/r87_stability_work/tests/native-crowd50.mjs 50 180
```

Sonuç `r87_stability_work/evidence/native-mixed-load-claude-first-review-50.json`. Yalnız `passed` alanını okumayın: `errors`, `faults`, `runtimeCancelledInputCount`, `clientTransport.actors[].predictionCapEpisodes`, `predictionLimitedFrames`, p99 ve üst uç gecikmeler birlikte incelenmeli. Bu sentetik yerel native ölçümdür; gerçek tarayıcı/render veya canlı VDS testi değildir.

## Tarayıcı ve eski testler

`tests/browser-atlas-r87.mjs` Playwright ile Chromium ve Edge kullanır. Mevcut sabit yollar: `/workspace/ccre/r60_mount_work/tooling/node_modules/playwright/index.mjs`, `/usr/bin/chromium`, `/tmp/r72-edge/opt/microsoft/msedge/msedge`. Browser binary/Playwright bu devirde vendor edilmedi. Ayrı test araç dizinine Playwright kurup tarayıcı yollarını yerel test kopyasında uyarlayın; bu değişiklik üretim oyun kodu değildir. Atlas testi sentetik PNG ile çalışır; tam oyun için medya varlıkları ayrıca gerekir.

R85/R86 installer testleri ve paket kaynakları tarihsel örnektir; R87 kurucusu henüz yoktur. Eski build/seal betikleri eski adaylara/kanıtlara bağımlıdır ve R87 için hazır otomasyon sayılmaz. R84 başlangıç notlarını güncel kurulum talimatı olarak çalıştırmayın. Devirden sonra yeni test çıktıları için yeni adlar kullanın ve değişiklikleri ayrı commit'lerde kaydedin.
