import {createExpansion456Inventory} from './expansion456-inventory.mjs';
import {readEventsConfig,eventActive} from '../../lib/game-events.mjs';
import {PremiumEngine} from './premium-engine.mjs';
import {createStorage} from './storage.mjs';
import {createStarterReward} from './starter-reward.mjs';
import {channelError} from './channel-protocol.mjs';

// Only permanent inventory operations run here. No movement, combat, monster
// AI, reward roll or dungeon tick is dispatched to the writer. The surrounding
// ChannelWriter transaction includes the operation receipt and waits for fsync.
export class ChannelNativeOperations {
 constructor(database){
  this.database=database;let depth=0;
  this.connection={prepare:sql=>database.compiled(sql),get isTransaction(){return database.sqlite.isTransaction;},exec:sql=>{
   const command=sql.trim().replace(/;$/,'').toUpperCase();
   if(command==='BEGIN'||command==='BEGIN IMMEDIATE'){
    if(!database.sqlite.isTransaction||depth)throw channelError('invalid_native_transaction');
    database.sqlite.exec('SAVEPOINT native_inventory');depth=1;return;
   }
   if(command==='COMMIT'&&depth){database.sqlite.exec('RELEASE native_inventory');depth=0;return;}
   if(command==='ROLLBACK'&&depth){database.sqlite.exec('ROLLBACK TO native_inventory; RELEASE native_inventory');depth=0;return;}
   throw channelError('invalid_native_transaction');
  }};
  this.expansion456=createExpansion456Inventory(this.connection,{isHalloweenActive:time=>eventActive(readEventsConfig(this.database.compiled('SELECT events_json FROM game_settings WHERE id=1').get()?.events_json).events.halloween,time)});
  this.brokenCore464=createBrokenCore464(this.connection);
  this.premium=new PremiumEngine(this.connection);
  this.storage=createStorage(this.connection);
  this.starter=createStarterReward(this.connection,{initialize:false});
  this.assertClosed=()=>{if(depth)throw channelError('unclosed_native_transaction');};
  this.reset=()=>{depth=0;};
 }
 execute({name,playerId,accountId,input}){
  if(!this.database.sqlite.isTransaction)throw channelError('native_writer_transaction_required');
  let result;
  if(name==='expansion456.act'){if(this.database.compiled('SELECT account_id FROM players WHERE id=?').get(playerId)?.account_id!==accountId)throw channelError('native_account_scope');result=this.expansion456.act(playerId,input);}
  else if(name==='brokenCore464.act'){if(this.database.compiled('SELECT account_id FROM players WHERE id=?').get(playerId)?.account_id!==accountId)throw channelError('native_account_scope');result=this.brokenCore464.act(playerId,input);}
  else if(name==='premium.refreshHp')result=this.premium.refreshHp(playerId);
  else if(name==='storage.act')result=this.storage.act(playerId,input,accountId);
  else if(name==='starter.grant'){
   if(this.database.compiled('SELECT account_id FROM players WHERE id=?').get(playerId)?.account_id!==accountId)throw channelError('native_account_scope');
   result=this.starter.grant(accountId,playerId);
  }else throw channelError('unknown_native_operation');
  this.assertClosed();return result??null;
 }
}

import {createBrokenCore464} from './broken-core464.mjs';
