export const PROTOCOL = 'coreoflife-kernel-v1';
export const CHANNELS = Object.freeze([1, 2, 3, 4]);
export const CAPACITY = 25;
export const TICK_MS = 50;
export const CHECKPOINT_MS = 5000;
export const REQUIRED_MECHANICS = Object.freeze([
 'movement','speed','pve','pvp','skills','monster_ai','loot','xp','quests',
 'dungeon','boss','event_island','arena','guild_war','party','death',
 'respawn','channel_transfer','reconnect','ban','bot_check','macro_guard',
 'market_interlock','npc_interlock','upgrade_interlock','wheel_interlock',
 'epin_interlock','task_delivery_interlock'
]);
export function kernelError(code) { return Object.assign(new Error(code), {code}); }
export function demand(ok, code) { if (!ok) throw kernelError(code); }
export const validChannel = n => CHANNELS.includes(n);
export function selectChannel(counts) {
 const candidates = CHANNELS.map(channel => ({channel,count:counts.get(channel) ?? 0}))
  .filter(row => Number.isInteger(row.count) && row.count >= 0 && row.count < CAPACITY);
 candidates.sort((a,b) => a.count-b.count || (a.channel===1)-(b.channel===1) || a.channel-b.channel);
 return candidates[0]?.channel ?? null;
}
export {releaseGate} from './release-gate.mjs';
