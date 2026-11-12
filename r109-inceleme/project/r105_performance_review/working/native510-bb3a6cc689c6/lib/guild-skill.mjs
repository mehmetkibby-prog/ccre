// V485: costs are per level; earned levels and current donated essence remain unchanged.
export const GUILD_SKILL_LEVELS=Object.freeze([
 {level:1,cost:50000,attack:10,hp:250,xp:5},
 {level:2,cost:100000,attack:15,hp:350,xp:7},
 {level:3,cost:200000,attack:20,hp:500,xp:15},
]);
export const GUILD_SKILL_DURATION=30*60*1000;
export const GUILD_SKILL_COOLDOWN=2*60*60*1000;
export const GUILD_ORB={x:790,y:650};
export const EMPTY_GUILD_BUFF=Object.freeze({attack:0,hp:0,xp:0,until:0,level:0});
export const guildSkillLevel=level=>GUILD_SKILL_LEVELS.find(s=>s.level===level);
