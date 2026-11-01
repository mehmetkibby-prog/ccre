const EMERALD_SET444=Object.freeze({name:'Kadim Zümrüt Seti',slots:['weapon','armor','helmet','shoes','necklace'],bonuses:{hp:1000,pve:10,pvp:10,resistance:0,speed:12,attack:50}});
function emeraldName444(kind,role){return kind==='weapon'?({muhafiz:'Kadim Zümrüt Hükümkılıcı',avci:'Kadim Zümrüt Ufuk Yayı',arkanist:'Kadim Zümrüt Öz Asası'}[role]??'Kadim Zümrüt Hükümkılıcı'):({armor:'Kadim Zümrüt Zırhı',helmet:'Kadim Zümrüt Tacı',necklace:'Kadim Zümrüt Kalbi',shoes:'Kadim Zümrüt Çizmeleri'}[kind]??'Kadim Zümrüt');}
function emeraldPower444(kind,settings={}){if(kind==='weapon')return 350;if(kind==='armor')return 300;const unique=Math.max(1,Number(settings[kind==='weapon'?'unique_weapon_power':'unique_armor_power'])||(kind==='weapon'?180:150));const percent=Number.isFinite(Number(settings.infinite_power_percent))?Math.max(0,Number(settings.infinite_power_percent)):30;const weaponBase=Math.max(1,Number(settings.infinite_weapon_power)||230);const infinite=globalThis.__colDragonBoss?.infinitePower?.({kind,power:unique})??(kind==='weapon'&&unique<=180?Math.max(unique,weaponBase):kind==='weapon'?Math.max(unique,Math.round(unique*(1+percent/100)),weaponBase):Math.round(unique*(1+percent/100)));return Math.min(100000,Math.ceil(infinite*1.15));}
const EMERALD_CATALOG444=['muhafiz','avci','arkanist'].flatMap(role=>['weapon','armor','helmet','necklace','shoes'].map(kind=>({id:`gear:${role}:${kind}:emerald`,name:emeraldName444(kind,role),type:'gear',kind,role,rarity:'emerald',group:'Kadim Zümrüt'})));
function emeraldIconStyle444(kind,role){if(kind==='armor')return {display:'inline-block',flexShrink:0,backgroundImage:'url(/game/emerald-armor-v445.webp)',backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat'};const col=kind==='weapon'?Math.max(0,['muhafiz','avci','arkanist'].indexOf(role)):Math.max(0,['helmet','necklace','shoes'].indexOf(kind));return {display:'inline-block',flexShrink:0,backgroundImage:'url(/game/emerald-set-v444.webp)',backgroundSize:'300% 200%',backgroundPosition:`${col*50}% ${kind==='weapon'?0:100}%`,backgroundRepeat:'no-repeat'};}
function emeraldGroundArt444(drop){if(drop.kind==='armor')return {src:'/game/emerald-armor-v445.webp',columns:1,rows:1,col:0,row:0,glyph:'◆',label:drop.item_name??emeraldName444('armor',drop.role),color:'#39c889',rarity:'emerald'};return {src:'/game/emerald-set-v444.webp',columns:3,rows:2,col:drop.kind==='weapon'?Math.max(0,['muhafiz','avci','arkanist'].indexOf(drop.role)):Math.max(0,['helmet','necklace','shoes'].indexOf(drop.kind)),row:drop.kind==='weapon'?0:1,glyph:'◆',label:drop.item_name??emeraldName444(drop.kind,drop.role),color:'#39c889',rarity:'emerald'};}
function emeraldGrantFields444(current,change){const next={...current,...change};if(next.rarity!=='emerald')return next;return {...next,itemName:emeraldName444(next.kind,next.role),power:emeraldPower444(next.kind)};}

import {progressionMaterial} from './progression-materials.mjs';
import {DRAGON_CATALOG_BY_ID} from './dragon-boss.mjs';
import {PREMIUM_ITEMS} from './premium-catalog.mjs';
export const LOOT_COLORS=Object.freeze({white:'#e3e8ef',blue:'#56aaff',orange:'#ffa13b',red:'#ff354f',purple:'#b579ee',unique:'#e4e8ff',infinite:'#ffd779',emerald:"#39c889"});
const sprite=(src,columns=1,rows=1,col=0,row=0)=>({src,columns,rows,col,row});
const game=(name,...cell)=>sprite(`/game/${name}.webp`,...cell);
const materials={wing:'wing',infinite:'infinite',pet:'dragon'};
const rank={hunter_weapon:'rank-hunter-weapons',fedai_cape:'rank-cape',guardian_companion:'rank-companion',executioner_weapon:'rank-executioner-weapons',sovereign_wings:'rank-wings',legend_costume:'rank-costume'};
const aliases={essence:'resource:essence',pearl:'resource:pearls',stone_dust:'resource:stone_dust',stone_book:'stone:book',evolution_scroll:'stone:evolution_scroll',crystal_chest:'stone:crystal_chest',moonlight_chest:'stone:moonlight_chest'};
export function groundLootArt(drop){if(drop.rarity==='emerald')return emeraldGroundArt444(drop);
 const item=DRAGON_CATALOG_BY_ID.get(drop.catalog_id??aliases[drop.kind])??drop;
 const kind=item.kind??drop.kind,rarity=drop.rarity??item.rarity??'white';
 const role=Math.max(0,['muhafiz','avci','arkanist'].indexOf(item.role??drop.role));
 let art={},glyph='◆';
 if(progressionMaterial(kind))art=sprite(`/dungeon/${progressionMaterial(kind).image}.webp`);
 else if(['weapon','armor','helmet','shoes','necklace'].includes(kind)){
  if(kind==='weapon')art=rarity==='purple'?game('purple-weapons-v349',3,1,role):rarity==='infinite'?game('infinite-weapons-v202',3,1,role):game('weapon-atlas-v2',3,5,role,Math.max(0,['white','blue','orange','red','unique'].indexOf(rarity)));
  else {const i=['armor','helmet','shoes','necklace'].indexOf(kind);art=game(['white','blue','orange','red','purple'].includes(rarity)?`inventory-gear-${rarity}-v347`:'equipment-icons-v202',2,2,i%2,Math.floor(i/2));}
 }else if(item.type==='premium'){
  if(PREMIUM_ITEMS[kind]?.image)art=sprite(PREMIUM_ITEMS[kind].image);
  else if(kind==='costume')art=game(`costume-${item.role??drop.role??'muhafiz'}`);
  else if(['xp_ring','drop_charm','wings'].includes(kind)){const i={xp_ring:0,drop_charm:1,wings:3}[kind];art=game('market-items-v186',2,2,i%2,Math.floor(i/2));}
  else if(kind==='storage_page')glyph='▣';
 }else if(item.type==='material')art=sprite(`/dungeon/${materials[kind]}-fragment-v244.webp`);
 else if(item.type==='pet')art=kind==='dragon'?sprite('/dungeon/dragon.webp'):game(kind==='starter'?'starter-pet':`pet-${kind}-icon-v186`);
 else if(item.type==='rank')art=game(rank[kind],kind.endsWith('_weapon')?3:1,1,kind.endsWith('_weapon')?role:0);
 else if(item.type==='special')art=kind==='core_wings'?sprite('/dungeon/wings.webp'):game(kind==='rod'?'fishing-rod-v29-premium':'starter-chest');
 else if(item.type==='stone'){
  const index=['critical','attack','defense','block'].indexOf(kind.split(':')[0]);
  if(index>=0)art=game('crafted-stones',2,2,index%2,Math.floor(index/2));
  else if(kind==='book'||kind==='evolution_scroll')art=game('materials-v186',2,2,kind==='book'?0:1,0);
  else if(kind==='crystal_chest'||kind==='moonlight_chest')art=game(kind==='crystal_chest'?'crystal-chest':'moonlight-chest-v357');
 }else if(item.type==='resource'){
  const k=item.column;
  if(k==='fifth_enchant_scrolls')art=game('enchant-fifth-v260');
  else if(k==='stone_dust')art=game('materials-v186',2,2,0,1);
  else if(k.startsWith('fish_')){const i=['fish_sokan','fish_levrek','fish_zargana'].indexOf(k)+1;art=game('fishing-item-atlas',2,2,i%2,Math.floor(i/2));}
  else glyph={essence:'essence',gems:'gem',potions:'potion',pearls:'pearl'}[k]??'◆';
 }
 return {...art,glyph,label:drop.item_name??item.name??'Ganimet',color:LOOT_COLORS[rarity]??LOOT_COLORS.white,rarity};
}
