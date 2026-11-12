export const INGRESS_SECURITY_REVISION = 305;
// Game publishers connect directly to localhost. Public/proxied HTTP requests
// must not occupy the signed publisher's body/verification budget.
export function isLocalBroadcastRequest(request) {
 const peer=request.socket?.remoteAddress;
 if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer))return false;
 return !['forwarded','x-forwarded-for','x-real-ip','cf-connecting-ip','x-forwarded-host','x-forwarded-proto']
  .some(name=>Object.hasOwn(request.headers,name));
}
