"""Verify sequential candidate shared-state propagation using full original calls."""
from pathlib import Path
import json,runpy,sys,subprocess
root=Path(__file__).resolve().parents[2]
arguments=sys.argv[:]
try:
 sys.argv=[str(root/'simgolf-reborn/scripts/verify-original-contiguous-candidate.py')]
 oracle=runpy.run_path(sys.argv[0])
finally:sys.argv=arguments
for address in [0x5a3200,0x567278,0x53ec30]:oracle['u'].mem_write(address,bytes(40))
oracle['write'](0x5a8728,0)
initial=dict(seed=1234567,landing=dict(x=12345,z=23456),cache=dict(next=0,entries=[dict(distance=0,verticalSpeed=0,speed=0) for _ in range(10)]),shotClassOverrides=[])
shared=initial;rows=[]
for q,_ in oracle['rows']:
 effective={**q,'seed':shared['seed'],'classes':q['classes'][:]}
 for patch in shared['shotClassOverrides']:effective['classes'][patch['code']+1]=patch['shotClass']
 oracle['write'](0x5691dc,shared['landing']['x']);oracle['write'](0x5691e0,shared['landing']['z'])
 e=oracle['run'](effective)
 shared=dict(seed=e['end']['seed'],landing=e['end']['landing'] or shared['landing'],cache=e['cache'],shotClassOverrides=e['shotClassOverrides'])
 rows.append([q,shared])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalSharedCandidateTrial,advanceOriginalCandidateTrial,originalCandidateTrialResult}=await import(TRIAL),{originalShotMap}=await import(MAP);
const {initial,rows}=JSON.parse(readFileSync(0,'utf8'));let shared=initial;
for(const [q,e] of rows){
const map=originalShotMap({terrain:Uint8Array.from(q.terrain),marks:Uint16Array.from(q.marks),derived:{edgeMasks:new Uint8Array(2500),surfaceHeights:new Int8Array(2500),directionHeights:new Int8Array(20000)},readHeight:()=>0,globalFlags:0,metadata:code=>({flags:0,kind:q.kinds[code],shotClass:q.classes[code+1],bounceCoefficient:3,rollCoefficient:0})});
const physical={professional:q.actorClass!==0,abilityFlags:q.abilityFlags,luck:5,skillMask:q.skillMask};
let trial=originalSharedCandidateTrial(q,shared,map.planning,physical);
trial=advanceOriginalCandidateTrial(trial,{...map,mode:q.driftMode,variant:q.variant},2000);
shared=originalCandidateTrialResult(trial);
if(!isDeepStrictEqual(shared,e))throw Error(JSON.stringify({shared,e}));
}console.log(`${rows.length} sequential original candidates match shared RNG, landing, cache and metadata.`);
""".replace('TRIAL',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-candidate-trial.js').as_uri())).replace('MAP',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-shot-map.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(dict(initial=initial,rows=rows)),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-shared-candidate-trials.json').write_text(json.dumps(dict(initial=initial,rows=rows[:12]),separators=(',',':'))+'\n')
