"""Uninterrupted original automatic middle, including scenery/putts/reactions."""
from pathlib import Path
# Reuse emulator initialization and height/RNG hooks; do not run its fixture loop.
setup=Path(__file__).with_name('verify-original-auto-scenery.py')
exec(compile(setup.read_text().split('rng=random.Random(2002);rows=[]')[0],str(setup),'exec'))
from_entry=True
from_target='--from-target' in sys.argv or from_entry
from_assessment='--from-assessment' in sys.argv or from_target
from unicorn.x86_const import UC_X86_REG_EDI
with_tail='--with-tail' in sys.argv or from_assessment
for a,n in [(0x4235c0,0x2553),(0x4219e0,0x168),(0x466ba0,0x10e),(0x421870,0x167),(0x466ea0,0x22),(0x46c140,0x2c),(0x466a00,0x50),(0x405710,0x4e)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_write(0x4672d0,b'\xc3')
events=[];middle_references={};entry_setup={}
byte_fields={'marker':0x577f82,'reaction':0x577f8c,'actorClass':0x577f20,'hole':0x577f29,'shotCounter':0x577f2a,'skillMask':0x577f21,'club':0x577f24,'elevationCounter':0x577f23}
word_fields={'stateCode':0x577fb4,'profileIndex':0x577fbe,'conditionFlags':0x577f90,'usedClubs':0x577fa8}
def remarks(u,a,size,data):
 global middle_references,draws,entry_setup
 if from_entry and a==0x42365d:
  sp=u.reg_read(UC_X86_REG_ESP)
  entry_setup=dict(range=read(sp+0x30),originTile=dict(x=read(sp+0x34),z=read(sp+0x40)),originIndex=read(sp+0x50),
   terrainCode=read(sp+0x14),obstacleIndex=read(0x4c1fbc),shotClassOverrides=[dict(code=c,shotClass=u.mem_read(0x576dc2+c*48,1)[0]) for c in [17,20]] if current['state']['actor']['actorFlags']&1 else [])
 if from_assessment and a==0x424988:draws=0
 if a==0x425372:
  sp=u.reg_read(UC_X86_REG_ESP)
  middle_references=dict(scannedTile=read(sp+0x38),sceneryTile=read(sp+0x48),namedReference=read(sp+0x1c),pathHeading=read(sp+0x44))
 if a==0x4672d0:
  sp=u.reg_read(UC_X86_REG_ESP);who=read(sp+4);events.append(dict(actorId=who,kind=read(sp+8),value=read(sp+12)))
  current.setdefault('reactionSnapshots',[]).append(dict(actor={**{name:u.mem_read(addr,1)[0] for name,addr in byte_fields.items()},**{name:struct.unpack('<H',u.mem_read(addr,2))[0] for name,addr in word_fields.items()},'recoveryValue':u.mem_read(0x578000,1)[0],'actorFlags':read(0x577f18)&0xffffffff,'angularOffset':read(0x577ff4),'target':dict(x=read(0x577fd4),z=read(0x577fd8))},seed=read(0x820454)&0xffffffff,speed=read(0x577fec),heading=read(0x577fe8)&0xffffffff,verticalSpeed=read(0x577ff0),holeCounter=read(0x574524+current['state']['actor']['hole']*520),partner=dict(actorClass=u.mem_read(0x578020,1)[0],reaction=u.mem_read(0x57808c,1)[0])))
  if current['effect']=='marker':
   address=0x577f82+who*256;u.mem_write(address,bytes([(u.mem_read(address,1)[0]+1)&255]))
  if current['effect']=='reaction':u.mem_write(0x577f8c+who*256,b'\x01')
u.hook_add(UC_HOOK_CODE,remarks)
def terrain(x,z,target,target_code):
 index=x*50+z
 if index<0 or index>=2500:return 0
 x=index//50;z=index%50
 if dict(x=x,z=z)==target:return target_code
 return 3 if (x-z)%7==0 else [2,19,21,22][(x+z)%4]
def run_middle(q):
 global current,draws,events
 current=q;draws=0;events=[];sp=0x102000;s=q['state'];actor=s['actor']
 for name,a in byte_fields.items():u.mem_write(a,bytes([actor[name]]))
 for name,a in word_fields.items():u.mem_write(a,struct.pack('<H',actor[name]))
 for name in ['actorClass','reaction']:u.mem_write(byte_fields[name]+256,bytes([s['partner'][name]]))
 u.mem_write(0x577f82+256,b'\x00');u.mem_write(0x577faa,struct.pack('<h',1));u.mem_write(0x577fbe+256,struct.pack('<h',q['otherProfileIndex']))
 for index,value in enumerate(q['profileBytes']):u.mem_write(0x4d5061+index*560,bytes([value]))
 u.mem_write(0x583446+actor['profileIndex']*44+actor['hole'],bytes([q['profileHoleMark']]))
 for a,v in [(0x577f08,q['position']['x']),(0x577f0c,q['position']['z']),(0x577fd4,actor['target']['x']),(0x577fd8,actor['target']['z']),
  (0x577fe8,q['heading']),(0x577fec,s['speed']),(0x577ff4,actor['angularOffset']),(0x577f18,actor['actorFlags']),
  (0x820454,s['seed']),(0x820344,q['conditionLevel']),(0x5a872c,q['followupFlag']),(0x5a5b88,s['diagnostics']),
  (0x574524+actor['hole']*520,s['holeCounter']),(0x5746fc+actor['hole']*520,q['holeRecord']),
  (sp+0xb28,-1),(sp+0xb20,0),(sp+0xb24,q['mode']),(sp+0xb30,q['curveArgument']),
  (sp+0x34,q['origin']['x']),(sp+0x40,q['origin']['z']),(sp+0x10,q['distance']),(sp+0x14,q['terrainCode']),
  (sp+0x38,s['scannedTile']),(sp+0x48,s['sceneryTile']),(sp+0x1c,s['namedReference']),(sp+0x44,s['pathHeading']),
  (sp+0x20,0),(sp+0x24,q['aimHeading']),(sp+0x4c,q['pathHeading']),(sp+0x3c,q['cueValue']),(sp+0x50,q['origin']['x']*50+q['origin']['z'])]:write(a,v)
 for index,e in enumerate(s['cache']['entries']):
  write(0x5a3200+index*4,e['distance']);write(0x567278+index*4,e['verticalSpeed']);write(0x53ec30+index*4,e['speed'])
 write(0x5a8728,s['cache']['next']);u.mem_write(0x576df1,bytes([q['rollCoefficient']]))
 if with_tail:
  for a,v in [(0x577ff0,s['verticalSpeed']),(sp+0x2c,q['referenceSpeed']),(sp+0x18,q['modifier']),
   (0x5a4440,0 if q['activeActor'] else 999),(0x5a3228,q['stateFlags']),(0x5a870c,q['driftMode'])]:write(a,v)
  u.mem_write(0x5a1f30,bytes([q['variant']]));u.mem_write(0x578000,bytes([actor['recoveryValue']]))
 u.mem_write(0x570d38,bytes([terrain(x,z,actor['target'],q['targetTerrainCode']) for x in range(50) for z in range(50)]))
 if 'originTerrainCode' in q:u.mem_write(0x570d38+q['origin']['x']*50+q['origin']['z'],bytes([q['originTerrainCode']]))
 marks=[0x100 if (x+z)%6==0 else 0 for x in range(50) for z in range(50)];marks[q['origin']['x']*50+q['origin']['z']]=q['originFlags']
 u.mem_write(0x53ba00,struct.pack('<2500H',*marks))
 for code in [0,1,2,3,19,21,22]:
  u.mem_write(0x576dc2+code*48,bytes([1 if code==3 else 2 if code==19 else 0]));u.mem_write(0x576dc6+code*48,bytes([13 if code==3 else 0]));u.mem_write(0x576dc7+code*48,bytes([16 if code in [21,22] else 0]))
 if with_tail:
  for code,value in zip([17,20],q['restorationClasses']):u.mem_write(0x576dc2+code*48,bytes([value]))
 for code,size in [(4,2),(5,3),(6,1),(7,2)]:u.mem_write(0x4c16b8+code*20,bytes([size]));write(0x5a7680+code*4,3 if code==6 else 9)
 records=[dict(type=-1 if i%5==0 else q['record']['type'] if i%3==0 else 6 if i%2 else 7,x=(i%16)*3,z=(i//16)*3,value=q['record']['value']) for i in range(256)]
 for index,r in [(-1,dict(q['missingRecord'],x=0,z=0)),*enumerate(records)]:u.mem_write(0x58a708+index*16,struct.pack('<hhh',r['type'],r['x'],r['z']));write(0x58a710+index*16,r['value'])
 if from_assessment:
  p=q['planning']
  for a,v in [(sp+0x30,p['range']),(sp+0xb24,int(p['explicitTarget'])),(0x58dd80,p['mode']),
   (0x577fdc,p['x']),(0x577fe0,p['z']),(0x59d208,p['worldFlags']),(0x542bc8,p['difficulty']),(0x542bd0,p['accuracySetting']),
   (0x574518+actor['hole']*520,actor['target']['x']),(0x57451c+actor['hole']*520,actor['target']['z']),
   (sp+0x3c,p['dominantCode']),(sp+0x4c,p['dominantDirection']),(sp+0x44,p['sampleX'])]:write(a,v)
  for off,key in [(0x3e,'attitude'),(0x1e,'abilityFlags'),(0xfc,'abilityValue'),(0xfa,'driverValue'),(0xfb,'ironValue'),(0xfd,'drawValue'),(0xfe,'fadeValue'),(0xff,'backspinValue')]:u.mem_write(0x577f00+off,bytes([p[key]&255]))
  u.mem_write(0x5682dc+actor['target']['x']*50+actor['target']['z'],bytes([p['targetFlags']]))
  for index,value in enumerate(p['directions']):write(sp+0xd8+index*4,value)
 if from_target:
  write(0x5a7270,s['landing']['x']);write(0x5a7278,s['landing']['z'])
  u.reg_write(UC_X86_REG_EAX,int(p['explicitTarget']));u.reg_write(UC_X86_REG_EDI,actor['hole'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp)
 if from_entry:
  r=p['rangeInput']
  for off,key in [(0xc2,'level'),(0xf8,'power'),(0xf9,'longDrive'),(0x3e,'boost')]:u.mem_write(0x577f00+off,bytes([r[key]&255]))
  write(0x542bd8,r['lengthBonus']);write(0x53ce64,p['obstacleCount'])
  write(0x400104,q['terrainCode']);u.mem_write(0x40bc90,b'\xa1'+struct.pack('<I',0x400104)+b'\xc3')
  u.reg_write(UC_X86_REG_ESP,sp+0xb1c)
 stop=0x425aca if with_tail else 0x425372
 u.emu_start(0x4235c0 if from_entry else 0x42365d if from_target else 0x423b66 if from_assessment else 0x424988,stop,count=1000000);assert u.reg_read(UC_X86_REG_EIP)==stop
 result_actor={name:u.mem_read(a,1)[0] for name,a in byte_fields.items()}
 result_actor.update({name:struct.unpack('<H',u.mem_read(a,2))[0] for name,a in word_fields.items()})
 result_actor.update(actorFlags=read(0x577f18)&0xffffffff,angularOffset=read(0x577ff4),target=actor['target'])
 cache=dict(next=read(0x5a8728),entries=[dict(distance=read(0x5a3200+i*4),verticalSpeed=read(0x567278+i*4),speed=read(0x53ec30+i*4)) for i in range(10)])
 state=dict(actor=result_actor,partner={name:u.mem_read(byte_fields[name]+256,1)[0] for name in ['actorClass','reaction']},seed=read(0x820454)&0xffffffff,cache=cache,speed=read(0x577fec),diagnostics=read(0x5a5b88)&0xffffffff,holeCounter=read(0x574524+actor['hole']*520),scannedTile=read(sp+0x38),sceneryTile=read(sp+0x48),namedReference=read(sp+0x1c),pathHeading=read(sp+0x44))
 if with_tail:
  result_actor['recoveryValue']=u.mem_read(0x578000,1)[0]
  result_actor['stateCode']=struct.unpack('<h',u.mem_read(0x577fb4,2))[0]
  state.update(middle_references,verticalSpeed=read(0x577ff0),heading=read(0x577fe8)&0xffffffff,lie=read(sp+0x14))
 result=dict(state=state,events=events,randomDraws=draws,samples=read(sp+0x20))
 if from_assessment:
  result['postPreparationDraws']=result.pop('randomDraws')
  if result_actor['club']==13:result['samples']=0
 if from_target:state['landing']=dict(x=read(0x5a7270),z=read(0x5a7278))
 if with_tail:result['shotClassOverrides']=[dict(code=code,shotClass=u.mem_read(0x576dc2+code*48,1)[0]) for code in [17,20]]
 if from_entry:result['setup']=entry_setup
 return result
rng=random.Random(2002);rows=[]
for i in range(240):
 origin=dict(x=24+i%2,z=25);position=dict(x=origin['x']*1024+512,z=26112)
 actor=dict(marker=2,reaction=int(i%17==0),actorClass=int(i%11==0),hole=2+i%4,shotCounter=i%4,skillMask=i%8,club=13 if i%3==0 else 4,elevationCounter=i%35,stateCode=4 if i%5==0 else 0,profileIndex=i%4,conditionFlags=rng.randrange(65536),usedClubs=i%2,actorFlags=rng.randrange(256),angularOffset=rng.randrange(-3000000,3000001),target=dict(x=30,z=25))
 q=dict(actorId=0,position=position,origin=origin,heading=rng.randrange(2**32),distance=10+i%140,conditionLevel=i%4,heightBase=[-4,0,3,8][i%4],targetTerrainCode=1 if i%2 else 22,originFlags=0x800 if i%7==0 else 0,followupFlag=i%2,mode=int(i%13==0),curveArgument=[-1,0,1][i%3],aimHeading=i%8,pathHeading=(i+3)%8,cueValue=1234,holeRecord=i%9,profileHoleMark=i%2,otherProfileIndex=(i+1)%4,profileBytes=[0,5,128,129],effect=['none','marker','reaction'][i%3],rollCoefficient=3,record=dict(type=4 if i%2 else 5,value=16),missingRecord=dict(type=4,value=8))
 q['terrainCode']=terrain(origin['x'],origin['z'],actor['target'],q['targetTerrainCode'])
 q['state']=dict(actor=actor,partner=dict(actorClass=0,reaction=0),seed=rng.randrange(2**32),speed=1000,cache=dict(next=0,entries=[dict(distance=0,verticalSpeed=0,speed=0) for _ in range(10)]),diagnostics=i%8,holeCounter=i,scannedTile=0,sceneryTile=0,namedReference=0,pathHeading=7)
 if i%20==19:
  actor.update(hole=4,shotCounter=3,actorClass=0,reaction=0,profileIndex=0)
  q.update(otherProfileIndex=1,effect='none',heightBase=-4)
 if with_tail:
  actor['recoveryValue']=i%40
  q['state'].update(verticalSpeed=500,heading=q['heading'])
  q.update(referenceSpeed=1800,modifier=i%20-5,activeActor=bool(i%2),variant=i%4,stateFlags=i%4,driftMode=i%4)
  q['restorationClasses']=[i%7,32]
 if from_assessment:
  q['mode']=0
  if i%12==0:q['originTerrainCode']=q['terrainCode']=1;actor['actorFlags']&=~1
  q['planning']=dict(plannerArgument=-1,x=position['x'],z=position['z'],distance=q['distance'],range=200,explicitTarget=False,mode=0,
   heading=q['heading'],curve=q['curveArgument'],globalFlags=q['stateFlags'],worldFlags=0,difficulty=1,accuracySetting=1,level=q['conditionLevel'],
   driftMode=q['driftMode'],activeActor=q['activeActor'],variant=q['variant'],attitude=0,abilityFlags=0,abilityValue=2,
   driverValue=3,ironValue=3,drawValue=2,fadeValue=2,backspinValue=4,targetFlags=0,directions=[0]*32,dominantCode=0,dominantDirection=0,sampleX=0,sampleZ=0)
 if from_target:
  explicit=i%3==0
  actor['actorFlags']=(actor['actorFlags']&~1)|0x10000000
  actor['skillMask']&=~4
  if not explicit or q.get('originTerrainCode')==1:actor['target']=dict(x=origin['x']+1+i%2,z=origin['z'])
  q['planning'].update(explicitTarget=explicit,mode=i%4,cup=dict(actor['target']))
  q['state']['landing']=dict(x=123,z=456)
 if from_entry:
  q['planning'].update(obstacleCount=0,rangeInput=dict(difficulty=q['conditionLevel'],level=i%5,power=i%12,longDrive=i%10,
   boost=0,lengthBonus=i%3,abilityFlags=q['planning']['abilityFlags']))
  if i%8==1:
   q['originTerrainCode']=q['terrainCode']=17
   actor['actorFlags']|=1
   actor['target']=dict(x=origin['x']+1,z=origin['z'])
   q['planning']['cup']=dict(actor['target'])
 rows.append([q,run_middle(q)])
name='original-auto-launch-finish' if with_tail else 'original-auto-launch-middle'
if from_assessment:name='original-assessed-automatic-launch'
print('Native reaction boundaries:',sum(len(q.get('reactionSnapshots',[])) for q,e in rows),flush=True)
module=(root/f'simgolf-reborn/scene/src/simulation/{name}.js').as_uri()
adapter=(root/'simgolf-reborn/scene/tests/helpers/original-auto-middle-map.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const module=await import(MODULE);const run=FROM_ENTRY?module.originalDirectAutomaticPlanner:FROM_TARGET?module.originalDirectAutomaticLaunch:module.originalAssessedAutomaticLaunch??module.originalAutoLaunchFinish??module.originalAutoLaunchMiddle;const {middleMap,middleEffects}=await import(ADAPTER);const {originalPlannerReactionWorld,originalPlannerAfterReaction}=await import(BRIDGE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const snapshots=[],effects=middleEffects(q);let world={actorId:0,actors:[new Uint8Array(256),new Uint8Array(256)],holes:Array.from({length:20},()=>new Uint8Array(520))};new DataView(world.actors[0].buffer).setInt16(0xaa,1,true);const a=run(q,middleMap(q),{emit:(event,state)=>{world=originalPlannerReactionWorld(world,state,0,q.state.actor.hole);state=originalPlannerAfterReaction(state,world,0,q.state.actor.hole);const expected=q.reactionSnapshots[snapshots.length];snapshots.push({actor:Object.fromEntries(Object.keys(expected.actor).map(k=>[k,state.actor[k]])),seed:state.seed,speed:state.speed,heading:state.heading,verticalSpeed:state.verticalSpeed,holeCounter:state.holeCounter,partner:structuredClone(state.partner)});const actor=world.actors[event.actorId];if(q.effect==='marker')actor[0x82]=(actor[0x82]+1)&255;if(q.effect==='reaction')actor[0x8c]=1;return originalPlannerAfterReaction(state,world,0,q.state.actor.hole);}});if(!isDeepStrictEqual(snapshots,q.reactionSnapshots||[])){console.error(JSON.stringify({diff:snapshots.map((a,i)=>({actual:a,expected:q.reactionSnapshots[i]})).filter(r=>!isDeepStrictEqual(r.actual,r.expected)).slice(0,1)}));process.exit(1);}if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('240 uninterrupted '+LABEL+' runs match complete state, events, cache and RNG.');
""".replace('FROM_ENTRY',json.dumps(from_entry)).replace('FROM_TARGET',json.dumps(from_target)).replace('MODULE',json.dumps(module)).replace('ADAPTER',json.dumps(adapter)).replace('LABEL',json.dumps('original-direct-automatic-planner' if from_entry else 'original-direct-automatic-launch' if from_target else name))
script=script.replace('BRIDGE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-planner-reaction-world.js').as_uri()))
result=subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True);raise SystemExit(result.returncode)
