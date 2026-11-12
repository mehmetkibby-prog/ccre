import {randomUUID} from 'node:crypto';
import {SOLO_MAPS,SOLO_KEY_COST,SOLO_CATALOG_BY_ID,soloDay,rollSoloLoot} from '../../lib/solo-dungeon.mjs';
import {progressionSettings} from '../../lib/progression-runtime.mjs';

const requestId=input=>{const id=String(input.requestId??'');if(!/^[a-zA-Z0-9-]{16,80}$/.test(id))throw Error('Geçerli işlem kimliği gerekiyor.');return id;};
export function soloInfo(engine,id){
 const {solo}=progressionSettings(),row=engine.db.prepare('SELECT day,used FROM solo_daily_entries WHERE player_id=?').get(id);
 const used=row?.day===soloDay(engine.now())?row.used:0;
 return {settings:solo,used,remaining:Math.max(0,solo.daily_limit-used)};
}
export function craftSoloKey(id,input){
 const request=requestId(input);
 return this.transaction(()=>{
  const previous=this.db.prepare('SELECT result FROM solo_key_crafts WHERE player_id=? AND request_id=?').get(id,request);
  if(previous)return JSON.parse(previous.result);
  const p=this.player(id);
  if(p.hp<=0||p.area!=='bazaar'||Math.hypot(p.x-1200,p.y-390)>245||this.locked(id)||p.arena_match_id||p.combat_lock_until_ms>this.now())throw Error('Dönüşüm için Pazar Köyü’nde Demirci Haso’nun yanına gel.');
  if(!this.db.prepare('UPDATE players SET pearls=pearls-?,gems=gems-? WHERE id=? AND pearls>=? AND gems>=?').run(SOLO_KEY_COST.pearls,SOLO_KEY_COST.gems,id,SOLO_KEY_COST.pearls,SOLO_KEY_COST.gems).changes)throw Error('Zindan Anahtarı için 3 İnci ve 100 Mücevher gerekir.');
  this.material(id,'solo_key',1);
  const result={ok:true,message:'Zindan Anahtarı çantana eklendi. Pazarda satabilir veya solo zindana girişte kullanabilirsin.'};
  this.db.prepare('INSERT INTO solo_key_crafts VALUES(?,?,?,?)').run(id,request,JSON.stringify(result),Math.floor(this.now()/1000));
  return result;
 });
}
export function createSolo(id,input){
 const request=requestId(input),previous=this.db.prepare('SELECT run_id FROM solo_entry_receipts WHERE player_id=? AND request_id=?').get(id,request);
 if(previous)return {ok:true};
 const solo=progressionSettings().solo;
 if(!solo.enabled)throw Error('Solo zindan şu anda kapalı.');
 this.keeper(id,false);
 const p=this.player(id),now=this.now(),day=soloDay(now);
 if(p.level<solo.minimum_level||p.arena_match_id||p.combat_lock_until_ms>now)throw Error(`Solo zindan için seviye ${solo.minimum_level} olmalı ve savaş dışında olmalısın.`);
 const cfg={...this.settings(),minimum_level:solo.minimum_level,duration_seconds:solo.duration_seconds,boss_hp:solo.boss_hp,boss_damage:solo.boss_damage};
 const r={id:randomUUID(),partyId:'solo:'+id,leaderId:id,mode:'solo',status:'ready',created:now,readyUntil:now,started:0,deadline:0,stage:0,wave:0,attempt:0,size:1,cfg,solo:structuredClone(solo),members:[{id,name:p.name,role:p.role,ready:true,x:1200,y:1190,hp:1,maxHp:1,damage:0,seen:now,input:{x:0,y:0},inputAt:0,sequence:0,cooldowns:[0,0,0,0],stats:null}],enemies:[],telegraphs:[],effects:[],message:'',rewards:{}};
 try{this.transaction(()=>{
  const counted=this.db.prepare(`INSERT INTO solo_daily_entries(player_id,day,used) VALUES(?,?,1)
   ON CONFLICT(player_id) DO UPDATE SET day=excluded.day,used=CASE WHEN solo_daily_entries.day=excluded.day THEN used+1 ELSE 1 END
   WHERE solo_daily_entries.day!=excluded.day OR solo_daily_entries.used<?`).run(id,day,solo.daily_limit);
  if(!counted.changes)throw Error('Bugünkü solo zindan giriş hakkın doldu. Haklar Türkiye saatiyle 00.00’da yenilenir.');
  if(!this.db.prepare("UPDATE dungeon_materials SET amount=amount-1 WHERE player_id=? AND kind='solo_key' AND amount>0").run(id).changes)throw Error('Zindan Anahtarı gerekiyor. Demirci Haso’da 3 İnci + 100 Mücevher ile dönüştürebilir veya pazardan alabilirsin.');
  this.db.prepare('INSERT INTO dungeon_members VALUES(?,?)').run(id,r.id);
  this.begin(r);this.save(r);
  this.db.prepare('INSERT INTO solo_entry_receipts VALUES(?,?,?,?)').run(id,request,r.id,Math.floor(now/1000));
 });}catch(error){this.lastSave.delete(r.id);throw error;}
 this.runs.set(r.id,r);
 return {ok:true};
}
export function soloStage(r){
 r.mapId=SOLO_MAPS[r.stage].id;
 r.crystal=null;
 r.cfg.enemy_hp=r.solo[`stage${r.stage}_hp`];r.cfg.enemy_damage=r.solo[`stage${r.stage}_damage`];
 const points=r.stage===1?[[650,800],[1750,800],[1200,420]]:r.stage===2?[[600,900],[1800,900],[650,530],[1750,530]]:[[650,850],[1750,850],[850,550],[1550,550],[1200,340]];
 for(const [x,y] of points)this.enemy(r,'sentinel',x,y,r.cfg.enemy_hp);
 r.message=r.stage===3?'Demir Avlu · Son muhafızları yen; Demir Hükümdar ortaya çıkacak.':`${SOLO_MAPS[r.stage].name} · Muhafızları yen ve geçide ilerle.`;
}
export function soloTick(r){
 if(r.stage===2&&r.enemies.every(e=>e.hp<=0))this.portal(r);
 if(r.stage===3&&!r.soloBossSpawned&&r.enemies.every(e=>e.hp<=0)){
  this.enemy(r,'boss',1200,390,r.cfg.boss_hp);r.soloBossSpawned=true;
  r.message='Demir Hükümdar · İşaretli saldırılardan kaç ve mahzeni tamamla.';this.save(r);
 }
}
export function rewardSolo(r){
 if(r.status==='complete')return;
 const p=r.members[0];if(p.left)return;
 const before={rewards:r.rewards,groundLoot:r.groundLoot,status:r.status,message:r.message,deadline:r.deadline};
 try{this.transaction(()=>{
  if(this.db.prepare('SELECT 1 FROM dungeon_rewards WHERE run_id=? AND player_id=?').get(r.id,p.id))return;
  const rewards=rollSoloLoot(r.solo,this.roll).map(rule=>{
   const item=SOLO_CATALOG_BY_ID.get(rule.itemId);
   if(item.type==='gear'&&!this.makeGear)throw Error('Ekipman ödül sistemi hazır değil.');
   const gear=item.type==='gear'?this.makeGear(item,{...this.gameSettings(),...this.combatSettings()},r.cfg):{};
   return {catalogId:item.id,kind:item.kind??'resource',name:gear.item_name??item.name,amount:rule.amount,rarity:item.rarity??'orange',role:item.role??p.role,...gear};
  });
  this.db.prepare('INSERT INTO dungeon_rewards VALUES(?,?,?,?)').run(r.id,p.id,JSON.stringify(rewards),this.now());
  r.rewards={[p.id]:rewards};
  const boss=r.enemies.find(e=>e.kind==='boss')??{x:1200,y:700};
  const cx=Math.max(760,Math.min(1640,boss.x)),cy=Math.max(550,Math.min(950,boss.y));
  r.groundLoot=rewards.map((d,i)=>({...d,id:randomUUID(),ownerId:p.id,x:cx+(i%8-3.5)*115,y:cy+(Math.floor(i/8)-3.5)*80}));
  r.status='complete';r.message=rewards.length?'Demir Hükümdar yenildi! Ganimetlerini topla; 1 dakika sonra Pazar Köyü’ne döneceksin.':'Mahzen tamamlandı. Bu turda eşya düşmedi; 1 dakika sonra Pazar Köyü’ne döneceksin.';r.deadline=this.now()+60000;
  this.save(r);
 });}catch(error){Object.assign(r,before);throw error;}
}
