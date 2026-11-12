// A local identity token, minted only after the ordinary durable writer ACK and
// memory reconciliation. An error property or network payload cannot forge it.
const known=new WeakMap();
export function colLabKnownRejection(error,{proof,sequence,channel}={}){
 if(!(error instanceof Error)||error.loadlabRejected!==true||!String(error.code).startsWith('loadlab_')||!Number.isSafeInteger(sequence)||sequence<1||![1,2,3].includes(channel))throw Error('loadlab_rejection_ack_invalid');
 known.set(error,Object.freeze({proof,sequence,channel}));return error;
}
export function colLabRejectionForGrant(error,proof,channel,sequence){
 const ack=error&&known.get(error);
 return !!ack&&typeof proof==='string'&&proof.length>0&&ack.proof===proof&&ack.channel===channel&&Number.isSafeInteger(sequence)&&sequence>=ack.sequence;
}
