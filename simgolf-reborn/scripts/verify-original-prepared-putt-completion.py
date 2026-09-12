"""Verify prepared putt output through clearance, animation and rolling termination."""
from pathlib import Path
outer_frame=0x10d000
source=Path(__file__).with_name('verify-original-search-launch.py')
prefix=source.read_text().split('rows=[]\nfor q,')[0]
prefix=prefix.replace('if a==0x425aca:u.emu_stop();return','if False:u.emu_stop();return')
exec(compile(prefix,str(source),'exec'))
for a,n in [(0x42b55c,0x2c9),(0x422450,14),(0x4a57e0,0x2f)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
initializing=False;setup_snapshot={};search_input={}
def outer_hook(u,a,n,d):
 global setup_snapshot,search_input
 if a==0x4295ef:u.emu_stop();return
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
fixtures=[]
for base,_ in json.loads((root/'simgolf-reborn/scene/tests/fixtures/original-search-launch.json').read_text()):
 for offset in [0,128,511]:
  for flags in [0,128]:
   q=json.loads(json.dumps(base));q['origin']['x']+=offset;q['puttFlags']=flags;q['seed']=(q['seed']+offset+flags)&0xffffffff;fixtures.append(q)
for q in fixtures:
 q['cup']=dict(x=(q['origin']['x']>>10)+1,z=q['origin']['z']>>10)
 for cell in q['cells']:
  if cell[:2]==[q['cup']['x'],q['cup']['z']]:cell[2]=1;cell[3]=0;cell[4]=128
  if cell[:2]==[q['origin']['x']>>10,q['origin']['z']>>10]:cell[2]=1;cell[3]=0;cell[4]=q['puttFlags']
 launching=False;initializing=True;stop_search=True
 u.mem_write(0x577f00,bytes(512));write(0x577f08,q['origin']['x']);write(0x577f0c,q['origin']['z'])
 write(0x574524+q['hole']*520,0);write(0x5746fc+q['hole']*520,0)
 try:run(q)
 except AssertionError:assert u.reg_read(UC_X86_REG_EIP)==0x42245e
 initializing=False;stop_search=False
 startup=p.get_memory_mapped_image()[0xc0a38:0xc0a38+23*48];q['terrainMetadata']=[dict(bounceCoefficient=struct.unpack('b',startup[i*48+32:i*48+33])[0],rollCoefficient=struct.unpack('b',startup[i*48+33:i*48+34])[0],scatterCoefficient=struct.unpack('b',startup[i*48+34:i*48+35])[0]) for i in range(23)]
 for i,m in enumerate(q['terrainMetadata']):u.mem_write(0x576dc0+i*48,bytes([m['bounceCoefficient']&255,m['rollCoefficient']&255]))
 sp=outer_frame;u.mem_write(sp,bytes(0xc00))
 automatic=json.loads(json.dumps(q['automatic']));automatic['rollCoefficient']=q['terrainMetadata'][1]['rollCoefficient'];planning=automatic['planning']
 planning.update(cup=q['cup'],rangeInput={**q['rangeInput'],'abilityFlags':q['abilityFlags']},worldFlags=q['worldFlags'],driftMode=q['mode'],obstacleCount=0)
 planning['curve']=0
 state=automatic['state'];state.update(actor=actor_state(),seed=q['seed'],cache=dict(next=0,entries=[dict(distance=0,verticalSpeed=0,speed=0) for _ in range(10)]),diagnostics=q['diagnostics'],landing=q['winner']['landing'])
 partner_id=struct.unpack('<h',u.mem_read(0x577faa,2))[0];state['partner']=dict(actorClass=u.mem_read(0x577f20+partner_id*256,1)[0],reaction=u.mem_read(0x577f8c+partner_id*256,1)[0])
 
 for index in range(32):write(0x5698cc+index*184,0)
 q['initialSearchGlobals']=dict(globalFlags=read(0x59d208)&0xffffffff,worldFlags=read(0x59d208)&0xffffffff,updateScratch=0,driftMode=read(0x5a870c),candidateSkillMask=read(0x4c1e0c),cornerTarget=read(0x5a8730),searchFlag=read(0x5a872c),candidateLanding=dict(x=read(0x5691dc),z=read(0x5691e0)))
 initial_records=list(u.mem_read(0x577f00,512));initial_holes=list(u.mem_read(0x574500,20*520))
 # Match live caller state before entry; no search or aim results are injected.
 for off,v in [(0xb1c,0),(0xb20,q['actorId']),(0xb24,0),(0xb28,-1),(0xb2c,0),(0xb30,planning['curve']),
  (0x3c,planning['dominantCode']),(0x4c,planning['dominantDirection']),(0x44,planning['sampleX'])]:write(sp+off,v)
 for index,v in enumerate(planning['directions']):write(sp+0xd8+index*4,v)
 u.mem_write(sp+0x158,bytes(v&255 for v in q['aimScores']))
 write(0x53ce64,0);write(0x58dd80,0)
 events=[];draws=0;refs={};search_input={};launching=True
 caller=sp+0xb34;surface=next(c[2] for c in q['cells'] if c[:2]==[q['origin']['x']>>10,q['origin']['z']>>10]);q['startTerrain']=surface
 write(caller+0x10,q['actorId']);write(caller+0x14,surface);write(caller+0x18,q['origin']['x']>>10);write(caller+0x20,q['origin']['z']>>10);write(0x59a188,0)
 u.reg_write(UC_X86_REG_EBP,q['actorId']*256);u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,caller)
 try:u.emu_start(0x42b55c,0x400fff,count=500000000)
 except Exception:
  print('Outer trace',trace,'EIP',hex(u.reg_read(UC_X86_REG_EIP)),flush=True);raise
 assert u.reg_read(UC_X86_REG_EIP)==0x4295ef
 launching=False
 actor=actor_state();actor['stateCode']=struct.unpack('<h',u.mem_read(0x577fb4,2))[0]
 cache=dict(next=read(0x5a8728),entries=[dict(distance=read(0x5a3200+i*4),verticalSpeed=read(0x567278+i*4),speed=read(0x53ec30+i*4)) for i in range(10)])
 final_state={**state,**refs,'actor':actor,'seed':read(0x820454)&0xffffffff,'cache':cache,'speed':read(0x577fec),'verticalSpeed':read(0x577ff0),'heading':read(0x577fe8)&0xffffffff,
  'diagnostics':read(0x5a5b88)&0xffffffff,'holeCounter':read(0x574524+q['hole']*520),'lie':read(sp+0x14),'landing':dict(x=read(0x5a7270),z=read(0x5a7278))}
 final=dict(state=final_state,events=events,postPreparationDraws=draws,samples=read(sp+0x20) if actor['club']!=13 else 0,
  shotClassOverrides=[dict(code=c,shotClass=u.mem_read(0x576dc2+c*48,1)[0]) for c in [17,20]],setup=setup_snapshot)
 q['automatic']=automatic;q['outerSearchState']=search_input
 q['puttCounts']=[read(0x5698cc+index*184) for index in range(32)];q['searchGlobals']=dict(globalFlags=read(0x59d208)&0xffffffff,worldFlags=read(0x59d208)&0xffffffff,updateScratch=read(0x59a188),driftMode=read(0x5a870c),candidateSkillMask=read(0x4c1e0c),cornerTarget=read(0x5a8730),searchFlag=read(0x5a872c),candidateLanding=dict(x=read(0x5691dc),z=read(0x5691e0)));q['initialRecords']=initial_records;q['initialHoles']=initial_holes;q['finalHoles']=list(u.mem_read(0x574500,20*520));q['finalRecords']=list(u.mem_read(0x577f00,512));rows.append([q,final])

# Consume the verified preparation output without substituting launch values.
from unicorn.x86_const import UC_X86_REG_FPCW
v=Uc(UC_ARCH_X86,UC_MODE_32);v.mem_map(0x400000,0x500000);v.mem_write(0x400000,p.get_memory_mapped_image());v.mem_map(0x100000,0x4000)
motion_effects={0x42f110:2,0x4096e0:1,0x4672d0:3,0x40c1f0:4,0x409820:1,0x409780:1,0x40c140:3,0x4093b0:1,0x4219e0:1,0x405e80:2,0x466fb0:2,0x40c7f0:3,0x40c580:4,0x45b2c0:1,0x45b180:1}
for address in motion_effects:v.mem_write(address,b'\xc3')
def vp(a,n):v.mem_write(a,struct.pack('<I',n&0xffffffff))
def vr(a):return struct.unpack('<i',v.mem_read(a,4))[0]
motion_calls=[];motion_done=False;terminal=None

def motion_hook(v,a,n,d):
 global motion_done,terminal
 if a in [0x42ca9d,0x42c3f4]:motion_done=True;terminal=hex(a)
 if a in [0x425b50,0x426b00]:
  sp=v.reg_read(UC_X86_REG_ESP);motion_calls.append(dict(address=a,args=[vr(sp+4)]))
 if a==0x40bc90 and vr(v.reg_read(UC_X86_REG_ESP))==0x42c7d5:
  sp=v.reg_read(UC_X86_REG_ESP);motion_calls.append(dict(address=a,args=[vr(sp+4),vr(sp+8)]))
 if a==0x4295ef:v.emu_stop()
 if a in motion_effects:
  sp=v.reg_read(UC_X86_REG_ESP);motion_calls.append(dict(address=a,args=[vr(sp+4+i*4) for i in range(motion_effects[a])]))
  v.reg_write(UC_X86_REG_EAX,100 if a==0x4219e0 else 0)
  if a==0x466fb0:v.mem_write(0x518f78,b'Gary\0')
v.reg_write(UC_X86_REG_FPCW,0x37f);v.reg_write(UC_X86_REG_ESP,0x102000);v.emu_start(0x491380,0x4913bc,count=20000);v.hook_add(UC_HOOK_CODE,motion_hook)
for q,e in rows:
 v.mem_write(0x577f00,bytes(152*256));v.mem_write(0x577f00,bytes(q['finalRecords']));vp(0x59d208,q['searchGlobals']['globalFlags']);vp(0x820454,e['state']['seed']);v.mem_write(0x53e2f8,struct.pack('<160i',*([8]*160)));vp(0x10204c,0)
 v.mem_write(0x570d38,bytes(c[2] for c in q['cells']));v.mem_write(0x53ba00,struct.pack('<2500H',*[c[4] for c in q['cells']]));v.mem_write(0x5608b0,bytes(2500));vp(0x831828,1)
 for i,m in enumerate(q['terrainMetadata']):v.mem_write(0x576dc0+i*48,bytes([m['bounceCoefficient']&255,m['rollCoefficient']&255,m['scatterCoefficient']&255]))
 v.mem_write(0x574500,bytes(q['finalHoles']));v.mem_write(0x5698c0,bytes(184*32));v.mem_write(0x53d934,bytes(2500));v.mem_write(0x583430,bytes(44));v.mem_write(0x582c60,bytes(40));v.mem_write(0x5842b2,bytes(76*64));v.mem_write(0x568f74,bytes(40));v.mem_write(0x518f78,b'Before\0')
 for i,n in enumerate(q['puttCounts']):vp(0x5698cc+i*184,n)
 for a,n in [(0x542c04,0),(0x542be8,0),(0x570a24,200),(0x5a5784,0),(0x4c1dfc,-1),(0x5a8714,0),(0x5672a0,19),(0x5a4440,0),(0x820344,1),(0x542bd4,0),(0x56bc00,0),(0x542be4,0),(0x4c1848,0)]:vp(a,n)
 vp(0x102010,0);vp(0x102014,q['startTerrain']);vp(0x102018,vr(0x577fdc)>>10);vp(0x102020,vr(0x577fe0)>>10);vp(0x102030,-1)
 animation_ticks=0;motion_calls=[];motion_done=False;terminal=None
 vp(0x599a9c,0);vp(0x568f6c,0);v.reg_write(UC_X86_REG_ESP,0x102000);v.reg_write(UC_X86_REG_EBP,0);v.emu_start(0x42b825,0x400fff,count=30000)
 assert v.mem_read(0x577f25,1)[0]==16
 while v.mem_read(0x577f28,1)[0]!=2:
  animation_ticks+=1;assert animation_ticks<=10, (q['scenario'], q['finalRecords'][0x24:0x29], list(v.mem_read(0x577f24,5)), q['searchGlobals']['globalFlags'])
  vp(0x102038,v.mem_read(0x577f26,1)[0]);v.reg_write(UC_X86_REG_ESP,0x102000);v.reg_write(UC_X86_REG_EBP,0);v.reg_write(UC_X86_REG_EDI,0);v.emu_start(0x414f79,0x41503b,count=1000)
 for swing_ticks in range(1,100):
  vp(0x102018,vr(0x577fdc)>>10);vp(0x102020,vr(0x577fe0)>>10);vp(0x102028,0);vp(0x102014,v.mem_read(0x570d38+(vr(0x577fdc)>>10)*50+(vr(0x577fe0)>>10),1)[0]);vp(0x831828,swing_ticks)
  v.reg_write(UC_X86_REG_ESP,0x102000);v.reg_write(UC_X86_REG_EBP,0);v.reg_write(UC_X86_REG_EAX,v.mem_read(0x577f28,1)[0]);v.emu_start(0x42bb3b,0x400fff,count=10000)
  if motion_done:break
 assert motion_done
 q['capturedTarget']=motion_done and terminal=='0x42c3f4' and [vr(0x102018),vr(0x102020)]==[q['cup']['x'],q['cup']['z']]
 q['motionExpected']=dict(terminal=terminal,holes=list(v.mem_read(0x574500,20*520)),stats=list(v.mem_read(0x5698c0,32*184)),wear=list(v.mem_read(0x53d934,2500)),record=list(v.mem_read(0x583430,44)),cashTotal=vr(0x570a24),periods=list(v.mem_read(0x582c60,40)),notices=list(v.mem_read(0x5842b2,64*76)),settlementValue=vr(0x4c1848),periodIndex=struct.unpack('<h',v.mem_read(0x5a5784,2))[0],recordHolder=vr(0x4c1dfc),presentationMode=vr(0x5a8714),selectionState=vr(0x5a4440),scoreList=list(struct.unpack('<10i',v.mem_read(0x568f74,40))),actors=list(v.mem_read(0x577f00,512)),seed=vr(0x820454)&0xffffffff,calls=motion_calls,animationTicks=animation_ticks,swingTicks=swing_ticks)

print('Native outcomes:', {kind:sum(q['motionExpected']['terminal']==kind for q,e in rows) for kind in ['0x42ca9d','0x42c3f4']}, flush=True)
assert sum(q['capturedTarget'] for q,e in rows)==8
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalAutomaticPlanner}=await import(PLANNER),{searchLaunchMap}=await import(MAP);
const {originalShotPreparation}=await import(PREPARATION);const {originalGolferEffects}=await import(DISPATCHER);function integratedPreparation(snapshot,context,dependencies,effects){let planner;const dispatch=originalGolferEffects(undefined,()=>({context,dependencies,effects}));const prepared=originalShotPreparation(snapshot,(event,state)=>{const result=dispatch(event,state);planner=result.planner;return result;});return {...prepared,planner};}const {originalPlannedShotPreparation}=await import(EFFECT);const {originalPlannerInput}=await import(INPUT);const {originalPlannerActor}=await import(ACTOR);const {applyOriginalPlannerResult}=await import(RESULT);

const {originalActorMotionContinuation}=await import(CONTINUATION);const {originalActorMotionContext}=await import(CONTEXT),{originalMotionSample}=await import(SAMPLE),{originalActorGroundDecision}=await import(DECISION),{originalActorGroundReflection}=await import(REFLECTION),{originalPostContactMotion}=await import(CONTACT);
function advance(action,resolve){const r=originalActorMotionContinuation({...action,visualSlot:-1},resolve);return {...r,terminal:r.accounted?(r.captured?'0x42c3f4':'0x42ca9d'):null};}
const {originalSwingClearance}=await import(CLEARANCE);const {originalActorSwingAnimation}=await import(ANIMATION),{originalSwingProgress}=await import(SWING),{originalActorPositionStep}=await import(POSITION);
function verifyMovement(snapshot,q){let state={...structuredClone(snapshot),ballTerrain:q.startTerrain,visualSlot:-1,worldFlags:snapshot.globalFlags,terrain:Uint8Array.from(q.cells.map(c=>c[2])),edgeMasks:new Uint8Array(2500),metadata:q.terrainMetadata,luck:5,variant:0},frameIndex=0,animationTicks=0,swingTicks=0;state.actors=Array.from({length:152},(_,i)=>state.actors[i]||new Uint8Array(256));state.holeRecords=state.holes;Object.assign(state,{tileWear:new Uint8Array(2500),completionRecords:[new Uint8Array(44)],financialPeriods:[new Uint8Array(20),new Uint8Array(20)],completionNotices:Array.from({length:64},()=>new Uint8Array(76)),settlementMode:0,settlementBonus:0,cashTotal:200,periodIndex:0,recordHolder:-1,presentationMode:0,courseHoleCount:19,selectionState:0,difficulty:1,performanceBonus:0,secondaryBalance:0,adjustmentSetting:0,settlementValue:0,sourceText:'Before',scoreList:new Int32Array(10)});state=originalSwingClearance({...state,swingOverride:0,roundClock:0}).state;let terminal=null;const calls=[],resolve=(e,state)=>{if(e.address===0x466fb0)state.sourceText='Gary';return {state,result:100,value:e.address===0x40bc90?state.terrain[(e.args[0]>>10)*50+(e.args[1]>>10)]:0};};while(state.actors[0][0x28]!==2){if(++animationTicks>10)throw Error('Animation timeout');const a=originalActorSwingAnimation(state,{animationDirection:0,frameCounts:Array(160).fill(8),previousFrame:state.actors[0][0x26],frameIndex});state=a.state;frameIndex=a.frameIndex;}for(swingTicks=1;swingTicks<100;swingTicks++){state.phaseCounter=swingTicks;const av=new DataView(state.actors[0].buffer);state.ballTerrain=state.terrain[(av.getInt32(0xdc,true)>>10)*50+(av.getInt32(0xe0,true)>>10)];const a=originalSwingProgress(state,resolve);state=a.state;const m=advance(a,resolve);state=m.state;calls.push(...m.calls);terminal=m.terminal;if(terminal)break;}const actual={terminal,holes:state.holeRecords.flatMap(b=>Array.from(b)),stats:state.statRecords.flatMap(b=>Array.from(b)),wear:Array.from(state.tileWear),record:Array.from(state.completionRecords[0]),cashTotal:state.cashTotal,periods:state.financialPeriods.flatMap(b=>Array.from(b)),notices:state.completionNotices.flatMap(b=>Array.from(b)),settlementValue:state.settlementValue,periodIndex:state.periodIndex,recordHolder:state.recordHolder,presentationMode:state.presentationMode,selectionState:state.selectionState,scoreList:Array.from(state.scoreList),actors:state.actors.slice(0,2).flatMap(b=>Array.from(b)),seed:state.seed,calls,animationTicks,swingTicks};if(!isDeepStrictEqual(actual,q.motionExpected)){console.error(JSON.stringify({scenario:q.scenario,keys:Object.keys(actual).filter(k=>!isDeepStrictEqual(actual[k],q.motionExpected[k])),diff:actual.actors.flatMap((v,i)=>v===q.motionExpected.actors[i]?[]:[[i,v,q.motionExpected.actors[i]]]),ticks:[swingTicks,q.motionExpected.swingTicks],terminal:[terminal,q.motionExpected.terminal]}));process.exit(1);}}

for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const snapshot={...q.initialSearchGlobals,statRecords:Array.from({length:32},()=>new Uint8Array(184)),shotStatCounts:new Uint32Array(32),holeStrokeTotals:Uint16Array.from({length:20},(_,i)=>q.initialHoles[i*520+0x162]|q.initialHoles[i*520+0x163]<<8),tileFlags:Uint16Array.from(q.cells.map(c=>c[4])),metadata:Array.from({length:23},(_,i)=>({...q.terrainMetadata[i],shotClass:99,scatterCoefficient:99})),actorId:0,actors:[Uint8Array.from(q.initialRecords.slice(0,256)),Uint8Array.from(q.initialRecords.slice(256))],holes:Array.from({length:20},(_,i)=>Uint8Array.from(q.initialHoles.slice(i*520,(i+1)*520))),seed:q.automatic.state.seed,strengthCache:q.automatic.state.cache,diagnostics:q.automatic.state.diagnostics,landing:q.automatic.state.landing};const preparation=integratedPreparation({...snapshot,updateScratch:0,ballTerrain:q.startTerrain,ballTile:{x:q.origin.x>>10,z:q.origin.z>>10}},{...q.automatic,position:{x:-999,z:-999},planning:{...q.automatic.planning,cup:{x:-1,z:-1}},rollCoefficient:0},{map:searchLaunchMap(q),physical:{luck:5},searchState:q.outerSearchState,score:0,scoreAt:(x,z)=>q.aimScores[x*50+z]},{emit:(_event,state)=>state});const {searched,...a}=preparation.planner;const actors=[Uint8Array.from(q.initialRecords.slice(0,256)),Uint8Array.from(q.initialRecords.slice(256))],input={actors,actorId:0,holes:Array.from({length:20},(_,i)=>Uint8Array.from(q.initialHoles.slice(i*520,(i+1)*520))),metadata:Array.from({length:23},(_,i)=>({...q.terrainMetadata[i],shotClass:99,scatterCoefficient:99}))};if(!isDeepStrictEqual(originalPlannerActor(input),q.automatic.state.actor))throw Error('Planner actor input differs from native');const applied=preparation.state;verifyMovement(applied,q);if(!isDeepStrictEqual(Array.from(applied.shotStatCounts),q.puttCounts))throw Error('Putt counts differ');const searchGlobals=Object.fromEntries(Object.keys(q.searchGlobals).map(k=>[k,applied[k]]));if(!isDeepStrictEqual(searchGlobals,q.searchGlobals))throw Error(JSON.stringify({actual:searchGlobals,expected:q.searchGlobals}));const shared={seed:applied.seed,cache:applied.strengthCache,diagnostics:applied.diagnostics,landing:applied.landing,holes:applied.holes.flatMap(b=>Array.from(b)),overrides:[17,20].map(code=>({code,shotClass:applied.metadata[code].shotClass}))};const expectedShared={seed:e.state.seed,cache:e.state.cache,diagnostics:e.state.diagnostics,landing:e.state.landing,holes:q.finalHoles,overrides:e.shotClassOverrides};if(!isDeepStrictEqual(shared,expectedShared))throw Error('Planner shared state differs from native');const expected=Uint8Array.from(q.finalRecords);const diff=applied.actors.flatMap(b=>Array.from(b)).flatMap((v,i)=>v===expected[i]?[]:[[i,v,expected[i]]]);if(diff.length)throw Error(JSON.stringify({scenario:q.scenario,recordDiff:diff}));if(!isDeepStrictEqual(a,e)){
const diffs=[];function walk(a,b,p=''){if(isDeepStrictEqual(a,b))return;if(a&&b&&typeof a==='object'&&typeof b==='object')for(const k of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[k],b[k],p+'.'+k);else if(diffs.length<20)diffs.push({p,a,b});}walk(a,e);throw Error(JSON.stringify({scenario:q.scenario,mode:q.mode,diffs}));}}
console.log('36 native planned putts with original ground coefficients match through shot accounting and cup completion.');
""".replace('PREPARATION',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-shot-preparation.js').as_uri())).replace('EFFECT',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-planner-effect.js').as_uri())).replace('INPUT',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-planner-input.js').as_uri())).replace('RESULT',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-planner-result.js').as_uri())).replace('ACTOR',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-planner-actor.js').as_uri())).replace('PLANNER',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-automatic-planner.js').as_uri())).replace('MAP',json.dumps((root/'simgolf-reborn/scene/tests/helpers/original-search-launch.js').as_uri()))

for key,name in [('CONTEXT','original-actor-motion-context'),('SAMPLE','original-motion-sample'),('DECISION','original-actor-ground-decision'),('REFLECTION','original-actor-ground-reflection'),('CONTACT','original-post-contact-motion')]:script=script.replace(key,json.dumps((root/f'simgolf-reborn/scene/src/simulation/{name}.js').as_uri()))
script=script.replace('DISPATCHER',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-golfer-effects.js').as_uri())).replace('CONTINUATION',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-actor-motion-continuation.js').as_uri())).replace('CLEARANCE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-swing-clearance.js').as_uri())).replace('ANIMATION',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-swing-animation.js').as_uri())).replace('SWING',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-swing-progress.js').as_uri())).replace('POSITION',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-actor-position-step.js').as_uri()))
result=subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True);raise SystemExit(result.returncode)
