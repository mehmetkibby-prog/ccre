import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
/** Incremental patch ONLY: input must be the verified R30/R29 game client. */
export function patchBeltClient(source,bridge,{art}={}) {
 if(!/^core511-belt-r31-[a-f0-9]{16}\.js$/.test(bridge))throw Error('belt_client_bridge_name');
 for(const variant of ['wisdom','sovereign'])if(!new RegExp('^/assets/belt-'+variant+'-r31-[a-f0-9]{16}\\.webp$').test(art?.[variant]??''))throw Error('belt_client_art_name:'+variant);
 let output=source;const edits=[];
 const replace=(from,to,count=1,label=from.slice(0,100))=>{const found=output.split(from).length-1;if(found!==count)throw Error('belt_client_anchor_changed:'+label+':'+found+'/'+count);output=output.split(from).join(to);edits.push({label,from,to,count});};
 const append=value=>{output+=value;edits.push({label:'append belt UI binding',from:'',to:value,position:'append'});};
 const prefix=`import {createBeltUI as createBeltUIR31,beltStats as beltStatsR31} from './${bridge}';\n`;
 output=prefix+output;edits.push({label:'import belt UI',from:'',to:prefix,position:'prepend'});
 replace('function du(e3) {\n','function du(e3) {\n  if(e3 === "belt") return true;\n');
 replace('function gu(e3, t2) {\n','function gu(e3, t2) {\n  if(e3.kind === "belt") return true;\n');
 replace('function yu(e3, t2) {\n','function yu(e3, t2) {\n  if(e3.kind === "belt") return true;\n');
 replace('function fu(e3, t2) {\n','function fu(e3, t2) {\n  if(t2 === "belt") return [];\n');
 replace('function tv(e3) {\n','function tv(e3) {\n  if(e3 === "belt") return "Kemer";\n');
 replace('function q_(e3) {\n','function q_(e3) {\n  if(e3 === "all") return "Tüm sınıflar";\n');
 replace('function J_(e3) {\n','function J_(e3) {\n  if(e3 === "crafted") return "Üretim";\n');
 replace('Ku = { earring:', 'Ku = { belt:"Kemer", earring:');
 replace('function rv({ kind: e3, role: t2, rarity: n2, enchantments: r2 }) {','function rv({ kind: e3, role: t2, rarity: n2, enchantments: r2, item_name, name }) {\n  if(e3 === "belt") return R.createElement(colBeltUIR31.Icon,{item:{kind:e3,item_name:item_name??name}});');
 // Preserve the canonical item name through every item-bearing common icon call.
 replace('rv, { kind: e4.kind, role: e4.role, rarity: e4.rarity, enchantments: e4.enchantments }','rv, { kind: e4.kind, role: e4.role, rarity: e4.rarity, enchantments: e4.enchantments, item_name:e4.item_name }',3,'bag and listing icons');
 replace('rv, { kind: Uc2.kind, role: Uc2.role ?? `muhafiz`, rarity: Uc2.rarity, enchantments: Uc2.enchantments }','rv, { kind: Uc2.kind, role: Uc2.role ?? `muhafiz`, rarity: Uc2.rarity, enchantments: Uc2.enchantments, item_name:Uc2.item_name }');
 replace('rv, { kind: t2, role: e3.role ?? `muhafiz`, rarity: e3.rarity, enchantments: e3.enchantments }','rv, { kind: t2, role: e3.role ?? `muhafiz`, rarity: e3.rarity, enchantments: e3.enchantments, item_name:e3.item_name??e3.name }');
 replace('rv, { kind: e4.kind, role: e4.role ?? `muhafiz`, rarity: e4.rarity }','rv, { kind: e4.kind, role: e4.role ?? `muhafiz`, rarity: e4.rarity, item_name:e4.item_name??e4.name }');
 replace('rv, { kind: e3.kind, role: e3.role, rarity: e3.rarity, enchantments: e3.enchantments }','rv, { kind: e3.kind, role: e3.role, rarity: e3.rarity, enchantments: e3.enchantments, item_name:e3.item_name }');
 // The trade glass list has its own image path; a belt has no legacy server image.
 replace('row.image && h2("img", { src: row.image, alt: "", width: 48, height: 48, loading: "lazy" })','row.kind === "belt" ? h2(colBeltUIR31.Icon,{item:{...row,item_name:row.item_name??row.name}}) : row.image && h2("img", { src: row.image, alt: "", width: 48, height: 48, loading: "lazy" })');
 replace('` \\xB7 `, tv(e4.kind), ` \\xB7 Sv. `, vu(e4.rarity)', '` \\xB7 `, tv(e4.kind), e4.kind === "belt" ? " · Seviye sınırı yok" : ` \\xB7 Sv. `, e4.kind === "belt" ? "" : vu(e4.rarity)',2,'bag belt level subtitle');
 replace('function cv({ item: e3 }) {\n','function cv({ item: e3 }) {\n  if(e3.kind === "belt") return R.createElement(colBeltUIR31.Details,{item:e3});\n');
 replace('function Ju({ item: e3 }) {\n','function Ju({ item: e3 }) {\n  if(e3.kind === "belt") return R.createElement("details",{className:"trade-gear"},R.createElement("summary",null,R.createElement(colBeltUIR31.Icon,{item:e3}),e3.item_name),R.createElement(colBeltUIR31.Details,{item:e3}));\n');
 // Render one compact slot after the existing jewelry slots.
 replace('R.createElement(colExpansionUI456.Slots, { inventory: U2?.inventory, onInspect: Wc2, Slot: lv }))','R.createElement(colExpansionUI456.Slots, { inventory: U2?.inventory, onInspect: Wc2, Slot: lv }),R.createElement(colBeltUIR31.Slot,{inventory:U2?.inventory,onInspect:Wc2}))');
 replace('"aria-label": "K\\xFCpe ve bilezik"','"aria-label": "Küpe, bilezik ve kemer"');
 replace('children: [R.createElement(colExpansionUI456.Host,','children: [R.createElement(colBeltUIR31.Host,{own:X2,world:U2,joined:Ea2,post:Q,onChanged:async()=>{I2.current=true;await J(true);}}),R.createElement(colExpansionUI456.Host,');
 // New Pakize window; do not render two modal windows at once.
 replace('mode === "pakize" ? h2(React.Fragment, null, h2("nav", { className: "expansion456-tabs"','mode === "pakize" ? h2(React.Fragment, null,h2("button",{type:"button",className:"belt31-open",disabled:busy,onClick:()=>{setMode("");window.dispatchEvent(new Event("belt31-open"));}},"Kemer Dönüşümü · Ayrı atölyeyi aç"), h2("nav", { className: "expansion456-tabs"');
 // Belts use owned native_action. Do not enter native HTTP equip or predict HP/items.
 replace('Wm2 = (0, R.useCallback)(async (e4) => {\n    if (quickSaleRef.current.hasItem(e4)) return;',`Wm2 = (0, R.useCallback)(async (e4) => {
    if(F2.current?.inventory.find(item=>item.id===e4)?.kind === "belt"){
      try{const result=await colBeltUIR31.command(Q,"equip_belt_r31",{itemId:e4},g2.current);Y2("equip");K2(result.message??"Kemer takıldı.");}catch(error){K2(error?.message??"Kemer işlemi doğrulanamadı.");}finally{I2.current=true;await J(true);}return;
    }
    if (quickSaleRef.current.hasItem(e4)) return;`);
 // Separate details hide irrelevant enchant/stone/+0-defense controls.
 replace('Uc2 && du(Uc2.kind) && (0, z.jsxs)(z.Fragment, { children:', 'Uc2?.kind === "belt" && R.createElement(colBeltUIR31.DetailPanel,{item:(U2?.inventory??[]).find(item=>item.id===Uc2.id)??Uc2,own:X2,post:(U2?.inventory??[]).some(item=>item.id===Uc2.id)?Q:null,onChanged:async()=>{I2.current=true;await J(true);Wc2(null);}}),Uc2 && Uc2.kind !== "belt" && du(Uc2.kind) && (0, z.jsxs)(z.Fragment, { children:');
 replace('x2 = (e4) => du(e4.kind) && (n2 === `reroll`','x2 = (e4) => e4.kind !== "belt" && du(e4.kind) && (n2 === `reroll`');
 // Crafted belts are marketable gear, never an accidental cheap NPC sale.
 replace('![`purple`, `unique`, `infinite`, "emerald"].includes(e4.rarity)','e4.kind !== "belt" && ![`purple`, `unique`, `infinite`, "emerald"].includes(e4.rarity)',3,'exclude belts from direct NPC sale');
 // Recognize generic equipment family in every market filter.
 replace('necklace: "Kolye", earring: "K\\xFCpe", bracelet: "Bilezik", rune_attack:', 'necklace: "Kolye", earring: "K\\xFCpe", bracelet: "Bilezik", belt:"Kemer", rune_attack:');
 replace('const labels = { white: "Beyaz",','const labels = { crafted:"Üretim", white: "Beyaz",');
 // Existing jewelry intrinsic source remains intact; belts add only their fixed bonuses.
 replace('const colJewelryIntrinsic456 = colExpansionModel456.jewelryStats456(t2);','const colJewelryIntrinsic456 = colExpansionModel456.jewelryStats456(t2),colBeltIntrinsicR31=beltStatsR31(t2);');
 replace('+ colJewelryIntrinsic456.attack, f2 =','+ colJewelryIntrinsic456.attack + colBeltIntrinsicR31.attack, f2 =');
 replace('!["earring", "bracelet"].includes(e4.kind)','!["earring", "bracelet", "belt"].includes(e4.kind)');
 replace('n2.player_max_hp) + p2 + a2.hp + o2.hp + s2.hp)','n2.player_max_hp) + p2 + a2.hp + o2.hp + s2.hp + colBeltIntrinsicR31.hp)');
 replace('+ colJewelryIntrinsic456.strongPlayers, resistantPlayers:','+ colJewelryIntrinsic456.strongPlayers + colBeltIntrinsicR31.strongPlayers, resistantPlayers:');
 replace('className: `stats-list`, children: [','className: `stats-list`, children: [R.createElement(colBeltUIR31.Stats,{inventory:U2?.inventory}),');
 replace('Ki\\u015Fi ba\\u015F\\u0131 g\\xFCnde en fazla 15 giri\\u015F','Ki\\u015Fi ba\\u015F\\u0131 g\\xFCnde en fazla 30 giri\\u015F');
 append(`\nconst colBeltUIR31=createBeltUIR31(R,{Dialog:It,Content:kt,Header:Pt,Title:jt,Description:Ct,MaterialIcon:tower511.Icon,art:${JSON.stringify(art)}});\n`);
 parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{version:'belt-r31',sourceSha256:sha(source),patchedSha256:sha(output),bridge,art,edits,scope:'Incremental R30 client: single belt slot, fixed bonuses, Pakize workshop, owned belt actions, common inventory/trade/market displays; existing movement/attack/reward/transport logic retained. Group daily limit label 15→30.'}};
}
