import {NativeGameServices} from './game-services.mjs';
import {demand} from './contract.mjs';

// Cold read-worker only. These are the original native service reads, not a
// second configuration parser with new defaults. Caller owns the WAL snapshot.
export function readConfiguration(sql,{revision,nowMs}){
 demand(Number.isSafeInteger(revision)&&revision>=0&&sql.isTransaction,'config_read_transaction');
 const {globals:g}=new NativeGameServices(sql,{clock:()=>nowMs});
 return {revision,contentR102:g.__colContentR102.settings(),rank:g.__colRanks.settings(),rune:g.__colRunes.settings(),runeV2:g.__colRuneV2.settings(),status:g.__colStatus.settings(),
  progression:g.__colProgression.snapshot(),dragon:g.__colDragonBoss.settings(),dungeon:g.__colDungeon.settings(),
  dungeonRaw:JSON.parse(sql.prepare('SELECT value FROM dungeon_settings WHERE id=1').get()?.value??'{}'),events:g.__colEventIsland444.settings(),
  eventProfiles:sql.prepare("SELECT e.id,e.profile_json FROM event_island_monsters444 e JOIN monsters m ON m.id=e.id WHERE m.hp>0 AND m.area='event'").all().map(r=>[r.id,JSON.parse(r.profile_json)])};
}
