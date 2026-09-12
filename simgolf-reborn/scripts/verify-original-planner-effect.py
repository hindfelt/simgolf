"""Execute the native outer automatic planner including its nested search."""
from pathlib import Path
outer_frame=0x10d000
source=Path(__file__).with_name('verify-original-search-launch.py')
prefix=source.read_text().split('rows=[]\nfor q,')[0]
prefix=prefix.replace('if a==0x425aca:u.emu_stop();return','if a==0x425aca and u.reg_read(UC_X86_REG_ESP)==outer_frame+12:u.emu_stop();return')
exec(compile(prefix,str(source),'exec'))
for a,n in [(0x422450,14),(0x4a57e0,0x2f)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
initializing=False;setup_snapshot={};search_input={}
def outer_hook(u,a,n,d):
 global setup_snapshot,search_input
 if a==0x42245e:
  if initializing:u.emu_stop();return
  sp=u.reg_read(UC_X86_REG_ESP)
  search_input={**current,'candidateLanding':dict(x=read(0x5691dc),z=read(0x5691e0)),
   'distances':[list(struct.unpack('<6i',u.mem_read(sp+0x2a14+i*24,24))) for i in range(441)],
   'flags':[list(struct.unpack('<6I',u.mem_read(sp+0x536c+i*24,24))) for i in range(441)],
   'followupFlag':read(sp+0xb4),
   'winner':dict(score=read(sp+0x60),target=dict(x=read(sp+0x78),z=read(sp+0xa4)),curve=read(sp+0x6c),cornerTarget=read(0x5a8730),landing=dict(x=read(0x5a7270),z=read(0x5a7278)),landingFlag=read(sp+0xac))}
  search_input.pop('automatic',None)
 if a==0x42365d and u.reg_read(UC_X86_REG_ESP)==outer_frame:
  sp=outer_frame
  setup_snapshot=dict(range=read(sp+0x30),originTile=dict(x=read(sp+0x34),z=read(sp+0x40)),originIndex=read(sp+0x50),terrainCode=read(sp+0x14),obstacleIndex=read(0x4c1fbc),shotClassOverrides=[])
u.hook_add(UC_HOOK_CODE,outer_hook)
rows=[]
for q,_ in json.loads((root/'simgolf-reborn/scene/tests/fixtures/original-search-launch.json').read_text()):
 launching=False;initializing=True;stop_search=True
 u.mem_write(0x577f00,bytes(512));write(0x577f08,q['origin']['x']);write(0x577f0c,q['origin']['z'])
 write(0x574524+q['hole']*520,0);write(0x5746fc+q['hole']*520,0)
 try:run(q)
 except AssertionError:assert u.reg_read(UC_X86_REG_EIP)==0x42245e
 initializing=False;stop_search=False
 sp=outer_frame;u.mem_write(sp,bytes(0xc00))
 automatic=json.loads(json.dumps(q['automatic']));planning=automatic['planning']
 planning.update(cup=q['cup'],rangeInput={**q['rangeInput'],'abilityFlags':q['abilityFlags']},worldFlags=q['worldFlags'],driftMode=q['mode'],obstacleCount=0)
 state=automatic['state'];state.update(actor=actor_state(),seed=q['seed'],cache=dict(next=0,entries=[dict(distance=0,verticalSpeed=0,speed=0) for _ in range(10)]),diagnostics=q['diagnostics'],landing=q['winner']['landing'])
 partner_id=struct.unpack('<h',u.mem_read(0x577faa,2))[0];state['partner']=dict(actorClass=u.mem_read(0x577f20+partner_id*256,1)[0],reaction=u.mem_read(0x577f8c+partner_id*256,1)[0])
 initial_records=list(u.mem_read(0x577f00,512));initial_holes=list(u.mem_read(0x574500,20*520))
 # Match live caller state before entry; no search or aim results are injected.
 for off,v in [(0xb1c,0),(0xb20,q['actorId']),(0xb24,0),(0xb28,-1),(0xb2c,0),(0xb30,planning['curve']),
  (0x3c,planning['dominantCode']),(0x4c,planning['dominantDirection']),(0x44,planning['sampleX'])]:write(sp+off,v)
 for index,v in enumerate(planning['directions']):write(sp+0xd8+index*4,v)
 u.mem_write(sp+0x158,bytes(v&255 for v in q['aimScores']))
 write(0x53ce64,0);write(0x58dd80,0)
 events=[];draws=0;refs={};search_input={};launching=True
 u.reg_write(UC_X86_REG_ESP,sp+0xb1c)
 try:u.emu_start(0x4235c0,0x400fff,count=500000000)
 except Exception:
  print('Outer trace',trace,'EIP',hex(u.reg_read(UC_X86_REG_EIP)),flush=True);raise
 assert u.reg_read(UC_X86_REG_EIP)==0x425aca
 launching=False
 actor=actor_state();actor['stateCode']=struct.unpack('<h',u.mem_read(0x577fb4,2))[0]
 cache=dict(next=read(0x5a8728),entries=[dict(distance=read(0x5a3200+i*4),verticalSpeed=read(0x567278+i*4),speed=read(0x53ec30+i*4)) for i in range(10)])
 final_state={**state,**refs,'actor':actor,'seed':read(0x820454)&0xffffffff,'cache':cache,'speed':read(0x577fec),'verticalSpeed':read(0x577ff0),'heading':read(0x577fe8)&0xffffffff,
  'diagnostics':read(0x5a5b88)&0xffffffff,'holeCounter':read(0x574524+q['hole']*520),'lie':read(sp+0x14),'landing':dict(x=read(0x5a7270),z=read(0x5a7278))}
 final=dict(state=final_state,events=events,postPreparationDraws=draws,samples=read(sp+0x20) if actor['club']!=13 else 0,
  shotClassOverrides=[dict(code=c,shotClass=u.mem_read(0x576dc2+c*48,1)[0]) for c in [17,20]],setup=setup_snapshot)
 q['automatic']=automatic;q['outerSearchState']=search_input
 q['searchGlobals']=dict(globalFlags=read(0x59d208)&0xffffffff,worldFlags=read(0x59d208)&0xffffffff,updateScratch=read(0x59a188),driftMode=read(0x5a870c),candidateSkillMask=read(0x4c1e0c),cornerTarget=read(0x5a8730),searchFlag=read(0x5a872c),candidateLanding=dict(x=read(0x5691dc),z=read(0x5691e0)));q['initialRecords']=initial_records;q['initialHoles']=initial_holes;q['finalHoles']=list(u.mem_read(0x574500,20*520));q['finalRecords']=list(u.mem_read(0x577f00,512));rows.append([q,final]);print('Native outer planner finished',q['scenario'],q['mode'],flush=True)
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalAutomaticPlanner}=await import(PLANNER),{searchLaunchMap}=await import(MAP);
const {originalPlannerEffect}=await import(EFFECT);const {originalPlannerInput}=await import(INPUT);const {originalPlannerActor}=await import(ACTOR);const {applyOriginalPlannerResult}=await import(RESULT);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const snapshot={metadata:Array.from({length:23},()=>({shotClass:99,scatterCoefficient:99})),actorId:0,actors:[Uint8Array.from(q.initialRecords.slice(0,256)),Uint8Array.from(q.initialRecords.slice(256))],holes:Array.from({length:20},(_,i)=>Uint8Array.from(q.initialHoles.slice(i*520,(i+1)*520))),seed:q.automatic.state.seed,strengthCache:q.automatic.state.cache,diagnostics:q.automatic.state.diagnostics,landing:q.automatic.state.landing};const response=originalPlannerEffect({address:0x4235c0,args:[0,0,-1,0,q.automatic.planning.curve]},snapshot,q.automatic,{map:searchLaunchMap(q),physical:{luck:5},searchState:q.outerSearchState,score:0,scoreAt:(x,z)=>q.aimScores[x*50+z]},{emit:(_event,state)=>state});const {searched,...a}=response.planner;const actors=[Uint8Array.from(q.initialRecords.slice(0,256)),Uint8Array.from(q.initialRecords.slice(256))],input={actors,actorId:0,holes:Array.from({length:20},(_,i)=>Uint8Array.from(q.initialHoles.slice(i*520,(i+1)*520))),metadata:Array.from({length:23},()=>({shotClass:99,scatterCoefficient:99}))};if(!isDeepStrictEqual(originalPlannerActor(input),q.automatic.state.actor))throw Error('Planner actor input differs from native');const applied=response.state;const searchGlobals=Object.fromEntries(Object.keys(q.searchGlobals).map(k=>[k,applied[k]]));if(!isDeepStrictEqual(searchGlobals,q.searchGlobals))throw Error(JSON.stringify({actual:searchGlobals,expected:q.searchGlobals}));const shared={seed:applied.seed,cache:applied.strengthCache,diagnostics:applied.diagnostics,landing:applied.landing,holes:applied.holes.flatMap(b=>Array.from(b)),overrides:[17,20].map(code=>({code,shotClass:applied.metadata[code].shotClass}))};const expectedShared={seed:e.state.seed,cache:e.state.cache,diagnostics:e.state.diagnostics,landing:e.state.landing,holes:q.finalHoles,overrides:e.shotClassOverrides};if(!isDeepStrictEqual(shared,expectedShared))throw Error('Planner shared state differs from native');const expected=Uint8Array.from(q.finalRecords);const diff=applied.actors.flatMap(b=>Array.from(b)).flatMap((v,i)=>v===expected[i]?[]:[[i,v,expected[i]]]);if(diff.length)throw Error(JSON.stringify({scenario:q.scenario,recordDiff:diff}));if(!isDeepStrictEqual(a,e)){
const diffs=[];function walk(a,b,p=''){if(isDeepStrictEqual(a,b))return;if(a&&b&&typeof a==='object'&&typeof b==='object')for(const k of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[k],b[k],p+'.'+k);else if(diffs.length<20)diffs.push({p,a,b});}walk(a,e);throw Error(JSON.stringify({scenario:q.scenario,mode:q.mode,diffs}));}}
console.log('Six scheduler-shaped planner effects match native actor, hole, cache and search state.');
""".replace('EFFECT',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-planner-effect.js').as_uri())).replace('INPUT',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-planner-input.js').as_uri())).replace('RESULT',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-planner-result.js').as_uri())).replace('ACTOR',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-planner-actor.js').as_uri())).replace('PLANNER',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-automatic-planner.js').as_uri())).replace('MAP',json.dumps((root/'simgolf-reborn/scene/tests/helpers/original-search-launch.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:(root/'simgolf-reborn/scene/tests/fixtures/original-automatic-planner.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
