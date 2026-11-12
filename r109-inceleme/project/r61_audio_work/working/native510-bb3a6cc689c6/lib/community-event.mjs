export const COMMUNITY_REWARDS = Object.freeze({gems:'Mücevher',potions:'Kırmızı İksir',essence:'Öz',pearl:'Beyaz İnci',stone_dust:'Taş Tozu',stone_art_book:'Taş Sanatı Kitabı',enchant_scroll:'Efsun Değiştirme'});
export const CLAIM_GRACE_SECONDS=72*3600;
export function defaultCommunityConfig(){return {title:'Kuzey Ormanı Uyanıyor',minimum:30,stages:[{target:1000,rewards:[{kind:'gems',amount:10},{kind:'potions',amount:1}]},{target:3000,rewards:[{kind:'gems',amount:15},{kind:'potions',amount:2},{kind:'essence',amount:15}]},{target:6000,rewards:[{kind:'gems',amount:25},{kind:'potions',amount:2},{kind:'essence',amount:25}]}]};}
export function validateCommunityConfig(input){
 if(!input||typeof input!=='object')throw new Error('Etkinlik ayarları geçersiz.');
 const title=String(input.title??'').trim();if(title.length<3||title.length>64)throw new Error('Etkinlik adı 3–64 karakter olmalı.');
 if(!Number.isInteger(input.minimum)||input.minimum<1||input.minimum>100000)throw new Error('Kişisel katkı 1–100.000 arasında olmalı.');
 if(!Array.isArray(input.stages)||input.stages.length!==3)throw new Error('Üç ödül kademesi gerekli.');
 let previous=0;const stages=input.stages.map(stage=>{
 if(!stage||!Number.isInteger(stage.target)||stage.target<=previous||stage.target>10000000)throw new Error('Hedefler artan tam sayılar olmalı (en fazla 10 milyon).');previous=stage.target;
 if(!Array.isArray(stage.rewards)||!stage.rewards.length||stage.rewards.length>7)throw new Error('Her kademeye 1–7 ödül ekle.');
 const seen=new Set();const rewards=stage.rewards.map(reward=>{if(!reward||typeof reward.kind!=='string'||!Object.hasOwn(COMMUNITY_REWARDS,reward.kind)||seen.has(reward.kind)||!Number.isInteger(reward.amount)||reward.amount<1||reward.amount>1000000)throw new Error('Ödül türü/adedi geçersiz veya aynı ödül tekrarlanmış.');seen.add(reward.kind);return {kind:reward.kind,amount:reward.amount};});return {target:stage.target,rewards};});
 return {title,minimum:input.minimum,stages};
}
export function communityActive(run,now){return Boolean(run&&run.published&&now>=run.start&&now<run.end);}
export function communityRewardText(rewards){return rewards.map(r=>`${r.amount.toLocaleString('tr-TR')} ${COMMUNITY_REWARDS[r.kind]??''}`).join(' · ');}
