import {cleanJoinR57} from './r57-options.mjs';

// A normal drain already omits unchanged actor/encounter journals. Joined
// deaths used to replay them for every reward recipient, producing needless
// SQL updates and native trigger work after each party-wide refresh. Keep the
// attacker checkpoint and every dirty/rejected/pending journal. This changes
// no reward footprint, lease, actor barrier, native reward or durability ACK.
export function deathActorNeedsCheckpointR57(checkpoints,id,attacker){
 if(!cleanJoinR57||id===attacker||typeof checkpoints.changed!=='function')return true;
 const entry=checkpoints.entries.get(id);
 if(!entry||entry.pending||entry.joinedR53||entry.rejectedR531)return true;
 checkpoints.state.assertOwner(id,entry.epoch);
 return Boolean(checkpoints.changed(id));
}
