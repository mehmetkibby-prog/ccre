// R110 options. Each defaults ON; set the variable to 0 to restore R109.
// CORE511_R110_WS_HANDOFF: the realm ingress hands a validated client
// WebSocket socket to its channel process instead of piping every byte
// through the single-threaded realm (writer) process.
export const wsHandoffR110=process.env.CORE511_R110_WS_HANDOFF!=='0';
