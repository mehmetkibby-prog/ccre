# Gerçekçi Karakter Modelleri — Hazırlama Rehberi

Oyun, `packages/client/public/models/models.json` dosyasında listelenen GLB modellerini kullanır.
Listede olmayan karakterler için yedek prosedürel model çizilir. Modelleri oyuna sokan hat hazırdır:
FBX veya GLB dosyalarını klasöre koyup tek komut çalıştırmak yeter.

## Önerilen yol: Meshy (model) → Mixamo (iskelet + animasyon)

### 1. Meshy'de karakteri üret
- Karakter **T-poz veya A-poz** olmalı. Kollar gövdeden ayrı, bacaklar hafif açık, tam boy olmalı.
- Silah elde olmasın. Kalkan ve yay sırtta olabilir. Silahları oyun ayrıca takar.
- Örnek istem (İngilizce daha iyi sonuç verir):
  - Muhafız: `realistic medieval fantasy knight, full plate armor with worn leather straps, dark red tabard, chainmail, no weapon in hands, A-pose, full body, game-ready PBR textures, semi-realistic dark fantasy`
  - Avcı: `realistic fantasy ranger, hooded leather armor, green cloak, quiver on back, bracers, no weapon in hands, A-pose, full body, game-ready PBR, semi-realistic dark fantasy`
  - Arkanist: `realistic fantasy battle mage, long dark blue robe with gold trim, leather belt with pouches, hood down, no staff in hands, A-pose, full body, game-ready PBR, semi-realistic dark fantasy`
  - NPC örneği (Demirci Haso): `realistic medieval blacksmith, muscular, leather apron, rolled sleeves, beard, A-pose, full body, game-ready PBR`
- Dışa aktarma: **FBX** (dokular gömülü) veya OBJ + dokular, zip olarak.

### 2. Mixamo'da iskelet ve animasyon (ücretsiz, Adobe hesabı gerekir)
1. mixamo.com → **Upload Character** → Meshy FBX dosyasını seç.
2. Otomatik iskelet ekranında işaretleri yerleştir: çene, bilekler, dirsekler, dizler, kasık → **Next**.
3. Animasyonları ara ve her birini indir:
   - **Muhafız:** Sword And Shield Idle · Walk · Run · Slash · Attack · Impact · Death · (isteğe bağlı Casting / Power Up)
   - **Avcı:** Standing Idle · Walk Forward · Run Forward · Draw Arrow · Aim Recoil · React (darbe) · Death
   - **Arkanist:** Standing Idle · Walking · Running · 1H Magic Attack · 2H Magic Area Attack · Hit Reaction · Dying
   - **NPC'ler:** yalnız bir bekleme animasyonu (Breathing Idle, Standing Idle vb.)
4. Yürüme ve koşu için **In Place** kutusunu işaretle.
5. İndirme ayarları:
   - İlk dosya: **FBX Binary, With Skin**, 30 fps.
   - Diğer animasyonlar: **Without Skin**. Dosyalar küçük olur.
   - Dosya adlarını değiştirmeye gerek yok. Durum, Mixamo'nun verdiği addan otomatik çıkarılır.

Meshy'nin kendi "Animate / Rig" özelliği de kullanılabilir. O durumda aynı modelin her animasyonu ayrı GLB olarak indirilir ve hepsi aynı klasöre konur.

## 3. Klasöre koy ve çalıştır
```
assets-src/characters/
  guardian/   ← Muhafız: With Skin FBX + animasyon FBX'leri
  hunter/     ← Avcı
  arcanist/   ← Arkanist
  smith/ keeper/ crafter/ mage/ warden/ stable/ merchant/ fisher/   ← NPC'ler (tek idle dosyası)
  _anims/     ← (isteğe bağlı) ortak animasyonlar; bir karakterde eksik olan durum buradan alınır
```
```bash
node scripts/import-characters.mjs
```
Komut her karakter için şunları yapar:
- Modeli ve animasyonları tek GLB'de birleştirir.
- Kemik adlarını eşler (`mixamorig:` önekleri gibi).
- Kök kaymasını siler.
- Kalça yüksekliğini karaktere uyarlar.
- Yönü iskeletten bulur.
- Üçgen sayısını düşürür: kahraman 16 bin, NPC 11 bin.
- Dokuları en çok 1024 piksele indirir.
- Meshopt ile sıkıştırır ve `models.json`'a yazar.

Seçenekler:
- `--tris 20000`, `--tex 2048`, `--only guardian,hunter`.
- Klasöre `karakter.json` konabilir, örneğin `{ "height": 1.9, "anims": { "attack": "Sword And Shield Slash" } }`.

## Lisans
- **Mixamo:** Ücretsizdir. Adobe'nin SSS'sine göre (forumlarda aktarıldığı kadarıyla) ticari oyunlarda kullanılabilir, ancak modeller tek başına yeniden dağıtılamaz. Yayından önce Adobe'nin güncel koşullarını kontrol edin.
- **Meshy:** Ücretsiz plandaki çıktılar için lisans koşulları farklı olabilir. Ticari kullanım hakkını Meshy'nin güncel fiyatlandırma/lisans sayfasından doğrulayın.
