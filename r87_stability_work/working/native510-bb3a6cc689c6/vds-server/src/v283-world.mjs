// Existing VDS database only. Repeatable startup changes; no character resets.
export function ensureV283World(db){
 const columns=new Set(db.prepare('PRAGMA table_info(combat_settings)').all().map(r=>r.name));
 if(!columns.has('arena_2v2_reward_gems'))db.exec('ALTER TABLE combat_settings ADD COLUMN arena_2v2_reward_gems INTEGER NOT NULL DEFAULT 35');
 db.exec('BEGIN IMMEDIATE');
 try{
  for(let channel=1;channel<=3;channel++){
   const rows=db.prepare("SELECT id FROM monsters WHERE area='frozen' AND channel=? AND is_boss=0 AND is_stone=0 AND summoned=0 AND id NOT LIKE 'frozen-%' ORDER BY substr(id,1,instr(id,'-')-1),y,x,id").all(channel);
   if(rows.length<=45)continue;
   // Spread removals across species and positions instead of emptying one region.
   const remove=rows.filter((_,i)=>Math.floor((i+1)*45/rows.length)===Math.floor(i*45/rows.length));
   const participantTable=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='monster_participants'").get();
   for(const row of remove){
    if(participantTable)db.prepare('DELETE FROM monster_participants WHERE monster_id=?').run(row.id);
    db.prepare('DELETE FROM monsters WHERE id=?').run(row.id);
   }
  }
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
