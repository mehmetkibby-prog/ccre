// The presence lease belongs to one UUID. Keep it through retries; a new UUID
// would race the asynchronous old release and be rejected as another tab.
// Notify the transport only after the original presence endpoint confirmed a
// live, visible claim with a valid player result. No authorization is bypassed.
export function patchNativeEntry(source){
 const original='p=t.idleExempt===!0,col422StoreEntry(e,t.entry),n(t.player),b(t.chatAfterId),i(!0)';
 const replacement="p=t.idleExempt===!0,col422StoreEntry(e,t.entry),window.dispatchEvent(new CustomEvent('coreoflife:presence-claimed',{detail:{instance:d.current}})),n(t.player),b(t.chatAfterId),i(!0)";
 const start=source.indexOf(original);
 if(start<0||source.indexOf(original,start+1)!==-1)throw Error('native_entry_claim_anchor_changed');
 return{source:source.slice(0,start)+replacement+source.slice(start+original.length),proof:{edits:[{start,end:start+original.length,original,replacement}],scope:'Same-UUID transport recovery notification only after successful active game-presence claim; lease, authentication, bot checks and entry decisions unchanged.'}};
}
