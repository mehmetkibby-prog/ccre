import type {db} from './game-world';
type GameDatabase=ReturnType<typeof db>;
/** Read and heal in the same transaction; report only HP actually restored. */
export async function restoreStolenLife(database:GameDatabase,playerId:string,amount:number,memoryCombat=false){
 if(!Number.isSafeInteger(amount)||amount<=0)return null;
 const commit=(statements:ReturnType<GameDatabase["prepare"]>[])=>memoryCombat&&(database as any).combat?.enabled?(database as any).combatBatch(statements,playerId):database.batch(statements);
 const rows=await commit([
  database.prepare('SELECT hp FROM players WHERE id=?').bind(playerId),
  database.prepare('UPDATE players SET hp=MIN(max_hp,hp+?),hp_revision=hp_revision+1 WHERE id=? AND hp>0 AND hp<max_hp RETURNING hp,hp_revision,max_hp').bind(amount,playerId),
 ]);
 const healed=rows[1].results[0] as {hp:number;hp_revision:number;max_hp:number}|undefined;
 return healed?{...healed,healed:Math.max(0,healed.hp-Number((rows[0].results[0] as {hp:number}).hp))}:null;
}
