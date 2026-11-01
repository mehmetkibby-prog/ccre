// Fixed server-owned fragments only. Append to the same guarded UPDATE that
// awards the fish so the session cannot pay twice or leave half an award.
export function fishingEventRewardMutation(id?: string) {
  switch (id) {
    case 'enchant_scroll': return {set: 'enchant_scrolls = enchant_scrolls + 1', columns: 'enchant_scrolls'};
    case 'enchant_add': return {set: 'enchant_add_scrolls = enchant_add_scrolls + 1', columns: 'enchant_add_scrolls'};
    case 'afk_ticket': return {set: 'afk_tickets = afk_tickets + 1', columns: 'afk_tickets'};
    case 'auto_potion': return {
      set: 'auto_potion_owned = 1, auto_potion_total = MAX(0, auto_potion_remaining) + 100000, auto_potion_remaining = MAX(0, auto_potion_remaining) + 100000',
      columns: 'auto_potion_owned, auto_potion_remaining, auto_potion_total, auto_potion_enabled',
    };
    default: return {set: '', columns: ''};
  }
}
