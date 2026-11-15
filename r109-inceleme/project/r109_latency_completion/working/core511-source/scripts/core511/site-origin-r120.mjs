export const SITE_ORIGIN_R120='https://2d.coreoflife.net';
// Exact apex/www URL boundaries: never rewrite accounts/r1/r2/realtime,
// email domains, token issuers or a lookalike such as coreoflife.net.evil.
export function siteUrlsR120(value){
 return value.replace(/(https?:\/\/|wss?:\/\/)(?:www\.)?coreoflife\.net(?![\w.-])/g,(_,scheme)=>scheme+'2d.coreoflife.net');
}
