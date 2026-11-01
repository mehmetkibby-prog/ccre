// Restart-scoped. Zero preserves R49's repeated read-only scope checks.
export const requestGuardCache=process.env.CORE511_REQUEST_GUARD_CACHE!=='0';
