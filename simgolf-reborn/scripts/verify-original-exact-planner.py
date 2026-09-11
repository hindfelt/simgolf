"""Verify original full entry-to-launch exact-point path; raw surface and height reads supplied."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EBP,UC_X86_REG_FPCW,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x4235c0,0x2553),(0x4219e0,0x168),(0x466ba0,0x10e),(0x40bc50,0x33),(0x4c1870,64),(0x466a00,0x50),(0x421870,0x167),(0x405710,0x4e),(0x45ba70,0x60),(0x4a57a0,0x27),(0x4b9800,8)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_map(0x839000,0x1000)
for a,n in [(0x491380,0x3c),(0x4913e0,0x10b),(0x466b40,0x59),(0x4baa48,16)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
u.mem_map(0x820000,0x1000)
def write(a,v,n=4):u.mem_write(a,(v&((1<<(n*8))-1)).to_bytes(n,'little'))
from unicorn import UC_HOOK_CODE
reference_heading=0;variation=0;current={};assessment={};adjusted=0;ray_draws=0;setup={}
def hook(u,a,n,d):
 global reference_heading,variation,assessment,adjusted,ray_draws,setup
 if a==0x40bc90:
  sp=u.reg_read(UC_X86_REG_ESP);ret=struct.unpack('<I',u.mem_read(sp,4))[0]
  v=current['terrain'][(current['x']>>10)*50+(current['z']>>10)]
  u.reg_write(UC_X86_REG_EAX,v);u.reg_write(UC_X86_REG_ESP,sp+4);u.reg_write(UC_X86_REG_EIP,ret)
 if a==0x42365d:
  sp=u.reg_read(UC_X86_REG_ESP)
  def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
  setup=dict(range=read(sp+0x30),originTile=dict(x=read(sp+0x34),z=read(sp+0x40)),originIndex=read(sp+0x50),terrainCode=read(sp+0x14),obstacleIndex=read(0x4c1fbc),shotClassOverrides=[dict(code=c,shotClass=u.mem_read(0x576dc2+c*48,1)[0]) for c in [17,20]] if current['actorFlags']&1 else [])
 if a==0x40be60:
  sp=u.reg_read(UC_X86_REG_ESP);ret,x,z=struct.unpack('<3I',u.mem_read(sp,12));v=current['heights'][x*50+z]
  u.reg_write(UC_X86_REG_EAX,v&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4);u.reg_write(UC_X86_REG_EIP,ret)
 if a==0x423b66:
  sp=u.reg_read(UC_X86_REG_ESP);current['distance']=struct.unpack('<i',u.mem_read(sp+0x10,4))[0]
 if a==0x423dd7:
  sp=u.reg_read(UC_X86_REG_ESP)
  def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
  assessment=dict(span=read(sp+0x2c),totals=list(struct.unpack('<32i',u.mem_read(sp+0x58,128))),directions=list(struct.unpack('<32i',u.mem_read(sp+0xd8,128))),accumulated=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EBX)))[0],obstacles=read(sp+0x20),markedTerrain=read(sp+0x48),firstWaterIndex=read(sp+0x28),dominantCode=read(sp+0x3c),dominantDirection=read(sp+0x4c),sampleX=read(sp+0x44),sampleZ=read(sp+0x3c) if current['distance']>=25 else current['sampleZ'],seed=read(0x820454)&0xffffffff,draws=ray_draws)
 if a==0x423d34:ray_draws+=1
 if a==0x423ee1:
  sp=u.reg_read(UC_X86_REG_ESP)
  def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
  assessment.update(totals=list(struct.unpack('<32i',u.mem_read(sp+0x58,128))),directions=list(struct.unpack('<32i',u.mem_read(sp+0xd8,128))),dominantCode=read(sp+0x3c),dominantDirection=read(sp+0x4c),rating=u.mem_read(0x577f23,1)[0])
 if a==0x423f48:adjusted=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EBX)))[0]
 if a==0x424697:
  reference_heading=u.reg_read(UC_X86_REG_EBX);variation=u.reg_read(UC_X86_REG_EBP)
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global current,ray_draws
 current=q.copy();ray_draws=0
 sp=0x102000
 write(sp+0x30,q['range']);write(sp+0x14,q['terrainCode']);write(sp+0xb24,int(q['explicitTarget']))
 write(0x58dd80,q['mode']);write(0x577f18,q['actorFlags'])
 write(sp+0x2c,q['assessmentSpan']);write(sp+0xb20,154);write(sp+0xb30,q['curve'])
 for off,key in [(0x20,'actorClass'),(0x21,'skillMask'),(0x3e,'attitude'),(0x1e,'abilityFlags'),(0xfc,'abilityValue'),(0x2a,'shotCounter'),(0xfa,'driverValue'),(0xfb,'ironValue'),(0xfd,'drawValue'),(0xfe,'fadeValue')]:write(0x577f00+off,q[key],1)
 write(0x577fe8,q['heading']);write(0x577f29,0,1);write(0x574518,10);write(0x57451c,10);write(0x5682dc+510,q['targetFlags'],1)
 for address,key in [(0x5a3228,'globalFlags'),(0x59d208,'worldFlags'),(0x542bc8,'difficulty'),(0x542bd0,'accuracySetting'),(0x820344,'level'),(0x820454,'seed'),(0x5a870c,'driftMode')]:write(address,q[key])
 write(0x5a4440,0 if q['activeActor'] else 154)
 write(sp+0xb28,q['plannerArgument']);write(sp+0x50,25*50+25);write(0x53ba00+(25*50+25)*2,q['tileFlags'],2);write(0x578000,q['recoveryValue'],1);write(0x5a1f30,q['variant'],1)
 for i,c in enumerate(q['classes']):write(0x576dc2+(i-1)*48,c,1)
 write(0x577fdc,q['x']);write(0x577fe0,q['z']);write(0x577fd4,10);write(0x577fd8,10)
 write(0x570d38+510,q['targetTerrainCode'],1);write(0x577fff,q['backspinValue'],1);write(sp+0x28,q['firstWaterIndex'])
 for r in range(23,28):
  for c in range(23,28):write(0x570d38+r*50+c,2 if (r+c)%2 else 13,1)
 write(0x576dc6+48*2,0,1);write(0x576dc6+48*13,13,1)
 u.mem_write(0x570d38,bytes(q['terrain']));u.mem_write(0x53ba00,struct.pack('<2500H',*q['marks']))
 for c,k in enumerate(q['kinds']):write(0x576dc6+c*48,k,1)
 write(sp+0x10,q['distance']);write(sp+0x34,q['x']>>10);write(sp+0x40,q['z']>>10)
 write(sp+0x3c,q['dominantCode']);write(sp+0x4c,q['dominantDirection']);write(sp+0x44,q['sampleX'])
 for i,v in enumerate(q['directions']):write(sp+0xd8+i*4,v)
 write(0x577fd4,q['target']['x']);write(0x577fd8,q['target']['z'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBX,q['distance']&0xffffffff)
 write(sp+0xb2c,q['targetZ']);write(0x574518,q['cup']['x']);write(0x57451c,q['cup']['z'])
 u.reg_write(UC_X86_REG_EDI,0);u.reg_write(UC_X86_REG_EAX,int(q['explicitTarget']))
 write(sp+0xb20,0);write(0x577fc2,q['rangeInput']['level'],1);write(0x577ff8,q['rangeInput']['power'],1);write(0x577ff9,q['rangeInput']['longDrive'],1)
 write(0x542bd8,q['rangeInput']['lengthBonus']);write(0x53ce64,q['obstacleCount'])
 u.reg_write(UC_X86_REG_ESP,sp+0xb1c)
 u.emu_start(0x4235c0,0x425ab9,count=100000)
 entries=[dict(distance=struct.unpack('<i',u.mem_read(0x5a3200+j*4,4))[0],verticalSpeed=struct.unpack('<i',u.mem_read(0x567278+j*4,4))[0],speed=struct.unpack('<i',u.mem_read(0x53ec30+j*4,4))[0]) for j in range(10)]
 def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
 return dict(speed=read(0x577fec),verticalSpeed=read(0x577ff0),heading=read(0x577fe8)&0xffffffff,angularOffset=read(0x577ff4),actorFlags=read(0x577f18)&0xffffffff,seed=read(0x820454)&0xffffffff,lie=read(sp+0x14),shotType=struct.unpack('<h',u.mem_read(0x577fb4,2))[0],club=u.mem_read(0x577f24,1)[0],cache=dict(next=read(0x5a8728),entries=entries),assessment=assessment,distance=adjusted,setup=setup)

rng=random.Random(2002);rows=[]
for i in range(1000):
 q=dict(distance=rng.randrange(-100,501),range=rng.randrange(1,331),terrainCode=rng.choice([0,1,2,3,7,13,17]),explicitTarget=bool(rng.randrange(2)),mode=rng.randrange(4),actorFlags=rng.randrange(2))
 q.update(assessmentSpan=max(0,q['distance']//25),curve=rng.choice([-1,0,1]),actorClass=rng.choice([0,1,32,33,64]),skillMask=rng.choice([0,3,7]),attitude=rng.randrange(-4,5),abilityFlags=rng.choice([0,16]),abilityValue=rng.randrange(10),shotCounter=rng.randrange(3),driverValue=rng.randrange(10),ironValue=rng.randrange(10),drawValue=rng.randrange(10),fadeValue=rng.randrange(10),heading=rng.randrange(2**32),targetFlags=rng.choice([0,128]),globalFlags=rng.randrange(2),worldFlags=rng.choice([0,0x200000,0x800000,0xa00000]),difficulty=rng.randrange(4),accuracySetting=rng.randrange(4),level=rng.randrange(4),seed=rng.randrange(2**32),driftMode=rng.randrange(4),activeActor=bool(rng.randrange(2)))
 if i%4==0:q.update(terrainCode=1,distance=rng.randrange(50),actorFlags=0,explicitTarget=False)
 q.update(x=26112,z=26112,firstWaterIndex=rng.randrange(10),backspinValue=rng.randrange(10),shotClass=rng.choice([0,0,1]),targetTerrainCode=rng.choice([1,2]))
 if i%7==0:q.update(distance=100,range=200,terrainCode=2,explicitTarget=True,mode=3,actorFlags=0,skillMask=4,curve=0,shotClass=0,firstWaterIndex=0)
 if i%11==0:q.update(distance=100,range=200,terrainCode=2,explicitTarget=True,mode=4,actorFlags=0,skillMask=4,curve=0,shotClass=0,firstWaterIndex=0)
 q.update(plannerArgument=rng.randrange(50),actorId=154,tileFlags=rng.choice([0,0x800]),variant=rng.randrange(4),recoveryValue=rng.randrange(10),classes=[rng.randrange(-1,4) for _ in range(24)])
 q['classes'][q['terrainCode']+1]=q['shotClass']
 q['stateFlags']=q['globalFlags']
 q.update(distance=rng.randrange(331),target=dict(x=10,z=10),directions=[0]*32,dominantCode=0,dominantDirection=0,sampleX=0,sampleZ=0,
  terrain=[rng.choice([0,1,2,3,7,13,17,20]) for _ in range(2500)],marks=[rng.choice([0,256,2048]) for _ in range(2500)],heights=[rng.randrange(-2,3) for _ in range(2500)],kinds=[rng.choice([0,13]) for _ in range(23)])
 q['terrain'][25*50+25]=q['terrainCode']
 q.update(plannerArgument=q['x']+rng.randrange(-4000,4001),targetZ=q['z']+rng.randrange(-4000,4001),cup=dict(x=10,z=10))
 q.update(actorId=0,obstacleCount=rng.randrange(-2,20),worldFlags=q['worldFlags']|rng.choice([0,32]))
 q['rangeInput']=dict(skillMask=q['skillMask'],difficulty=q['level'],level=rng.randrange(9),shot=q['shotCounter'],professional=q['actorClass']!=0,abilityFlags=q['abilityFlags'],power=rng.randrange(16),longDrive=rng.randrange(16),boost=q['attitude'],lengthBonus=rng.randrange(5))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-exact-planner.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalExactPlanner}=await import(MODULE);
const {originalStrengthCache}=await import(CACHE);let cache=originalStrengthCache();
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const a=originalExactPlanner(q,cache,{terrainAt:(x,z)=>q.terrain[x*50+z],kindAt:c=>q.kinds[c],shotClassAt:lie=>q.classes[lie+1],marksAt:(x,z)=>q.marks[x*50+z],heightAt:(x,z)=>q.heights[x*50+z]});if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q:{distance:q.distance,skillMask:q.skillMask},a,e}));cache=a.cache;}
console.log(`${rows.length} resolved-target launch results and caches match original x86.`);
""".replace('MODULE',json.dumps(module)).replace('CACHE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-strength-search.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-exact-planner.json').write_text(json.dumps(rows[:20],separators=(',',':'))+'\n')
