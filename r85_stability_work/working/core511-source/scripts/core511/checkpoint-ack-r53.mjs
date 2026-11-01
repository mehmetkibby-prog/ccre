import {createHash} from 'node:crypto';
import {rewardGroupCommitR53} from './r53-options.mjs';
const hash=payload=>createHash('sha256').update(JSON.stringify(payload)).digest('hex');
// This is only the echo of an already successful checkpoint. The SystemWriter
// still hashes the full request, validates ownership/sequence, and awaits fsync.
export function compactCheckpointAckR53(kind,payload,result){
 if(!rewardGroupCommitR53||kind!=='combat_checkpoint'||result?.saved!==payload||Object.keys(result).length!==1)return result;
 return {savedSha256R53:hash(payload)};
}
export function checkpointAckMatchesR53(result,payload){
 if(typeof result?.savedSha256R53==='string')return rewardGroupCommitR53&&Object.keys(result).length===1&&/^[a-f0-9]{64}$/.test(result.savedSha256R53)&&result.savedSha256R53===hash(payload);
 return JSON.stringify(result?.saved)===JSON.stringify(payload);
}
