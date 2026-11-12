import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
import {PROTOCOL} from './contract.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),pin='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));
if(hash(bytes)!==pin)throw Error('Exact V510 required');const file='vds-server/src/realm-manifest.mjs',source=fs.readFileSync(path.join(root,file),'utf8');if(hash(source)!==JSON.parse(bytes).files.find(r=>r.path===file)?.sha256)throw Error('Native manifest source changed');
let generated=source;const edits=[];function replace(original,replacement){if(generated.split(original).length!==2)throw Error('Native manifest anchor changed:'+original);edits.push({original,replacement});generated=generated.replace(original,replacement);}
replace("requireValue(row.channels === 3, 'v416a/b keeps three channels per realm');",`requireValue(row.coreProtocol === undefined || row.coreProtocol === ${JSON.stringify(PROTOCOL)}, 'unknown core protocol');
    const core511 = row.coreProtocol === ${JSON.stringify(PROTOCOL)};
    requireValue(row.channels === (core511 ? 4 : 3), 'channel count must match the explicit core protocol');
    requireValue(!core511 || input.phase !== '416a' && row.initialChannelCapacity === 25, 'CORE511 requires four channels of 25');`);
replace("    requireValue(typeof row.dbIdentity === 'string'",`    if (core511) {
      requireValue(Array.isArray(row.ports.channels) && row.ports.channels.length === 4, 'CORE511 requires four channel ports');
      boundPorts.channels = Object.freeze(row.ports.channels.map(value => {
        requireValue(integer(value, 1024, 65535) && !ports.has(value), 'invalid or reused channel port');
        ports.add(value); return value;
      }));
    } else requireValue(row.ports?.channels === undefined, 'legacy realm cannot specify channel ports');
    requireValue(typeof row.dbIdentity === 'string'`);
replace('registrationOpen: row.registrationOpen, channels: 3, initialChannelCapacity: row.initialChannelCapacity,','registrationOpen: row.registrationOpen, channels: row.channels, ...(core511 ? {coreProtocol: row.coreProtocol} : {}), initialChannelCapacity: row.initialChannelCapacity,');
replace('health.ready === true && integer(health.channelCapacity, 1, 30) &&','health.ready === true && integer(health.channelCapacity, 1, 30) &&\n      (!realm.coreProtocol || health.protocol === realm.coreProtocol && health.channelCapacity === 25) &&');
replace('health.channels.length === 3','health.channels.length === realm.channels');
replace('capacity: capacity * 3','capacity: capacity * realm.channels');

// R101 realm scope transformations are recorded after the native extraction.
const realmChangesR101=[
  {
    "original": "export function validateRealmManifest(input) {\n  requireValue(input && input.version === 1, 'unsupported version');\n  requireValue(input.phase === '416a' || input.phase === '416b' || input.phase === '417', 'unknown rollout phase');\n  requireValue(typeof input.primaryRealmId === 'string' && idPattern.test(input.primaryRealmId), 'primaryRealmId required');\n  const accountsDatabase = dataPath(input.accountsDatabase, 'accountsDatabase');\n",
    "replacement": "export function validateRealmManifest(input) {\n  requireValue(input && input.version === 1, 'unsupported version');\n  requireValue(input.phase === '416a' || input.phase === '416b' || input.phase === '417' || input.phase === '101', 'unknown rollout phase');\n  requireValue(typeof input.primaryRealmId === 'string' && idPattern.test(input.primaryRealmId), 'primaryRealmId required');\n  const accountsDatabase = dataPath(input.accountsDatabase, 'accountsDatabase');\n",
    "phase": "r101"
  },
  {
    "original": "    const core511 = row.coreProtocol === \"coreoflife-kernel-v1\";\n    requireValue(row.channels === (core511 ? 4 : 3), 'channel count must match the explicit core protocol');\n    requireValue(!core511 || input.phase !== '416a' && row.initialChannelCapacity === 25, 'CORE511 requires four channels of 25');\n    requireValue(integer(row.initialChannelCapacity, 1, 30), 'invalid initial channel capacity');\n    requireValue(input.phase !== '416a' || row.initialChannelCapacity === 15, '416a initial capacity is 15');\n",
    "replacement": "    const core511 = row.coreProtocol === \"coreoflife-kernel-v1\";\n    requireValue(row.channels === (core511 ? 4 : 3), 'channel count must match the explicit core protocol');\n    requireValue(!core511 || input.phase !== '416a' && row.initialChannelCapacity === (input.phase==='101'&&row.id!==input.primaryRealmId?10:25), 'CORE511 capacity differs from the realm profile');\n    requireValue(integer(row.initialChannelCapacity, 1, 30), 'invalid initial channel capacity');\n    requireValue(input.phase !== '416a' || row.initialChannelCapacity === 15, '416a initial capacity is 15');\n",
    "phase": "r101"
  },
  {
    "original": "}\n\nexport function publicRealmCatalog(manifest, healthByRealm, nowMs = Date.now()) {\n  return manifest.realms.map(realm => {\n    const health = healthByRealm.get(realm.id);\n",
    "replacement": "}\n\nexport function publicRealmCatalog(manifest, healthByRealm, nowMs = Date.now(), {includeCounts=false}={}) {\n  return manifest.realms.map(realm => {\n    const health = healthByRealm.get(realm.id);\n",
    "phase": "r101"
  },
  {
    "original": "      Number.isFinite(health.sampledAtMs) && health.sampledAtMs <= nowMs && nowMs - health.sampledAtMs <= 15000 &&\n      health.ready === true && integer(health.channelCapacity, 1, 30) &&\n      (!realm.coreProtocol || health.protocol === realm.coreProtocol && health.channelCapacity === 25) &&\n      Array.isArray(health.channels) && health.channels.length === realm.channels && health.channels.every(n => integer(n, 0, 100000));\n    const capacity = current ? health.channelCapacity : realm.initialChannelCapacity;\n",
    "replacement": "      Number.isFinite(health.sampledAtMs) && health.sampledAtMs <= nowMs && nowMs - health.sampledAtMs <= 15000 &&\n      health.ready === true && integer(health.channelCapacity, 1, 30) &&\n      (!realm.coreProtocol || health.protocol === realm.coreProtocol && health.channelCapacity === realm.initialChannelCapacity) &&\n      Array.isArray(health.channels) && health.channels.length === realm.channels && health.channels.every(n => integer(n, 0, 100000));\n    const capacity = current ? health.channelCapacity : realm.initialChannelCapacity;\n",
    "phase": "r101"
  },
  {
    "original": "    // Explicit projection: no paths, ports, credentials, DB identity or private\n    // health/account fields become part of the selection-screen response.\n    return { id: realm.id, name: realm.id===manifest.primaryRealmId?\"Çekirdek\":realm.name, origin: realm.origin, status,\n      registrationOpen: realm.registrationOpen, capacity: capacity * realm.channels, channelCapacity: capacity,\n      online, channels: current ? [...health.channels] : null };\n  });\n}\n",
    "replacement": "    // Explicit projection: no paths, ports, credentials, DB identity or private\n    // health/account fields become part of the selection-screen response.\n    return { id: realm.id, name: manifest.phase==='101'?(realm.id===manifest.primaryRealmId?\"Core Efsane\":\"Core Akademi\"):realm.id===manifest.primaryRealmId?\"Çekirdek\":realm.name, origin: realm.origin, status,\n      registrationOpen: realm.registrationOpen, load:current?(status==='full'?'Dolu':online>=capacity*realm.channels*0.65?'Yoğun':'Boş'):null,\n      ...((includeCounts||manifest.phase!=='101')?{capacity:capacity*realm.channels,channelCapacity:capacity,online,channels:current?[...health.channels]:null}:{}) };\n  });\n}\n",
    "phase": "r101"
  }
];
for(const edit of realmChangesR101){if(generated.split(edit.original).length!==2)throw Error('R101 realm extraction anchor changed');generated=generated.replace(edit.original,edit.replacement);edits.push(edit);}
// R102: any occupied realm is busy; preserve full/maintenance/availability rules.
replace("online>=capacity*realm.channels*0.65?'Yoğun':'Boş'","online>0?'Yoğun':'Boş'");
parse(generated,{ecmaVersion:'latest',sourceType:'module'});const out=path.join(import.meta.dirname,'generated');fs.writeFileSync(path.join(out,'native-realm-manifest.mjs'),generated);fs.writeFileSync(path.join(out,'native-realm-manifest-proof.json'),JSON.stringify({baselineManifestSha256:pin,file,sourceSha256:hash(source),generatedSha256:hash(generated),edits,scope:'Explicit CORE511 realm only: four channels, fixed capacity25, protocol-matched health and four unique listener ports. Existing legacy three-channel realms and all identity, path, origin, rollout, visibility and port guards retained.'},null,2)+'\n');
