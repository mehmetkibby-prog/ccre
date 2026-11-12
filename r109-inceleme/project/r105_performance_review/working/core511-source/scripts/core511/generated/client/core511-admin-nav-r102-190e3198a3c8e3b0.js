// working/core511-source/scripts/core511/admin-navigation-r66.mjs
var ADMIN_GROUPS_R66 = [
  { id: "management", label: "Genel y\xF6netim", items: ["overview", "launch", "registrations", "players", "gm", "updates", "support"] },
  { id: "items", label: "E\u015Fya ve geli\u015Fim", items: ["enchants_r66", "loot", "enhancement491", "materials", "mount_r55", "status", "runes", "specialistSkills459"] },
  { id: "world", label: "Haritalar ve sava\u015F", items: ["zumrut_r93", "castle_r66", "world", "combat", "champion_r102", "battlefield_r102", "solo", "kadim_tower", "sis_mist", "runes_v2", "stone_boss"] },
  { id: "events", label: "Etkinlikler ve \xF6d\xFCller", items: ["events", "newyear_r102", "community", "eventIsland", "quests438", "battle_pass", "wheel483", "cauldron488", "brokenCore464"] },
  { id: "economy", label: "Ekonomi", items: ["economy", "market", "arenaMarket", "epins"] },
  { id: "security", label: "G\xFCvenlik ve sunucu", items: ["security", "afk_suspects", "loadlab477"] }
];
var details = {
  champion_r102: "Giri\u015F bedeli, tecr\xFCbe art\u0131\u015F\u0131 ve on seviye \xF6d\xFClleri",
  battlefield_r102: "Sava\u015F saatleri, oyuncu \xF6ld\xFCrme ve Zafer Sand\u0131\u011F\u0131",
  newyear_r102: "\xC7orap d\xFC\u015Fme oran\u0131 ve Y\u0131lba\u015F\u0131 Sand\u0131\u011F\u0131 i\xE7eri\u011Fi",
  zumrut_r93: "Balta, kazma, toplama ve \u015Fansl\u0131 \xFCretim tezg\xE2h\u0131",
  overview: "Canl\u0131 oyuncular ve sunucu performans\u0131",
  launch: "\xD6n kay\u0131t, a\xE7\u0131l\u0131\u015F saati ve bak\u0131m",
  registrations: "Hesaplar ve erken giri\u015F izni",
  players: "Karakterler, e\u015Fya g\xF6nderme ve hesap i\u015Flemleri",
  gm: "GM yetkileri ve sunucu duyurular\u0131",
  updates: "Yeni i\xE7erikleri \xF6nizleme ve a\xE7ma",
  support: "Oyuncu destek talepleri",
  enchants_r66: "Efsun ihtimalleri ve d\xF6rt kademe de\u011Ferleri",
  loot: "Ganimet tablolar\u0131, sand\u0131klar ve e\u015Fya g\xFCc\xFC",
  enhancement491: "Art\u0131 basma oranlar\u0131, malzemeler ve Kor M\xFChr\xFC",
  materials: "Geli\u015Ftirme malzemelerinin d\xFC\u015Fme oranlar\u0131",
  mount_r55: "Binek malzemeleri ve d\xFC\u015Fme haritalar\u0131",
  status: "Stat\xFC puanlar\u0131n\u0131n verdi\u011Fi bonuslar",
  runes: "R\xFCn geli\u015Fimi ve bonuslar",
  specialistSkills459: "Uzmanl\u0131k becerilerinin g\xFCc\xFC ve s\xFCreleri",
  castle_r66: "Sava\u015F saati, test modu ve sand\u0131k \xF6d\xFClleri",
  world: "D\xFCnya, haritalar, canavarlar ve kanallar",
  combat: "Seviye, deneyim, r\xFCtbe ve sava\u015F dengesi",
  solo: "Solo zindan kademeleri ve ganimetleri",
  kadim_tower: "Kule katlar\u0131, Azrail ve sand\u0131k i\xE7eri\u011Fi",
  sis_mist: "Sis Yar\u0131\u011F\u0131 portallar\u0131, d\xFC\u015Fmanlar\u0131 ve \xF6d\xFClleri",
  runes_v2: "Karanl\u0131k R\xFCn Sahili ve boss ayarlar\u0131",
  stone_boss: "Kara Ta\u015F Muhaf\u0131z\u0131 g\xFCc\xFC ve ganimetleri",
  events: "Etkinlik takvimi ve bonuslar",
  community: "Ortak hedefler ve kademe \xF6d\xFClleri",
  eventIsland: "Etkinlik Adas\u0131, boss plan\u0131 ve duyurular",
  quests438: "G\xF6rev hedefleri ve \xF6d\xFClleri",
  battle_pass: "Sava\u015F Bileti g\xF6revleri ve \xF6d\xFClleri",
  wheel483: "\xC7ark \xF6d\xFClleri ve \xE7\u0131kma oranlar\u0131",
  cauldron488: "Kazan tarifleri ve \xF6d\xFClleri",
  brokenCore464: "Bulmaca s\u0131kl\u0131\u011F\u0131 ve \xF6d\xFCller",
  economy: "Bal\u0131k\xE7\u0131l\u0131k, sat\u0131\u015F ve demirci ekonomisi",
  market: "Nesne Market fiyatlar\u0131 ve indirimleri",
  arenaMarket: "Arena Market \xFCr\xFCnleri ve fiyatlar\u0131",
  epins: "E-PIN olu\u015Fturma ve kod kay\u0131tlar\u0131",
  security: "Hesap g\xFCvenli\u011Fi ve hile kay\u0131tlar\u0131",
  afk_suspects: "\u015E\xFCpheli hareketler ve do\u011Frulama kay\u0131tlar\u0131",
  loadlab477: "Ayr\u0131 test sunucusunda y\xFCk denemeleri"
};
var fold = (value) => String(value).toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("\u0131", "i");
function adminSectionR66(group, fallback) {
  const keys = group.fields?.map((row) => row[0]) ?? [];
  if (keys.length && keys.every((key) => key.startsWith("enchant_"))) return "enchants_r66";
  if (fallback === "loot" && keys.some((key) => /^(?:afk_island_|(?:forest|frozen|black|ancient)_.*respawn|monster_rest_regen_|player_rest_regen_|ancient_boss_)/.test(key))) return "world";
  if (fallback === "loot" && keys.every((key) => key.startsWith("guild_create_"))) return "economy";
  return fallback;
}
var css = `
.admin-r66 .admin-page-enchants_r66 .settings-card{grid-column:1/-1}.admin-r66 .castle59-admin input,.admin-r66 .castle59-admin select{border:1px solid #526958;border-radius:7px;background:#102019;color:#f2ecda;min-height:42px;color-scheme:dark;font:inherit}.admin-r66 .castle59-admin button{border:1px solid #688064;border-radius:7px;background:#29422e;color:#f1dfb8;min-height:42px;font:inherit}.admin-r66 .castle59-admin button:hover:not(:disabled){background:#38583c;border-color:#ccb572}.admin-r66 .castle59-admin button:disabled{opacity:.45;cursor:default}.admin-r66 .castle59-admin :is(input,select,button):focus-visible{outline:2px solid #edcf86;outline-offset:2px}.admin-r66 .castle59-admin>label{margin:16px 0}.admin-r66 .castle59-admin>p{margin:12px 0}.admin-r66 .castle59-admin h2{color:#efd6a0}.admin-r66 .castle59-admin footer{align-items:center}
.admin-r66{--r66-line:#395147;--r66-gold:#e3c785}.admin-r66 *{box-sizing:border-box}.admin-r66 .admin-header{gap:16px;flex-wrap:wrap}.admin-r66 .admin-notice{overflow-wrap:anywhere}.admin-r66 .admin-stats{gap:10px}.r66-nav{margin:22px 0;padding:20px;border:1px solid var(--r66-line);border-radius:14px;background:linear-gradient(120deg,#152b23,#101d18);color:#f0eee4;min-width:0}.r66-nav button,.r66-nav input{font:inherit}.r66-nav button{cursor:pointer}.r66-top{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:16px}.r66-top strong{font-size:18px;color:var(--r66-gold)}.r66-top p{margin:4px 0 0;color:#aabdb2;font-size:12px}.r66-search{display:flex;align-items:center;gap:10px;min-width:250px}.r66-search input{width:100%;min-width:0;padding:11px 13px;border:1px solid #527361;border-radius:8px;background:#0c1914;color:#f2f3ec;font-size:14px}.r66-search button{border:0;background:transparent;color:#e3c785;padding:10px}.r66-quick{display:flex;gap:8px;flex-wrap:wrap;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid var(--r66-line)}.r66-quick button{min-height:38px;padding:8px 12px;border:1px solid #445f50;border-radius:7px;background:#1a3127;color:#ecebdc;font-size:12px}.r66-quick button[aria-current=page]{border-color:var(--r66-gold);color:var(--r66-gold)}.r66-groups{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px}.r66-groups button{padding:10px 13px;min-height:42px;background:transparent;border:1px solid transparent;border-radius:8px;color:#b5c6bb;font-size:13px}.r66-groups button[aria-pressed=true]{background:#304a39;border-color:#668568;color:#fff4ce}.r66-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.r66-options button{display:flex;align-items:flex-start;gap:11px;min-height:78px;padding:14px 12px;border:1px solid #344b3c;border-radius:9px;background:#13271e;color:#eceddf;text-align:left;min-width:0}.r66-options button:hover,.r66-quick button:hover{background:#244732;border-color:#82a37f}.r66-options button[aria-current=page]{background:#274a32;border-color:var(--r66-gold);box-shadow:inset 3px 0 var(--r66-gold)}.r66-icon{display:flex;flex:0 0 22px;color:#dfc689;padding-top:2px}.r66-icon svg,.r66-icon img{max-width:22px;height:22px}.r66-options strong{display:block;font-size:13px;line-height:1.45}.r66-options small{display:block;color:#afc0b2;font-size:11px;line-height:1.5;margin-top:4px}.r66-options span{min-width:0;overflow-wrap:anywhere}.r66-nav button:focus-visible,.r66-nav input:focus-visible{outline:2px solid #edcf86;outline-offset:3px}.r66-result{font-size:12px;color:#b7c7ba;margin:0 0 12px}.r66-empty{padding:18px;color:#c5d2c6;border:1px dashed #536a59;border-radius:8px}.r66-breadcrumb{margin:20px 0 12px;padding-bottom:12px;border-bottom:1px solid #384d3e;color:#b1c3b4;font-size:12px}.r66-breadcrumb strong{font-size:17px;color:#eedbae;margin-left:10px}.admin-r66 .overview-links{display:none}.admin-r66 .admin-grid{min-width:0}.admin-r66 .admin-grid>*,.admin-r66 .settings-groups>*{min-width:0}.admin-r66 .admin-card h2,.admin-r66 legend{overflow-wrap:anywhere}
@media(max-width:1000px){.r66-options{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:650px){.r66-nav{padding:14px;margin:14px 0}.r66-top{align-items:stretch;flex-direction:column;gap:12px}.r66-search{min-width:0;width:100%}.r66-options{grid-template-columns:repeat(2,minmax(0,1fr))}.r66-groups{gap:5px}.r66-groups button{flex:1 1 30%;padding:9px 5px;font-size:12px}.r66-options button{padding:12px 9px;gap:8px}.r66-quick{gap:6px}.r66-quick button{flex:1 1 auto}.r66-breadcrumb strong{display:block;margin:5px 0 0}.admin-r66 .admin-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){.r66-nav *{scroll-behavior:auto}}
`;
function createAdminNavigatorR66(React) {
  const h = React.createElement;
  return function AdminNavigator({ rows, selected, onSelect }) {
    const groupFor = (id) => ADMIN_GROUPS_R66.find((group2) => group2.items.includes(id)) ?? ADMIN_GROUPS_R66[0];
    const [group, setGroup] = React.useState(() => groupFor(selected).id), [query, setQuery] = React.useState("");
    React.useEffect(() => setGroup(groupFor(selected).id), [selected]);
    const available = new Map(rows.map((row) => [row.id, { ...row, note: details[row.id] ?? row.note, label: row.id === "afk_suspects" ? "\u015E\xFCpheliler" : row.label }]));
    const ordered = [...ADMIN_GROUPS_R66.flatMap((g) => g.items).map((id) => available.get(id)).filter(Boolean), ...rows.filter((row) => !ADMIN_GROUPS_R66.some((g) => g.items.includes(row.id)))];
    const needle = fold(query.trim()), shown = ordered.filter((row) => needle ? fold(row.label + " " + row.note + " " + (row.id === "players" ? "k\xFCpe bilezik kemer hediye" : "")).includes(needle) : groupFor(row.id).id === group);
    const choose = (id) => {
      setQuery("");
      onSelect(id);
    }, active = available.get(selected), renderButton = (row, quick = false) => h("button", { key: row.id, type: "button", "data-section": row.id, "aria-current": selected === row.id ? "page" : void 0, onClick: () => choose(row.id) }, quick ? row.label : [h("span", { className: "r66-icon", "aria-hidden": true, key: "icon" }, row.icon), h("span", { key: "label" }, h("strong", null, row.label), h("small", null, row.note))]);
    return h(
      React.Fragment,
      null,
      h("style", null, css),
      h(
        "nav",
        { className: "r66-nav", "aria-label": "Y\xF6netim b\xF6l\xFCmleri" },
        h("div", { className: "r66-top" }, h("div", null, h("strong", null, "Y\xF6netim merkezi"), h("p", null, "B\xF6l\xFCm se\xE7 veya arad\u0131\u011F\u0131n ayar\u0131 bul.")), h("label", { className: "r66-search" }, h("input", { type: "search", "aria-label": "Panelde b\xF6l\xFCm ara", placeholder: "Efsun, kale, oyuncu\u2026", value: query, onChange: (e) => setQuery(e.target.value) }), query && h("button", { type: "button", onClick: () => setQuery(""), "aria-label": "Aramay\u0131 temizle" }, "Temizle"))),
        h("div", { className: "r66-quick", "aria-label": "S\u0131k kullan\u0131lanlar" }, ...["launch", "registrations", "players", "enchants_r66", "castle_r66"].map((id) => available.get(id)).filter(Boolean).map((row) => renderButton(row, true))),
        h("div", { className: "r66-groups", "aria-label": "B\xF6l\xFCm gruplar\u0131" }, ...ADMIN_GROUPS_R66.map((g) => h("button", { key: g.id, type: "button", "aria-pressed": !needle && g.id === group, onClick: () => {
          setGroup(g.id);
          setQuery("");
        } }, g.label))),
        needle && h("p", { className: "r66-result", role: "status" }, shown.length + " b\xF6l\xFCm bulundu"),
        shown.length ? h("div", { className: "r66-options" }, ...shown.map((row) => renderButton(row))) : h("p", { className: "r66-empty" }, "B\xF6l\xFCm bulunamad\u0131. Daha k\u0131sa bir kelime deneyebilirsin.")
      ),
      h("div", { className: "r66-breadcrumb", "aria-live": "polite" }, groupFor(selected).label, h("strong", null, active?.label ?? "Y\xF6netim"))
    );
  };
}
export {
  ADMIN_GROUPS_R66,
  adminSectionR66,
  createAdminNavigatorR66
};
