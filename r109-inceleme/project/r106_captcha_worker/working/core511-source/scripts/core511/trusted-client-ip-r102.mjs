import {BlockList,isIP} from 'node:net';

// Cloudflare's published proxy ranges (https://www.cloudflare.com/ips/).
// Only the Caddy-authenticated immediate peer is checked. An arbitrary browser
// CF-Connecting-IP / X-Real-IP header never establishes proxy trust.
const edges=new BlockList();
for(const cidr of ['173.245.48.0/20','103.21.244.0/22','103.22.200.0/22','103.31.4.0/22','141.101.64.0/18','108.162.192.0/18','190.93.240.0/20','188.114.96.0/20','197.234.240.0/22','198.41.128.0/17','162.158.0.0/15','104.16.0.0/13','104.24.0.0/14','172.64.0.0/13','131.0.72.0/22','2400:cb00::/32','2606:4700::/32','2803:f800::/32','2405:b500::/32','2405:8100::/32','2a06:98c0::/29','2c0f:f248::/32']){
 const [ip,prefix]=cidr.split('/');edges.addSubnet(ip,Number(prefix),isIP(ip)===6?'ipv6':'ipv4');
}
export function trustedClientIpR102(peer,headers){
 if(typeof peer!=='string'||peer.includes('%')||!isIP(peer))throw Error('proxy_identity');
 if(!edges.check(peer,isIP(peer)===6?'ipv6':'ipv4'))return peer;
 const ip=headers['cf-connecting-ip'];
 if(typeof ip!=='string'||ip.includes('%')||!isIP(ip))throw Error('proxy_identity');
 return ip;
}
