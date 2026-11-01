import fs from 'node:fs';
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
Object.assign(process.env,config.environment,{NODE_ENV:'production',CORE_DATABASE_PATH:config.database,VINEXT_TRUST_PROXY:'1',VINEXT_TRUSTED_HOSTS:config.hosts.join(',')});
const [{DatabaseHost},{NativeWorldStartup},{NativeRealmStartup},{reconcileFourthChannelRollback}]=await Promise.all([import('../core511/database-host.mjs'),import('../core511/native-world-startup.mjs'),import('../core511/native-realm-startup.mjs'),import('./rollback-current-db.mjs')]);
const host=await DatabaseHost.open({file:config.database,realmId:config.realm.id,dbIdentity:config.realm.dbIdentity});
try{await NativeWorldStartup.prepare(host);await NativeRealmStartup.prepare(host,config);console.log(JSON.stringify(await reconcileFourthChannelRollback(host)));}finally{await host.close();}
