"""Verify chained original exact planning and flight on the same flat or nonflat terrain map.
Planner raw map inputs and physical actor fields remain supplied explicitly.
The flight oracle supplies flat height/slope, a mixed map and the original loop.
"""
from pathlib import Path
import json,runpy,struct,subprocess,sys
root=Path(__file__).resolve().parents[2]
# Reuse whole original executable harnesses; they also run their own regressions.
arguments=sys.argv[:];nonflat='--nonflat' in arguments
try:
 sys.argv=[str(root/'simgolf-reborn/scripts/verify-original-exact-planner.py')]
 launch=runpy.run_path(sys.argv[0])
 sys.argv=[str(root/'simgolf-reborn/scripts/verify-original-candidate-mixed.py')]+(['--nonflat'] if nonflat else [])
 flight=runpy.run_path(sys.argv[0])
finally:
 sys.argv=arguments
for address in [0x5a3200,0x567278,0x53ec30]:launch['u'].mem_write(address,bytes(40))
launch['write'](0x5a8728,0)
heights=flight['height_grid'] if nonflat else [0]*2601
rows=[]
for q,_ in launch['rows'][:60]:
 q={**q,'heights':[heights[x*51+z] for x in range(50) for z in range(50)]}
 world=dict(grid=q['terrain'],marks=q['marks'],walls=[0]*2500,metadata={c:dict(bounceCoefficient=3,rollCoefficient=0) for c in set(q['terrain'])})
 l=launch['run'](q)
 physical=dict(professional=q['actorClass']!=0,abilityFlags=q['abilityFlags'],luck=5,skillMask=q['skillMask'])
 state=dict(**physical,x=q['x'],z=q['z'],height=0,speed=l['speed'],verticalSpeed=l['verticalSpeed'],heading=l['heading'],angularOffset=l['angularOffset'],flags=l['actorFlags'],seed=l['seed'])
 world['mode']=q['driftMode'];world['variant']=q['variant']
 end=flight['run'](state,world)
 rows.append([q,physical,dict(launch=l,end=end)])
module=(root/'simgolf-reborn/scene/src/simulation/original-exact-candidate.js').as_uri()
step=(root/'simgolf-reborn/scene/src/simulation/original-candidate-step.js').as_uri()
cache_module=(root/'simgolf-reborn/scene/src/simulation/original-strength-search.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalExactCandidate}=await import(MODULE),{originalCandidateStep}=await import(STEP),{originalStrengthCache}=await import(CACHE);
const {originalDirectionalHeightStage}=await import(HEIGHT);const {originalShotMap}=await import(MAP);const {rows,heights}=JSON.parse(readFileSync(0,'utf8'));let cache=originalStrengthCache();
for(const [q,physical,e] of rows){
 const readHeight=(x,z)=>heights[x*51+z];
 const map=originalShotMap({terrain:Uint8Array.from(q.terrain),marks:Uint16Array.from(q.marks),derived:{...originalDirectionalHeightStage({readHeight,readMetadataFlags:()=>0}),edgeMasks:new Uint8Array(2500)},readHeight,globalFlags:0,metadata:code=>({flags:0,kind:q.kinds[code],shotClass:q.classes[code+1],bounceCoefficient:3,rollCoefficient:0})});
 const result=originalExactCandidate(q,cache,map.planning,physical);cache=result.launch.cache;let a=result.candidate;
 const env={...map,mode:q.driftMode,variant:q.variant};
for(let i=0;i<2000&&a.speed!==0;i++)a=originalCandidateStep(a,env);
const actual={launch:result.launch,end:{x:a.x,z:a.z,seed:a.seed,steps:a.steps,landing:a.landing}};
if(a.speed!==0||!isDeepStrictEqual(actual,e))throw Error(JSON.stringify({q,actual,e}));}
console.log(`${rows.length} shared-map original planners and candidate trajectories match.`);
""".replace('HEIGHT',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-corner-height.js').as_uri())).replace('MAP',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-shot-map.js').as_uri())).replace('MODULE',json.dumps(module)).replace('STEP',json.dumps(step)).replace('CACHE',json.dumps(cache_module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(dict(rows=rows,heights=heights)),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/('simgolf-reborn/scene/tests/fixtures/original-shared-map-'+('nonflat-' if nonflat else '')+'candidate.json')).write_text(json.dumps(dict(rows=rows,heights=heights),separators=(',',':'))+'\n')
