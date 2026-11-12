import {createHash} from 'node:crypto';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const kinds=new Set(['character','item','storage_item','mail','market_listing','guild']);
export const TRANSFER_CONTRACT_R101=Object.freeze({version:1,sourceRealm:'r2',destinationRealm:'r1',accountKey:'central_account_id',sameClassCharacters:'preserve_separately',currency:'per_character',automaticTransfer:false});

// Metadata only. R101 does not merge worlds or remove any source data.
export function ensureTransferFoundationR101(db,{realmId,dbIdentity}){
 if(!['r1','r2'].includes(realmId)||!uuid.test(dbIdentity))throw Error('transfer_realm_identity_required');
 db.exec(`CREATE TABLE IF NOT EXISTS realm_transfer_identity_r101(id INTEGER PRIMARY KEY CHECK(id=1),realm_id TEXT NOT NULL,db_identity TEXT NOT NULL UNIQUE,contract_version INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS realm_transfer_receipts_r101(source_db_identity TEXT NOT NULL,entity_kind TEXT NOT NULL,source_id TEXT NOT NULL,target_id TEXT NOT NULL,account_id TEXT NOT NULL,payload_sha256 TEXT NOT NULL,transfer_id TEXT NOT NULL,completed_at_ms INTEGER NOT NULL,PRIMARY KEY(source_db_identity,entity_kind,source_id),UNIQUE(entity_kind,target_id));`);
 db.prepare('INSERT OR IGNORE INTO realm_transfer_identity_r101 VALUES(1,?,?,1)').run(realmId,dbIdentity);
 const row=db.prepare('SELECT * FROM realm_transfer_identity_r101 WHERE id=1').get();
 if(row.realm_id!==realmId||row.db_identity!==dbIdentity||row.contract_version!==1)throw Error('transfer_database_identity_changed');
}
export function sourceEntityKeyR101({realmId,dbIdentity,kind,id}){
 if(!['r1','r2'].includes(realmId)||!uuid.test(dbIdentity)||!kinds.has(kind)||typeof id!=='string'||!id||id.length>200)throw Error('invalid_transfer_origin');
 return JSON.stringify([1,realmId,dbIdentity,kind,id]);
}
export function transferTargetIdR101(origin){
 const hash=createHash('sha256').update(sourceEntityKeyR101(origin)).digest('hex');
 return hash.slice(0,8)+'-'+hash.slice(8,12)+'-5'+hash.slice(13,16)+'-a'+hash.slice(17,20)+'-'+hash.slice(20,32);
}
export function characterOriginR101(db,realm,playerId){
 const receipt=db.prepare("SELECT source_db_identity,source_id FROM realm_transfer_receipts_r101 WHERE entity_kind='character' AND target_id=?").get(playerId);
 return receipt?{realmId:'r2',realmName:'Core Akademi',dbIdentity:receipt.source_db_identity,id:receipt.source_id}:{realmId:realm.id,realmName:realm.name,dbIdentity:realm.dbIdentity,id:playerId};
}

// Future importer contract: call inside the SAME destination transaction as the
// complete character/items/balance writes. A retried source can never receive a
// second mapping, even with a new transfer job ID. No web endpoint exposes this.
export function recordTransferReceiptR101(db,{origin,targetId,accountId,payloadSHA256,transferId,now=Date.now()}){
 sourceEntityKeyR101(origin);
 const self=db.prepare('SELECT * FROM realm_transfer_identity_r101 WHERE id=1').get();
 if(!db.isTransaction||self?.realm_id!=='r1'||origin.realmId!=='r2'||origin.dbIdentity===self.db_identity||!uuid.test(targetId)||!uuid.test(transferId)||!accountId||!/^[a-f0-9]{64}$/.test(payloadSHA256))throw Error('invalid_transfer_receipt');
 const prior=db.prepare('SELECT * FROM realm_transfer_receipts_r101 WHERE source_db_identity=? AND entity_kind=? AND source_id=?').get(origin.dbIdentity,origin.kind,origin.id);
 if(prior){if(prior.target_id!==targetId||prior.account_id!==accountId||prior.payload_sha256!==payloadSHA256)throw Error('transfer_already_recorded_with_different_payload');return {alreadyRecorded:true,targetId:prior.target_id};}
 db.prepare('INSERT INTO realm_transfer_receipts_r101 VALUES(?,?,?,?,?,?,?,?)').run(origin.dbIdentity,origin.kind,origin.id,targetId,accountId,payloadSHA256,transferId,now);
 return {alreadyRecorded:false,targetId};
}
