import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated'),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));
if(hash(bytes)!==baseline)throw Error('Exact V510 required');
const manifest=JSON.parse(bytes),file='vds-server/src/guild-schema.mjs',source=fs.readFileSync(path.join(root,file),'utf8');
if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Native guild schema changed');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),decl=ast.body.find(n=>n.declaration?.declarations?.some(d=>d.id.name==='GUILD_WAR_TIMEOUT_SQL')).declaration.declarations[0],sql=decl.init.quasis[0].value.cooked;
const start=source.indexOf('DROP TRIGGER IF EXISTS guild_war_finish;'),end=source.indexOf('\nEND;',start)+5,native=source.slice(start,end);
if(start<0||end<start||decl.init.expressions.length)throw Error('Native guild timeout drift');
let adapted=native;const edits=[];
for(const [from,to,count]of [
 ['SELECT 1 AS channel UNION ALL SELECT 2 UNION ALL SELECT 3','SELECT 1 AS channel UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4',2],
 ['MAX(1,MIN(30,channel_capacity))','MAX(1,MIN(25,channel_capacity))',3],
 ['occupied.last_seen>=unixepoch()-30',"(occupied.last_seen>=unixepoch()-30 OR EXISTS(SELECT 1 FROM kernel511_admissions col_slot WHERE col_slot.player_id=occupied.id))",3],
 ['arena_match_id=NEW.id AND last_seen>=unixepoch()-30',"arena_match_id=NEW.id AND (last_seen>=unixepoch()-30 OR EXISTS(SELECT 1 FROM kernel511_admissions col_slot WHERE col_slot.player_id=players.id))",1],
 ['players.last_seen<unixepoch()-30 OR',"(players.last_seen<unixepoch()-30 AND NOT EXISTS(SELECT 1 FROM kernel511_admissions col_slot WHERE col_slot.player_id=players.id)) OR",1]
]){if(adapted.split(from).length-1!==count)throw Error('Guild return boundary drift: '+from);adapted=adapted.replaceAll(from,to);edits.push({from,to,count});}
const due='SELECT 1 FROM arena_matches'+sql.slice(sql.indexOf(' WHERE id IN '))+' LIMIT 1',generated='// Exact V510 timeout and return trigger; only public-channel/admission boundaries differ.\n'+Object.entries({GUILD_WAR_TIMEOUT_SQL:sql,GUILD_WAR_DUE_SQL:due,GUILD_WAR_NATIVE_FINISH_SQL:native,GUILD_WAR_FINISH_SQL:adapted}).map(([k,v])=>'export const '+k+'='+JSON.stringify(v)+';').join('\n')+'\n';
fs.writeFileSync(path.join(out,'guild-war-rules.mjs'),generated);fs.writeFileSync(path.join(out,'guild-war-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),timeout:{start:decl.start,end:decl.end,sha256:hash(source.slice(decl.start,decl.end))},finish:{start,end,sha256:hash(native)},generatedSha256:hash(generated),edits,notes:['Timeout SQL is unchanged. Due query derives only the original WHERE clause.','Public channels extend to 4 and cap at 25. Reconnect admissions count as occupied slots even after the native 30-second SQL presence deadline.','Native score, tie, cancellation, economy, HP, position, return preference, overflow and announcements are unchanged.']},null,2)+'\n');
