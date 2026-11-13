import {createHash} from 'node:crypto';
import {prepareCached477} from './writer-statements.mjs';
import {readTowerConfig} from './tower-config.mjs';
import {demand} from './contract.mjs';

const connections=new WeakMap(),immutableRefs=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const equal=(a,b)=>a===b||a&&b&&typeof a==='object'&&typeof b==='object'&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&Object.is(a[k],b[k]));
export function dungeonSettingsRefR113(settings){
 demand(settings&&['game_settings','combat_settings','dungeon_settings','kadim_tower_settings'].every(k=>settings[k]&&typeof settings[k]==='object'),'dungeon_settings_image');
 return immutableRefs.get(settings)??createHash('sha256').update(JSON.stringify(settings)).digest('hex');
}
export function immutableDungeonSettingsR113(settings){
 const ref=dungeonSettingsRefR113(settings),image=freeze(JSON.parse(JSON.stringify(settings)));immutableRefs.set(image,ref);return Object.freeze({ref,settings:image});
}
// Read every complete current SQL row inside the caller's snapshot. A revision
// number, data_version, TTL or a successful previous command is not a cache key.
// Exact row equality also notices in-transaction edits and restores on rollback.
export function readDungeonSettingsPointR113(sql){
 const rows=[prepareCached477(sql,'SELECT * FROM game_settings WHERE id=1').get(),prepareCached477(sql,'SELECT * FROM combat_settings WHERE id=1').get(),prepareCached477(sql,'SELECT value FROM dungeon_settings WHERE id=1').get()?.value,prepareCached477(sql,'SELECT value FROM kadim_tower_settings WHERE id=1').get()?.value];
 const prior=connections.get(sql);if(prior&&rows.every((row,i)=>equal(row,prior.rows[i])))return prior.point;
 const point=immutableDungeonSettingsR113({game_settings:rows[0],combat_settings:rows[1],dungeon_settings:JSON.parse(rows[2]),kadim_tower_settings:readTowerConfig(rows[3])});
 connections.set(sql,{rows,point});return point;
}
export function retainDungeonSettingsR113(channel,settings){
 const ref=dungeonSettingsRefR113(settings);
 if(channel.dungeonSettingsR113?.ref!==ref)channel.dungeonSettingsR113=immutableDungeonSettingsR113(settings);
 return channel.dungeonSettingsR113;
}
