import {isAdventureArea} from './adventure-maps.mjs';

// All inputs here are trusted resident snapshots. A client cannot provide its
// own GM/Oto Av exemption, map, monster flags, or instance membership.
export const AFK_ACTIONS=Object.freeze(['afk_answer','afk_recover']);
export const afkCheckEnabled=()=>process.env.CORE511_AFK_CHECK!=='0';
export function afkExempt(player,officialAfk,state,now=Date.now()){
 return (player?.hp>0&&Number(player.auto_attack_until_r102)>now)||(state?.adminExemptR102??state?.exempt)===true||Number(player?.is_gm)===1||Number(officialAfk?.active)===1;
}
export function afkQuestionEligible({player,dungeon=false,engagement=null,monster=()=>null,recentCombatUntil=0,now=Date.now()}){
 if(!player||player.hp<=0||dungeon||player.arena_match_id||player.instance_id)return false;
 const area=String(player.area??'');
 if(!area||area==='arena'||area==='war'||area==='afk'||area==='rune_v2'||area.startsWith('guild_')||area.startsWith('dungeon')||isAdventureArea(area))return false;
 if(recentCombatUntil>now)return false;
 if(engagement){
  const target=monster(engagement.monster_id);if(target?.hp>0&&(target.is_boss||target.is_stone))return false;
  // Multi-attacker encounters may include a boss other than the primary.
  const multi=engagement.attackers489;
  if(typeof multi==='string'&&multi.length<65536)try{for(const id of Object.keys(JSON.parse(multi))){const m=monster(id);if(m?.hp>0&&(m.is_boss||m.is_stone))return false;}}catch{}
 }
 return true;
}
const normal=(m,p)=>m&&m.hp>0&&!m.is_boss&&!m.is_stone&&m.area===p?.area&&(m.channel===0||m.channel===p.channel);
export function afkNormalAttack({player,input,monster=()=>null,monsters=()=>[]}){
 if(!player||!input)return false;
 if(input.action==='attack'&&normal(monster(input.targetId),player))return true;
 const ability=Math.min(3,Math.max(0,Math.floor(Number(input.ability)||0)));
 // An AoE whose primary target is a boss/player can still farm normal mobs.
 // While locked, conservatively disallow that AoE if this room contains any
 // living normal monster; the ordinary single-target PvP/boss path stays open.
 const mixed=input.action==='pvp_attack'&&ability===2&&player.role!=='muhafiz'&&(player.area==='black'||player.area==='rune_v2'||isAdventureArea(player.area));
 const areaAttack=input.action==='attack'&&ability>0;
 if(mixed||areaAttack)for(const m of monsters())if(normal(m,player))return true;
 return false;
}
export const afkVerificationRequired=()=>({status:409,body:{ok:false,code:'afk_verification_required',error:'Doğrulama gerekli — ekrandaki soruyu cevapla.'}});
