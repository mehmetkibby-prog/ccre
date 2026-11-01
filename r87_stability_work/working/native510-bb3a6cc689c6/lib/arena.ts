export type ArenaMode = "1v1" | "2v2" | "3v3" | "5v5";

export type ArenaRule = {
  mode: ArenaMode;
  teamSize: number;
  totalPlayers: number;
  killTarget: number;
  label: string;
};

export const ARENA_RULES: Record<ArenaMode, ArenaRule> = {
  "1v1": { mode: "1v1", teamSize: 1, totalPlayers: 2, killTarget: 5, label: "1'e 1" },
  "2v2": { mode: "2v2", teamSize: 2, totalPlayers: 4, killTarget: 15, label: "2’ye 2" },
  "3v3": { mode: "3v3", teamSize: 3, totalPlayers: 6, killTarget: 25, label: "3'e 3" },
  "5v5": { mode: "5v5", teamSize: 5, totalPlayers: 10, killTarget: 35, label: "5'e 5" },
};

export const ARENA_COUNTDOWN_MS = 4_000;
export const ARENA_ANNOUNCEMENT_MS = 7_000;
export const ARENA_QUEUE_TTL_MS = 45_000;
export const ARENA_RECONNECT_GRACE_MS = 30_000;

export function isArenaMode(value: unknown): value is ArenaMode {
  return value === "1v1" || value === "2v2" || value === "3v3" || value === "5v5";
}

export function safeArenaTeamName(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

export function arenaSpawn(team: 1 | 2, slot: number, teamSize: number) {
  const safeSlot = Math.max(0, Math.min(Math.max(0, teamSize - 1), Math.floor(slot)));
  if(teamSize>5)return {x:team===1?450+Math.floor(safeSlot/8)*60:1950-Math.floor(safeSlot/8)*60,y:400+(safeSlot%8)*100};
  const spread = teamSize <= 1 ? 0 : (safeSlot - (teamSize - 1) / 2) * 115;
  return { x: team === 1 ? 650 : 1_750, y: 750 + spread };
}
