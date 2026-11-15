import {createContentSchemaR102} from '../content-config-r102.mjs';
import {createRoyalSchemaR118} from '../royal-config-r118.mjs';
import {ensureChampionsSchemaR118} from '../champions-service-r118.mjs';
import {installRoyalEquipmentTriggersR118} from '../../../../native510-bb3a6cc689c6/vds-server/src/equipment-sets-schema.mjs';
// Synthetic-only explicit migration, mirroring the R118 installer before boot.
export function prepareRoyalFixtureR118(sql){
 createContentSchemaR102(sql);createRoyalSchemaR118(sql);ensureChampionsSchemaR118(sql);installRoyalEquipmentTriggersR118(sql);
}
