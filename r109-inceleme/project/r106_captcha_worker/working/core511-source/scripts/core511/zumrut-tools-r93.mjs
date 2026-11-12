import {prepareServerStatement} from './server-statements.mjs';
export const ZUMRUT_TOOL_SQL_R93="SELECT t.equipped FROM zumrut_tools_r93 t JOIN dungeon_materials m ON m.player_id=t.player_id AND m.kind=CASE t.equipped WHEN 'axe' THEN 'zumrut_axe_r93' WHEN 'pickaxe' THEN 'zumrut_pickaxe_r93' ELSE '' END JOIN players p ON p.id=t.player_id WHERE t.player_id=? AND m.amount>0 AND p.rod_equipped=0";
// This small read adapter has no game-service/catalog imports and no timers.
// Possession remains in the normal bag; a sold/consumed tool is never held.
export function readZumrutToolR93(sql,id){return prepareServerStatement(sql,ZUMRUT_TOOL_SQL_R93).get(id)?.equipped??'';}
