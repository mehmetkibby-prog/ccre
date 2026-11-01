import {configurationSource,configurationHandlers,configurationRequest} from './native-configuration-fixture.mjs';
import {patchNativeGuildConfiguration} from '../patch-native-guild-configuration.mjs';
export const guildConfigurationSource=patchNativeGuildConfiguration(configurationSource).source;
export function guildConfiguration(s){
 const routes=configurationHandlers(s.f,{guildVillageService:()=>s.core.guild,publishGuildEjections:()=>{throw Error('legacy admin guild publisher reached');}},guildConfigurationSource);
 const body={action:'save_guild_village',guildVillageEnabled:false,guildVillageRevision:s.core.guild.settings().revision};
 return {routes,body,request:input=>configurationRequest(input??body),read:()=>JSON.parse(JSON.stringify({settings:s.core.guild.settings(),...s.read(),observer:s.f.sql.prepare('SELECT area,position_revision,hp_revision,realtime_scope_version,is_gm FROM players WHERE id=?').get(s.observer.id)}))};
}
