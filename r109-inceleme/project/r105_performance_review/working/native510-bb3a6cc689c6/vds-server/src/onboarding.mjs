// Additive VDS migration. Existing characters are never forced through first entry.
export function ensureOnboardingSchema(db){
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='player_onboarding'").get()){
  if(!db.prepare('PRAGMA table_info(player_onboarding)').all().some(c=>c.name==='potion_hint_seen'))db.exec('ALTER TABLE player_onboarding ADD COLUMN potion_hint_seen INTEGER NOT NULL DEFAULT 0 CHECK(potion_hint_seen IN (0,1))');
  return;
 }
 db.exec('BEGIN IMMEDIATE');
 try{db.exec(`CREATE TABLE player_onboarding(player_id TEXT PRIMARY KEY,step INTEGER NOT NULL DEFAULT 0 CHECK(step BETWEEN 0 AND 3),potion_hint_seen INTEGER NOT NULL DEFAULT 0 CHECK(potion_hint_seen IN (0,1)));
 INSERT INTO player_onboarding(player_id,step) SELECT id,3 FROM players;`);db.exec('COMMIT');}
 catch(e){db.exec('ROLLBACK');throw e;}
}
export function createOnboarding(db){
 const player=id=>{const p=db.prepare('SELECT area FROM players WHERE id=?').get(id);if(!p)throw new Error('Karakter gerekli.');return p;};
 const read=id=>{player(id);db.prepare('INSERT OR IGNORE INTO player_onboarding(player_id,step) VALUES(?,0)').run(id);const row=db.prepare('SELECT step,potion_hint_seen FROM player_onboarding WHERE player_id=?').get(id);return {step:row.step,potionHintSeen:row.potion_hint_seen===1};};
 return {read,advance(id,event){const p=player(id);const current=read(id).step;
 if(event==='potion_hint_seen'){db.prepare('UPDATE player_onboarding SET potion_hint_seen=1 WHERE player_id=? AND potion_hint_seen=0').run(id);return read(id);}
 const next={teleport_open:1,forest_arrival:2,first_attack:3}[event];
 if(!next)throw new Error('Geçersiz rehber adımı.');
 if(next>=2&&p.area!=='forest')return {step:current};
 if(next===3&&current<2)return {step:current};
 db.prepare('UPDATE player_onboarding SET step=MAX(step,?) WHERE player_id=?').run(next,id);return read(id);
 }};
}
