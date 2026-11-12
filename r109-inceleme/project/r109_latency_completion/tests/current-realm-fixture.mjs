import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const fixtureTree=process.env.STUTTER_TREE||path.resolve(import.meta.dirname,'../working');
const {realmStartupConfig}=await import(fixtureTree+'/core511-source/scripts/core511/tests/native-realm-startup-fixture.mjs');

// Keep the real signed security boundary, but configure the current two-realm
// manifest before NativeRealmStartup reads it. No production access checks skip.
export function currentRealmFixture(t,host,options={}) {
 const fixture=realmStartupConfig(t,host,options);
 const file=fixture.config.realm.manifestFile,manifest=JSON.parse(fs.readFileSync(file));
 const own=manifest.realms[0],secondary=own.id==='r2';
 own.name=secondary?'Core Akademi':'Core Efsane';
 own.initialChannelCapacity=secondary?10:25;
 const otherId=secondary?'r1':'r2',dir=path.join(path.dirname(file),otherId);
 const other={...own,id:otherId,name:secondary?'Core Efsane':'Core Akademi',initialChannelCapacity:secondary?25:10,
  origin:`https://${otherId}.example.test`,realtimeOrigin:`https://rt-${otherId}.example.test`,dataRoot:dir,database:path.join(dir,'game.sqlite'),dbIdentity:randomUUID(),
  ports:{proxy:3510,app:3511,realtime:3512,dungeon:3513,voice:3514,channels:[3515,3516,3517,3518]}};
 manifest.phase='101';manifest.primaryRealmId='r1';manifest.realms=secondary?[other,own]:[own,other];
 fs.writeFileSync(file,JSON.stringify(manifest));
 return fixture;
}
