// The audit receipt and balance increment commit together. Retries reuse the
// receipt, including when the HTTP response was lost after a successful grant.
export async function grantCoreCoins(database:any,adminId:string,input:{playerName:unknown;amount:unknown;requestId:unknown}){
 const playerName=typeof input.playerName==='string'?input.playerName.trim():'';
 const amount=input.amount,requestId=input.requestId;
 if(!playerName||playerName.length>32||/[\r\n\t]/.test(playerName))throw new Error('Geçerli oyuncu adını yaz.');
 if(typeof amount!=='number'||!Number.isSafeInteger(amount)||amount<1||amount>1000000)throw new Error('ÇP miktarı 1–1.000.000 arasında tam sayı olmalı.');
 if(typeof requestId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(requestId))throw new Error('Gönderim kimliği geçersiz.');
 const id='grant-core-coins:'+requestId;
 const result=await database.batch([
  database.prepare(`INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms)
   SELECT ?,?,'grant_core_coins',account_id,json_object('playerId',id,'playerName',name,'requestedName',?,'amount',?,'before',core_coins,'after',core_coins+?),?
   FROM players WHERE name=? COLLATE NOCASE AND typeof(core_coins)='integer' AND core_coins BETWEEN 0 AND ?
   AND (SELECT COUNT(*) FROM players WHERE name=? COLLATE NOCASE)=1
   ON CONFLICT(id) DO NOTHING RETURNING detail_json`)
   .bind(id,adminId,playerName,amount,amount,Date.now(),playerName,Number.MAX_SAFE_INTEGER-amount,playerName),
  database.prepare(`UPDATE players SET core_coins=core_coins+? WHERE id=(SELECT json_extract(detail_json,'$.playerId') FROM admin_audit_events WHERE id=?) AND changes()=1 RETURNING id,core_coins`).bind(amount,id),
 ]);
 const receipt=await database.prepare('SELECT admin_account_id,action,detail_json FROM admin_audit_events WHERE id=?').bind(id).first();
 if(!receipt)throw new Error('Oyuncu bulunamadı veya ÇP bakiyesi güvenli sınırın dışında. Tam oyuncu adını kontrol et.');
 const detail=JSON.parse(receipt.detail_json);
 if(receipt.admin_account_id!==adminId||receipt.action!=='grant_core_coins'||detail.requestedName!==playerName||detail.amount!==amount)throw new Error('Bu gönderim kimliği başka bir işleme ait.');
 return {playerName:detail.playerName,amount,balance:detail.after,replayed:!result[0]?.results?.length};
}
