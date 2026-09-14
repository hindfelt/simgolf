import {originalFacilityArrival} from './original-facility-arrival.js';
import {originalNearestFacility} from './original-nearest-facility.js';
import {cellAt} from './world.js';
const types={ballwasher:3,'putting-green':6,snack:7,'pro-shop':8,'driving-range':10};
// Search only reachable candidates. Native distance and stable record order
// choose within a service type; the live needs policy chooses the type first.
export function nearestLiveFacility(candidates,pos){
 if(!candidates.length)return null;
 const type=types[candidates[0].type];
 if(type===undefined)return candidates[0];
 const same=candidates.filter(f=>f.type===candidates[0].type).slice(0,256);
 const records=new Uint8Array(4096),view=new DataView(records.buffer);
 same.forEach((f,i)=>{view.setInt16(i*16,type,true);view.setInt16(i*16+2,f.c,true);view.setInt16(i*16+4,f.r,true);records[i*16+7]=64;});
 const p=cellAt(pos.x,pos.z);
 const result=originalNearestFacility({facilityRecords:records,facilityWidths:{[type]:1}},type,{x:p.c*1024+512,z:p.r*1024+512});
 return same[result.value]??same[0];
}
// Packed scratch records belong to this entry point, not to the differently
// based remark actor. Native money units map to dollars in the live economy.
export function liveFacilityArrival(g,v,f,onRemark=()=>{}){
 const type=types[f.type];if(type===undefined)return {income:0,remarks:[]};
 const records=new Uint8Array(4096);new DataView(records.buffer).setInt16(0,type,true);
 const actor=new Uint8Array(256),remarks=[];
 const result=originalFacilityArrival({actorId:0,actors:{0:actor},serviceIndex:0,facilityRecords:records,
  seed:g.rng,cashUnits:0,serviceIncome:new Int16Array(1),ledgerPeriod:0,
  tileFlags:new Uint16Array(2500),tileServiceState:new Uint8Array(2500),
  type6Level:0,type8Level:0,type10Level:0},(event,state)=>{
   if(event.address===0x4672d0){remarks.push(event.args[1]);g.rng=state.seed;onRemark(event.args[1]);state.seed=g.rng;}
   return {state};
  });
 g.rng=result.state.seed;
 return {income:result.state.cashUnits,remarks};
}
