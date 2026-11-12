// These legacy admin branches mutate game/combat settings without the original
// channelPermanent callback. Other branches already have their own coordinator.
export const ADMIN_SETTINGS_R65=Object.freeze([
 'content_save_r102','save_settings','save_level_curve','save_level_balance487',
 'save_fishing_chances482','save_specialist_skills459',
 'save_events','event_start','event_schedule','event_stop',
 'enhancement_settings491','cauldron_settings488','save_forest_loot_policy',
 'beta_schedule','beta_start','set_decor_layout','reset_decor_layout',
 'set_map_theme','set_new_year_mode','set_halloween_mode',
 'save_broken_core464'
]);
