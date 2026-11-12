// Runs only in the existing owned action transaction. No global/world lane.
// A durable, actor-scoped receipt makes a retried request a read, not a second sale.
export function exchangeEssence(sql, actor, input, settings, now, enforce) {
 const fail=(error,status=409)=>({status,body:{error}});
 if(!sql.isTransaction)throw Error('exchange_requires_owned_transaction');
 const {amount,expectedCost,expectedReward,requestId,requestAt}=input;
 if(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)||!Number.isSafeInteger(requestAt))return fail('İşlem kimliği geçersiz.',400);
 if(!Number.isSafeInteger(amount)||amount<1||!Number.isSafeInteger(expectedCost)||expectedCost<1||!Number.isSafeInteger(expectedReward)||expectedReward<1)return fail('Geçerli bir Öz miktarı seç.',400);
 const operation=JSON.stringify(['bulk_exchange_essence',amount,expectedCost,expectedReward]);
 const old=sql.prepare('SELECT operation,result FROM expansion456_receipts WHERE player_id=? AND request_id=?').get(actor,requestId);
 if(old){if(old.operation!==operation)return fail('Bu işlem kimliği farklı bir takasta kullanılmış.');return {status:200,body:{...JSON.parse(old.result),replayed:true}};}
 if(Math.abs(now-requestAt)>600000)return fail('Takas isteğinin süresi doldu; pencereyi yeniden aç.');
 const p=sql.prepare('SELECT account_id,hp,essence,gems FROM players WHERE id=?').get(actor);
 if(!p||p.hp<=0)return fail('Öz takası için hayatta olmalısın.');
 enforce?.('essence-exchange-r27',p.account_id,{limit:60,windowSeconds:60,blockSeconds:10});
 const cost=settings.exchange_essence_cost,reward=settings.exchange_gem_reward;
 if(!Number.isSafeInteger(cost)||cost<1||!Number.isSafeInteger(reward)||reward<1||cost!==expectedCost||reward!==expectedReward)return fail('Takas oranı değişti; marketi yeniden aç.');
 if(amount%cost!==0)return fail('Öz miktarı '+cost+' sayısının katı olmalı.',400);
 const gems=amount/cost*reward;
 if(!Number.isSafeInteger(gems)||!Number.isSafeInteger(p.gems+gems))return fail('Bu miktar için bakiye sınırı aşılıyor.',400);
 if(amount>p.essence)return fail('Yeterli Yaşam Özün yok.');
 const row=sql.prepare('UPDATE players SET essence=essence-?,gems=gems+? WHERE id=? AND hp>0 AND essence>=? RETURNING essence,gems').get(amount,gems,actor,amount);
 if(!row)return fail('Bakiye değişti; yeniden dene.');
 const body={ok:true,...row,exchangedEssence:amount,earnedGems:gems,message:amount.toLocaleString('tr-TR')+' Öz karşılığında '+gems.toLocaleString('tr-TR')+' Mücevher aldın.'};
 sql.prepare('INSERT INTO expansion456_receipts(player_id,request_id,operation,result,created_at_ms) VALUES(?,?,?,?,?)').run(actor,requestId,operation,JSON.stringify(body),now);
 return {status:200,body};
}
