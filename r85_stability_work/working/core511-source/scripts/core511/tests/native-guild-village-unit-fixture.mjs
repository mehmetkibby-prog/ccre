import {NativeGuildVillage} from '../native-guild-village.mjs';
import {bindGuildEjection} from './guild-ejection-fixture.mjs';
import {native} from './helpers.mjs';

// SQL parity/crash fixture only: the production five-process owner barrier is
// covered separately by native-guild-village-process.test.mjs.
export async function standaloneRevoke(database,nowMs){
 const writer=await bindGuildEjection(database,nowMs),{createGuildVillage}=await native('vds-server/src/guild-village.mjs'),clock=()=>nowMs;
 const core={database,writer,authority:writer.authority,clock,realmId:'guild-ejection-test',guild:createGuildVillage(database.sqlite,{now:clock}),notify:()=>{},closed:false,nativeConfiguration:{async run(ids,operation){const result=operation();await writer.durableExternal();return result;}}};
 const adapter=new NativeGuildVillage(core);database.core511GuildVillage=adapter;core.nativeGuildVillage=adapter;
 core.nativeConfiguration.runGuild=async(bound,ids,operation)=>{if(bound!==adapter)throw Error('fixture_guild_binding');return core.nativeConfiguration.run(ids,operation);};
 return {writer,core,adapter};
}
