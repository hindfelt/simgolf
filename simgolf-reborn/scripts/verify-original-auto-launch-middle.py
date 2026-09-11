"""Uninterrupted original automatic middle, including scenery/putts/reactions."""
from pathlib import Path
# Reuse emulator initialization and height/RNG hooks; do not run its fixture loop.
setup=Path(__file__).with_name('verify-original-auto-scenery.py')
exec(compile(setup.read_text().split('rng=random.Random(2002);rows=[]')[0],str(setup),'exec'))
with_tail='--with-tail' in sys.argv
for a,n in [(0x424988,0x118b),(0x421870,0x167),(0x466ea0,0x22),(0x46c140,0x2c),(0x466a00,0x50)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_write(0x4672d0,b'\xc3')
events=[];middle_references={}
byte_fields={'marker':0x577f82,'reaction':0x577f8c,'actorClass':0x577f20,'hole':0x577f29,'shotCounter':0x577f2a,'skillMask':0x577f21,'club':0x577f24,'elevationCounter':0x577f23}
word_fields={'stateCode':0x577fb4,'profileIndex':0x577fbe,'conditionFlags':0x577f90,'usedClubs':0x577fa8}
def remarks(u,a,size,data):
 global middle_references
 if a==0x425372:
  sp=u.reg_read(UC_X86_REG_ESP)
  middle_references=dict(scannedTile=read(sp+0x38),sceneryTile=read(sp+0x48),namedReference=read(sp+0x1c),pathHeading=read(sp+0x44))
 if a==0x4672d0:
  sp=u.reg_read(UC_X86_REG_ESP);who=read(sp+4);events.append(dict(actorId=who,kind=read(sp+8),value=read(sp+12)))
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
 marks=[0x100 if (x+z)%6==0 else 0 for x in range(50) for z in range(50)];marks[q['origin']['x']*50+q['origin']['z']]=q['originFlags']
 u.mem_write(0x53ba00,struct.pack('<2500H',*marks))
 for code in [0,1,2,3,19,21,22]:
  u.mem_write(0x576dc2+code*48,bytes([1 if code==3 else 2 if code==19 else 0]));u.mem_write(0x576dc6+code*48,bytes([13 if code==3 else 0]));u.mem_write(0x576dc7+code*48,bytes([16 if code in [21,22] else 0]))
 for code,size in [(4,2),(5,3),(6,1),(7,2)]:u.mem_write(0x4c16b8+code*20,bytes([size]));write(0x5a7680+code*4,3 if code==6 else 9)
 records=[dict(type=-1 if i%5==0 else q['record']['type'] if i%3==0 else 6 if i%2 else 7,x=(i%16)*3,z=(i//16)*3,value=q['record']['value']) for i in range(256)]
 for index,r in [(-1,dict(q['missingRecord'],x=0,z=0)),*enumerate(records)]:u.mem_write(0x58a708+index*16,struct.pack('<hhh',r['type'],r['x'],r['z']));write(0x58a710+index*16,r['value'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp)
 stop=0x425ab9 if with_tail else 0x425372
 u.emu_start(0x424988,stop,count=1000000);assert u.reg_read(UC_X86_REG_EIP)==stop
 result_actor={name:u.mem_read(a,1)[0] for name,a in byte_fields.items()}
 result_actor.update({name:struct.unpack('<H',u.mem_read(a,2))[0] for name,a in word_fields.items()})
 result_actor.update(actorFlags=read(0x577f18)&0xffffffff,angularOffset=read(0x577ff4),target=actor['target'])
 cache=dict(next=read(0x5a8728),entries=[dict(distance=read(0x5a3200+i*4),verticalSpeed=read(0x567278+i*4),speed=read(0x53ec30+i*4)) for i in range(10)])
 state=dict(actor=result_actor,partner={name:u.mem_read(byte_fields[name]+256,1)[0] for name in ['actorClass','reaction']},seed=read(0x820454)&0xffffffff,cache=cache,speed=read(0x577fec),diagnostics=read(0x5a5b88)&0xffffffff,holeCounter=read(0x574524+actor['hole']*520),scannedTile=read(sp+0x38),sceneryTile=read(sp+0x48),namedReference=read(sp+0x1c),pathHeading=read(sp+0x44))
 if with_tail:
  result_actor['recoveryValue']=u.mem_read(0x578000,1)[0]
  result_actor['stateCode']=struct.unpack('<h',u.mem_read(0x577fb4,2))[0]
  state.update(middle_references,verticalSpeed=read(0x577ff0),heading=read(0x577fe8)&0xffffffff,lie=read(sp+0x14))
 return dict(state=state,events=events,randomDraws=draws,samples=read(sp+0x20))
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
 rows.append([q,run_middle(q)])
name='original-auto-launch-finish' if with_tail else 'original-auto-launch-middle'
module=(root/f'simgolf-reborn/scene/src/simulation/{name}.js').as_uri()
adapter=(root/'simgolf-reborn/scene/tests/helpers/original-auto-middle-map.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const module=await import(MODULE);const run=module.originalAutoLaunchFinish??module.originalAutoLaunchMiddle;const {middleMap,middleEffects}=await import(ADAPTER);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=run(q,middleMap(q),middleEffects(q));if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('240 uninterrupted '+LABEL+' runs match complete state, events, cache and RNG.');
""".replace('MODULE',json.dumps(module)).replace('ADAPTER',json.dumps(adapter)).replace('LABEL',json.dumps(name))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/f'simgolf-reborn/scene/tests/fixtures/{name}.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
