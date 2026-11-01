export const RANK_GROUPS = [
 ['Öz Avcısı','Avcı','#42e8d0'],['Çekirdek Fedaisi','Fedai','#ffcb55'],
 ['Çekirdek Muhafızı','Muhafız','#69b9ff'],['Çekirdek Celladı','Cellat','#ff727d'],
 ['Kadim Hükümdar','Hükümdar','#d69aff'],['Çekirdek Efsanesi','Efsane','#fff1ad'],
];
export const RANK_AREAS = [['forest','Kuzey Ormanı'],['frozen','Donmuş Çam Geçidi'],['black','Kara Bölge'],['ancient','Kadim Kök Vadisi']];
export const RANK_REWARDS = [
 {id:'hunter_weapon',name:'Öz Avcısı silah görünümü',slot:'weapon',bonuses:{hp:100,defense:0,pve:3,pvp:0}},
 {id:'fedai_cape',name:'Fedai pelerini',slot:'cape',bonuses:{hp:150,defense:0,pve:4,pvp:0}},
 {id:'guardian_companion',name:'Çekirdek yoldaşı görünümü',slot:'companion',bonuses:{hp:200,defense:0,pve:5,pvp:0}},
 {id:'executioner_weapon',name:'Cellat silah görünümü',slot:'weapon',bonuses:{hp:250,defense:0,pve:6,pvp:0}},
 {id:'sovereign_wings',name:'Hükümdar kanatları',slot:'wings',bonuses:{hp:300,defense:0,pve:7,pvp:0}},
 {id:'legend_costume',name:'Efsane kostümü ve profil çerçevesi',slot:'costume',bonuses:{hp:400,defense:0,pve:8,pvp:0}},
];
export const EMPTY_RANK_BONUSES = Object.freeze({hp:0,defense:0,pve:0,pvp:0});
export function rankLabel(tier,short=false){const n=Math.max(0,Math.min(18,Math.trunc(Number(tier)||0)));return n?`${RANK_GROUPS[Math.floor((n-1)/3)][short?1:0]} ${(n-1)%3+1}`:'';}
export function rankColor(tier){return RANK_GROUPS[Math.max(0,Math.min(5,Math.floor(((Number(tier)||1)-1)/3)))][2];}
export function defaultRankConfig(){return {requirements:Object.fromEntries(RANK_AREAS.map(([key])=>[key,50])),tiers:Array.from({length:18},(_,i)=>({xp:i===0?0:Math.round(25000*1.22**(i-1)),hp:50,defense:2,pve:1,pvp:1,reward:i%3===2?RANK_REWARDS[Math.floor(i/3)].id:''}))};}
export function validateRankConfig(value){
 if(!value||typeof value!=='object'||!Array.isArray(value.tiers)||value.tiers.length!==18)throw new Error('18 rütbe kademesi gerekli.');
 const integer=(v,min,max,label)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw new Error(`${label}: ${min}–${max} arasında tam sayı gir.`);return v;};
 const requirements=Object.fromEntries(RANK_AREAS.map(([key,name])=>[key,integer(value.requirements?.[key],1,100000,name)]));
 const seen=new Set();
 const tiers=value.tiers.map((t,i)=>{
  const reward=t.reward??'';if(typeof reward!=='string'||reward&&!RANK_REWARDS.some(r=>r.id===reward)||reward&&seen.has(reward))throw new Error('Her özel ödül en fazla bir kademede bulunabilir.');if(reward)seen.add(reward);
  return {xp:integer(t.xp,i===0?0:1,i===0?0:100000000,'TP'),hp:integer(t.hp,0,10000,'Can'),defense:integer(t.defense,0,1000,'Savunma'),pve:integer(t.pve,0,10,'Canavar hasarı'),pvp:integer(t.pvp,0,10,'Oyuncu hasarı'),reward};
 });return {requirements,tiers};
}
export function rankBonuses(tier,config=defaultRankConfig()){return config.tiers.slice(0,Math.max(0,Math.min(18,Number(tier)||0))).reduce((out,t)=>({hp:out.hp+t.hp,defense:out.defense+t.defense,pve:out.pve+t.pve,pvp:out.pvp+t.pvp}),{...EMPTY_RANK_BONUSES});}
export function rankThreshold(tier,config){return config.tiers.slice(0,Math.max(0,tier)).reduce((sum,t)=>sum+t.xp,0);}
export function rankProgress(tier,xp,config){const start=rankThreshold(tier,config),cost=config.tiers[tier]?.xp??0;return {start,cost,earned:tier>=18?0:Math.max(0,Math.min(cost,Number(xp)-start))};}
export function rankNamePrefix(player){return player?.rank?.tier?rankLabel(player.rank.tier,true):`Lv ${player?.level??1}`;}

// Only owned rewards in their actual equipment slot grant stats; old unlocks use the same definitions.
export function rankRewardBonuses(tier,unlocked=[],cosmetics={}){
 const result={...EMPTY_RANK_BONUSES};
 if(!(tier>0)||!Array.isArray(unlocked)||!cosmetics||typeof cosmetics!=='object')return result;
 for(const reward of RANK_REWARDS)if(unlocked.includes(reward.id)&&cosmetics[reward.slot]===reward.id)
  for(const key of Object.keys(result))result[key]+=reward.bonuses[key];
 return result;
}
export function totalRankBonuses(player,config=defaultRankConfig()){
 const tier=player?.level>=65?player.rank_tier:0;
 const base=rankBonuses(tier,config),reward=rankRewardBonuses(tier,JSON.parse(player?.rank_unlocked??'[]'),JSON.parse(player?.rank_cosmetics??'{}'));
 return Object.fromEntries(Object.keys(base).map(key=>[key,base[key]+reward[key]]));
}
export function rankRewardHpSql(){return `(CASE WHEN players.level>=65 AND players.rank_tier>0 THEN ${RANK_REWARDS.map(r=>`CASE WHEN json_extract(players.rank_cosmetics,'$.${r.slot}')='${r.id}' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='${r.id}') THEN ${r.bonuses.hp} ELSE 0 END`).join('+')} ELSE 0 END)`;}
