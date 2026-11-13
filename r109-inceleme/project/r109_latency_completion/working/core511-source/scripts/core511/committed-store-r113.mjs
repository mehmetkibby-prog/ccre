import {prepareCached477} from './writer-statements.mjs';
import {demand} from './contract.mjs';

// Immutable derived images share the reward transaction. Large fan-out does
// not enlarge the 256 KiB command receipt. Expired images are recoverable by
// an authoritative snapshot; receipt/sequence and reward journals are separate.
export function initializeCommittedStoreR113(sql){
 sql.exec(`CREATE TABLE IF NOT EXISTS kernel511_committed_images_r113(
  operation_id TEXT NOT NULL,actor TEXT NOT NULL,epoch INTEGER NOT NULL,
  channel INTEGER NOT NULL,incarnation TEXT NOT NULL,created_ms INTEGER NOT NULL,
  image TEXT NOT NULL,PRIMARY KEY(operation_id,actor)) WITHOUT ROWID;
  CREATE INDEX IF NOT EXISTS kernel511_committed_images_age_r113 ON kernel511_committed_images_r113(created_ms,operation_id,actor)`);
}
export function storeCommittedImagesR113(sql,delta){
 demand(sql.isTransaction,'committed_image_transaction');
 const insert=prepareCached477(sql,'INSERT INTO kernel511_committed_images_r113 VALUES(?,?,?,?,?,?,?)');
 const actors=delta.actors.map(part=>{
  const o=part.bundle.owner;insert.run(delta.operationId,part.id,o.epoch,o.channel,o.incarnation,delta.at,JSON.stringify(part));
  return {id:part.id,base:part.base,next:part.next,epoch:o.epoch,channel:o.channel,incarnation:o.incarnation};
 });
 return {...delta,actors,indirect:true};
}
export function readCommittedImagesR113(sql,{operationId,channel,incarnation,actors}){
 demand(typeof operationId==='string'&&operationId.length<=240&&Number.isInteger(channel)&&typeof incarnation==='string'&&Array.isArray(actors)&&actors.length<=25,'committed_image_read');
 const read=prepareCached477(sql,'SELECT image FROM kernel511_committed_images_r113 WHERE operation_id=? AND actor=? AND epoch=? AND channel=? AND incarnation=?');
 const parts=[];let bytes=0;
 for(const a of actors){const row=read.get(operationId,a.id,a.epoch,channel,incarnation);if(!row)return null;bytes+=Buffer.byteLength(row.image);if(bytes>3*1024*1024)return null;parts.push(JSON.parse(row.image));}
 return parts;
}
export function pruneCommittedImagesR113(sql,before,limit){
 const rows=prepareCached477(sql,'SELECT operation_id,actor FROM kernel511_committed_images_r113 WHERE created_ms<? ORDER BY created_ms LIMIT ?').all(before,limit);
 const remove=prepareCached477(sql,'DELETE FROM kernel511_committed_images_r113 WHERE operation_id=? AND actor=?');
 for(const r of rows)remove.run(r.operation_id,r.actor);return rows.length;
}
