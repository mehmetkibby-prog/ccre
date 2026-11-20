import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {encodeHoldingsActorR127,inventoryRowsR127,storageRowsR127,readHoldingsR127} from '../../r109_latency_completion/working/core511-source/scripts/core511/committed-holdings-r127.mjs';
import {decodeCommittedActorR113} from '../../r109_latency_completion/working/core511-source/scripts/core511/committed-codec-r113.mjs';

test('every receipt decodes independently with native order, rollback, ownership and historical values',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 db.exec('CREATE TABLE player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at,expires_at_ms,sale_locked499);CREATE TABLE player_storage_items(id,player_id,slot,kind,item_name,rarity,power,role,enchantments,created_at)');
 const insert=db.prepare('INSERT INTO player_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?)'),store=db.prepare('INSERT INTO player_storage_items VALUES(?,?,?,?,?,?,?,?,?,?)');
 const owner={channel:4,incarnation:'test',epoch:2};
 function capture(id='p'){
  const part={id,base:1,next:2,bundle:{owner},sections:{owner:{id},drops:[],dungeonWings:null}};
  const before={...part,sections:{...part.sections,inventory:db.prepare(inventoryRowsR127).all(id),storageItems:db.prepare(storageRowsR127).all(id)}};
  const expected=JSON.parse(JSON.stringify(before));
  const holdings=readHoldingsR127(db,id);
  for(const compress of [false,true]){
   const envelope=encodeHoldingsActorR127(part,holdings,{compress});
   assert.deepEqual(decodeCommittedActorR113(envelope),expected);
   assert.equal(decodeCommittedActorR113({...envelope,epoch:3}),null);
  }
  return encodeHoldingsActorR127(part,holdings,{compress:true});
 }
 capture();
 const shell={id:'p',base:0,next:1,bundle:{owner},sections:{}};
 assert.deepEqual(decodeCommittedActorR113(encodeHoldingsActorR127(shell,readHoldingsR127(db,'p'))).sections,{inventory:[],storageItems:[]});
 const insertUnsafe="INSERT INTO player_items(id,player_id,power) VALUES('oversize','historic',9223372036854775807)";
 db.exec(insertUnsafe);
 assert.throws(()=>readHoldingsR127(db,'historic'),{code:'ERR_OUT_OF_RANGE'});
 for(let i=0;i<400;i++){
  insert.run('a'+i,'p','kılıç','Ödül № '+i+' 🌙"\n','royal',19.5,null,'[{"kind":"def"}]',[0,1,null,-1][i%4],Math.floor(i/3),null,0);
  if(i<35)store.run('s'+i,'p',i,'zırh','Eski','purple',i,null,'[]',i);
 }
 const first=capture();assert.match(first.image,/^z1:/);
 db.exec("BEGIN; UPDATE player_items SET item_name='ara'; DELETE FROM player_storage_items");const interim=capture();db.exec('ROLLBACK');
 assert.deepEqual(decodeCommittedActorR113(capture()),decodeCommittedActorR113(first));
 assert.notDeepEqual(decodeCommittedActorR113(interim),decodeCommittedActorR113(first));
 db.prepare('UPDATE player_items SET item_name=? WHERE id=?').run('old\u0000tail','a2');capture();
 db.exec("UPDATE player_items SET enchantments=x'61' WHERE id='a0'");
 capture();
 capture('other');
 db.exec("DELETE FROM player_items; DELETE FROM player_storage_items");capture();
});
