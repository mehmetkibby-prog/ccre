const quote=name=>'"'+name.replaceAll('"','""')+'"';
export const canonicalRuneV2Monster483=row=>row?.area==='rune_v2'&&row?.loadlab_run_id===''&&Number.isInteger(row.channel)&&row.channel>=1&&row.channel<=3&&new RegExp('^rune-v2-(?:(?:tide|warden|sentinel|wraith)-c'+row.channel+'-[1-5]|boss-c'+row.channel+'-1)$').test(row.id)&&row.is_boss===0&&row.is_stone===0&&row.summoned===0;
// Called inside the startup migration transaction only. Rollback preserves
// every NPC field (especially spawn_round); restoring never resets its ledger.
export function restoreRuneV2Rollback483(db){
 if(!db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='rune_v2_rollback_monsters483'").get())return 0;
 const cols=db.prepare('PRAGMA table_info(monsters)').all(),archived=db.prepare('PRAGMA table_info(rune_v2_rollback_monsters483)').all();
 if(cols.length!==archived.length||cols.some((c,i)=>c.name!==archived[i].name||c.type!==archived[i].type))throw Error('Karanlık Rün Sahili geri dönüş canavar şeması uyuşmuyor.');
 const rows=db.prepare('SELECT * FROM rune_v2_rollback_monsters483 ORDER BY id').all();if(rows.length>63||rows.some(r=>!canonicalRuneV2Monster483(r))||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Karanlık Rün Sahili geri dönüş canavar kaydı geçersiz.');
 const names=cols.map(c=>c.name),find=db.prepare('SELECT * FROM monsters WHERE id=?'),insert=db.prepare('INSERT INTO monsters('+names.map(quote).join(',')+') VALUES('+names.map(()=>'?').join(',')+')'),remove=db.prepare('DELETE FROM rune_v2_rollback_monsters483 WHERE id=?');
 for(const row of rows){const existing=find.get(row.id);if(existing){if(names.some(c=>existing[c]!==row[c]))throw Error('Karanlık Rün Sahili canavar geri yükleme çatışması.');}else insert.run(...names.map(c=>row[c]));if(names.some(c=>find.get(row.id)[c]!==row[c]))throw Error('Karanlık Rün Sahili canavar geri yükleme doğrulanamadı.');remove.run(row.id);}
 return rows.length;
}
