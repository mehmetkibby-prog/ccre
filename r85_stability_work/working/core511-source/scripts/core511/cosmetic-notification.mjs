import {actorFaultIsolation} from './r48-options.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
const report=createFaultReporter(text=>process.stderr.write(text));
const coded=new Set(['notification_arguments','notification_event','notification_scope','notification_too_large','notification_requires_private_or_security_route']);
// These exact native validators throw Error(message), without a code. Only
// presentation validation belongs here; SQL, ownership and commit errors do not.
const native=new Set(['notification_route_unbound','invalid_world_event','invalid_private_event','invalid_pvp_gem_loss479','invalid_guild_event','invalid_private_message','invalid_world_delta','invalid_world_scope','invalid_world_frame','invalid_world_field_segment']);
export function skipInvalidNotification(error,context={}){
 if(!actorFaultIsolation)return false;
 const code=typeof error?.code==='string'?error.code:native.has(error?.message)?error.message:null;
 if(!coded.has(code)&&!native.has(code))return false;
 report({...context,error:{code}});return true;
}
