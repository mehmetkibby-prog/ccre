import {createPresentationOptions} from './client-presentation-options.mjs';
const options=createPresentationOptions({url:'/api/core511-r46-options',defaults:{frameMotionClock:false}});
export const readR46ClientOptions=options.read;
export const loadR46ClientOptions=options.load;
if(typeof window!=='undefined')void loadR46ClientOptions();
