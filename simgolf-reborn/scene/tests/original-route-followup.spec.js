import {test,expect} from '@playwright/test';
import {originalRouteFollowup} from '../src/simulation/original-route-followup.js';
const base={score:10,samples:4,mode:0,skillMask:4,beyondTwoShots:false,lie:0,range:200,shot:1,remaining:100,landingClass:0,shapeMask:3,followupFlag:0,landing:{x:10512,z:10512},cup:{x:20,z:20}};
test('only eligible four-sample imaginative search assesses a follow-up',()=>{
 for(const change of [{samples:2},{samples:8},{mode:2},{skillMask:3},{beyondTwoShots:true}])
 expect(originalRouteFollowup({...base,...change,assessShot:()=>{throw Error('Must skip');}})).toEqual({score:10,followupFlag:0});
});
test('difficult lie doubles straight assessment and does not evaluate curves',()=>{
 const calls=[];
 expect(originalRouteFollowup({...base,lie:1,shot:0,assessShot:q=>{calls.push(q);return 7;}})).toEqual({score:24,followupFlag:0});
 expect(calls).toEqual([{landing:base.landing,cup:base.cup,range:200,shape:0,flag:0}]);
});
test('good lie takes cheapest allowed shot and applies first-shot range reduction',()=>{
 const calls=[];
 const result=originalRouteFollowup({...base,shot:0,assessShot:q=>{calls.push(q);return q.shape===-1?5:q.shape===1?9:11;}});
 expect(result).toEqual({score:12,followupFlag:1});
 expect(calls.map(q=>[q.range,q.shape,q.flag])).toEqual([[160,0,1],[160,-1,0],[160,1,0]]);
});
test('follow-up flag requires both distance and range headroom; incoming flag persists',()=>{
 for(const [change,expected] of [[{remaining:49},0],[{remaining:161},0],[{remaining:160},1],[{landingClass:1},0],[{remaining:161,followupFlag:1},1]]){
  const calls=[];const result=originalRouteFollowup({...base,...change,shapeMask:0,assessShot:q=>{calls.push(q);return 0;}});
  expect(result.followupFlag).toBe(expected);expect(calls).toHaveLength(1);expect(calls[0].flag).toBe(expected);
 }
});
