// Shared rollout and map data. Preview access never grants GM privileges.
export const ANCIENT_WORLD = Object.freeze({width:3600,height:3600});
export const ANCIENT_SPAWN = Object.freeze({x:1740,y:2940});
export const ANCIENT_NAME = 'Kadim Kök Vadisi';
export const ANCIENT_MIN_LEVEL = 50;
export const ANCIENT_FAMILIES = Object.freeze([
 {family:'golge',name:'Kızıl Pençe',hp:4000,damage:80,xp:400},
 {family:'curuk',name:'Kök Muhafızı',hp:7000,damage:110,xp:600},
 {family:'yutan',name:'Kül Kâhini',hp:10000,damage:150,xp:800},
]);
export function expansion65Available(settings,player) {
 return Number(settings?.expansion65_enabled)===1 || !!(player?.id && Number(player.is_gm)===1 && player.id===settings?.expansion65_preview_player_id);
}
export function playerLevelCap(settings,player){return expansion65Available(settings,player)?65:50;}
export function canEnterAncient(settings,player){return expansion65Available(settings,player)&&Number(player?.level)>=ANCIENT_MIN_LEVEL;}
// Broadly scattered through the open ground, clear of the central Core and
// southern arrival point. Stable slots keep monster IDs and admin profiles.
const ancientPoints=[
 [560,510],[1070,640],[1630,470],[2210,600],[2790,490],[3180,840],
 [700,1130],[1360,1030],[1910,1160],[2540,1040],[3080,1310],
 [480,1650],[990,1510],[1490,1480],[2220,1580],[2800,1740],[3220,1950],
 [630,2140],[1140,1980],[1570,2240],[2370,2130],[2920,2320],
 [480,2700],[1050,2610],[1430,2820],[2320,2750],[2990,2910],
];
export const ANCIENT_SPAWNS=ancientPoints.map(([x,y],index)=>({
 ...ANCIENT_FAMILIES[(index+Math.floor(index/9))%3],x,y,slot:index+1,
}));
// Use only with a trusted SQL player alias. Evaluated at the reward commit.
export function levelCapSql(alias='players') {
 if(!/^[a-z_]+$/.test(alias))throw new Error('Invalid SQL alias');
 return `(CASE WHEN (SELECT expansion65_enabled FROM game_settings WHERE id=1)=1 OR (${alias}.is_gm=1 AND ${alias}.id=(SELECT expansion65_preview_player_id FROM game_settings WHERE id=1)) THEN 65 ELSE 50 END)`;
}
