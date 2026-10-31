# Core of Life — Yaşam Çekirdeği

Tarayıcıda (PC + mobil) oynanan, gerçek zamanlı, çok oyunculu 3B fantastik aksiyon RPG.
Sunucu otoriter; kanal başına ayrı CPU çekirdeği; ekonomi işlemleri tek seferlik makbuzlarla korunur.

## Hızlı başlangıç (geliştirme)

Gerekenler: Node.js 22, PostgreSQL 16.

```bash
npm install
```

```bash
createdb coreoflife   # veya DATABASE_URL ile kendi veritabanını göster
```

```bash
npm run db:migrate
```

```bash
npx tsx packages/server/src/main.ts
```

Ayrı bir terminalde istemci (Vite, /api ve /ws'yi 8080'e yönlendirir):

```bash
npm run dev -w @col/client
```

Tarayıcı: http://localhost:5173 — Geliştirme modunda ilk kayıt olan hesap `owner` (yönetici) olur.

## Üretim derlemesi

```bash
npm run build
```

```bash
NODE_ENV=production DATABASE_URL=postgres://... node packages/server/dist/main.js
```

Sunucu `packages/client/dist` klasörünü statik olarak sunar. Kurulum ayrıntıları: `docs/VDS_KURULUM.md`.

## Kontroller

| Tuş | Eylem |
|---|---|
| WASD / oklar | Yürü |
| Sol tık | Yürü / hedef seç / NPC ile konuş / ganimet al |
| Sağ tık | Hedefe saldır |
| Boşluk veya 1 (basılı tut) | Temel saldırı (menzile kendiliğinden yaklaşır) |
| 2, 3, 4 | Beceriler (4 = uzmanlık, Sv. 30) |
| Q | Kırmızı İksir |
| Z / F | Yakındaki ganimeti topla |
| Tab | Sonraki hedef |
| I / B · C · K · T · M | Çanta · Karakter · Beceriler · Işınlan · Harita |
| Enter | Sohbet |

Mobil: sol altta joystick, sağ altta saldırı/beceri/iksir/toplama düğmeleri.

## Klasör yapısı

```
packages/shared   Ortak protokol, içerik (sınıf, canavar, eşya, harita), formüller, deterministik harita üretici
packages/server   HTTP API, WebSocket geçidi, kanal worker'ları (oyun simülasyonu), PostgreSQL kalıcılık
packages/client   React arayüz + Three.js 3B motor (prosedürel modeller, dokular, efektler)
scripts/          Yük testi (gerçek protokol botları)
docs/             Özellik matrisi, kararlar, kurulum, test raporu, devam notu
```

## Testler

```bash
npm test
```

```bash
LOADTEST=1 npx tsx packages/server/src/main.ts   # yalnız ayrı test ortamında
```

```bash
npx tsx scripts/loadtest.ts --bots 300 --duration 120 --channels 6
```
