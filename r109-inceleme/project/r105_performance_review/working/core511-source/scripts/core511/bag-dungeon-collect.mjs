import {r40Options} from './r40-options.mjs';
import {BAG_EQUIPMENT_KINDS,bagFullBody} from './bag-limit.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {SOLO_CATALOG_BY_ID} from '../../../native510-bb3a6cc689c6/lib/solo-dungeon.mjs';

const enabled=process.env.CORE511_BAG_PARTIAL_DUNGEON!=='0';
const countSql=`SELECT count(*) n FROM (SELECT 1 FROM player_items INDEXED BY kernel511_bag_equipment_owner WHERE player_id=? AND equipped=0 AND kind IN (${BAG_EQUIPMENT_KINDS.map(kind=>"'"+kind+"'").join(',')}) LIMIT 35)`;
// Called only on an explicit collect. The resident SQL stub delegates to the
// existing writer path; one indexed read of at most35 entries, no extra writes.
export function selectDungeonBagDrops(sql,actor,run,drops){
 if(!enabled||!r40Options.bagLimit)return {drops,blocked:0};
 const selected=[];let available=null,blocked=0;
 for(const drop of drops){
  const item=run.mode==='solo'?SOLO_CATALOG_BY_ID.get(drop.catalogId):null;
  const gear=run.mode==='solo'?item?.type==='gear'&&BAG_EQUIPMENT_KINDS.includes(item.kind):BAG_EQUIPMENT_KINDS.includes(drop.kind);
  const amount=gear?(run.mode==='solo'?drop.amount:1):0;
  if(gear&&available===null)available=35-prepareServerStatement(sql,countSql).get(actor).n;
  if(gear&&(!Number.isSafeInteger(amount)||amount<1||amount>available)){blocked+=Number.isSafeInteger(amount)&&amount>0?amount:1;continue;}
  selected.push(drop);if(gear)available-=amount;
 }
 return {drops:selected,blocked};
}
export function dungeonBagNotice(blocked){
 return blocked?{bagBlocked:blocked,notice:`Çantanda yeterli yer yok; ${blocked} ekipman yerde kaldı. Yer açıp ganimetin süresi dolmadan topla.`}:{};
}
export function dungeonBagBlocked(snapshot,blocked){return {...snapshot,...bagFullBody(),...dungeonBagNotice(blocked)};}
