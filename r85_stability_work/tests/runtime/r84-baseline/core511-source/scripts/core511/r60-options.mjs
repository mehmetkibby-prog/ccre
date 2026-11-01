export const gameplayR60Options=(env=process.env)=>Object.freeze({
 mountMaterials:env.CORE511_R60_MOUNT_MATERIALS==='1',
 mountState:env.CORE511_R60_MOUNT_STATE==='1',
 mountRender:env.CORE511_R60_MOUNT_RENDER==='1',
 rewardSections:env.CORE511_R60_REWARD_SECTIONS==='1',
 castleNotices:env.CORE511_R60_CASTLE_NOTICES==='1'
});
export const gameplayR60=gameplayR60Options();
