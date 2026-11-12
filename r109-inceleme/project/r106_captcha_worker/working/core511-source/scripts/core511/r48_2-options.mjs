import {actorFaultIsolation} from './r48-options.mjs';
// Restart-scoped: zero preserves the delivered R48_1 retirement sequence.
export const retiredActorIsolation=actorFaultIsolation&&process.env.CORE511_RETIRED_ACTOR_ISOLATION!=='0';
