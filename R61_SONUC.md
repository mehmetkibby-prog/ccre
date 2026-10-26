# Birleşik R61 — Sonuç

Son kullanıcı kabul sınırı: **p95 en çok 520 ms**. Aşağıdaki ölçümler aynı son kaynak ve ayarlarla, izleme/profil çıkarma ek yükü olmadan alınmıştır.

| Oyuncu | Süre | Saldırı p95 | Ölüm + bütün kalıcı ödüller p95 | Ödül örneği | En yüksek ödül gecikmesi |
|---:|---:|---:|---:|---:|---:|
| 30 | 60 sn | 57 ms | 351.5 ms | 33 | 385.0 ms |
| 50 | 60 sn | 60 ms | 285.8 ms | 41 | 341.4 ms |
| 70 | 60 sn | 64 ms | 267.4 ms | 40 | 367.8 ms |
| 100 | 60 sn | 82 ms | 507.3 ms | 34 | 508.2 ms |
| 100 | 300 sn | 69 ms | 419.6 ms | 469 | 789.6 ms |

Bütün koşularda bağlantı kopması, süreç hatası, yanıtsız komut, eksik kalıcı ödül ve yinelenen işlem anahtarı: **0**. Temizlik/servis kapanışından sonraki son hata kontrolü de temiz.

**Ölçüm ortamı:** yerel 4 CPU kotası, 32 GiB bellek sınırı. En yüksek toplam RSS 2.39 GiB. İstemci botları aynı makinede çalıştı. Kullanıcının 8 çekirdek/8 GB VDS’sinde ölçüm veya canlı kurulum yapılmadı.

p95, ölçülen olayların %95’inin bu süre içinde tamamlandığını ifade eder. En yüksek gecikme ayrıca gösterilmiştir; her olay için520 ms garantisi değildir. Ölüm ve ödül süresi, istemcide kesin ölüm görülmesi ile bütün native ödüllerin SQL kaydı ve ilgili fsync tamamlanmasının geç olanıdır. Çantanın son görsel çizim süresi ölçülmez.

## Birlikte gelen değişiklikler

- Yakındaki oyuncuların saldırı, beceri ve isabet sesleri;650 birim mesafe sınırı ve ses sayısı sınırı korunur.
- Işınlanma → PvP → Lonca Kalesi Adası; pazarda bulunma şartı kaldırılır. Lonca üyeliği ve savaş/arena/zindan kilitleri korunur.
- Kabul edilmiş saldırı ve iksir işlemlerinde sınırlı gruplama, eski isteğin sırasını koruma, tekrarlanan kare/ayar okumalarının azaltılması.
- Gerçek oyundaki SQL ifadelerinin sınırlı başlangıç hazırlığı ve V8 derlemesinin başlangıca alınması.
- Toplu saldırıda yalnız karşılaşma kaydı değişen ara oyuncunun yenilenmemesi hatası düzeltildi; eski encounter CAS kontrolü aynen korunur.
- Ödül yanıtında tekrar eden oyuncu satırları, aynı işlemde birebir eşitliği ve alıcıda SHA-256 değeri doğrulanan referanslarla taşınır. Mevcut512 KiB sınırı korunur; doğrulanamayan kayıt tam okuma yoluna döner.

Hasar, ganimet oranı, tecrübe, rastgelelik sırası, oyuncu sahipliği, kayıt/tekrar koruması ve fsync kaldırılmadı. Şema/veri dönüşümü yok.

## Doğrulama ve geçmiş

Son kaynak için açık/kapalı özellik, gerçek native writer, socket, süreç çökmesi/yeniden oynatma, kale girişleri ve kurulum/geri alma kanıtları final paketteki evidence dosyalarında bulunur. Önceki R61 tarayıcı/ses kanıtı yalnız ilgili kaynak dosyalarının birebir değişmediği doğrulanarak kullanılır; son sunucu üzerinde yeni tarayıcı testi yapıldığı iddia edilmez.

Önceki R61 adayının100 oyuncu/60 sn sonucu1086.35 ms idi. Önceki başarısız deneyler çalışma klasöründe saklandı; hızlı koşu seçilerek silinmedi. Son kaynakta507.313 ms ölçümü önce500 ms hedefini aşmıştı; kullanıcı kabul sınırını açıkça520 ms yaptı ve aynı ölçüm yeni sınır içinde kabul edildi.

Kaynak kimliği: `cdaffd0d1297c1ef49248bffb39226e966f1195148a808a480dee36bee5961a9`.

Kurulum doğrudan doğrulanmış R60 üzerine yapılır; önceki R61 ses paketinin ayrıca kurulması gerekmez. Canlı VDS’ye kurulmadı.
