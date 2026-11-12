import {progressionMaterial} from './progression-materials.mjs';
// A crystal chest picture must mean an actual event chest, never generic loot.
export function dungeonLootArt(kind){
 return progressionMaterial(kind)?`/dungeon/${progressionMaterial(kind).image}.webp`:({crystal_chest:'/game/crystal-chest.webp',wing:'/dungeon/wing-fragment-v244.webp',infinite:'/dungeon/infinite-fragment-v244.webp',pet:'/dungeon/dragon-fragment-v244.webp',evolution_scroll:'/game/materials-v186.webp',stone_book:'/game/materials-v186.webp'})[kind]??'/game/loot-sack-v410.webp';
}
