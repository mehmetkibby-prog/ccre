import type {db} from './game-world';
import {serializeLootProfile,type LootGroup} from './monster-loot.ts';

const BOSS_BOOK_SOURCES = [
  ['world_boss','boss.world'],
  ['frozen_boss','boss.frozen_throne'],
  ['frozen_water','boss.frozen_water'],
] as const;

// Append these statements to the settings transaction. A customized loot table
// otherwise masks the combat_settings book fields. Publish a new immutable
// revision so future kills change while existing defeat snapshots stay intact.
export function bossBookSettingsStatements(database:ReturnType<typeof db>,
  values:Record<string,number>, submittedKeys:ReadonlySet<string>, now:number) {
  return BOSS_BOOK_SOURCES.flatMap(([prefix,sourceKey])=>{
    if (!['chance','min','max'].some(suffix=>submittedKeys.has(`${prefix}_stone_book_${suffix}`))) return [];
    const group:LootGroup={id:'stone-book',label:'Taş Sanatı Kitabı',rolls:1,charmMultiplierBps:10000,outcomes:[{
      id:'stone_book',item:{type:'resource',kind:'stone_book'},
      baseChancePpm:Math.round(values[`${prefix}_stone_book_chance`]*1000000),
      minAmount:values[`${prefix}_stone_book_min`],maxAmount:values[`${prefix}_stone_book_max`],charmWeight:0,
    }]};
    const compactGroup=JSON.parse(serializeLootProfile({version:1,key:sourceKey,label:sourceKey,groups:[group]}))[2][0];
    return [database.prepare(`
      INSERT INTO loot_profile_versions(source_key,revision,profile_json,created_at)
      SELECT pointer.source_key,pointer.latest_revision+1,
        json_set(version.profile_json,CASE WHEN json_type(version.profile_json)='array' THEN '$[2]' ELSE '$.groups' END,json_insert(
          (SELECT json_group_array(json(groups.value)) FROM json_each(version.profile_json,
            CASE WHEN json_type(version.profile_json)='array' THEN '$[2]' ELSE '$.groups' END) groups
           WHERE NOT EXISTS(SELECT 1 FROM json_each(groups.value,
             CASE WHEN json_type(groups.value)='array' THEN '$[4]' ELSE '$.outcomes' END) outcome
             WHERE (json_extract(outcome.value,'$.item.type')='resource' AND json_extract(outcome.value,'$.item.kind')='stone_book')
                OR (json_extract(outcome.value,'$[1][0]')=1 AND json_extract(outcome.value,'$[1][1]')='stone_book'))),
          '$[#]',json(CASE WHEN json_type(version.profile_json)='array' THEN ? ELSE ? END))),?
      FROM loot_profiles pointer JOIN loot_profile_versions version
        ON version.source_key=pointer.source_key AND version.revision=pointer.active_revision
      WHERE pointer.source_key=? AND pointer.active_revision>0
    `).bind(JSON.stringify(compactGroup),JSON.stringify(group),now,sourceKey),database.prepare(`
      UPDATE loot_profiles SET active_revision=latest_revision+1,latest_revision=latest_revision+1,updated_at=?
      WHERE source_key=? AND active_revision>0 AND EXISTS(
        SELECT 1 FROM loot_profile_versions version WHERE version.source_key=loot_profiles.source_key
          AND version.revision=loot_profiles.latest_revision+1)
    `).bind(now,sourceKey)];
  });
}
