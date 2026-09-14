import {test,expect} from '@playwright/test';
import {originalAutomaticCoordinator} from '../src/workers/original-automatic-coordinator.js';
const event={actorId:0,kind:29,value:20};
function setup(){
 let token='course/ball/social/rng';const requests=[],effects=[],applied=[];
 const client={cancel(){},dispose(){},run(snapshot,revision){return new Promise((resolve,reject)=>requests.push({snapshot:structuredClone(snapshot),revision,resolve,reject}));}};
 const coordinator=originalAutomaticCoordinator({client,revision:()=>token,apply:r=>applied.push(r),
  resolveEffect:(request,context)=>new Promise((resolve,reject)=>effects.push({request,context,resolve,reject}))});
 return {coordinator,requests,effects,applied,token:()=>token,setToken:v=>{token=v;}};
}
const tick=()=>new Promise(resolve=>queueMicrotask(resolve));
function pause(s,index=0){s.requests[index].resolve({revision:s.token(),result:{status:'effect',index,event,state:{seed:2,actor:{marker:0}}}});}

test('effects remain speculative and only the completed plan applies',async()=>{
 const s=setup(),snapshot={request:{value:1}},pending=s.coordinator.plan(snapshot,s.token());
 snapshot.request.value=99;pause(s);await tick();
 expect(s.applied).toEqual([]);expect(s.effects).toHaveLength(1);
 s.effects[0].resolve({seed:3,actor:{marker:1}});await tick();
 expect(s.requests[1].snapshot.request.value).toBe(1);
 expect(s.requests[1].snapshot.effectReplies).toEqual([{event,state:{seed:3,actor:{marker:1}}}]);
 expect(snapshot).not.toHaveProperty('effectReplies');
 const result={state:{seed:4},shotClassOverrides:[{code:17,shotClass:8}]};
 s.requests[1].resolve({revision:s.token(),result:{status:'done',result}});
 expect(await pending).toEqual({status:'applied'});expect(s.applied).toEqual([result]);
});

test('changes while awaiting a reaction discard its reply without another worker run',async()=>{
 for(const token of ['course2','ball2','social2','rng2']){
  const s=setup(),pending=s.coordinator.plan({},s.token());pause(s);await tick();
  s.setToken(token);s.effects[0].resolve({seed:9});
  expect(await pending).toEqual({status:'stale'});expect(s.requests).toHaveLength(1);expect(s.applied).toEqual([]);
 }
});

test('cancel and replacement abort the resolver and prevent late speculative state from applying',async()=>{
 const s=setup(),old=s.coordinator.plan({},s.token());pause(s);await tick();
 const latest=s.coordinator.plan({},s.token());
 expect(s.effects[0].context.signal.aborted).toBe(true);
 s.effects[0].resolve({seed:99});expect(await old).toEqual({status:'cancelled'});
 s.requests[1].resolve({revision:s.token(),result:{status:'done',result:{seed:3}}});
 expect(await latest).toEqual({status:'applied'});expect(s.applied).toEqual([{seed:3}]);
});

test('late worker answers, invalid effect indices and resolver failures cannot commit',async()=>{
 const stale=setup(),old=stale.coordinator.plan({},stale.token());stale.setToken('changed');pause(stale);
 expect(await old).toEqual({status:'stale'});expect(stale.effects).toEqual([]);
 const bad=setup(),pending=bad.coordinator.plan({},bad.token());
 bad.requests[0].resolve({revision:bad.token(),result:{status:'effect',index:3,event,state:{}}});
 await expect(pending).rejects.toThrow('Unexpected automatic reaction');expect(bad.applied).toEqual([]);
 const failed=setup(),job=failed.coordinator.plan({},failed.token());pause(failed);await tick();failed.effects[0].reject(Error('reaction failed'));
 await expect(job).rejects.toThrow('reaction failed');expect(failed.applied).toEqual([]);
});

test('disposed plans and reply histories from earlier plans cannot dispatch',async()=>{
 const s=setup();
 await expect(s.coordinator.plan({effectReplies:[{}]},s.token())).rejects.toThrow('fresh automatic plan');
 expect(s.requests).toEqual([]);s.coordinator.dispose();
 await expect(s.coordinator.plan({},s.token())).rejects.toThrow('disposed');
});

test('cancellation settles even when a reaction resolver ignores its abort signal',async()=>{
 for(const action of ['cancel','dispose']){
  const s=setup(),pending=s.coordinator.plan({},s.token());pause(s);await tick();
  s.coordinator[action]();
  expect(await pending).toEqual({status:'cancelled'});
  expect(s.effects[0].context.signal.aborted).toBe(true);
  s.effects[0].reject(Error('late ignored resolver failure'));await tick();
  expect(s.applied).toEqual([]);
 }
});
