import {rollEnchantments} from "./gear-enchantments";
import {resolveLootItemName,rollLootPower} from "./monster-loot";
import {infiniteEquipmentPower} from "./infinite-power.mjs";
import { calculateEquipmentStats } from './combat-stats';
type Service = {
    stats: typeof calculateEquipmentStats;
    makeGear: (item:any,settings:any,cfg:any)=>any;
    settings: () => Record<string, number>;
    snapshot: (id: string) => unknown;
    command: (id: string, input: Record<string, unknown>) => unknown;
    admin: (input: Record<string, unknown>) => unknown;
    locked: (id: string) => boolean;
};
export function dungeonService() {
    const service = (globalThis as typeof globalThis & {
        __colDungeon?: Service;
    }).__colDungeon;
    if (!service)
        throw new Error('Zindan hizmeti bu sunucuda henüz hazır değil.');
    service.stats = calculateEquipmentStats;
    service.makeGear=(item,settings,cfg)=>{
        const definition={type:'gear' as const,family:item.family??'generic',kind:item.kind,rarity:item.rarity};
        const uniquePower=item.kind==='weapon'?settings.unique_weapon_power:settings.unique_armor_power;
        return {item_name:['unique','infinite'].includes(item.rarity)?item.name:resolveLootItemName(definition,item.role),power:item.rarity==='infinite'?infiniteEquipmentPower({kind:item.kind,power:uniquePower},cfg):item.rarity==='unique'?uniquePower:rollLootPower(definition,settings),enchantments:JSON.stringify(rollEnchantments(settings,item.kind))};
    };
    return service;
}
export function dungeonLocked(id: string) { return (globalThis as typeof globalThis & {
    __colDungeon?: Service;
}).__colDungeon?.locked(id) ?? false; }
