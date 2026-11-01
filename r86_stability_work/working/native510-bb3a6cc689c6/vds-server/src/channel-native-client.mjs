import {PremiumEngine} from './premium-engine.mjs';
import {createStarterReward} from './starter-reward.mjs';

export function installChannelNativeInventory(database){
 const premium=new PremiumEngine(database.sqlite);
 premium.refreshHp=playerId=>database.nativeOperation({name:'premium.refreshHp',playerId});
 globalThis.__colPremium=premium;
 globalThis.__colStorage={act:(playerId,input,accountId)=>database.nativeOperation({name:'storage.act',playerId,input,accountId})};
 const starter=createStarterReward(database.sqlite,{initialize:false});
 globalThis.__colStarterReward={grant(accountId,playerId){
  return starter.inspect(accountId,playerId)??database.nativeOperation({name:'starter.grant',accountId,playerId});
 }};
}
