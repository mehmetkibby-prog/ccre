import {createHash} from 'node:crypto';
import {itemRefreshR57} from './r57-options.mjs';
// SQLite-owned per-transaction evidence. OLD and NEW owners, including native
// trigger effects and savepoint rollback, are observed without changing items.
const definitions=['INSERT','UPDATE','DELETE'].map(event=>{
 const name='kernel511_item_refresh_r57_'+event,refs=event==='INSERT'?['NEW']:event==='DELETE'?['OLD']:['OLD','NEW'];
 const body=refs.map(ref=>`INSERT INTO kernel511_refresh_item_actors SELECT ${ref}.player_id WHERE ${ref}.player_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM kernel511_refresh_item_actors WHERE id=${ref}.player_id);`).join('');
 return {name,sql:`CREATE TRIGGER ${name} ${event==='DELETE'?'BEFORE':'AFTER'} ${event} ON main.player_items WHEN (SELECT v FROM kernel511_refresh_enabled)>0 BEGIN ${body} END`};
});
export const itemRefreshTriggerHashesR57=Object.fromEntries(definitions.map(d=>['temp:'+d.name,createHash('sha256').update(d.sql).digest('hex')]));
export function initializeItemRefreshR57(sql){
 if(!itemRefreshR57)return;
 sql.exec('CREATE TEMP TABLE kernel511_refresh_item_actors(id TEXT PRIMARY KEY) WITHOUT ROWID');
 for(const d of definitions)sql.exec(d.sql.replace('CREATE TRIGGER','CREATE TEMP TRIGGER'));
}
export function clearItemRefreshR57(sql){if(itemRefreshR57)sql.exec('DELETE FROM temp.kernel511_refresh_item_actors');}
export function readItemRefreshR57(sql){return itemRefreshR57?{itemActorsR57:sql.prepare('SELECT id FROM temp.kernel511_refresh_item_actors ORDER BY id').all().map(r=>r.id)}:{};}
