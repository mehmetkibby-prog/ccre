// Selected process/recovery fixture, never a production mechanics provider.
// Unexercised economy/schedule/profile routes reject explicitly.
export function createChannelMechanics({peer}){
 const unused=()=>{throw Object.assign(Error('unexercised_process_fixture'),{code:'unexercised_process_fixture'});};
 return {footprint:()=>({players:[],resources:[]}),affectedAttack:()=>[],affectedPvp:()=>[],rankingEligible:()=>false,monsterOwned:m=>m.channel===peer.channel,changedArenaLife:()=>false,modeRate:unused,modeTick:()=>{},respawn:()=>{},recordSecurityEvent:unused,waveView:()=>null,profile:unused};
}
