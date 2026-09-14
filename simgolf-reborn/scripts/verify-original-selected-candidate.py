"""Chain the original resolved launch and candidate loop using their existing oracles.
Launch assessment inputs and physical actor fields remain supplied explicitly.
The flight oracle supplies flat height/slope, a mixed map and the original loop.
"""
from pathlib import Path
import json,runpy,struct,subprocess,sys
root=Path(__file__).resolve().parents[2]
# Reuse whole original executable harnesses; they also run their own regressions.
arguments=sys.argv[:]
try:
 sys.argv=[str(root/'simgolf-reborn/scripts/verify-original-selected-launch.py')]
 launch=runpy.run_path(sys.argv[0])
 sys.argv=[str(root/'simgolf-reborn/scripts/verify-original-candidate-mixed.py')]
 flight=runpy.run_path(sys.argv[0])
finally:
 sys.argv=arguments
for address in [0x5a3200,0x567278,0x53ec30]:launch['u'].mem_write(address,bytes(40))
launch['write'](0x5a8728,0)
world=flight['world'];rows=[]
for q,_ in launch['rows'][:60]:
 l=launch['run'](q)
 physical=dict(professional=q['actorClass']!=0,abilityFlags=q['abilityFlags'],luck=5,skillMask=q['skillMask'])
 state=dict(**physical,x=q['x'],z=q['z'],height=0,speed=l['speed'],verticalSpeed=l['verticalSpeed'],heading=l['heading'],angularOffset=l['angularOffset'],flags=l['actorFlags'],seed=l['seed'])
 world['mode']=q['driftMode'];world['variant']=q['variant']
 end=flight['run'](state,world)
 rows.append([q,physical,dict(cache=l['cache'],club=l['club'],shotType=l['shotType'],end=end)])
module=(root/'simgolf-reborn/scene/src/simulation/original-selected-candidate.js').as_uri()
step=(root/'simgolf-reborn/scene/src/simulation/original-candidate-step.js').as_uri()
cache_module=(root/'simgolf-reborn/scene/src/simulation/original-strength-search.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalSelectedCandidate}=await import(MODULE),{originalCandidateStep}=await import(STEP),{originalStrengthCache}=await import(CACHE);
const {world,rows}=JSON.parse(readFileSync(0,'utf8'));let cache=originalStrengthCache();
for(const [q,physical,e] of rows){const result=originalSelectedCandidate(q,cache,{kindAt:p=>(p.x+p.z)%2?0:13,shotClassAt:lie=>q.classes[lie+1]},physical);cache=result.cache;let a=result.candidate;
const env={terrainAt:p=>{const i=p.x*50+p.z,code=world.grid[i];return {code,flags:world.marks[i],wallFlags:world.walls[i],...world.metadata[code]};},heightAt:()=>0,slopeAt:()=>0,mode:q.driftMode,variant:q.variant};
for(let i=0;i<2000&&a.speed!==0;i++)a=originalCandidateStep(a,env);
const actual={cache,club:result.club,shotType:result.shotType,end:{x:a.x,z:a.z,seed:a.seed,steps:a.steps,landing:a.landing}};
if(a.speed!==0||!isDeepStrictEqual(actual,e))throw Error(JSON.stringify({q,actual,e}));}
console.log(`${rows.length} chained original launches and complete candidate trajectories match.`);
""".replace('MODULE',json.dumps(module)).replace('STEP',json.dumps(step)).replace('CACHE',json.dumps(cache_module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(dict(world=world,rows=rows)),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-selected-candidate.json').write_text(json.dumps(dict(world=world,rows=rows),separators=(',',':'))+'\n')
