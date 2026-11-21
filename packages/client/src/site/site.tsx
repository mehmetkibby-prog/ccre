/**
 * Site iskeleti: adres yönlendirme (ana sayfa, forum, gizlilik), üst menü, alt bilgi, ön kayıt bölümleri ve
 * gizlilik politikası. Oyunun kendisi aynı tek sayfa uygulamasında; site sayfaları oyuna girmeden gezilir.
 */
import React, { useEffect, useState } from 'react';
import { SITE, PREREG_REWARD } from '@col/shared';
import { api } from '../api.ts';

// ───────── yönlendirme ─────────
/** Site sayfaları kendi kaydırma kabında (.site) kayar: oyun ekranı sayfayı kaydırmaz. */
const scrollTop = () => setTimeout(() => document.querySelector('.site')?.scrollTo({ top: 0 }), 0);
export function navigate(to: string) {
  if (to !== location.pathname + location.search) {
    history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  scrollTop();
}
export function useRoute() {
  const [r, setR] = useState(() => location.pathname + location.search);
  useEffect(() => {
    const on = () => setR(location.pathname + location.search);
    addEventListener('popstate', on);
    return () => removeEventListener('popstate', on);
  }, []);
  return r;
}
/** <a> gibi davranan iç bağlantı (sayfa yenilenmez, orta tıkla yeni sekme çalışır) */
export function Link({ to, className, children, onClick }: { to: string; className?: string; children: React.ReactNode; onClick?: () => void }) {
  return <a href={to} className={className} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; e.preventDefault(); onClick?.(); navigate(to); }}>{children}</a>;
}

// ───────── durum (açılış, ön kayıt sayısı) ─────────
export interface SiteStatus { online: number; open: boolean; mode: string; openAt: number | null; msg: string; prereg: number }
export function useSiteStatus() {
  const [st, setSt] = useState<SiteStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => api('/api/status').then((r) => { if (alive) setSt({ online: r.online ?? 0, open: !r.opening || r.opening.mode === 'open', mode: r.opening?.mode ?? 'open', openAt: r.opening?.openAt ?? null, msg: r.opening?.message ?? '', prereg: r.prereg ?? 0 }); }).catch(() => {});
    load(); const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return st;
}

// ───────── üst menü / alt bilgi ─────────
export function SiteMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="site-mark">
      <defs><linearGradient id="sm-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8e2a4" /><stop offset=".55" stopColor="#d9a441" /><stop offset="1" stopColor="#8a5e1c" /></linearGradient></defs>
      <path d="M24 3 L43 14 L43 34 L24 45 L5 34 L5 14 Z" fill="#14100a" stroke="url(#sm-g)" strokeWidth="2.4" />
      <path d="M24 11 C17 11 13 17 14 23 C15 30 21 33 24 37 C27 33 33 30 34 23 C35 17 31 11 24 11 Z" fill="none" stroke="#3fe08a" strokeWidth="2.2" />
      <circle cx="24" cy="23" r="4.2" fill="#3fe08a" />
    </svg>
  );
}
export function SiteNav({ onCta, ctaLabel }: { onCta?: () => void; ctaLabel?: string }) {
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const at = (p: string) => (p === '/' ? route === '/' || route.startsWith('/?') : route.startsWith(p));
  const items: [string, string][] = [['/', 'Ana Sayfa'], ['/#odul', 'Ön Kayıt Ödülü'], ['/#oyun', 'Oyun'], ['/forum', 'Forum']];
  const go = (to: string) => {
    setOpen(false);
    const hash = to.split('#')[1];
    if (hash) {
      if (location.pathname !== '/') navigate('/');
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      return;
    }
    navigate(to);
  };
  return (
    <header className={'site-nav' + (open ? ' open' : '')}>
      <div className="sn-in">
        <a href="/" className="sn-brand" onClick={(e) => { e.preventDefault(); go('/'); }}><SiteMark /><span><b>CORE OF LIFE</b><small>3D · ÇEVRİMİÇİ RPG</small></span></a>
        <nav className="sn-links">
          {items.map(([to, label]) => <a key={to} href={to} className={!to.includes('#') && at(to) ? 'on' : ''} onClick={(e) => { e.preventDefault(); go(to); }}>{label}</a>)}
        </nav>
        {onCta && <button className="sn-cta" onClick={() => { setOpen(false); onCta(); }}>{ctaLabel ?? 'Ön Kayıt'}</button>}
        <button className="sn-burger" aria-label="Menü" onClick={() => setOpen(!open)}><i /><i /><i /></button>
      </div>
    </header>
  );
}
export function SiteFooter() {
  const y = new Date().getFullYear();
  return (
    <footer className="site-foot">
      <div className="sf-in">
        <div className="sf-brand"><SiteMark size={30} /><div><b>Core of Life 3D</b><small>Tarayıcıdan ve telefondan oynanan çevrimiçi RPG</small></div></div>
        <nav className="sf-links">
          <Link to="/forum">Forum</Link>
          <Link to="/gizlilik">Gizlilik Politikası</Link>
          <a href={`mailto:${SITE.supportEmail}`}>İletişim</a>
        </nav>
        <div className="sf-copy">© {y} {SITE.company}. Tüm hakları saklıdır. · <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></div>
      </div>
    </footer>
  );
}

// ───────── ön kayıt ödülü ─────────
export function RewardSection({ onCta, open }: { onCta: () => void; open: boolean }) {
  return (
    <section className="site-sec reward" id="odul">
      <div className="sec-head"><span className="eyebrow">Ön Kayıt Ödülü</span><h2>Erken gelen savaşçıya özel sandık</h2><p>Oyun açılmadan hesabını oluştur; <b>Ön Kayıt Sandığı</b> ilk karakterinin çantasında seni beklesin. Hesap başına bir kez verilir.</p></div>
      <div className="rw-grid">
        <div className="rw-chest">
          <div className="rw-glow" />
          <img src="/site/prereg_chest.png" alt="Ön Kayıt Sandığı" width={220} height={220} />
          <b>Ön Kayıt Sandığı</b>
          <small>Çantadan aç, içindekiler hemen senin</small>
        </div>
        <div className="rw-items">
          <div className="rw-item fox">
            <img src="/site/green_fox.png" alt="Yeşil Tilki" width={170} height={170} />
            <div><span className="tag">3 günlük pet</span><b>Yeşil Tilki</b><p>Zümrüt tüylü, sadık yol arkadaşın.</p>
              <div className="rw-stats"><span>+{PREREG_REWARD.petAtk} Saldırı</span><span>+{PREREG_REWARD.petHp} Can</span></div></div>
          </div>
          <div className="rw-item gem">
            <img src="/icons/gem.png" alt="" width={88} height={88} />
            <div><span className="tag">Hediye</span><b>{PREREG_REWARD.gems} Mücevher</b><p>İlk Kırmızı İksirlerin ve beceri geliştirmelerin için başlangıç desteği.</p></div>
          </div>
          {!open && <button className="site-btn primary big" onClick={onCta}>Ön Kayıt Ol, Ödülü Kap</button>}
        </div>
      </div>
    </section>
  );
}

// ───────── oyun tanıtımı ─────────
const CLASSES_INFO = [
  { id: 'guardian', name: 'Muhafız', role: 'Ön saf · Dayanıklı', desc: 'Kılıç ve kalkanla düşmanı üstüne çeker, sersemletir; takımını ayakta tutar.' },
  { id: 'hunter', name: 'Avcı', role: 'Menzilli · Çevik', desc: 'Yayıyla uzaktan isabet; ok yağmuru ve keskin nişanla kalabalığı eritir.' },
  { id: 'arcanist', name: 'Arkanist', role: 'Büyü · Alan hasarı', desc: 'Şimşek ve büyü küreleriyle geniş alanlara hasar verir, yoldaşlarını iyileştirir.' },
];
const FEATURES = [
  { img: 'f_tower', title: 'Kadim Kule', text: '10 katlı kule; bulmacalar, tuzaklar ve zirvede Azrail.' },
  { img: 'f_forge', title: 'Kor Kulesi', text: 'Dalga dalga gelen düşmanlar, ateş bulmacaları ve Karademir.' },
  { img: 'f_plus', title: 'Artı Basma', text: '+6\'ya kadar yükselt; +5 kor ateşi, +6 yıldız ateşi efektleri.' },
  { img: 'f_evo', title: 'Silah Evrimi', text: 'Avladıkça evrilen silahlar: üç kademe, yeni görünüm ve güç.' },
  { img: 'f_guild', title: 'Lonca Savaşları', text: 'Sancağını dik, loncanla savaş; vergi, hazine ve şeref.' },
  { img: 'f_mount', title: 'Binekler', text: 'Atına atla, haritaları rüzgâr gibi geç.' },
  { img: 'f_garden', title: 'Şifa Bahçesi', text: 'Otları topla, iksirleri kaynat; avda güç kazan.' },
  { img: 'f_classes', title: 'Eşsiz Teçhizat', text: 'Kızıl ve Eşsiz setler, parıltılı silahlar ve kanatlar.' },
];
export function GameSections() {
  return (
    <>
      <section className="site-sec classes" id="oyun">
        <div className="sec-head"><span className="eyebrow">Sınıflar</span><h2>Yolunu seç</h2><p>Üç sınıf, her birinin kendine özgü beceri ağacı ve uzmanlık dalı.</p></div>
        <div className="cls-grid">
          {CLASSES_INFO.map((c) => (
            <article key={c.id} className={'cls-card ' + c.id}>
              <img src={`/site/c_${c.id}.webp`} alt={c.name} loading="lazy" />
              <div className="cls-body"><span className="tag">{c.role}</span><h3>{c.name}</h3><p>{c.desc}</p></div>
            </article>
          ))}
        </div>
      </section>
      <section className="site-sec features">
        <div className="sec-head"><span className="eyebrow">Dünya</span><h2>Keşfedecek çok şey var</h2><p>Zindanlar, boss'lar, ticaret ve lonca savaşları; hepsi tarayıcında, kurulum gerektirmeden.</p></div>
        <div className="ft-grid">
          {FEATURES.map((f) => (
            <article key={f.img} className="ft-card"><div className="ft-img" style={{ backgroundImage: `url(/site/${f.img}.webp)` }} /><div className="ft-body"><h3>{f.title}</h3><p>{f.text}</p></div></article>
          ))}
        </div>
      </section>
    </>
  );
}

/** Son duyurular (forumdan) */
export function NewsSection() {
  const [list, setList] = useState<{ id: number; title: string; createdAt: number; author: string }[] | null>(null);
  useEffect(() => { api('/api/forum/topics?cat=duyurular').then((r) => setList((r.topics ?? []).slice(0, 4))).catch(() => setList([])); }, []);
  if (!list || !list.length) return null;
  return (
    <section className="site-sec news">
      <div className="sec-head row"><div><span className="eyebrow">Duyurular</span><h2>Haberler</h2></div><Link to="/forum/b/duyurular" className="site-btn ghost">Tümü</Link></div>
      <div className="news-list">
        {list.map((n) => <Link key={n.id} to={`/forum/k/${n.id}`} className="news-item"><time>{new Date(n.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</time><b>{n.title}</b><span>Devamını oku →</span></Link>)}
      </div>
    </section>
  );
}

// ───────── gizlilik politikası ─────────
const PRIVACY_UPDATED = '21 Kasım 2026';
export function PrivacyPage() {
  useEffect(() => { document.title = 'Gizlilik Politikası · Core of Life 3D'; return () => { document.title = 'Core of Life 3D'; }; }, []);
  const S = SITE;
  const toc = ['Veri sorumlusu', 'Topladığımız veriler', 'İşleme amaçları', 'Hukuki sebepler', 'Çerezler ve yerel depolama', 'Verilerin aktarılması', 'Saklama süreleri', 'Veri güvenliği', 'Çocukların gizliliği', 'Haklarınız (KVKK m. 11)', 'Başvuru yöntemi', 'Topluluk alanları', 'Değişiklikler', 'İletişim'];
  return (
    <div className="site page">
      <SiteNav />
      <main className="doc">
        <header className="doc-head"><span className="eyebrow">Yasal</span><h1>Gizlilik ve Kişisel Verilerin Korunması Politikası</h1><p>Son güncelleme: {PRIVACY_UPDATED}</p></header>
        <nav className="doc-toc" aria-label="İçindekiler"><b>İçindekiler</b><ol>{toc.map((t, i) => <li key={t}><a href={'#g' + (i + 1)} onClick={(e) => { e.preventDefault(); document.getElementById('g' + (i + 1))?.scrollIntoView({ behavior: 'smooth' }); }}>{t}</a></li>)}</ol></nav>
        <article className="doc-body">
          <p>{S.company} olarak oyuncularımızın gizliliğine önem veriyoruz. Bu politika, {S.gameName} oyunu, internet sitemiz ve forumumuz (birlikte “Hizmetler”) kullanılırken hangi kişisel verilerin, hangi amaçlarla ve nasıl işlendiğini; 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) kapsamındaki haklarınızı açıklar.</p>

          <h2 id="g1">1. Veri sorumlusu</h2>
          <p>Hizmetler kapsamında işlenen kişisel verilerin veri sorumlusu <b>{S.company}</b>’dir. Kişisel verilerinizle ilgili her türlü soru ve talebiniz için <a href={`mailto:${S.supportEmail}`}>{S.supportEmail}</a> adresine yazabilirsiniz.</p>

          <h2 id="g2">2. Topladığımız veriler</h2>
          <ul>
            <li><b>Hesap bilgileri:</b> kullanıcı adı, e-posta adresi, parolanızın tek yönlü şifrelenmiş özeti (parolanın kendisi saklanmaz), hesap açılış ve son giriş tarihleri, ön kayıt bilgisi.</li>
            <li><b>Oyun verileri:</b> karakter adları, sınıf, seviye, envanter ve ekipman, oyun içi para birimleri, görev ve sıralama bilgileri, lonca üyeliği, oyun içi alım-satım ve takas kayıtları.</li>
            <li><b>İletişim içerikleri:</b> oyun içi sohbet ve özel mesajlar, forumda açtığınız konular ve yazdığınız iletiler, destek yazışmaları.</li>
            <li><b>Teknik veriler:</b> IP adresi, tarayıcı ve cihaz türü, oturum bilgisi, bağlantı ve hata kayıtları, oyunun akıcılığına ilişkin performans ölçümleri.</li>
            <li><b>Ödeme ile ilgili veriler:</b> Nesne Market alımlarında işlem kaydı (ürün, tutar, tarih). Kart bilgileriniz tarafımızca işlenmez ve saklanmaz; ödeme ve E-PIN işlemleri ilgili hizmet sağlayıcılarca yürütülür.</li>
          </ul>

          <h2 id="g3">3. İşleme amaçları</h2>
          <ul>
            <li>Hesabınızı oluşturmak, kimliğinizi doğrulamak ve oturumunuzu sürdürmek,</li>
            <li>Oyunu sunmak, ilerlemenizi kaydetmek ve satın aldığınız ürünleri teslim etmek,</li>
            <li>Ön kayıt ve etkinlik ödüllerini hesabınıza tanımlamak,</li>
            <li>Hile, dolandırıcılık, hesap çalma ve kötüye kullanımı önlemek; oyun kurallarını uygulamak,</li>
            <li>Destek taleplerinizi yanıtlamak, parola sıfırlama gibi hesap işlemlerini yürütmek,</li>
            <li>Forum ve sohbet gibi topluluk alanlarını yönetmek ve denetlemek,</li>
            <li>Hizmetlerin güvenliğini, sürekliliğini ve performansını ölçmek ve geliştirmek,</li>
            <li>Yasal yükümlülüklerimizi yerine getirmek ve yetkili makamların taleplerini karşılamak.</li>
          </ul>

          <h2 id="g4">4. Hukuki sebepler</h2>
          <p>Kişisel verileriniz KVKK’nın 5. maddesinde yer alan; bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (oyun hizmetinin sunulması), veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi, bir hakkın tesisi, kullanılması veya korunması ve temel hak ve özgürlüklerinize zarar vermemek kaydıyla meşru menfaatlerimiz (örneğin güvenlik ve hile önleme) hukuki sebeplerine dayanılarak işlenir. Tanıtım amaçlı e-posta gönderimi gibi açık rıza gerektiren işlemler yalnızca onayınızla yapılır ve onayınızı dilediğiniz zaman geri alabilirsiniz.</p>

          <h2 id="g5">5. Çerezler ve yerel depolama</h2>
          <p>Hizmetlerde yalnızca çalışması için gerekli teknolojiler kullanılır: oturumunuzu tanıyan güvenli bir çerez (<code>HttpOnly</code>, yalnız bu site) ve tarayıcınızda grafik kalitesi, ses ve arayüz tercihlerinizi hatırlayan yerel depolama kayıtları. Reklam veya üçüncü taraf izleme çerezi kullanmıyoruz. Tarayıcı ayarlarınızdan bu kayıtları silebilirsiniz; oturum çerezi silinirse oturumunuz kapanır.</p>

          <h2 id="g6">6. Verilerin aktarılması</h2>
          <p>Kişisel verileriniz satılmaz ve kiralanmaz. Veriler yalnızca Hizmetlerin sunulması için gereken ölçüde; sunucu, barındırma ve içerik dağıtım/saldırı koruma hizmeti aldığımız iş ortaklarına, ödeme ve E-PIN hizmet sağlayıcılarına ve kanunen yetkili kamu kurum ve kuruluşlarına aktarılabilir. Altyapı sağlayıcılarımızın yurt dışında bulunması hâlinde aktarım KVKK’nın 9. maddesine uygun olarak yapılır.</p>

          <h2 id="g7">7. Saklama süreleri</h2>
          <p>Verileriniz hesabınız açık olduğu sürece saklanır. Hesabınızın silinmesini talep ettiğinizde, yasal saklama yükümlülükleri ve olası uyuşmazlıklar için gerekli olanlar dışındaki veriler makul süre içinde silinir veya anonim hâle getirilir. Bağlantı ve güvenlik kayıtları ilgili mevzuatta öngörülen süreler boyunca tutulur; veri tabanı yedekleri sınırlı sayıda ve dönüşümlü olarak saklanır.</p>

          <h2 id="g8">8. Veri güvenliği</h2>
          <p>Parolalar geri çevrilemeyen bir yöntemle (scrypt) özetlenerek saklanır; site ve oyun bağlantıları TLS ile şifrelenir; verilere erişim yetkiyle sınırlandırılır ve düzenli yedek alınır. İnternet üzerinden iletimin mutlak güvenliği garanti edilemeyeceğinden hesap bilgilerinizi kimseyle paylaşmamanızı öneririz. <b>Yönetim ekibi parolanızı hiçbir zaman sormaz.</b></p>

          <h2 id="g9">9. Çocukların gizliliği</h2>
          <p>Hizmetler 13 yaşından küçük çocuklara yönelik değildir. 18 yaşından küçük kullanıcıların Hizmetleri veli veya vasilerinin bilgisi ve onayıyla kullanmaları gerekir. Velisi olduğunuz bir çocuğun izniniz olmadan hesap açtığını düşünüyorsanız bize yazın; hesabı inceleyip gerekli işlemi yaparız.</p>

          <h2 id="g10">10. Haklarınız (KVKK m. 11)</h2>
          <p>Veri sorumlusuna başvurarak;</p>
          <ul>
            <li>kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme,</li>
            <li>işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
            <li>eksik veya yanlış işlenmişse düzeltilmesini, KVKK’da öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme ve bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini talep etme,</li>
            <li>münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
            <li>kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
          </ul>
          <p>haklarına sahipsiniz.</p>

          <h2 id="g11">11. Başvuru yöntemi</h2>
          <p>Taleplerinizi, hesabınızda kayıtlı e-posta adresinden <a href={`mailto:${S.supportEmail}`}>{S.supportEmail}</a> adresine kullanıcı adınızı belirterek iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz olarak yanıtlanır; işlemin ayrıca bir maliyet gerektirmesi hâlinde Kişisel Verileri Koruma Kurulu’nca belirlenen tarife uygulanabilir. Yanıtımızı yeterli bulmazsanız Kurul’a şikâyette bulunma hakkınız saklıdır.</p>

          <h2 id="g12">12. Topluluk alanları</h2>
          <p>Forumda ve oyun içi genel sohbette paylaştığınız içerikler diğer kullanıcılar tarafından görülebilir. Bu alanlarda telefon numarası, adres veya kimlik bilgisi gibi kişisel bilgilerinizi paylaşmamanızı rica ederiz. Kurallara aykırı içerikler yönetim tarafından kaldırılabilir.</p>

          <h2 id="g13">13. Değişiklikler</h2>
          <p>Bu politika, mevzuattaki veya Hizmetlerdeki değişikliklere göre güncellenebilir. Güncel sürüm her zaman bu sayfada yayımlanır; önemli değişiklikler sitede ve oyun içinde duyurulur.</p>

          <h2 id="g14">14. İletişim</h2>
          <p><b>{S.company}</b><br />E-posta: <a href={`mailto:${S.supportEmail}`}>{S.supportEmail}</a></p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
