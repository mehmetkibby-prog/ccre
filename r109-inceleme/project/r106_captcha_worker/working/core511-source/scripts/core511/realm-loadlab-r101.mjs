// The installed live load-test controller belongs to the primary world only.
// Keep the registry and durable revoked-entity seeds in BOTH worlds. Never
// read the primary control key/state from an Academy process or read worker.
import {loadRuntimeConfig} from '../../../native510-bb3a6cc689c6/vds-server/src/loadlab/registry.mjs';
import {assertRealmDatabaseIdentity} from '../../../native510-bb3a6cc689c6/vds-server/src/realm-database-identity.mjs';

export function realmLoadLabConfigR101(sqlite,expected){
 const exists=sqlite.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='realm_identity'").get();
 // Preserve unbound read-only utility fixtures. Production hosts always pass
 // their expected identity and cannot enter this compatibility branch.
 if(!exists){if(expected)throw Error('loadlab_realm_identity_required');return loadRuntimeConfig();}
 const identity=sqlite.prepare('SELECT realm_id,database_id FROM realm_identity WHERE id=1').get();
 if(!identity)throw Error('loadlab_realm_identity_invalid');
 assertRealmDatabaseIdentity(sqlite,expected??{realmId:identity.realm_id,dbIdentity:identity.database_id});
 return identity.realm_id==='r1'?loadRuntimeConfig():null;
}
