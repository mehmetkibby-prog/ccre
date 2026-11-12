// Read once per process. Operational rollback is an environment change followed
// by the normal service restart; no request can change a performance policy.
export const REFRESH_SCOPE_V2=process.env.CORE511_REFRESH_SCOPE_V2!=='0';
export const PARALLEL_RELEASE=process.env.CORE511_PARALLEL_RELEASE!=='0';
export const TRANSIENT_EVENTS=process.env.CORE511_TRANSIENT_EVENTS!=='0';
export const STMT_CACHE=process.env.CORE511_STMT_CACHE!=='0';
export const SETTINGS_CACHE=process.env.CORE511_SETTINGS_CACHE!=='0';
