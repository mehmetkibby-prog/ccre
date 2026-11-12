// Incremental immutable R39 graph patch. Never runs the V510 client rebuilder.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {patchR40Client,reverseR40Edits} from './patch-r40-client.mjs';
import {patchTowerMaterialIconsR40} from './patch-tower-material-icons-r40.mjs';
import {patchReconnectClientR40,patchReconnectSourceR40} from './patch-reconnect-client-r40.mjs';
const home=path.dirname(fileURLToPath(import.meta.url)),baseline=process.argv[2];
if(!baseline)throw Error('usage: node build-r40-client.mjs <verified-r39-core511-directory>');
const hash=value=>createHash('sha256').update(value).digest('hex');
const read=(base,name)=>fs.readFileSync(path.join(base,name),'utf8');
const proofText=read(baseline,'generated/native-client-proof.json'),proof=JSON.parse(proofText);
if(proof.r40)throw Error('r40_baseline_must_be_r39');
const oldGame=read(baseline,'generated/client/'+proof.name),oldPortal=read(baseline,'generated/client/'+proof.portal.name);
if(hash(oldGame)!=='d06b5d88b64ced7fdf2c84e4c7bb196f74462f6d58a2eba8e800c6c2e0a951da'||hash(oldPortal)!=='6db9f584c0fe7526200dd76cc8c4f03692502ab5f4699c0402ce6474e9190a33')throw Error('r40_wrong_live_client_baseline');
const namespace='core511-'+createHash('sha256').update(fs.readFileSync(path.join(baseline,'client-assets.mjs'))).update(JSON.stringify(proof)).digest('hex').slice(0,16);
const icons=read(home,'tower-material-icons-r40.mjs'),iconsName='core511-r40-icons-'+hash(icons).slice(0,16)+'.js';
const helperSource=read(home,'r40-client.mjs'),helper=helperSource.replace("'./tower-material-icons-r40.mjs'","'./"+iconsName+"'"),helperName='core511-r40-'+hash(helper).slice(0,16)+'.js';
const oldTower=read(baseline,'generated/client/'+proof.tower.bridge),tower=patchTowerMaterialIconsR40(oldTower,helperName),towerName='core511-tower-'+hash(tower.source).slice(0,16)+'.js';
const towerEdits=[...tower.proof.edits.map(edit=>({...edit,count:1})),{position:'prepend',from:'',to:tower.proof.prefix}];
if(hash(oldTower)!==proof.tower.sha256||reverseR40Edits(tower.source,towerEdits)!==oldTower)throw Error('r40_tower_inverse_failed');
const oldTransport=read(baseline,'generated/client/'+proof.bridge),transport=patchReconnectClientR40(oldTransport,helperName),transportName='core511-transport-'+hash(transport.source).slice(0,16)+'.js';
const oldTransportSource=read(baseline,'client-transport.mjs'),transportSource=patchReconnectSourceR40(oldTransportSource);
if(hash(oldTransport)!==proof.bridgeSha256||reverseR40Edits(transport.source,transport.proof.edits)!==oldTransport)throw Error('r40_transport_inverse_failed');
if(transportSource.source!==read(home,'client-transport.mjs')||reverseR40Edits(transportSource.source,transportSource.proof.edits)!==oldTransportSource)throw Error('r40_transport_source_inverse_failed');
const game=patchR40Client(oldGame,helperName);
const towerReference={from:proof.tower.bridge,to:towerName,count:game.source.split(proof.tower.bridge).length-1};
if(towerReference.count<1)throw Error('r40_tower_reference_missing');
game.source=game.source.replaceAll(proof.tower.bridge,towerName);game.proof.edits.push(towerReference);game.proof.patchedSha256=hash(game.source);
const transportReference={from:proof.bridge,to:transportName,count:game.source.split(proof.bridge).length-1};
if(transportReference.count!==1)throw Error('r40_transport_reference_count');
game.source=game.source.replaceAll(proof.bridge,transportName);game.proof.edits.push(transportReference);game.proof.patchedSha256=hash(game.source);
if(reverseR40Edits(game.source,game.proof.edits)!==oldGame)throw Error('r40_client_inverse_failed');
const gameName='game-client-core511-'+hash(game.source).slice(0,16)+'.js';
const portalEdits=[{from:proof.name,to:gameName,count:oldPortal.split(proof.name).length-1}];
if(portalEdits[0].count!==2)throw Error('r40_portal_reference_count');
const portal=oldPortal.replaceAll(proof.name,gameName),portalName='auth-portal-core511-'+hash(portal).slice(0,16)+'.js';
if(reverseR40Edits(portal,portalEdits)!==oldPortal)throw Error('r40_portal_inverse_failed');
for(const value of [icons,helper,tower.source,transport.source,game.source,portal])execFileSync(process.execPath,['--check','--input-type=module'],{input:value,stdio:['pipe','pipe','pipe']});
const next={...proof,name:gameName,patchedSha256:hash(game.source),bridge:transportName,bridgeSha256:hash(transport.source),transportSourceSha256:hash(transportSource.source),portal:{...proof.portal,name:portalName,patchedSha256:hash(portal)},tower:{...proof.tower,bridge:towerName,sha256:hash(tower.source)},r40:{
 baseline:{gameName:proof.name,gameSHA256:hash(oldGame),portalName:proof.portal.name,portalSHA256:hash(oldPortal),proofSHA256:hash(proofText),namespace},
 helper:{name:helperName,sha256:hash(helper),sourceSha256:hash(helperSource),icons:{name:iconsName,sha256:hash(icons)}},game:game.proof,
 tower:{...tower.proof,edits:towerEdits,sourceName:proof.tower.bridge,name:towerName},
 transport:{...transport.proof,sourceName:proof.bridge,name:transportName},transportSource:transportSource.proof,
 portal:{sourceSha256:hash(oldPortal),patchedSha256:hash(portal),edits:portalEdits},
}};
const assets=[[iconsName,icons],[helperName,helper],[towerName,tower.source],[transportName,transport.source],[gameName,game.source],[portalName,portal]];
for(const [name,value] of assets){
 const file=path.join(home,'generated/client',name);if(fs.existsSync(file)&&read(home,'generated/client/'+name)!==value)throw Error('r40_immutable_asset_collision');fs.writeFileSync(file,value);
}
fs.writeFileSync(path.join(home,'generated/native-client-proof.json'),JSON.stringify(next,null,2)+'\n');
console.log(JSON.stringify({baselineNamespace:namespace,namespace:'core511-'+createHash('sha256').update(fs.readFileSync(path.join(home,'client-assets.mjs'))).update(JSON.stringify(next)).digest('hex').slice(0,16),assets:assets.map(([name])=>name)},null,2));
