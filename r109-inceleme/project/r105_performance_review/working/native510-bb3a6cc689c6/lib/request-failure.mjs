// Bounded labels only. Never retain error messages, SQL, tokens or identifiers.
const known=new Set(['authentication_required','invalid_credentials','game_instance_expired','realtime_scope_changed','invalid_csrf','invalid_origin','account_suspended','bot_check_required','launch_locked','rate_limited','invalid_json','payload_too_large','unsupported_media_type','channel_full']);
export function requestFailureReason(error,status){
 if(known.has(error?.code))return error.code;
 const message=String(error?.message??'');
 if(/SQLITE_BUSY|database is locked/i.test(message))return 'sqlite_busy';
 if(/SQLITE_CONSTRAINT|constraint failed/i.test(message))return 'sqlite_constraint';
 if(/SQLITE_FULL|database or disk is full/i.test(message))return 'storage_full';
 if(/fsync|WAL.*sync|disk I\/O error/i.test(message))return 'storage_sync';
 return status===401?'session':status===403?'forbidden':status===409?'scope_or_conflict':status===429?'rate_limited':status>=500?'server_error':status>=400?'client_error':'ok';
}
export function safeFailureReason(reason,status){return known.has(reason)||['sqlite_busy','sqlite_constraint','storage_full','storage_sync','session','forbidden','scope_or_conflict','server_error','client_error','ok'].includes(reason)?reason:requestFailureReason(null,status);}
