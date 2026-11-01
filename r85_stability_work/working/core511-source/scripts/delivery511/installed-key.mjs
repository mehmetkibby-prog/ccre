import {createPrivateKey} from 'node:crypto';
// Existing native V510 configuration name and PKCS8/P-256 encoding.
export function installedSigningKey(config){
 const encoded=String(config.environment?.REALTIME_SIGNING_PRIVATE_KEY??'').replace(/\s+/g,'');
 if(!encoded||encoded.length>8192||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Error('installed_realtime_signing_key_required');
 const key=createPrivateKey({key:Buffer.from(encoded,'base64'),format:'der',type:'pkcs8'});
 if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw Error('installed_signing_key_not_P256');
 return key;
}
