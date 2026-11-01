// The temporary trial affects dungeon entry only; guild members may join wars.
export const SMALL_GROUP_TRIAL = true;
export const NORMAL_GROUP_RULES = Object.freeze({dungeonMin:3,dungeonMax:5,guildMin:3,guildTeamSize:10,guildLeadersOnly:false});
export const GROUP_RULES = SMALL_GROUP_TRIAL
  ? Object.freeze({...NORMAL_GROUP_RULES,dungeonMin:2})
  : NORMAL_GROUP_RULES;
// Center of the eastern rectangular pad in the 2400 × 1500 bazaar map.
export const DUNGEON_KEEPER = Object.freeze({x:1910,y:660});
