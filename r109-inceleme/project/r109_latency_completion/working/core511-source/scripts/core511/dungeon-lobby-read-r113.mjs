import {createDungeonRules} from './generated/dungeon-rules.mjs';
import {createProgressionSettings} from '../../../native510-bb3a6cc689c6/vds-server/src/progression-settings.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {demand} from './contract.mjs';

// An unopened dungeon menu is a query, not a reward command. Run the original
// native snapshot on the existing query-only WAL worker. No room simulation,
// migrations, checkpoint, receipt, actor image or RNG runs on this path.
export class DungeonLobbyReaderR113 {
 constructor(sql){
  this.sql=sql;this.now=0;
  const random=()=>{throw Error('dungeon_lobby_random_forbidden');};
  const globals={__colProgression:{snapshot:()=>this.progression.snapshot()}};
  const Rules=createDungeonRules({globals,progressionSettings:()=>this.progression.snapshot(),randomUUID:random,randomInt:random});
  this.engine=Object.assign(Object.create(Rules.DungeonEngine.prototype),{db:sql,now:()=>this.now,runs:new Map(),notices:new Map()});
 }
 read({actor,channel,incarnation,epoch,nowMs}){
  const sql=this.sql;
  demand(typeof actor==='string'&&actor.length>0&&actor.length<=160&&[1,2,3,4].includes(channel)&&typeof incarnation==='string'&&Number.isSafeInteger(epoch)&&epoch>0&&Number.isSafeInteger(nowMs)&&nowMs>=0,'dungeon_lobby_parameters');
  demand(prepareCached477(sql,'PRAGMA query_only').get().query_only===1&&!sql.isTransaction,'dungeon_lobby_read_only');
  sql.exec('BEGIN');
  try{
   const owner=prepareCached477(sql,`SELECT o.channel,o.incarnation,o.epoch,o.state FROM kernel511_channel_owners o
    JOIN kernel511_admissions a ON a.player_id=o.player_id AND a.channel=o.channel AND a.epoch=o.epoch
    JOIN players p ON p.id=o.player_id AND p.channel=o.channel WHERE o.player_id=?`).get(actor);
   demand(owner&&owner.state==='active'&&owner.channel===channel&&owner.incarnation===incarnation&&owner.epoch===epoch,'dungeon_lobby_owner_fenced');
   demand(!prepareCached477(sql,'SELECT 1 FROM dungeon_members WHERE player_id=?').get(actor),'dungeon_lobby_has_room');
   this.now=nowMs;
   if(this.progression)this.progression.refresh();else this.progression=createProgressionSettings(sql);
   const body=this.engine.command(actor,{action:'sync'});
   demand(body?.run===null,'dungeon_lobby_result');
   sql.exec('COMMIT');return {version:1,actor,channel,incarnation,epoch,body};
  }catch(error){sql.exec('ROLLBACK');throw error;}
 }
}
