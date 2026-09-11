import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAutomaticJob} from '../src/simulation/original-automatic-job.js';
const [q,expected]=JSON.parse(readFileSync(new URL('./fixtures/original-automatic-planner.json',import.meta.url),'utf8'))[0];
function snapshot(){
 const metadata=Object.fromEntries(q.cells.map(c=>[c[2],{shotClass:c[3],kind:c[2]===3?13:0,category:0,flags:0,bounceCoefficient:3,rollCoefficient:0}]));
 metadata[20]??={shotClass:q.excludedClass,kind:0,category:0,flags:0,bounceCoefficient:3,rollCoefficient:0};
 return {request:q.automatic,searchState:q.outerSearchState,score:0,spatialScores:q.aimScores,physical:{luck:5},
  records:{holes:{2:0},profileHoleMarks:{'0:2':0},profileIndices:{0:0,1:0},profileBytes:{0:0}},
  map:{terrain:q.cells.map(c=>c[2]),marks:q.cells.map(c=>c[4]),vertices:Array(2601).fill(0),edgeMasks:Array(2500).fill(0),globalFlags:0,metadata},effectReplies:[]};
}
test('automatic job pauses for explicit effects and reproduces native output after replies',()=>{
 const input=snapshot(),before=structuredClone(input);
 let answer=originalAutomaticJob(input);
 expect(answer.status).toBe('effect');expect(input).toEqual(before);
 while(answer.status==='effect'){
  // The native oracle uses controlled no-op remark effects; explicitly reply
  // with that behavior here. Production has no such default.
  input.effectReplies.push({event:answer.event,state:answer.state});
  answer=originalAutomaticJob(input);
 }
 const {searched,...result}=answer.result;expect(searched).not.toBeNull();expect(result).toEqual(expected);
 input.effectReplies.push(structuredClone(input.effectReplies[0]));
 expect(()=>originalAutomaticJob(input)).toThrow('Unused original reaction replies.');
});
test('mismatched reaction replies are rejected',()=>{
 const input=snapshot(),pending=originalAutomaticJob(input);
 input.effectReplies=[{event:{...pending.event,kind:999},state:pending.state}];
 expect(()=>originalAutomaticJob(input)).toThrow('does not match replay');
});
test('browser worker yields effect requests and finishes without blocking animation',async({page})=>{
 await page.goto('/');
 const output=await page.evaluate(async input=>{
  const {originalAutomaticClient}=await import('/src/workers/original-automatic-client.js');
  const client=originalAutomaticClient();let frames=0,done=false,requests=0;
  const frame=()=>{if(!done){frames++;requestAnimationFrame(frame);}};requestAnimationFrame(frame);
  try{
   let answer;
   do{
    answer=await client.run(input,4);
    if(answer.result.status==='effect'){
     requests++;input.effectReplies.push({event:answer.result.event,state:answer.result.state});
    }
   }while(answer.result.status==='effect');
   return {answer,frames,requests};
  }finally{done=true;client.dispose();}
 },snapshot());
 expect(output.frames).toBeGreaterThan(1);expect(output.requests).toBeGreaterThan(0);
 expect(output.answer.revision).toBe(4);
 const {searched,...result}=output.answer.result.result;expect(searched).not.toBeNull();expect(result).toEqual(expected);
});
