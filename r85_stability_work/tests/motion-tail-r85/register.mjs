import {register} from 'node:module';
process.env.CORE511_R85_MOVEMENT_TAIL='1';
register(new URL('./loader.mjs',import.meta.url));
