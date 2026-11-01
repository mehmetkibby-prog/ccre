import {RUNE_TYPES,RUNE_LOOT_LABELS} from './runes.mjs';
// Rolled inside the existing durable reward claim. Rules come from the death
// snapshot; configuration edits cannot change loot already earned.
export function prepareRuneDrops(profile,participants,monsterId,center,settings,now,helpers,random=Math.random){
 const rules=profile.runeLoot,rows=[];if(!rules||!participants.length)return rows;
 const owner=participants[Math.min(participants.length-1,Math.floor(random()*participants.length))];
 helpers.onOwner487?.(owner);
 for(const [kind,rule]of Object.entries(rules)){
  if(!(rule.chance>0)||random()*100>=rule.chance*(helpers.balance487?.(kind,owner)??1))continue;
  const amount=rule.min+Math.floor(random()*(rule.max-rule.min+1));
  if(['white','blue','orange','red','purple','emerald'].includes(kind)){
   for(let n=0;n<amount;n++){const slots=['weapon','armor','helmet','shoes','necklace'],gearKind=slots[Math.floor(random()*slots.length)],role=helpers.role(),item={type:'gear',family:'generic',kind:gearKind,rarity:kind};
    rows.push([crypto.randomUUID(),owner.player_id,monsterId,gearKind,helpers.name(item,role),kind,helpers.power(item,settings),1,role,JSON.stringify(helpers.enchants(settings,gearKind)),center.x+rows.length%5*10,center.y+Math.floor(rows.length/5)*8,now+120,now+5]);}
  }else{
   const label=RUNE_LOOT_LABELS[kind]??kind;
   rows.push([crypto.randomUUID(),owner.player_id,monsterId,kind,label,kind in RUNE_TYPES?'unique':'white',0,amount,null,'[]',center.x+rows.length%5*10,center.y+Math.floor(rows.length/5)*8,now+120,now+5]);
  }
 }
 return rows;
}
