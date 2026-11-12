import {characterOriginR101} from './realm-transfer-r101.mjs';
import {REALM_R101} from './realm-profile-r101.mjs';
const failure=(message,status=409)=>{throw Object.assign(Error(message),{status});};
export function createCharacterSelectionSchemaR101(db){
 db.exec(`CREATE TABLE IF NOT EXISTS character_selection_r101(token_hash TEXT PRIMARY KEY REFERENCES auth_sessions(token_hash) ON DELETE CASCADE,account_id TEXT NOT NULL REFERENCES accounts(id),player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,selected_at_ms INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS character_selection_account_r101 ON character_selection_r101(account_id);`);
}
// Retain the original single-character path when a session has not selected
// yet. With multiple owned characters there is NO arbitrary LIMIT 1 fallback.
export const SELECTED_CHARACTER_SQL_R101=` AND p.id=COALESCE((SELECT chosen.player_id FROM character_selection_r101 chosen WHERE chosen.token_hash=s.token_hash AND chosen.account_id=a.id),(SELECT MIN(only_player.id) FROM players only_player WHERE only_player.account_id=a.id HAVING COUNT(*)=1))`;
export function listCharactersR101(sql,accountId){return sql.prepare('SELECT id,name,role,level,area,channel FROM players WHERE account_id=? ORDER BY level DESC,id LIMIT 100').all(accountId);}
export function selectCharacterR101(sql,session,playerId,now=Date.now()){
 if(!sql.isTransaction)throw Error('r101_character_transaction_required');
 const current=sql.prepare('SELECT s.account_id,s.security_version,a.security_version current_version,s.expires_at FROM auth_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=?').get(session.tokenHash);
 if(!current||current.account_id!==session.account.id||current.security_version!==session.securityVersion||current.current_version!==session.securityVersion||current.expires_at<=now/1000)failure('Oturumun değişti. Yeniden giriş yap.',401);
 const player=sql.prepare('SELECT id,name,role FROM players WHERE id=? AND account_id=?').get(playerId,session.account.id);
 if(!player)failure('Karakter bulunamadı.',404);
 // Never abandon an active character or a battle by changing a request ID.
 const owners=sql.prepare('SELECT a.player_id FROM kernel511_admissions a JOIN players p ON p.id=a.player_id WHERE p.account_id=?').all(session.account.id);
 if(owners.some(row=>row.player_id!==playerId))failure('Önce açık oyun penceresinden çıkış yap.');
 sql.prepare(`INSERT INTO character_selection_r101 VALUES(?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET account_id=excluded.account_id,player_id=excluded.player_id,selected_at_ms=excluded.selected_at_ms`).run(session.tokenHash,session.account.id,playerId,now);
 return {ok:true,player};
}
async function readBody(request){
 if(!request.headers.get('content-type')?.includes('application/json'))failure('JSON isteği gerekli.',415);
 const reader=request.body?.getReader();if(!reader)failure('Geçersiz istek.',400);
 let size=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2048){await reader.cancel();failure('İstek çok büyük.',413);}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}finally{reader.releaseLock();}
}
export async function characterRouteR101(c,request){
 const path=new URL(request.url).pathname;
 if(!['/api/realm/context','/api/realm/characters','/api/realm/character-select'].includes(path))return null;
 const headers={'cache-control':'no-store'};
 if(c.realm?.manifest.phase!=='101')return Response.json({error:'Sunucu seçimi etkin değil.'},{status:404,headers});
 try{
  const select=path.endsWith('/character-select');
  if(request.method!==(select?'POST':'GET'))return new Response(null,{status:405,headers:{...headers,allow:select?'POST':'GET'}});
  if(path.endsWith('/context'))return Response.json({realm:{id:c.realm.id,name:c.realm.realm.name},authOrigin:c.realm.authOrigin,adminPath:'/admin',sharedCpCodes:true},{headers});
  const session=await c.authenticate(request,{csrf:select});
  if(!select)return Response.json({realm:{id:c.realm.id,name:c.realm.realm.name},characters:listCharactersR101(c.database.sqlite,session.account.id).map(p=>{const origin=characterOriginR101(c.database.sqlite,c.realm.realm,p.id);return {...p,originRealm:origin.realmId,originName:origin.realmName};}),selectedId:session.player?.id??null,canCreate:!c.database.sqlite.prepare('SELECT 1 FROM players WHERE account_id=? LIMIT 1').get(session.account.id),authOrigin:c.realm.authOrigin},{headers});
  const body=await readBody(request);
  if(typeof body?.playerId!=='string'||!body.playerId||body.playerId.length>160)failure('Karakter seçmelisin.',400);
  const result=await c.serial(async()=>{
   const current=await c.authenticate(request);
   if(current.account.id!==session.account.id||current.tokenHash!==session.tokenHash)failure('Oturumun değişti.',401);
   return c.database.atomic(sql=>selectCharacterR101(sql,current,body.playerId,c.clock()));
  });
  return Response.json(result,{headers});
 }catch(error){return Response.json({error:error.status?error.message:'Karakterler şu anda yüklenemedi. Yeniden dene.',code:error.code??'character_selection_failed'},{status:[400,401,403,404,409,413,415,423,429,503].includes(error.status)?error.status:503,headers});}
}
