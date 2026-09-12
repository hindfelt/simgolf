import {test,expect} from '@playwright/test';
import {originalSearchCoordinator} from '../src/workers/original-search-coordinator.js';
function setup(){
 let token='course1/ball1/rng1';const requests=[],applied=[];
 // Deliberately allow an uncooperative cancelled job to return late.
 const client={cancel(){},dispose(){},run(snapshot,revision){return new Promise((resolve,reject)=>requests.push({snapshot,revision,resolve,reject}));}};
 const coordinator=originalSearchCoordinator({client,revision:()=>token,apply:result=>applied.push(result)});
 return {coordinator,requests,applied,token:()=>token,setToken:value=>{token=value;}};
}
test('changed course, ball or random state prevents a late result from applying',async()=>{
 for(const token of ['course2/ball1/rng1','course1/ball2/rng1','course1/ball1/rng2']){
  const s=setup(),before=s.token(),pending=s.coordinator.plan({},before);
  s.setToken(token);s.requests[0].resolve({revision:before,result:{target:1,shared:{seed:2}}});
  expect(await pending).toEqual({status:'stale'});expect(s.applied).toEqual([]);
 }
});
test('only the newest job applies even when cancelled work returns late',async()=>{
 const s=setup(),old=s.coordinator.plan({},s.token()),latest=s.coordinator.plan({},s.token());
 const result={target:1,shared:{seed:2,cache:{next:3}}};
 s.requests[1].resolve({revision:s.token(),result});expect(await latest).toEqual({status:'applied'});
 s.requests[0].resolve({revision:s.token(),result:{target:9}});expect(await old).toEqual({status:'cancelled'});
 expect(s.applied).toEqual([result]);
});
test('stale input is rejected before dispatch and mismatched response tags are discarded',async()=>{
 const s=setup();expect(await s.coordinator.plan({},'old')).toEqual({status:'stale'});expect(s.requests).toHaveLength(0);
 const pending=s.coordinator.plan({},s.token());s.requests[0].resolve({revision:'wrong',result:{}});
 expect(await pending).toEqual({status:'stale'});expect(s.applied).toEqual([]);
});
test('cancel, disposal and worker errors cannot commit a result',async()=>{
 for(const action of ['cancel','dispose']){
  const s=setup(),pending=s.coordinator.plan({},s.token());s.coordinator[action]();
  s.requests[0].resolve({revision:s.token(),result:{}});expect(await pending).toEqual({status:'cancelled'});expect(s.applied).toEqual([]);
  if(action==='dispose')await expect(s.coordinator.plan({},s.token())).rejects.toThrow('disposed');
 }
 const s=setup(),pending=s.coordinator.plan({},s.token());s.requests[0].reject(new Error('worker failed'));
 await expect(pending).rejects.toThrow('worker failed');expect(s.applied).toEqual([]);
});
