// Expanded local casts retain the 1 MiB request limit. Reserve half the frame
// for the unchanged player/settings/input/envelope. Each ID occurs once in the
// target list and once in the lease list; include JSON escaping and UTF-8 bytes.
export function expandedLocalBudgetR51(monsters,actors){
 let bytes=128;
 for(const m of monsters){bytes+=2*Buffer.byteLength(JSON.stringify(m.id))+96;if(bytes>524288)return false;}
 for(const id of actors){bytes+=Buffer.byteLength(JSON.stringify(id))+16;if(bytes>524288)return false;}
 return true;
}
