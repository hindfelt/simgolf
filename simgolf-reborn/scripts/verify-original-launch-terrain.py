"""Verify combined original club selection and mixed-club launch core and state ordering."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EBP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x423f48,0xa40),(0x466a00,0x50),(0x421870,0x167),(0x405710,0x4e),(0x45ba70,0x60),(0x4a57a0,0x27),(0x4b9800,8)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_map(0x839000,0x1000)
for a,n in [(0x491380,0x3c),(0x4913e0,0x10b),(0x466b40,0x59),(0x4baa48,16)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
u.mem_map(0x820000,0x1000)
def write(a,v,n=4):u.mem_write(a,(v&((1<<(n*8))-1)).to_bytes(n,'little'))
from unicorn import UC_HOOK_CODE
reference_heading=0;variation=0
def hook(u,a,n,d):
 global reference_heading,variation
 if a==0x424697:
  reference_heading=u.reg_read(UC_X86_REG_EBX);variation=u.reg_read(UC_X86_REG_EBP)
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 sp=0x102000
 write(sp+0x30,q['range']);write(sp+0x14,q['terrainCode']);write(sp+0xb24,int(q['explicitTarget']))
 write(0x58dd80,q['mode']);write(0x577f18,q['actorFlags'])
 write(sp+0x2c,q['assessmentSpan']);write(sp+0xb20,154);write(sp+0xb30,q['curve'])
 for off,key in [(0x20,'actorClass'),(0x21,'skillMask'),(0x3e,'attitude'),(0x1e,'abilityFlags'),(0xfc,'abilityValue'),(0x2a,'shotCounter'),(0xfa,'driverValue'),(0xfb,'ironValue'),(0xfd,'drawValue'),(0xfe,'fadeValue')]:write(0x577f00+off,q[key],1)
 write(0x577fe8,q['heading']);write(0x577f29,0,1);write(0x574518,10);write(0x57451c,10);write(0x5682dc+510,q['targetFlags'],1)
 for address,key in [(0x5a3228,'globalFlags'),(0x59d208,'worldFlags'),(0x542bc8,'difficulty'),(0x542bd0,'accuracySetting'),(0x820344,'level'),(0x820454,'seed'),(0x5a870c,'driftMode')]:write(address,q[key])
 write(0x5a4440,154 if q['activeActor'] else 0)
 write(0x577fdc,q['x']);write(0x577fe0,q['z']);write(0x577fd4,10);write(0x577fd8,10)
 write(0x570d38+510,q['targetTerrainCode'],1);write(0x576dc2+48*q['terrainCode'],q['shotClass'],1);write(0x577fff,q['backspinValue'],1);write(sp+0x28,q['firstWaterIndex'])
 for r in range(23,28):
  for c in range(23,28):write(0x570d38+r*50+c,2 if (r+c)%2 else 13,1)
 write(0x576dc6+48*2,0,1);write(0x576dc6+48*13,13,1)
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBX,q['distance']&0xffffffff)
 u.emu_start(0x423f48,0x424988,count=100000)
 entries=[dict(distance=struct.unpack('<i',u.mem_read(0x5a3200+j*4,4))[0],verticalSpeed=struct.unpack('<i',u.mem_read(0x567278+j*4,4))[0],speed=struct.unpack('<i',u.mem_read(0x53ec30+j*4,4))[0]) for j in range(10)]
 def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
 return dict(club=u.mem_read(0x577f24,1)[0],speed=read(0x577fec),verticalSpeed=read(0x577ff0),referenceSpeed=read(sp+0x2c),variation=variation,heading=read(0x577fe8)&0xffffffff,referenceHeading=reference_heading,angularOffset=read(0x577ff4),modifier=read(sp+0x18),actorFlags=read(0x577f18)&0xffffffff,seed=read(0x820454)&0xffffffff,cache=dict(next=read(0x5a8728),entries=entries),shotType=struct.unpack('<H',u.mem_read(0x577fb4,2))[0],curve=read(sp+0xb30))

rng=random.Random(2002);rows=[]
for i in range(1000):
 q=dict(distance=rng.randrange(-100,501),range=rng.randrange(1,331),terrainCode=rng.choice([0,1,2,3,7,13,17]),explicitTarget=bool(rng.randrange(2)),mode=rng.randrange(4),actorFlags=rng.randrange(2))
 q.update(assessmentSpan=max(0,q['distance']//25),curve=rng.choice([-1,0,1]),actorClass=rng.choice([0,1,32,33,64]),skillMask=rng.choice([0,3,7]),attitude=rng.randrange(-4,5),abilityFlags=rng.choice([0,16]),abilityValue=rng.randrange(10),shotCounter=rng.randrange(3),driverValue=rng.randrange(10),ironValue=rng.randrange(10),drawValue=rng.randrange(10),fadeValue=rng.randrange(10),heading=rng.randrange(2**32),targetFlags=rng.choice([0,128]),globalFlags=rng.randrange(2),worldFlags=rng.choice([0,0x200000,0x800000,0xa00000]),difficulty=rng.randrange(4),accuracySetting=rng.randrange(4),level=rng.randrange(4),seed=rng.randrange(2**32),driftMode=rng.randrange(4),activeActor=bool(rng.randrange(2)))
 if i%4==0:q.update(terrainCode=1,distance=rng.randrange(50),actorFlags=0,explicitTarget=False)
 q.update(x=26112,z=26112,firstWaterIndex=rng.randrange(10),backspinValue=rng.randrange(10),shotClass=rng.choice([0,0,1]),targetTerrainCode=rng.choice([1,2]))
 if i%7==0:q.update(distance=100,range=200,terrainCode=2,explicitTarget=True,mode=3,actorFlags=0,skillMask=4,curve=0,shotClass=0,firstWaterIndex=0)
 if i%11==0:q.update(distance=100,range=200,terrainCode=2,explicitTarget=True,mode=4,actorFlags=0,skillMask=4,curve=0,shotClass=0,firstWaterIndex=0)
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-launch-terrain.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalLaunchTerrain}=await import(MODULE);
const {originalStrengthCache}=await import(CACHE);let cache=originalStrengthCache();
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const a=originalLaunchTerrain(q,cache,p=>(p.x+p.z)%2?0:13);if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));cache=a.cache;}
console.log(`${rows.length} terrain-dependent launch results and caches match original x86.`);
""".replace('MODULE',json.dumps(module)).replace('CACHE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-strength-search.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-launch-terrain.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
