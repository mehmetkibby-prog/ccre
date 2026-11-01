import {register} from 'node:module';
const own='--import '+new URL(import.meta.url).pathname;
if(!process.env.NODE_OPTIONS.includes(own))process.env.NODE_OPTIONS+=' '+own;
register(new URL('./firstkill-probe-loader-r85.mjs',import.meta.url));
