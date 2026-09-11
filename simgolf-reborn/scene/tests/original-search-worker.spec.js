import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalSearchJob} from '../src/simulation/original-search-job.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-full-physical-search.json',import.meta.url),'utf8'));
function snapshot(q){
 const metadata=Object.fromEntries(q.cells.map(c=>[c[2],{shotClass:c[3],kind:c[2]===3?13:0,flags:0,bounceCoefficient:3,rollCoefficient:0}]));
 metadata[20]??={shotClass:q.excludedClass,kind:0,flags:0,bounceCoefficient:3,rollCoefficient:0};
 return {search:q,launch:q.launch,physical:{professional:q.actorClass!==0,abilityFlags:q.abilityFlags,luck:5},
  shared:{seed:q.seed,landing:q.landing,cache:{next:0,entries:Array.from({length:10},()=>({distance:0,verticalSpeed:0,speed:0}))},shotClassOverrides:[]},
  map:{terrain:q.cells.map(c=>c[2]),marks:q.cells.map(c=>c[4]),vertices:Array(2601).fill(0),edgeMasks:Array(2500).fill(0),globalFlags:0,metadata}};
}
test('serialized search jobs retain all original full-search results',()=>{
 for(const [q,e] of rows)expect(originalSearchJob(snapshot(q))).toEqual(e);
});
test('browser worker matches original result while animation frames continue',async({page})=>{
 await page.goto('/');const [q,e]=rows[1];
 const result=await page.evaluate(async input=>{
  const {originalSearchClient}=await import('/src/workers/original-search-client.js');
  const client=originalSearchClient();let frames=0,done=false;
  const frame=()=>{if(!done){frames++;requestAnimationFrame(frame);}};requestAnimationFrame(frame);
  try{return {answer:await client.run(input,12),get frames(){return frames;}};}
  finally{done=true;client.dispose();}
 },snapshot(q));
 expect(result.answer).toEqual({revision:12,result:e});expect(result.frames).toBeGreaterThan(1);
});
test('superseded work is cancelled and worker errors do not poison the next job',async({page})=>{
 await page.goto('/');const [q,e]=rows[0];
 const result=await page.evaluate(async input=>{
  const {originalSearchClient}=await import('/src/workers/original-search-client.js');const client=originalSearchClient();
  const old=client.run(input,1).then(()=> 'unexpected',error=>error.name);
  const replacement=client.run(input,2);const cancelled=await old;const answer=await replacement;
  const broken=structuredClone(input);broken.map.vertices=[];
  const error=await client.run(broken,3).then(()=>'',e=>e.message);
  const recovered=await client.run(input,4);client.dispose();
  const disposed=await client.run(input,5).then(()=>'',e=>e.message);
  return {cancelled,answer,error,recovered,disposed};
 },snapshot(q));
 expect(result.cancelled).toBe('AbortError');expect(result.answer).toEqual({revision:2,result:e});
 expect(result.error).toContain('vertex-height snapshot');expect(result.recovered).toEqual({revision:4,result:e});expect(result.disposed).toContain('disposed');
});
