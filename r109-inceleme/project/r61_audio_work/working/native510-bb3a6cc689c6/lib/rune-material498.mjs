// V498 changes only newly earned purple loot on the two level-65 rune maps.
// Settings retain their editable base odds. Existing death JSON is never read
// through this helper during delivery, so earned odds and receipts stay frozen.
export const RUNE_PURPLE_MULTIPLIER498 = .5;
const source498 = /^rune(?:_v2)?\.(?:tide|warden|sentinel|wraith|boss)$/;
const snapshots498 = new WeakMap();

export function runeLoot498(loot) {
 if (!loot?.purple) return loot;
 return {...loot, purple:{...loot.purple, chance:loot.purple.chance * RUNE_PURPLE_MULTIPLIER498}};
}

export function runeLootSnapshot498(snapshot) {
 if (!snapshot || !source498.test(snapshot.lootSourceKey)) return snapshot;
 const cached = snapshots498.get(snapshot);
 if (cached) return cached;
 const profile = JSON.parse(snapshot.lootProfileJson);
 if (profile.version !== 1 || profile.key !== snapshot.lootSourceKey || !profile.runeLoot) throw Error('Rün ganimeti kaydı geçersiz.');
 if (profile.runePurple498 === RUNE_PURPLE_MULTIPLIER498) return snapshot;
 const next = Object.freeze({...snapshot, lootProfileJson:JSON.stringify({...profile, runeLoot:runeLoot498(profile.runeLoot), runePurple498:RUNE_PURPLE_MULTIPLIER498})});
 snapshots498.set(snapshot, next);
 return next;
}

export function runeSettings498(state) {
 return state ? {...state, purpleChanceMultiplier498:RUNE_PURPLE_MULTIPLIER498} : state;
}
