import {createPresentationOptions} from './client-presentation-options.mjs';
const options=createPresentationOptions({url:'/api/core511-r45-options',defaults:{continuousRemoteMotion:false}});
export const readR45ClientOptions=options.read;
export const loadR45ClientOptions=options.load;
if(typeof window!=='undefined')void loadR45ClientOptions();
