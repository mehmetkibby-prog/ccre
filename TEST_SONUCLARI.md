# R62 kalıcı ödül kurtarma incelemesi

İstenen komut aynı iş yükü ve kendi kurulum profilleriyle gerçek R56, R61 ve R62 kaynaklarında çalıştırıldı. R56, R61 ve R62 adları anahtar kapatılarak taklit edilmedi. Bu ortamda üç sürümde de 120 saniye sonunda tamamlanmamış ödül var. Bu sonuç Claude makinesindeki R56 sonucunu yeniden üretmiyor; R56→R62'ye özgü bir regresyon kanıtı olarak sunulmuyor. Kesin kaynak kimlikleri ve bütün ortam değişkenleri kaynak paketlerinde ve her koşunun source.json/command.sh dosyasında.

| Kaynak / koşu | Yük sonu | +30 sn | +60 sn | +120 sn | Çift anahtar | CHILD_EXIT | Tekrar giriş |
|---|---:|---:|---:|---:|---:|---:|---:|
| baseline-R56-crash | 864 | 969 | 837 | 544 | 0 | 0 | 24/24 |
| baseline-R61-crash | 1007 | 870 | 732 | 429 | 0 | 0 | 24/24 |
| baseline-R62-crash | 797 | 1046 | 916 | 616 | 0 | 0 | 24/24 |
| accept-crash-1 | 564 | 215 | 0 | 0 | 0 | 0 | 24/24 |
| accept-crash-2 | 951 | 791 | 106 | 0 | 0 | 0 | 24/24 |
| accept-crash-3 | 527 | 476 | 0 | 0 | 0 | 0 | 24/24 |
| accept-plain-1 | 1020 | 879 | 238 | 0 | 0 | 0 | — |
| accept-plain-2 | 1043 | 1201 | 546 | 0 | 0 | 0 | — |

Komut 4 kanal × 20 = **80 oyuncu**, oyuncu başına 60 = **4.800 canavar**, CORE_MON_HP=500, 50 saniye giriş üretimi kullanır. GEAR 15. saniyede, POKE 25. saniyede, HIT_N=3 ve 24 hesap için yeniden giriş vardır. Düz koşularda GEAR/POKE/HIT_N/RELOGIN kaldırılmıştır. Diğer iş yükü aynı kalır. İşletim ortamı Node 22.22.0, Linux x86_64, 4 CPU kotasıdır; botlar ve sunucu aynı makinededir. Canlı VDS ölçümü değildir.

Yük üreticisi durunca t=0 ölçülür; kabul edilmiş saldırılar hâlâ tamamlanabildiği için +30 saniyede ölüm/bekleyen sayısı artabilir. Ardından aynı sunucu açık tutulur; +30/+60/+120 zamanlayıcıları sırasında normal yeniden giriş ve otomatik sunucu işleri çalışır. Ödül tamamlama SQL'i yazılmaz, elle toplu claim gönderilmez, grace süresi kısaltılmaz. Snapshot sorgusu zamanlayıcı gecikmesi nedeniyle tam duvar saati sınırının biraz sonrasında çalışabilir; actualSnapshotElapsedMs ham gecikmeyi kaydeder. SQLite kopyası 120 saniye gözleminden sonra alınır.

## Kök neden ve düzeltme

Eski normal ödül kurtarması istemci heartbeat tanımlayıcılarına bağlıydı. Bağlantı/epoch değişince veya kuyruk boşalınca kalıcı ölüm kayıtları kendi başlarına yeni iş uyandırmıyordu. Var olan heartbeat olsa da dünya bakımı yaklaşık 1 saniyede bir, kurtarma ise en fazla 6 ölüm kaydıyla çalışıyordu. Büyük öldürme grupları eager ödül bütçesini aşınca oluşan borç bu hızla 120 saniyede bitmiyordu. Ek olarak `reward_recovery_busy`, AI/checkpoint/oyuncu işi sürdükçe grubu erteliyordu. Baseline sayıları pencere boyunca azalıyor: tüm borçların kalıcı olarak kilitlendiği veya oyuncu verisinin silindiği iddia edilmiyor; gözlenen sorun 120 saniye kabul sınırında bitmeyen kurtarmadır.

Düzeltme, kalıcı ölüm indeksini heartbeat olmadan da tarar. En fazla 16 normal ölüm ve aynı kanal ile sınırlıdır; iş varken başarılı gruptan sonra 50 ms, ertelenen gruptan sonra 250 ms sonraki bakıma izin verir. Boşta normal 1 saniyelik ritim korunur. Gruptaki en eski ölüm 45 saniyeyi geçmişse mevcut `durablePlayers` boşaltma/dondurma yolu kullanılır; daha genç işler mevcut `durablePlayersWhenIdle` yolundadır. Genç kayıtlar yaşlı kaydın önceliğini sürekli engelleyemez.

Oyuncu geçişi, karantina, sahiplik/epoch ve kalıcı yazıcı denetimleri atlanmaz; kilitli alıcı yeniden denenir. Dönen imleç kilitli bir grupta takılıp diğerlerini engellemez. Ödül, mevcut native award fonksiyonu ve tekil claim kayıtlarıyla verilir. `rewards_completed_at` elle yükseltilmez. Zindan/etkinlik gibi özel katalogların global kurtarma ve arena işleri korunur. Şema/oyuncu verisi göçü yoktur.

## Her kalan kaydın sınıflandırması

`R56_KALAN_ODULLER_120SN.csv`, `R61_KALAN_ODULLER_120SN.csv`, `R62_KALAN_ODULLER_120SN.csv` her **ölüm × ödenmemiş alıcı** için kanal, ölüm turu, yaş, oyuncu, aktif epoch, yeniden giriş/karantina/kilit durumu, gözlenen worker/attack/recovery yolu ve son gözlenen hata kodunu içerir. Tam 0/30/60/120 JSON'larında tüm katılımcılar ve claim durumları; routes.jsonl içinde işlem izleri vardır.

Worker ana saldırı işleminin yürütücüsüdür; small-group eager bunun içindeki ödül bütçesi yoludur. Her kalan hedef, SQLite içindeki gerçek kalıcı ölüm makbuzuyla eşleştirildi; sıkıştırılmış makbuzlar açılırken özgün boyut/SHA-256 doğrulandı. R56: 544/544, R61: 429/429, R62: 616/616 makbuz eşleşmesi. Makbuzdaki `rewardsCompletedR53`, öldürülen hedef sırası ve `completedClaimsR56` alanları kontrol edildi. R56'da 479 büyük grup dilimi / 65 küçük grup eager; R61'de 385 / 44; R62'de 523 / 93. Büyük grupların makbuzunda 4, küçük grupların makbuzunda 16 eager tamamlanma kayıtlıdır; geriye kalan hedefler kurtarmaya bırakılmıştır. Kalan hedeflerden tamamlanmış listesine alınmış olan **0**. Böylece completed-claim tarafından yanlış tamamlanmış sayılma değil, sınırlı eager bütçesinden sonraki kurtarma kapasitesi/sıralaması sorunu gözlenmiştir. `KALICI_MAKBUZ_SINIFLANDIRMA.json` ve CSV'lerde her hedefin receipt/commit zamanı, grup büyüklüğü, sırası ve gerçekleşen eager sayısı bulunur.

Baseline izleyicide recovery grubunun ilk hedefi kaydedildi; diğer hedefler için recovery denemeleri eksik olabilir. Bu nedenle boş son hata hücresi **hata gözlenmedi/bilinmiyor** demektir, hatasız çalıştığı kanıtı değildir. Yeni aday gözlemcisinde tüm normalTargets kaydedilir ve önceki işin lastTrace kaydı yeni işe yanlış bağlanmaz. Her kalan kaydın alıcı ve ödeme durumu doğrudan SQL/çalışan koordinatörden alınmıştır. İlgili bütün kayıtların ham verisi korunmuştur.

## Kabul ve ek denetimler

İstenen kabul ayrı hesaplanır: 120 saniye sonra yarım ödül 0, çift normal claim anahtarı 0, CHILD_EXIT 0, dört kanal incarnation sabit, arızalı koşularda 24/24 tekrar giriş + hareket + 12 saniye açık kalma. Kaynak, test dosyaları ve tersine sürücü kanıtı da doğrulanır. Üç arızalı ve iki düz koşu aynı son kaynak kimliğindedir.

İlk düz deneme, test gözlemcisinin aynı işlem hedeflerini her bekleyen kayıt için tekrar serileştirmesi nedeniyle V8 `Invalid string length` sınırına takıldı; bu geçersiz deneme kabul koşularına dahil değildir ve `observer-failed-plain-1` ham kanıtı saklanır. Gözlemci her kayıt için işlem özeti/hedef sayısı yazar, tam hedef listesi routes.jsonl içinde bir kez korunur. Üretim kaynak SHA’sı değişmedi. Düz koşular bu gözlemciyle yeniden koşuldu. Zamanlayıcılar da t=0 başlangıcına sabitlendi; arızalı koşuların önceki gözlemcisindeki gerçek gecikmeler raporda aynen durur.

Eski runner ayrıca bütün oturumların toplam cevapsız isteklerini, geçmiş hata listesini ve bu liste boş değilse `cleanShutdown=false` durumunu kontrol eder. Karantinada kapanan eski soketlerdeki istekler yeni soket bağlandı diye silinmez. Ham `FAIL` çıktıları değiştirilmez. `result.client-audit.json` bekleyen isteğin eski kapalı sokete mi, hâlâ açık sokete mi ait olduğunu gösterir. `permanent_actor_fenced` gibi bir kabul/relogin çakışması kaydedilmişse hata sayısı raporda kalır; başarılı yeniden girişten veya sıfır yarım ödülden bunu çıkarmıyoruz. Gerçek kapanış için hostClosed ve cleanupErrors ayrıca verilir.

SQL snapshotlarında tamamlandı işaretli olup ödenmemiş katılımcısı bulunan kayıt sayısı da ayrıca denetlendi (`markedCompleteButUnpaid`); yalnız işaret sayısına güvenilmedi. Son tamamlanma zamanının yük sonuna göre saniyesi JSON raporda bulunur.

| Koşu | İstenen kabul | Ham runner | Cevapsız istek | Geçmiş hata kodları |
|---|---|---|---:|---|
| baseline-R56-crash | FAIL | FAIL | 2 | permanent_actor_fenced |
| baseline-R61-crash | FAIL | FAIL | 9 | — |
| baseline-R62-crash | FAIL | FAIL | 4 | permanent_actor_fenced, permanent_actor_fenced |
| accept-crash-1 | PASS | FAIL | 2 | — |
| accept-crash-2 | PASS | FAIL | 7 | permanent_actor_fenced |
| accept-crash-3 | PASS | FAIL | 7 | — |
| accept-plain-1 | PASS | PASS | 0 | — |
| accept-plain-2 | PASS | PASS | 0 | — |
| accept-matrix-1 | PASS | PASS | 0 | — |
| accept-matrix-2 | PASS | PASS | 0 | — |
| baseline-R62-matrix | PASS | PASS | 0 | — |

## Normal 100 oyuncu kontrolü: accept-matrix-1

Bu ayrı kontrol 100 oyuncu, 4 kanal toplam 240 paylaşılan canavar, 60 saniye ve bütün oyuncular savaşırken çalışır. 120 saniyelik observer/drain eklenmez. Yukarıdaki 4.800 canavarlı arıza yüküyle gecikmeleri karıştırılmamalıdır.

{
  "allRewards": {
    "n": 46,
    "p50": 218.92624600000272,
    "p95": 864.950514000011,
    "p99": 912.7030180000002,
    "max": 912.7030180000002
  },
  "latency": {
    "move": {
      "n": 331,
      "p50": 129,
      "p95": 286,
      "p99": 297,
      "max": 580,
      "over300": 2,
      "over500": 2,
      "over1000": 0
    },
    "use_potion": {
      "n": 354,
      "p50": 102,
      "p95": 549,
      "p99": 669,
      "max": 718,
      "over300": 84,
      "over500": 23,
      "over1000": 0
    },
    "attack": {
      "n": 5670,
      "p50": 40,
      "p95": 99,
      "p99": 375,
      "max": 919,
      "over300": 93,
      "over500": 28,
      "over1000": 0
    },
    "claim_rewards": {
      "n": 36,
      "p50": 99,
      "p95": 180,
      "p99": 319,
      "max": 319,
      "over300": 1,
      "over500": 0,
      "over1000": 0
    },
    "heartbeat": {
      "n": 500,
      "p50": 63,
      "p95": 108,
      "p99": 115,
      "max": 139,
      "over300": 0,
      "over500": 0,
      "over1000": 0
    },
    "collect": {
      "n": 24,
      "p50": 108,
      "p95": 194,
      "p99": 795,
      "max": 795,
      "over300": 1,
      "over500": 1,
      "over1000": 0
    }
  },
  "checks": {
    "exitZero": true,
    "sourceUnchanged": true,
    "testFilesUnchanged": true,
    "completed": true,
    "population": true,
    "driverInverse": true,
    "noChildExit": true,
    "sameFourIncarnations": true,
    "noFaults": true,
    "noUnacked": true,
    "noUnfinishedRewards": true,
    "noDuplicateKeys": true,
    "cleanShutdown": true,
    "noDisconnects": true
  }
}

## Normal 100 oyuncu kontrolü: accept-matrix-2

Bu ayrı kontrol 100 oyuncu, 4 kanal toplam 240 paylaşılan canavar, 60 saniye ve bütün oyuncular savaşırken çalışır. 120 saniyelik observer/drain eklenmez. Yukarıdaki 4.800 canavarlı arıza yüküyle gecikmeleri karıştırılmamalıdır.

{
  "allRewards": {
    "n": 43,
    "p50": 151.72517400000652,
    "p95": 321.551148999999,
    "p99": 623.5712339999991,
    "max": 623.5712339999991
  },
  "latency": {
    "move": {
      "n": 352,
      "p50": 104,
      "p95": 250,
      "p99": 256,
      "max": 278,
      "over300": 0,
      "over500": 0,
      "over1000": 0
    },
    "use_potion": {
      "n": 349,
      "p50": 93,
      "p95": 381,
      "p99": 509,
      "max": 511,
      "over300": 67,
      "over500": 5,
      "over1000": 0
    },
    "attack": {
      "n": 5731,
      "p50": 39,
      "p95": 78,
      "p99": 228,
      "max": 590,
      "over300": 23,
      "over500": 1,
      "over1000": 0
    },
    "claim_rewards": {
      "n": 50,
      "p50": 95,
      "p95": 176,
      "p99": 283,
      "max": 283,
      "over300": 0,
      "over500": 0,
      "over1000": 0
    },
    "heartbeat": {
      "n": 500,
      "p50": 55,
      "p95": 82,
      "p99": 83,
      "max": 85,
      "over300": 0,
      "over500": 0,
      "over1000": 0
    },
    "collect": {
      "n": 20,
      "p50": 86,
      "p95": 163,
      "p99": 171,
      "max": 171,
      "over300": 0,
      "over500": 0,
      "over1000": 0
    }
  },
  "checks": {
    "exitZero": true,
    "sourceUnchanged": true,
    "testFilesUnchanged": true,
    "completed": true,
    "population": true,
    "driverInverse": true,
    "noChildExit": true,
    "sameFourIncarnations": true,
    "noFaults": true,
    "noUnacked": true,
    "noUnfinishedRewards": true,
    "noDuplicateKeys": true,
    "cleanShutdown": true,
    "noDisconnects": true
  }
}

## Normal 100 oyuncu kontrolü: baseline-R62-matrix

Bu ayrı kontrol 100 oyuncu, 4 kanal toplam 240 paylaşılan canavar, 60 saniye ve bütün oyuncular savaşırken çalışır. 120 saniyelik observer/drain eklenmez. Yukarıdaki 4.800 canavarlı arıza yüküyle gecikmeleri karıştırılmamalıdır.

{
  "allRewards": {
    "n": 46,
    "p50": 173.8877369999973,
    "p95": 286.50926000000254,
    "p99": 430.78781900000104,
    "max": 430.78781900000104
  },
  "latency": {
    "move": {
      "n": 352,
      "p50": 93,
      "p95": 194,
      "p99": 198,
      "max": 206,
      "over300": 0,
      "over500": 0,
      "over1000": 0
    },
    "use_potion": {
      "n": 356,
      "p50": 96,
      "p95": 385,
      "p99": 416,
      "max": 500,
      "over300": 59,
      "over500": 0,
      "over1000": 0
    },
    "attack": {
      "n": 5737,
      "p50": 39,
      "p95": 80,
      "p99": 221,
      "max": 431,
      "over300": 4,
      "over500": 0,
      "over1000": 0
    },
    "claim_rewards": {
      "n": 53,
      "p50": 85,
      "p95": 179,
      "p99": 234,
      "max": 234,
      "over300": 0,
      "over500": 0,
      "over1000": 0
    },
    "heartbeat": {
      "n": 500,
      "p50": 57,
      "p95": 91,
      "p99": 100,
      "max": 102,
      "over300": 0,
      "over500": 0,
      "over1000": 0
    },
    "collect": {
      "n": 24,
      "p50": 89,
      "p95": 138,
      "p99": 139,
      "max": 139,
      "over300": 0,
      "over500": 0,
      "over1000": 0
    }
  },
  "checks": {
    "exitZero": true,
    "sourceUnchanged": true,
    "testFilesUnchanged": true,
    "completed": true,
    "population": true,
    "driverInverse": true,
    "noChildExit": true,
    "sameFourIncarnations": true,
    "noFaults": true,
    "noUnacked": true,
    "noUnfinishedRewards": true,
    "noDuplicateKeys": true,
    "cleanShutdown": true,
    "noDisconnects": true
  }
}
