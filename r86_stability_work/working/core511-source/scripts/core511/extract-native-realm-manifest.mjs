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
parse(generated,{ecmaVersion:'latest',sourceType:'module'});const out=path.join(import.meta.dirname,'generated');fs.writeFileSync(path.join(out,'native-realm-manifest.mjs'),generated);fs.writeFileSync(path.join(out,'native-realm-manifest-proof.json'),JSON.stringify({baselineManifestSha256:pin,file,sourceSha256:hash(source),generatedSha256:hash(generated),edits,scope:'Explicit CORE511 realm only: four channels, fixed capacity25, protocol-matched health and four unique listener ports. Existing legacy three-channel realms and all identity, path, origin, rollout, visibility and port guards retained.'},null,2)+'\n');
