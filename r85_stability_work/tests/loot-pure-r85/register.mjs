import {register} from 'node:module';
register(new URL('./loader.mjs',import.meta.url));
const preload=new URL('./register.mjs',import.meta.url).pathname;
if(!process.env.NODE_OPTIONS?.includes(preload))process.env.NODE_OPTIONS=(process.env.NODE_OPTIONS??'')+' --import '+preload;
