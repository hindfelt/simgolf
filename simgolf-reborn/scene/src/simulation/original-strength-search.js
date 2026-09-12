import {originalPuttRange} from './original-putt-strength.js';
// 0x4218a0: planning estimate, not the live airborne update.
export function originalAirRange(speed,verticalSpeed) {
 if(![speed,verticalSpeed].every(n=>Number.isInteger(n)&&n>=0&&n<=100000))throw Error('Unsupported original air range inputs.');
 let distance=0,height=0;
 do {
  distance+=Math.trunc(speed/8);
  height+=Math.trunc(verticalSpeed/16);verticalSpeed-=128;
  speed-=speed>>4;
 }while(height>0);
 return distance;
}
export function originalStrengthCache() {
 return {next:0,entries:Array.from({length:10},()=>({distance:0,verticalSpeed:0,speed:0}))};
}
// Complete 0x4218e0 search with explicit serializable ten-entry ring cache.
// Mode and roll coefficient are intentionally absent from the original key.
export function originalStrengthSearch({distance,verticalSpeed,mode,rollCoefficient=3},cache) {
 if(!Number.isInteger(distance)||distance<0||distance>330||!Number.isInteger(verticalSpeed)||verticalSpeed<0||verticalSpeed>100000||
    !Number.isInteger(mode)||!cache||!Number.isInteger(cache.next)||cache.next<0||cache.next>=10||cache.entries?.length!==10)
  throw Error('Invalid original strength search.');
 const hit=cache.entries.find(e=>e.distance===distance&&e.verticalSpeed===verticalSpeed);
 if(hit)return {speed:hit.speed,cache,hit:true};
 const scaled=Math.trunc(distance*20/25);
 let speed=scaled*33-Math.trunc(scaled*scaled/48)+64,step=Math.trunc(speed/2);
 const target=Math.trunc(distance*1024/25);
 do {
  const range=mode?originalPuttRange(speed,rollCoefficient):originalAirRange(speed,verticalSpeed);
  if(range>target)speed-=step;
  if(range<target)speed+=step;
  step=Math.trunc(step/2);
 }while(step>2);
 const entries=cache.entries.map(e=>({...e}));entries[cache.next]={distance,verticalSpeed,speed};
 return {speed,hit:false,cache:{next:(cache.next+1)%10,entries}};
}
