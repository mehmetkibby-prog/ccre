// Read once with the process incarnation. Installer changes restart all owners.
const enabled=name=>process.env[name]!=='0';
const ingress=Number(process.env.CORE511_CHANNEL_INGRESS_KB??32);
export const r37Options=Object.freeze({mixedNarrow:enabled('CORE511_MIXED_NARROW'),claimChunks:enabled('CORE511_CLAIM_CHUNKS'),abandonedLocal:enabled('CORE511_ABANDONED_LOCAL'),collectLight:enabled('CORE511_COLLECT_LIGHT'),ingressBytes:([8,16,32].includes(ingress)?ingress:8)*1024});
