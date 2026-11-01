// This R55 gameplay branch is based on the delivered R54, not the earlier R55 performance candidate.
export const gameplayR55Options=(env=process.env)=>Object.freeze({
 enhancementDurability:env.CORE511_R55_ENHANCEMENT_DURABILITY!=='0',
 adminMaterials:env.CORE511_R55_ADMIN_MATERIALS!=='0',
 mountState:env.CORE511_R55_MOUNT_STATE!=='0',
 mountRender:env.CORE511_R55_MOUNT_RENDER!=='0',
 mountDrops:env.CORE511_R55_MOUNT_DROPS!=='0',
 mobileExperience:env.CORE511_R55_MOBILE_EXPERIENCE!=='0',
 dungeonProgress:env.CORE511_R55_DUNGEON_PROGRESS!=='0'
});
export const gameplayR55=gameplayR55Options();
