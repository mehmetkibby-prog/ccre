# Açılış ve ön kayıt uyumluluğu

Açılış: **30 Ekim 2026 Cuma, 20:00 Türkiye saati** (`2026-10-30T17:00:00Z`).

Mevcut oyun bu davranışı zaten sunucu tarafında destekliyor. Yeni oyun kodu,
veritabanı tablosu veya ayrı ön kayıt listesi eklenmedi. `launch_settings` içindeki
`enabled=1`, `mode='scheduled'`, `public_opens_at=1793379600000` ayarları mevcut
hesap servisinin yetkili yönetim API'siyle kaydedilir. Eski beta/başlangıç hediyesi
tarihleri (`registration_at`, `opens_at`, `ends_at`) korunur.

Ön kayıt, mevcut `accounts` tablosuna yapılan gerçek hesap kaydıdır. Hesaplar,
parolalar ve geçerli oturumlar taşınmaz/silinmez. Açılıştan önce normal giriş ve
oyun bileti sunucuda reddedilir. Açılış anından itibaren aynı hesap/oturum çalışır.
Mevcut yönetici/erken erişim izinleri korunur. Cihaz saatini değiştirmek sunucu
iznini açmaz. Site, halka açık sunucu durumunu gösterir.

## Kurucu entegrasyonu

Yüklü çekirdeğin durum dosyası: `/var/lib/core511/state.json`.
Node: `Path(state['releaseRoot']) / 'bin/node'`.
Yüklü kök `/opt/core511/releases/` altında doğrulanır.
Oyun ayarı `state['prior']['newGameConfigFile']`; hesap ayarı
`newAccountsConfigFile` veya eski kurulumlar için `accountsConfigFile`.

```text
<kurulu-node> launch-config.mjs --check
<kurulu-node> launch-config.mjs --status
<kurulu-node> launch-config.mjs --apply --receipt <mutlak-yedek-dizini>/launch.json
<kurulu-node> launch-config.mjs --rollback --receipt <mutlak-yedek-dizini>/launch.json
```

İsteğe bağlı `--state <dosya>` ve `--opens-at <ISO-tarih>` vardır. Varsayılan tarih
yukarıdaki doğrulanmış açılıştır. Kurucu, paketin doğrulanmış yardımcısını kalıcı
bir yedek konumuna çıkarır ve aynı sürümle geri alır. Çıktı JSON'dur; hesap listesi,
parola, anahtar veya erişim jetonu içermez.

`--check` salt okunurdur. Yerel çekirdek sağlığı, dört kanal, kalıcı kayıt ve
mevcut panelin açılabilirlik kararı doğrulanır. `--apply`, diske 0600 izinli ve
fsync edilmiş hazırlık kaydı yazdıktan sonra mevcut revizyonla karşılaştırmalı
kaydetme yapar. İşlem hesabın tek yazıcısından geçer; doğrudan SQL çalıştırılmaz.
Mevcut yerel imzalı protokol kullanılır. 20 saniyelik istek süresi, çekirdeğin
mevcut 6 saniyelik açılış doğrulamasını kapsar. Yeni zamanlayıcı/hareket/savaş işi
eklenmez.

Kurucu önce site dosyalarını ve Caddy değişikliğini hazırlar, sonra açılış
ayarını uygular, ardından Caddy'yi etkinleştirir. Hata olursa bu yardımcının
`--rollback` işlemi ve site geri alması çalıştırılır. Açılış zaten aynıysa yazım
yapılmaz. Sonraki bir yönetici değişikliği varsa otomatik geri alma onu ezmez.
Mevcut çekirdeğin dünya saati/kanal sağlık koruması atlanmaz. Çekirdek kendi
başarısız açılışını yeni revizyonla bakıma alırsa yardımcı bu daha yeni kararı
korur; otomatik geri almayı reddettiğini açıkça bildirir.

`--rollback`, önceki politika alanlarını mevcut yetkili API ile geri yükler.
Bakım geri yüklenirse mevcut oyunun doğal 10 saniyelik bakım geçişi yeniden
başlar. Oyun/hareket/ödül dosyaları ve hesap satırları değişmez.

## Ön yüz sözleşmesi

Ön kayıt sayfası `accounts.coreoflife.net` üzerinde sunulmalıdır; kayıt API'si
aynı kökeni doğrular ve oturum çerezi yalnız bu sunucuya aittir. Tüm API'ler ve
SSO yolları mevcut hesap servisine gider. Ana alan adındaki halka açık
`/api/launch` proxy'si `Cookie`/`Authorization` iletmemelidir; yöneticiye özel
erken erişim bilgisini halka açık sayaç olarak kullanmamalıdır.

- `GET /api/launch`: ham durum; `phase`, `serverTime`, `opensAt`,
  `publicOpeningAt`, `automaticOpening`, `registrationOpen`, `canPlay`, `revision`.
  Zamanlar milisaniyedir. `phase='waiting'` iken halka açık oyun düğmesi gizlidir.
- `GET /api/auth/me`: normal anonim durumda HTTP 200 ve `authenticated:false`;
  oturum varsa `authenticated:true`, `account`, `csrfToken`, `launch`.
- `POST /api/auth/challenge {}`: `{id,image,expiresAt}`; PNG data URL, 6 rakam,
  5 dakika, 5 deneme. IP'ye bağlı mevcut güvenlik doğrulaması.
- `POST /api/auth/register`: `{username,email,password,passwordConfirmation,
  captchaId,captchaAnswer,launchEmailConsent}`. HTTP 201; `account`, `launch`,
  `csrfToken` ve güvenli oturum çerezleri. Kullanıcı adı 3–24 Unicode harf/rakam
  veya `_ . -`; parola **9–128** karakter; e-posta en fazla 254 karakter.
  Form alanları veya parolalar localStorage'a yazılmaz. E-posta izni açık onaydır.
- Hatalar `{error:'Türkçe mesaj',code:'kod'}` biçimindedir. `400/403/409/429`
  yanıtları görünür şekilde işlenir. Kayıt/challenge için mevcut `Origin`
  doğrulaması zorunludur; bu iki anonim işlem CSRF jetonu istemez.
- Açılış sonrası giriş bağlantısı `https://r1.coreoflife.net/api/realm/begin`.
  Bu yol yerel güvenli nonce çerezini oluşturur ve
  `https://accounts.coreoflife.net/?realm=r1&state=...` adresine yönlendirir.
  Geçerli ön kayıt oturumu varsa doğal SSO devam eder; yoksa mevcut giriş/kayıt
  formu kullanılır. Parolalar ya da jetonlar URL'ye elle eklenmez.
- Accounts `/` sayfası yalnız **boş query** için yeni tasarımla sunulur.
  Query içeren kök istekler, özellikle `realm/state`, `logout`, `admin`, mevcut
  portala gider. `/reset-password`, `/early-access`, `/admin-login`, tüm API ve
  oyun dosyaları korunur. `/on-kayit` yeni sayfanın kalıcı adresidir.

## Test sonucu

23 test geçti. `launch-config.test.mjs`: 17 test. Native ön kayıt entegrasyonu:
3 test. Native panel entegrasyonu: 3 test.

Yerel entegrasyon, gerçek derlenmiş R60 auth handler'larını değiştirmeden alır;
gerçek `LocalDatabase`, CAPTCHA, parola türetme, oturum ve tek kullanımlık SSO
kod deposunu geçici SQLite üzerinde çalıştırır. CAPTCHA'nın rastgele cevap
hash'i sadece test veritabanında bilinen bir cevapla hazırlanır; gerçek
sahiplik/süre/tüketim doğrulaması çalışmaya devam eder. Oyun kanallarının hazır
olduğunu gösteren panel probu testte temsil edilir; canlı VDS testi yapılmadı.

```text
/workspace/ccre/r60_mount_work/tooling/node-v22.22.0-linux-x64/bin/node --test \
 /workspace/ccre/site_launch_v2/backend/launch-config.test.mjs \
 /workspace/ccre/site_launch_v2/backend/native-prereg-integration.test.mjs \
 /workspace/ccre/site_launch_v2/backend/native-panel-integration.test.mjs
```
