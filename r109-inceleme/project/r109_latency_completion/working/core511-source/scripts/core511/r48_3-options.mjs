import {actorFaultIsolation} from './r48-options.mjs';
// Restart-scoped: zero preserves delivered R48_2 frame-error propagation.
export const actorFrameIsolation=actorFaultIsolation&&process.env.CORE511_ACTOR_FRAME_ISOLATION!=='0';
