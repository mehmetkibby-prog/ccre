import {actorFrameIsolation} from './r48_3-options.mjs';
// Requires the existing authenticated, durable rollback-proof protocol.
export const commandOutputGuard=actorFrameIsolation&&process.env.CORE511_COMMAND_OUTPUT_GUARD!=='0';
