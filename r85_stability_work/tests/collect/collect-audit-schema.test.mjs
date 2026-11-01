import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeHttpHost} from '../../working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {nonlethalSchemaR56} from '../../working/core511-source/scripts/core511/nonlethal-rewards-r56.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
test('material audit exact hashes preserve native combat schema guard and reject changed or unknown triggers',async t=>{
 const s=await nativeHttpHost(t);await s.world.stopJobs();const sql=s.host.database.sqlite;
 const rows=sql.prepare("SELECT name,sql FROM temp.sqlite_schema WHERE type='trigger' AND name LIKE 'kernel511_collect_dungeon_materials_%' ORDER BY name").all();assert.equal(rows.length,3);
 const before=process.env.R85_AUDIT_BEFORE==='1',initial=nonlethalSchemaR56(sql);
 if(before){assert.equal(initial,false);for(const r of rows)sql.exec('DROP TRIGGER temp.'+r.name);assert.equal(nonlethalSchemaR56(sql),true,'only the three new audit triggers require additional known hashes');for(const r of rows)sql.exec('CREATE TEMP '+r.sql.slice('CREATE '.length));}
 else{
  assert.equal(initial,true,'full native writer schema remains certified');
  const row=rows.find(r=>r.name.endsWith('_INSERT'));sql.exec('DROP TRIGGER temp.'+row.name);sql.exec('CREATE TEMP '+row.sql.slice('CREATE '.length).replace('SET safe=0','SET safe=1'));assert.equal(nonlethalSchemaR56(sql),false,'same trigger name with modified body is rejected');sql.exec('DROP TRIGGER temp.'+row.name);sql.exec('CREATE TEMP '+row.sql.slice('CREATE '.length));assert.equal(nonlethalSchemaR56(sql),true);
  sql.exec('CREATE TEMP TRIGGER r85_unknown_audit AFTER INSERT ON dungeon_materials BEGIN SELECT 1;END');assert.equal(nonlethalSchemaR56(sql),false,'unknown trigger remains rejected');sql.exec('DROP TRIGGER temp.r85_unknown_audit');assert.equal(nonlethalSchemaR56(sql),true);
 }
 const report={passed:true,phase:before?'before':'after',initialCertified:initial,hashes:Object.fromEntries(rows.map(r=>['temp:'+r.name,hash(r.sql)])),...(before?{droppingOnlyNewTriggersRestoresCertification:true}:{modifiedTriggerRejected:true,unknownTriggerRejected:true,restoredCertified:true}),scope:'complete native SQLite writer schema and real TEMP trigger SQL',liveTouched:false};fs.writeFileSync(new URL('../../evidence/collect-audit-schema-'+report.phase+'.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
});
