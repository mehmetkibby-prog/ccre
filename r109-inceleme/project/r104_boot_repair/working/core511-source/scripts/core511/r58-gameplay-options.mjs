export const gameplayR58Options=(env=process.env)=>Object.freeze({
 mountCombat:env.CORE511_R58_MOUNT_COMBAT==='1',
 mountRender:env.CORE511_R58_MOUNT_RENDER==='1',
 dungeonWorldControls:env.CORE511_R58_DUNGEON_WORLD_CONTROLS==='1',
 adminAccessories:env.CORE511_R58_ADMIN_ACCESSORIES==='1',
 mistLevelRewards:env.CORE511_R58_MIST_LEVEL_REWARDS==='1'
});
export const gameplayR58=gameplayR58Options();
