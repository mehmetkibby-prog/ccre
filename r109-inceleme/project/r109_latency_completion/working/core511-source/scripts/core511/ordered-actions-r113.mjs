// Admission may overlap; execution, rate limits and durable results stay ordered.
// Purchases, inventory, movement transitions and reward claims use their own
// existing barriers. Two slots is the hard connection/epoch-wide window.
export const ORDERED_ACTIONS_R113='ordered-actions-r113';
export const orderedActionR113=p=>!!p&&['attack','pvp_attack','cast_support456'].includes(p.action);
