import fs from 'node:fs';
import {nativeHttpHost} from '../working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
const cleanups=[],scope={after:fn=>cleanups.push(fn)};
try {
 const s=await nativeHttpHost(scope,{start:false});await s.bind();
 const sql=s.host.database.sqlite;
 const schema=sql.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type,name").all();
 fs.writeFileSync(new URL('../evidence/schema.json',import.meta.url),JSON.stringify(schema,null,2));
 const tables=['normal_defeats','normal_reward_claims','monster_participants','monster_xp_claims','world_drops','kernel511_channel_receipts','kernel511_receipt_overflow','player_items'];
 for(const table of tables)console.log(JSON.stringify({table,columns:sql.prepare('PRAGMA table_info('+table+')').all().map(r=>r.name),indices:schema.filter(r=>r.type==='index'&&r.tbl_name===table).map(r=>r.sql)}));
}finally{for(const fn of cleanups)await fn();}
