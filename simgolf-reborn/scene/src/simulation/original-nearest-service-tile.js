import {originalMapDistance} from './original-route-distance.js';
// 0x40db60–0x40dc69: marked service tile within a fixed nine-by-nine scan.
export function originalNearestServiceTile(snapshot,origin,radius){
 const state=structuredClone(snapshot);
 if(!(state.tileFlags instanceof Uint16Array)||state.tileFlags.length!==2500||!origin||![origin.x,origin.z,radius].every(Number.isInteger))throw Error('Original service tile search unavailable.');
 state.nearestFacilityDistance=radius<<10;state.serviceTileX=-1;
 const tx=origin.x>>10,tz=origin.z>>10;
 for(let x=tx-4;x<=tx+4;x++)for(let z=tz-4;z<=tz+4;z++){
  if(x<0||x>=50||z<0||z>=50||!(state.tileFlags[x*50+z]&512))continue;
  const distance=originalMapDistance(((x<<10)+512-origin.x)|0,((z<<10)+512-origin.z)|0);
  if(distance<state.nearestFacilityDistance){state.nearestFacilityDistance=distance;state.serviceTileX=x;state.serviceTileZ=z;}
 }
 return {state};
}
