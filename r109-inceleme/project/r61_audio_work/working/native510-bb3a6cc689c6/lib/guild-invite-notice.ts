export type GuildInvite = {id:string;name:string;sender:string;tax_rate:number;expires_at?:number};
export type GuildInviteNotice = {key:string;invite:GuildInvite;until:number};
export const GUILD_INVITE_NOTICE_MS = 10_000;
export function guildInviteKey(invite:GuildInvite) { return `${invite.id}:${invite.expires_at??0}`; }
// Polls and unrelated guild events must not restart the ten-second notice.
export function nextGuildInviteNotice(invites:GuildInvite[], seen:Set<string>, current:GuildInviteNotice|null, now:number):GuildInviteNotice|null {
  const next = invites.find(invite=>!seen.has(guildInviteKey(invite)));
  for(const invite of invites) seen.add(guildInviteKey(invite));
  while(seen.size>100) seen.delete(seen.values().next().value!);
  if(next) return {key:guildInviteKey(next),invite:next,until:now+GUILD_INVITE_NOTICE_MS};
  return current && current.until>now && invites.some(invite=>guildInviteKey(invite)===current.key) ? current : null;
}
