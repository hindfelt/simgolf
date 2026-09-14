"""Verify ray scan and combined assessment; only raw height reads are supplied."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x423b66,0x37b),(0x4c1870,64),(0x40bc50,0x33),(0x45ba70,0x60),(0x4a57a0,0x27),(0x4b9800,8),(0x491380,0x3c),(0x4913e0,0x10b),(0x466b40,0x59),(0x4baa48,16)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_map(0x839000,0x1000);u.mem_map(0x820000,0x1000)
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
current={};draws=0
def hook(u,a,n,d):
 global draws
 if a==0x45bab0:draws+=1
 if a==0x40be60:
  sp=u.reg_read(UC_X86_REG_ESP);ret,x,z=struct.unpack('<3I',u.mem_read(sp,12));v=current['heights'][x*50+z]
  u.reg_write(UC_X86_REG_EAX,v&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4);u.reg_write(UC_X86_REG_EIP,ret)
u.hook_add(UC_HOOK_CODE,hook)
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def run(q):
 global current,draws
 current=q;draws=0;sp=0x102000
 u.mem_write(0x570d38,bytes(q['terrain']));u.mem_write(0x53ba00,struct.pack('<2500H',*q['marks']))
 for i,v in enumerate(q['classes']):
  u.mem_write(0x576dc2+48*i,bytes([v&255]));u.mem_write(0x576dc6+48*i,bytes([q['kinds'][i]]))
 for a,v in [(0x577fd4,q['target']['x']),(0x577fd8,q['target']['z']),(0x577fdc,q['origin']['x']),(0x577fe0,q['origin']['z']),(0x577fe8,q['heading']),(0x820454,q['seed'])]:write(a,v)
 for a,v in [(0x10,q['distance']),(0xb20,q['actorId']),(0x34,q['originTile']['x']),(0x40,q['originTile']['z']),(0x3c,q['dominantCode']),(0x4c,q['dominantDirection']),(0x44,q['sampleX'])]:write(sp+a,v)
 for i,v in enumerate(q['directions']):write(sp+0xd8+i*4,v)
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp)
 # Reset translated blocks when alternating ray-only and combined stop addresses.
 u.ctl_remove_cache(0x423b66,0x423ee1)
 u.emu_start(0x423b66,0x423dd7,count=100000)
 return dict(span=read(sp+0x2c),totals=list(struct.unpack('<32i',u.mem_read(sp+0x58,128))),directions=list(struct.unpack('<32i',u.mem_read(sp+0xd8,128))),accumulated=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EBX)))[0],obstacles=read(sp+0x20),markedTerrain=read(sp+0x48),firstWaterIndex=read(sp+0x28),dominantCode=read(sp+0x3c),dominantDirection=read(sp+0x4c),sampleX=read(sp+0x44),sampleZ=read(sp+0x3c) if q['distance']>=25 else q['sampleZ'],seed=read(0x820454)&0xffffffff,draws=draws)
rng=random.Random(2002);rows=[]
for i in range(1000):
 q=dict(distance=rng.randrange(-20,331),heading=rng.randrange(2**32),seed=rng.randrange(2**32),actorId=rng.randrange(1000),origin=dict(x=25*1024+512,z=25*1024+512),originTile=dict(x=25,z=25),target=dict(x=30,z=30),directions=[rng.randrange(8) for _ in range(32)],dominantCode=9,dominantDirection=7,sampleX=8,sampleZ=9,terrain=[rng.randrange(23) for _ in range(2500)],classes=[rng.randrange(-8,10) for _ in range(32)],kinds=[rng.choice([0,13]) for _ in range(32)],marks=[rng.choice([0,256]) for _ in range(2500)],heights=[rng.randrange(-4,5) for _ in range(2500)])
 if i%11==0:q.update(origin=dict(x=0,z=25*1024),originTile=dict(x=0,z=25),heading=0xc0000000)
 ray=run(q)
 u.emu_start(0x423dd7,0x423ee1,count=3000)
 assessment=dict(ray,totals=list(struct.unpack('<32i',u.mem_read(0x102058,128))),directions=list(struct.unpack('<32i',u.mem_read(0x1020d8,128))),dominantCode=read(0x10203c),dominantDirection=read(0x10204c),rating=u.mem_read(0x577f23,1)[0])
 rows.append([q,ray,assessment])
module=(root/'simgolf-reborn/scene/src/simulation/original-target-ray.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalTargetRay,originalTargetAssessment}=await import(MODULE);
for(const [q,e,combined] of JSON.parse(readFileSync(0,'utf8'))){const map={terrainAt:(x,z)=>q.terrain[x*50+z],shotClassAt:c=>q.classes[c],kindAt:c=>q.kinds[c],marksAt:(x,z)=>q.marks[x*50+z],heightAt:(x,z)=>q.heights[x*50+z]};const a=originalTargetRay(q,map);if(JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q:{distance:q.distance,heading:q.heading},a,e}));const b=originalTargetAssessment(q,map);if(JSON.stringify(b)!==JSON.stringify(combined))throw Error(JSON.stringify({b,combined}));}
console.log('1000 original ray scans and combined target assessments match x86 results and RNG state.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-target-ray.json').write_text(json.dumps(rows[:20],separators=(',',':'))+'\n')
