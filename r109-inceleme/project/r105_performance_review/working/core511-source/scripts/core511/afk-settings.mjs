export const AFK_DEFAULT_SETTINGS=Object.freeze({enabled:true,continuousMinutes:120,scoreThreshold:70,responseMinutes:3,wrongLimit:3,retentionDays:7,minFarmMinutes:20,cvThreshold:0.08,radiusThreshold:80,killsPerHourThreshold:120,inputRateThreshold:60});
const limits={continuousMinutes:[1,10080],scoreThreshold:[1,100],responseMinutes:[0.05,30],wrongLimit:[1,10],retentionDays:[1,90],minFarmMinutes:[1,10080],cvThreshold:[0.001,1],radiusThreshold:[1,10000],killsPerHourThreshold:[1,100000],inputRateThreshold:[1,100000]};
export function validateAfkSettings(patch,base=AFK_DEFAULT_SETTINGS){
 if(!patch||typeof patch!=='object'||Array.isArray(patch))return {ok:false,message:'Doğrulama ayarları geçersiz.'};
 const value={...base};
 for(const [key,input] of Object.entries(patch)){
  if(key==='enabled'){if(typeof input!=='boolean')return {ok:false,message:'Açık/kapalı değeri geçersiz.'};value.enabled=input;continue;}
  const range=limits[key];if(!range||typeof input!=='number'||!Number.isFinite(input)||input<range[0]||input>range[1]||(['wrongLimit','retentionDays'].includes(key)&&!Number.isInteger(input)))return {ok:false,message:'Ayar aralık dışında: '+key};value[key]=input;
 }
 return {ok:true,value};
}
export function afkEnabledByEnvironment(env=process.env){return env.CORE511_AFK_CHECK!=='0';}
