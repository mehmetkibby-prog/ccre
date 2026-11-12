// Only installed in the resident realm's sole durable writer. Legacy mode
// retains its original synchronous native transaction and durability contract.
export async function channelPermanent<T>(players:string[],operation:()=>T):Promise<T>{
 const control=(globalThis as any).__colChannelPermanent;
 return control?control(players,operation):operation();
}
