# Mimari harita

R109: Node.js 22.23.4; SQLite (Node native); HTTP + WebSocket; tarayıcı istemcisi.
Canlı bağlam: kullanıcıya göre VDS 8 çekirdek/12 GB RAM, iki realm. Önceki yerel
ölçüm makinesinin kotası 4 CPU idi; bu donanım eşitliği kurulmuş bir test değildir.

- **Hesap servisi:** kayıt/giriş, captcha, realm seçimi, ortak ÇP/E-PIN ve realm
  imzalı giriş. `accounts-runtime`, `realm-*`, `content-*`, `native-bot-check`.
- **Realm ana süreci:** kalıcı SQLite otoritesi, komut koordinasyonu, sahiplik,
  yazıcı kuyruğu, HTTP, shared world/market/guild ve ödül tamamlanması.
  `coordinator.mjs`, `database-host.mjs`, `native-http-bindings.mjs`,
  `shared-world-jobs.mjs`, `game-services.mjs`.
- **Dört kanal:** `channel-runtime.mjs`, `channel-process.mjs`, `action-loop.mjs`,
  `adventure-channel.mjs`. Hareket, canavar durumu, savaş planları; kalıcı ödül
  veya sahiplik için ana otoritenin onayını kullanırlar.
- **Okuyucu/yazıcı işçileri:** `read-worker.mjs`, `cold-world.mjs`,
  `reward-worker-r533.mjs`, `reward-worker-runtime-r533.mjs`,
  `statement-boot-pool-r61.mjs`, `reward-sql-r531.mjs`.
- **Savaş/ödül:** `attack-*`, `combat-*`, `retaliation-*`, `checkpoint-*`,
  `death-batch-*`, `reward-*`. Kalıcı işlem, receipt/intent ve epoch sınırları
  korunmadan birleştirme/async değişikliği yapılmamalı.
- **Kule/Solo/Sis:** `tower-*`, `dungeon-*`, `adventure-*`;
  `generated/dungeon-rules.mjs`, `generated/native-http-services.mjs`.
- **İstemci:** `client-transport.mjs`, oyun/portal/admin paketleri
  `generated/native-client-proof.json` ile isim/hash ilişkisine bağlıdır.
  `generated/native-http-composition-proof.json` HTTP ile istemci alanını bağlar.
- **Kurulum:** `deployment/modules/installer.py`, `source_identity.py`,
  `runtime_imports.py`, `asset_graph.py`, `readiness.py`, `inplace.py`,
  `retention.py`. Bunlar iki realm ve kod geri dönüşü sözleşmesini korur.

Veri şeması `native.../drizzle`, `native.../vds-server/src/*schema*` ve motorun
`*-schema.mjs` dosyalarındadır. Sentetik açılış `core511/tests/native-*fixture*`
ile kurulur. Gerçek hesap/parola/kişisel veri olmadan kod ve şema incelenebilir.

Önce ölçülecek zincir: istemci command → kanal planı → ana yazıcı/SQL → kalıcılık
→ son olay/yanıt → istemci görünümü. Düşük tick p99 tek başına bu zincirin kısa
olduğunu göstermez; boss testinde bu fark açıkça görülmüştür.
