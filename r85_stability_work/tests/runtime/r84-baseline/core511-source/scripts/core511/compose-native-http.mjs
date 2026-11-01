import {patchTradeIdleR72} from './patch-trade-idle-r72.mjs';
import {patchCastleAdminR59} from './patch-castle-admin-r59.mjs';
import {patchAzrailMarketR62} from './patch-azrail-market-r62.mjs';
import {patchResponsiveBotR62} from './patch-responsive-bot-r62.mjs';
import {patchAdminSettingsR65} from './patch-admin-settings-r65.mjs';
import {patchMountMarketR60} from './patch-mount-market-r60.mjs';
import {patchNativeGameplayR58} from './patch-native-gameplay-r58.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {patchNativeGuildRead} from './patch-native-guild-read.mjs';
import {patchNativeTowerMarketR43} from './patch-native-tower-market-r43.mjs';
import {patchNativeMistAdmin} from './patch-native-mist-admin.mjs';
import {patchNativeAdmin} from './patch-native-admin.mjs';
import {patchNativeTowerAdminRoutes} from './patch-native-tower-admin.mjs';
import {patchNativeAuth} from './patch-native-auth.mjs';
import {patchNativeLogout} from './patch-native-logout.mjs';
import {patchNativeSession} from './patch-native-session.mjs';
import {patchNativePresence} from './patch-native-presence.mjs';
import {patchNativeBootstrap} from './patch-native-bootstrap.mjs';
import {patchNativeConfiguration} from './patch-native-configuration.mjs';
import {patchNativeRuneConfiguration} from './patch-native-rune-configuration.mjs';
import {patchNativeWorldStartup} from './patch-native-world-startup.mjs';
import {patchNativeGuildAuth} from './patch-native-guild-auth.mjs';
import {patchNativeGuildVillage} from './patch-native-guild-village.mjs';
import {patchNativeGuildConfiguration} from './patch-native-guild-configuration.mjs';
import {patchNativeGuildMembership} from './patch-native-guild-membership.mjs';
import {patchNativeDatabase} from './patch-native-database.mjs';
import {patchNativeHttpAction} from './patch-native-http-action.mjs';
import {patchNativeChannelList} from './patch-native-channel-list.mjs';
import {patchNativeHotHttp} from './patch-native-hot-http.mjs';
import {patchNativeHttpRouter} from './patch-native-http-router.mjs';
import {patchNativeHttpPremium} from './patch-native-http-premium.mjs';
import {patchNativeHttpRewards} from './patch-native-http-rewards.mjs';
import {patchNativeBotCheck} from './patch-native-bot-check.mjs';
import {patchNativeAfkControl} from './patch-native-afk-control.mjs';
import {patchNativeSocial} from './patch-native-social.mjs';
import {patchNativeGm} from './patch-native-gm.mjs';
import {patchNativePayment} from './patch-native-payment.mjs';
import {patchNativeTradeStorage} from './patch-native-trade-storage.mjs';
import {patchNativeClientReference} from './patch-native-client-reference.mjs';
import {clientAssetPaths,CLIENT_ASSET_NAMESPACE} from './client-assets.mjs';
import {patchAdminSavesR66} from './patch-admin-saves-r66.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
export const NATIVE_HTTP_BASELINE='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
export const NATIVE_HTTP_PATCHES=Object.freeze([patchNativeAdmin,patchNativeAuth,patchNativeLogout,patchNativeSession,patchNativePresence,patchNativeBootstrap,patchNativeConfiguration,patchNativeRuneConfiguration,patchNativeWorldStartup,patchNativeGuildAuth,patchNativeGuildVillage,patchNativeGuildConfiguration,patchNativeGuildMembership,patchNativeDatabase,patchNativeHttpAction,patchNativeChannelList,patchNativeHotHttp,patchNativeHttpPremium,patchNativeHttpRewards,patchNativeBotCheck,patchNativeAfkControl,patchNativeSocial,patchNativeGm,patchNativePayment,patchNativeTradeStorage,patchNativeClientReference,patchNativeHttpRouter]);

// Source composition only. No production startup, archive, installer or
// deployment is performed here. Native relative imports remain unchanged.
export function composeNativeHttp(root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6')){
 const bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==NATIVE_HTTP_BASELINE)throw Error('native_http_manifest_changed');
 const manifest=JSON.parse(bytes),file='dist-vds/server/index.js',original=fs.readFileSync(path.join(root,file),'utf8');
 if(hash(original)!==manifest.files.find(row=>row.path===file)?.sha256)throw Error('native_http_source_changed');
 let source=original;const patches=[];
 for(const patch of [...NATIVE_HTTP_PATCHES,patchNativeTowerAdminRoutes,patchNativeMistAdmin,patchNativeGuildRead,patchNativeTowerMarketR43,patchNativeGameplayR58,patchCastleAdminR59,patchMountMarketR60,patchAzrailMarketR62,patchResponsiveBotR62,patchAdminSettingsR65,patchAdminSavesR66,patchTradeIdleR72]){const result=patch(source);patches.push({name:patch.name,...result.proof});source=result.source;}
 source=clientAssetPaths(source);
 return {source,proof:{baselineManifestSha256:NATIVE_HTTP_BASELINE,source:file,clientAssetNamespace:CLIENT_ASSET_NAMESPACE,sourceSha256:hash(original),generatedSha256:hash(source),patches,scope:'Pinned native HTTP source composition only; runtime route, ownership and listener evidence is recorded separately. Remaining native routes and full acceptance are not implied.'}};
}
