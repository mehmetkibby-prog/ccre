import {PROGRESSION_MATERIALS} from './progression-materials.mjs';
export const DUNGEON_MATERIALS={wing:{label:"Kanat Parçası",image:"wing-fragment-v244"},infinite:{label:"Sonsuz Taşı Parçası",image:"infinite-fragment-v244"},pet:{label:"Ejderha Parçası",image:"dragon-fragment-v244"},...PROGRESSION_MATERIALS,...{"halloween_pumpkin":{"label":"Bal Kabağı","image":"../game/halloween-pumpkin-v456"},"witch_wand":{"label":"Cadının Sihirli Değneği","image":"../game/witch-wand-v456"},"halloween_candy":{"label":"Cadı Şekeri","image":"../game/halloween-candy-v456"}}} as const;
export type DungeonMaterialKind=keyof typeof DUNGEON_MATERIALS;
export function parseDungeonMaterial(value:unknown){
 if(typeof value!=="string"||!Object.hasOwn(DUNGEON_MATERIALS,value))return null;
 const kind=value as DungeonMaterialKind;
 return {...DUNGEON_MATERIALS[kind],key:kind,kind,value:0,percent:false};
}
