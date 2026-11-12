export function hasWingBonus(player: {wings_equipped?:number;core_wings?:number|null}|null|undefined) {
 return player?.wings_equipped===1||player?.core_wings===1;
}
