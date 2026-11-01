export const GAME_INSTANCE_HEADER = "x-game-instance";
export const GAME_INSTANCE_ENDED_EVENT = "coreoflife:instance-ended";
export const GAME_PRESENCE_MS = 45_000;
export const GAME_IDLE_MS = 15 * 60_000;
let instanceId = "";
let chatAfterId = 0;
export function browserGameInstance() {
  if (!instanceId) instanceId = crypto.randomUUID();
  return instanceId;
}
export function setChatAfterId(value: number) { chatAfterId = Math.max(0, Number(value) || 0); }
export function setBrowserGameInstance(value: string) { instanceId = value; }
export function currentChatAfterId() { return chatAfterId; }
export function readGameInstance(request: Request) {
  const value = request.headers.get(GAME_INSTANCE_HEADER) ?? new URL(request.url).searchParams.get("instance") ?? "";
  return /^[a-f0-9-]{36}$/.test(value) ? value : "";
}
export function isGameApi(path: string) {
  return ["/api/guild-skill", "/api/guild-chat", "/api/guild-voice", "/api/guild-village", "/api/ranks", "/api/community-event", "/api/guild", "/api/dungeon", "/api/premium", "/api/quests"].includes(path) || path === "/api/trade" || path === "/api/connection-diagnostics" || path === "/api/starter-reward" || path === "/api/bot-check" || path === "/api/action" || path === "/api/world" || path === "/api/chat" || path.startsWith("/api/realtime/") || path.startsWith("/api/black-zone/");
}
