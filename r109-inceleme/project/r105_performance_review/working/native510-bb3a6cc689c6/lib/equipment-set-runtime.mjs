export function setHpSql(){return globalThis.__colEquipmentSets?'COALESCE(players.set_hp,0)':'0';}
export function setSelectSql(){return ['hp','pve','pvp','resistance','speed',"attack"].map(k=>globalThis.__colEquipmentSets?`set_${k}`:`0 AS set_${k}`).join(',');}
