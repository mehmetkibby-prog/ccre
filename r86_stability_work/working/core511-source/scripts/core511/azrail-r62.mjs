// R68: the result belongs to the opener's existing durable receipt. It is never
// inserted into public messages or published to other players.
export function azrailLinesR62(player,rewards){
 const prefix=`${player.name}, Azrail Sandığı: `,parts=rewards.length?rewards.map(row=>`${row.name} ×${row.amount}`):['Bu sandıktan eşya çıkmadı.'];
 const lines=[];let line=prefix;
 for(const part of parts){if(prefix.length+part.length>140)throw Error('azrail_item_name_bound');if(line!==prefix&&line.length+2+part.length>140){lines.push(line);line=prefix;}line+=(line===prefix?'':', ')+part;}
 lines.push(line);return lines;
}
export function azrailNoticeR68(player,rewards,now,requestId){
 if(process.env.CORE511_R62_AZRAIL!=='1')return null;
 if(rewards.length>16)throw Error('azrail_reward_bound');
 return {kind:'azrail',id:'azrail:'+player.id+':'+requestId,playerId:player.id,at:Math.floor(now),lines:azrailLinesR62(player,rewards)};
}
