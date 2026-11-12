import {randomUUID} from 'node:crypto';
import {setupPvp,put,update} from './pvp-fixture.mjs';
import {native} from './helpers.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {EntryWriter,createNativeEntryAuth,nativeTokenHash} from '../entry-writer.mjs';

export async function setupEntry(t,{fresh=false,realTime=false}={}){
 const f=await setupPvp(t),{sql,id}=f;let time=f.nowMs;
 f.reset({area:'bazaar',actor:{x:900,y:900,hp:1000,max_hp:1000}});
 const clock=()=>realTime?Date.now():time;let account=sql.prepare('SELECT * FROM accounts WHERE id=(SELECT account_id FROM players WHERE id=?)').get(id);
 if(fresh){account={...account,id:account.id+'-fresh',username:account.username+'Fresh',username_normalized:account.username_normalized+'fresh',email:'fresh-'+account.email,email_normalized:'fresh-'+account.email_normalized};put(sql,'accounts',account);}
 const token='native_session_'+'a'.repeat(40),csrf='native_csrf_'+'b'.repeat(40),tokenHash=nativeTokenHash(token),instance=randomUUID(),origin='https://game.invalid';
 sql.prepare('DELETE FROM auth_sessions WHERE account_id=?').run(account.id);
 put(sql,'auth_sessions',{token_hash:tokenHash,csrf_hash:nativeTokenHash(csrf),account_id:account.id,created_at:Math.floor(time/1000),last_seen_at:Math.floor(time/1000),expires_at:Math.floor(time/1000)+3600,security_version:account.security_version});
 sql.prepare('DELETE FROM game_presence WHERE account_id=?').run(account.id);
 put(sql,'game_presence',{account_id:account.id,token_hash:tokenHash,instance_id:instance,expires_at_ms:time+40000,chat_after_id:0});
 const {createBotCheck}=await native('vds-server/src/bot-check.mjs'),bot=createBotCheck(sql,{now:clock,exempt:()=>sql.prepare('SELECT area FROM players WHERE account_id=?').get(account.id)?.area==='afk'});
 bot.deadline(account.id);
 const services=new NativeGameServices(sql,{clock}),globals=services.globals;
 Object.assign(globals,{__colBotCheck:bot,__colLaunch:{status:()=>({canPlay:true})}});
 const auth=createNativeEntryAuth({database:f.db,globals,clock}),entry=new EntryWriter({database:f.f.database,services,clock});
 const request=({path='/api/realtime/core511-ticket',method='POST',headers={},body}={})=>new Request(origin+path,{method,headers:{Origin:origin,Cookie:'__Host-yasam-session='+token+'; __Host-yasam-csrf='+csrf,'X-CSRF-Token':csrf,'X-Game-Instance':instance,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {...f,clock,setTime:value=>{time=value;},account,token,csrf,tokenHash,instance,origin,services,globals,bot,auth,entry,request};
}
