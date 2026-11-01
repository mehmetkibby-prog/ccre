// Rune V2's ranked boss deliberately has is_boss=0 in the native catalog.
// Match only its four ordinary species; boss waves/ranking stay on their
// established authoritative path. The ordinary owner/party/SQL guards remain.
export function ordinaryRuneRewardR87(monster){
 if(monster?.area!=='rune_v2'||monster.is_boss!==0||monster.is_stone!==0||monster.summoned!==0)return false;
 const match=/^rune-v2-(?:tide|warden|sentinel|wraith)-c([1-4])-[1-5]$/.exec(monster.id??'');
 return !!match&&Number(match[1])===monster.channel;
}
