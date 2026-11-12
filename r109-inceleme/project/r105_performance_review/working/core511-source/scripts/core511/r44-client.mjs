import {createPresentationOptions} from './client-presentation-options.mjs';
const options=createPresentationOptions({url:'/api/core511-r44-options',defaults:{remoteMotionPrediction:false}});
export const readR44ClientOptions=options.read;
export const loadR44ClientOptions=options.load;
if(typeof window!=='undefined')void loadR44ClientOptions();
