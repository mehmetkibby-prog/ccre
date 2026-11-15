import assert from 'node:assert/strict';
export function patchGameR118(original,names,media){
 let text=original;const edits=[];
 function edit(label,from,to,count=1){assert.equal(text.split(from).length-1,count,label);text=text.replaceAll(from,to);edits.push({label,from,to,count});}
 const imports=`import {createRoyalUIR118,openRoyalR118} from './${names.ui}';\nimport {ROYAL_MEDIA_R118,drawRoyalArmorFxR118,drawRoyalWeaponFxR118} from './${names.art}';\nimport {createChampionsViewR118,CHAMPIONS_BOUNDS_R118,CHAMPIONS_SPAWN_R118,CHAMPIONS_PVP_NOTICE_R118,championsSegmentR118,clampChampionsR118} from './${names.map}';\nimport {createRoyalPresentationR118,royalEligibleClientR118} from './${names.presentation}';\n`;
 text=imports+text;edits.push({label:'new feature imports',prefix:imports});
 edit('initialize presentation beside existing UI','const colContentR102=createContentUIR102',`const colChampionsR118=createChampionsViewR118(ROYAL_MEDIA_R118);\nconst colRoyalArtR118=createRoyalPresentationR118(R,ROYAL_MEDIA_R118,Iy);\nconst colRoyalR118=createRoyalUIR118(R,{Dialog:It,Content:kt,Header:Pt,Title:jt,Description:Ct,icon:colRoyalArtR118.icon});\nconst colContentR102=createContentUIR102`);
 edit('royal host uses authoritative command ingress','children: [R.createElement(colContentR102.Host,',"children: [R.createElement(colRoyalR118.Host,{key:'royal:'+X2?.id,own:X2,world:U2,joined:Ea2,post:Q,suspended:Xo2,onChanged:async()=>{I2.current=true;await J(true);}}),R.createElement('style',null,'.rarity-royal{--rarity-color:#e8cf8c;color:#f4e6bc}.rarity-royal.inspectable-item,.rarity-royal.gear-slot{border-color:#d6b66d}.royal118-gear-icon{object-fit:contain}.champions118-destination strong{color:#f2d48e}'),R.createElement(colContentR102.Host,");
 edit('Haso salvage entry','children: [R.createElement(colContentR102.ForgeEntry,{area:U2?.area}),','children: [R.createElement(colRoyalR118.SalvageEntry,{area:U2?.area,onOpen:()=>{cd2(false);hd2(false);}}),R.createElement(colContentR102.ForgeEntry,{area:U2?.area}),');
 // The smith setter is resolved by the builder from the enclosing existing dialog.
 edit('champions hunting destination','Zs2 === `hunt` && (0, z.jsxs)(`div`, { className: `teleport-grid`, children: [',`Zs2 === \`hunt\` && (0, z.jsxs)(\`div\`, { className: \`teleport-grid\`, children: [R.createElement('button',{className:'champions118-destination',disabled:$2==='champions'||!royalEligibleClientR118(X2)||U2?.champions?.enabled===false,onClick:()=>{Xs2(false);Wb('champions');}},R.createElement('span',{className:'teleport-icon'},'♛'),R.createElement('span',null,R.createElement('strong',null,'Şampiyonlar Diyarı'),R.createElement('small',null,'Şampiyon Lv 1 · PvP açık · Kraliyet Tacı')),R.createElement('b',null,$2==='champions'?'BURADASIN':'IŞINLAN')),`);
 edit('royal separate town panel','Zs2 === `town` && (0, z.jsxs)(`div`, { className: `teleport-grid`, children: [',"Zs2 === `town` && (0, z.jsxs)(`div`, { className: `teleport-grid`, children: [R.createElement(colRoyalR118.RoyalEntry,{area:U2?.area,onOpen:()=>Xs2(false)}),");
 edit('champion friendly equip gate','if (n3 && !yu(n3, r3?.level)) {',"if(n3?.rarity==='royal'&&!royalEligibleClientR118(r3)){K2('Kraliyet eşyalarını kuşanmak için Şampiyon Lv 1 olmalısın.');return;}\n    if (n3 && !yu(n3, r3?.level)) {");
 edit('royal shares emerald family, no second bonus','const definition = hl[rarity];',"if(rarity==='royal')rarity='emerald';\n  const definition = hl[rarity];");
 edit('mixed royal and emerald family count','item.equipped === 1 && item.rarity === rarity',"item.equipped === 1 && (rarity==='emerald'?['emerald','royal'].includes(item.rarity):item.rarity===rarity)");
 edit('family label','emerald: EMERALD_SET444 }), gl',`emerald: {...EMERALD_SET444,name:'Kadim Zümrüt / Hükümdar Kraliyet'} }), gl`);
 edit('royal gear icon','function rv({ kind: e3, role: t2, rarity: n2, enchantments: r2, item_name, name }) {',"function rv({ kind: e3, role: t2, rarity: n2, enchantments: r2, item_name, name }) {\n  if(n2==='royal')return R.createElement(colRoyalArtR118.Icon,{kind:e3,role:t2});");
 edit('royal weapon icon','function uv(props) {',"function uv(props) {\n  if(props.rarity==='royal')return R.createElement(colRoyalArtR118.Icon,{...props,kind:'weapon'});");
 edit('royal ground and material icons','function zp(e3) {',"function zp(e3) {\n  const royalArt=colRoyalArtR118.ground(e3);if(royalArt)return royalArt;");
 edit('royal hidden in quick sale','![`unique`, `infinite`, "emerald"].includes(e4.rarity)','![`unique`, `infinite`, "emerald", "royal"].includes(e4.rarity)',3);
 edit('market material icons','ZR93.zumrutMarketIconR93(R,e4.item_id)', 'colRoyalArtR118.material(e4.item_id) ?? ZR93.zumrutMarketIconR93(R,e4.item_id)');
 edit('inventory material icons','ZR93.zumrutMarketIconR93(R,e3)', 'colRoyalArtR118.material(e3) ?? ZR93.zumrutMarketIconR93(R,e3)');
 edit('all gear icon source','function gear(kind, role, rarity) {',"function gear(kind, role, rarity) {\n    if(rarity==='royal')return [colRoyalArtR118.icon(kind,role),1,1,0,0];");
 edit('all weapon icon source','function weapon(role, rarity, costume = false) {',"function weapon(role, rarity, costume = false) {\n    if(!costume&&rarity==='royal')return [colRoyalArtR118.icon('weapon',role),1,1,0,0];");
 edit('royal inventory hero preview','function Hero({ role, rarity = "white", label = "" }) {',"function Hero({ role, rarity = \"white\", label = \"\" }) {\n    if(rarity==='royal')return sprite('div','preview-hero role-'+roleColumn(role)+' armor-royal',[ROYAL_MEDIA_R118.hero,6,3,0,roleColumn(role)],null,label);");
 edit('royal body atlas','u2 === "emerald" ? Iy("/game/hero-motion-emerald-v447.webp")', 'u2 === "royal" ? Iy(ROYAL_MEDIA_R118.hero) : u2 === "emerald" ? Iy("/game/hero-motion-emerald-v447.webp")');
 edit('body sizing uses royal atlas','String(t2.src ?? "").includes("hero-motion-emerald-v447.webp")', '(String(t2.src ?? "").includes("hero-motion-emerald-v447.webp")||String(t2.src??"").includes("royal-hero-motion-r118"))');
 edit('royal armor effects','P2 || (u2 === "emerald" && ie2?.emeraldInfiniteArmor===true',"P2 || (u2 === 'royal' && drawRoyalArmorFxR118(e3,xe2,Se2,m2,k2,o2), u2 === \"emerald\" && ie2?.emeraldInfiniteArmor===true");
 // All weapon pose/crop/attachment decisions remain those of the matching
 // existing emerald atlas. The royal sheet has identical cell/pivot geometry.
 const weaponStart=text.indexOf('  const colShopWeaponVisible492 = Boolean(pose?.weaponSkin)'),weaponEnd=text.indexOf('\nfunction ',weaponStart);
 assert(weaponStart>0&&weaponEnd>weaponStart,'weapon renderer boundary');
 let weapon=text.slice(weaponStart,weaponEnd),weaponOld=weapon;
 weapon=weapon.replaceAll('rarity === "emerald"','(rarity === "emerald" || rarity === "royal")');
 weapon=weapon.replace('Iy("/game/emerald-set-v447.webp")','Iy(rarity === "royal" ? ROYAL_MEDIA_R118.weapons : "/game/emerald-set-v447.webp")');
 weapon=weapon.replace('  const tint = ', '  const tint = rarity === "royal" ? "#edd69b" : ');
 weapon=weapon.replace('    const glow = Nv(', '    if(rarity===\'royal\'&&!rankWeapon&&!colShopWeaponVisible492)drawRoyalWeaponFxR118(ctx,-pivot.x*width,-pivot.y*height,width,height,now,pose.qualityR102,role,pose.ownR102);\n    const glow = Nv(');
 text=text.slice(0,weaponStart)+weapon+text.slice(weaponEnd);edits.push({label:'royal weapon presentation and same pose geometry',from:weaponOld,to:weapon,count:1});
 edit('remaining royal rarity colors','emerald: "#39c889"','emerald: "#39c889",royal:"#ecdba8"',4);
 edit('royal ordinary level stays independent','infinite: 50, emerald: 65 };','infinite: 50, emerald: 65, royal:1 };');
 edit('royal friendly rarity name','return e3 === "emerald" ? "Kadim', 'return e3 === "royal" ? "Hükümdar Kraliyet" : e3 === "emerald" ? "Kadim');
 edit('royal sale prediction guard','![`unique`, `infinite`, "emerald"].includes(n4.rarity)','![`unique`, `infinite`, "emerald", "royal"].includes(n4.rarity)');
 edit('royal protected sale price','[`unique`, `infinite`, "emerald"].includes(e4.rarity) ? 0','[`unique`, `infinite`, "emerald", "royal"].includes(e4.rarity) ? 0');
 edit('royal animated hand anchors','String(n2).includes("hero-motion-emerald-v447.webp")','(String(n2).includes("hero-motion-emerald-v447.webp")||String(n2).includes("royal-hero-motion-r118"))');
 edit('royal label dictionary','const labels = { crafted:', 'const labels = { royal:"Hükümdar Kraliyet", crafted:');
 const materialEntries=Object.fromEntries(['emerald_dust','royal_crown'].map(kind=>[kind,{label:kind==='emerald_dust'?'Zümrüt Tozu':'Kraliyet Tacı',image:'../assets/'+media.icons[kind].replace(/\.webp$/,'')}]));
 edit('material names and inventory image references','var Qf = { forge_ember491:', 'var Qf = { ...'+JSON.stringify(materialEntries)+', forge_ember491:');
 // Public map remains an ordinary world, not a private dungeon/instance.
 edit('open PvP classification','return area === "black" || area === "rune_v2";', 'return area === "champions" || area === "black" || area === "rune_v2";');
 edit('area bounds','return area === "zumrut" ? ZR93.ZUMRUT_BOUNDS', 'return area === "champions" ? CHAMPIONS_BOUNDS_R118 : area === "zumrut" ? ZR93.ZUMRUT_BOUNDS');
 edit('area segment','return area === "zumrut" ? ZR93.zumrutSegment(...args)', 'return area === "champions" ? championsSegmentR118(...args) : area === "zumrut" ? ZR93.zumrutSegment(...args)');
 edit('prediction clamp','function Ev(e3, t2, n2) {', "function Ev(e3, t2, n2) {\n  if(e3==='champions')return clampChampionsR118(n2);");
 edit('authoritative position area reconciliation','s5 = t5 === "zumrut" ?', 's5 = t5 === "champions" ? t5 : t5 === "zumrut" ?');
 edit('travel cache destination','o3 = n3 === "travel_event" ?', 'o3 = n3 === "travel_champions" ? "champions" : n3 === "travel_event" ?');
 edit('map travel client guard', '}, Wb = async (e4) => {', `}, Wb = async (e4) => {\n    if(e4==='champions'){if(!royalEligibleClientR118(X2)){K2('Şampiyonlar Diyarı için Şampiyon Lv 1 olmalısın.');return;}if(U2?.champions?.enabled===false){K2('Şampiyonlar Diyarı şu anda kapalı.');return;}if(e4===$2||!window.confirm(CHAMPIONS_PVP_NOTICE_R118))return;colChampionsR118.preload();}`);
 edit('map travel spawn','let n3 = e4 === "zumrut" ? ZR93.ZUMRUT_SPAWN', 'let n3 = e4 === "champions" ? CHAMPIONS_SPAWN_R118 : e4 === "zumrut" ? ZR93.ZUMRUT_SPAWN');
 edit('map command','let r3 = await _m2({ ...e4 === "rune_v2" ? { confirmPvp: true } : {}, action: e4 === "zumrut" ?', 'let r3 = await _m2({ ...["rune_v2","champions"].includes(e4) ? { confirmPvp: true } : {}, action: e4 === "champions" ? "travel_champions" : e4 === "zumrut" ?');
 edit('map name','$2 === "zumrut" ? "Zümrüt Vadisi" :', '$2 === "champions" ? "Şampiyonlar Diyarı" : $2 === "zumrut" ? "Zümrüt Vadisi" :');
 edit('map mission heading','ab2 = $2 === "zumrut" ?', 'ab2 = $2 === "champions" ? "ŞAMPİYONLAR DİYARI · PVP AÇIK" : $2 === "zumrut" ?');
 edit('hide unrelated boss ribbon','$2 !== "zumrut" && $2 !== `arena`', '$2 !== "champions" && $2 !== "zumrut" && $2 !== `arena`');
 edit('hide unrelated forest quest','($2 === "zumrut" || isAdventureArea511($2)) ? null', '($2 === "champions" || $2 === "zumrut" || isAdventureArea511($2)) ? null');
 edit('skip forest tutorial','step: $2 === "zumrut" || isAdventureArea511($2) ? 3', 'step: $2 === "champions" || $2 === "zumrut" || isAdventureArea511($2) ? 3');
 edit('ordinary monster targeting list','"rune", "rune_v2", "event"].includes(e4.area)', '"rune", "rune_v2", "event", "champions"].includes(e4.area)');
 edit('autohunt ordinary map list','"rune", "rune_v2", "event"].includes(F2.current?.area', '"rune", "rune_v2", "event", "champions"].includes(F2.current?.area');
 edit('attack gating','if (d2.area !== "event" &&', 'if (d2.area !== "champions" && d2.area !== "event" &&');
 edit('pointer monster selection','if (colRuneCoast483(a3?.area) ||', 'if (a3?.area === "champions" || colRuneCoast483(a3?.area) ||');
 edit('skill bar availability','$2 !== "event" && !colRuneCoast483($2)', '$2 !== "champions" && $2 !== "event" && !colRuneCoast483($2)',2);
 edit('mobile attack availability','($2 === "event" || colRuneCoast483($2)', '($2 === "champions" || $2 === "event" || colRuneCoast483($2)');
 edit('ordinary activity polling','r3 === "rune_v2", a3 = Hn2.current', '(r3 === "rune_v2" || r3 === "champions"), a3 = Hn2.current');
 edit('PvP rendering','at3 = rt2 || it2 || nt3 || Fe2 === "rune_v2"', 'at3 = rt2 || it2 || nt3 || Fe2 === "champions" || Fe2 === "rune_v2"');
 edit('map texture','L3 = isAdventureArea511(Fe2) ?', 'L3 = Fe2 === "champions" ? colChampionsR118.texture() : isAdventureArea511(Fe2) ?');
 edit('ordinary ground drops','if (isAdventureArea511(i4.area) || i4.area === "event"', 'if (i4.area === "champions" || isAdventureArea511(i4.area) || i4.area === "event"');
 edit('custom mob render with normal attack phase','draw: () => (drawAdventureEnemy511(n3, i5, adventureMob511,', 'draw: () => (colChampionsR118.drawEnemy(n3,i5,_r2.current===t4.id,a3,S2,E3,r6.travel,x3) ? void 0 : drawAdventureEnemy511(n3, i5, adventureMob511,');
 edit('map ambient palette','var Dv = { rune_v2:', 'var Dv = { champions:{veil:"rgba(12,18,15,.03)",screen:"rgba(227,205,142,.01)",lights:[]}, rune_v2:');
 edit('royal NPC depth-sorted presentation','Ze2 && e6(towerDoor511.x, towerDoor511.y, 440)', 'Ze2 && e6(1740,390,220) && lt2.push({y:390,draw:()=>colRoyalArtR118.npc(n3,a3)}), Ze2 && e6(towerDoor511.x, towerDoor511.y, 440)');
 edit('royal NPC click','if (towerHit511(n3, r3)) {', "if(Math.abs(n3-1740)<80&&r3>225&&r3<425){vi2.current=null;openRoyalR118('transform');Y2('ui');return;}\n      if (towerHit511(n3, r3)) {");
 return {text,edits};
}
