"""Execute original post-bounce branch including its RNG; supply slope helper results."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x4221d7,0x20d),(0x466a00,0x1d),(0x45ba70,0x60),(0x4a57a0,0x27),(0x4b9800,8)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v,size=4):u.mem_write(a,(v&((1<<(size*8))-1)).to_bytes(size,'little'))
u.mem_map(0x820000,0x1000)
slopes=[]
def hook(u,a,s,d):
 if a==0x40c140:
  sp=u.reg_read(UC_X86_REG_ESP);ret=struct.unpack('<I',u.mem_read(sp,4))[0]
  u.reg_write(UC_X86_REG_EAX,slopes.pop(0)&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4);u.reg_write(UC_X86_REG_EIP,ret)
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 slopes[:]=q['slopes'];u.mem_write(0x102000,bytes(256))
 for off,key in [(0x30,'terrainCode'),(0x38,'boundaryFlags'),(0x20,'centre'),(0x1c,'facing')]:write(0x102000+off,int(q[key]))
 write(0x10203c,25);write(0x53ba00+2*(25*50+25),q['terrainFlags'],2)
 for off,key in [(0xec,'speed'),(0xe8,'heading'),(0xf0,'verticalSpeed'),(0x18,'flags')]:write(0x577f00+off,q[key])
 write(0x577f20,int(q['professional']),1);write(0x578001,q['luck'],1)
 write(0x820454,q['seed']);write(0x4c1e0c,q['skillMask']);write(0x5a870c,q['mode'])
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,25);u.reg_write(UC_X86_REG_FPCW,0x37f)
 u.emu_start(0x4221d7,0x4223e4,count=1000)
 result={}
 for off,key in [(0xec,'speed'),(0xe8,'heading'),(0xf0,'verticalSpeed'),(0x18,'flags')]:result[key]=struct.unpack('<i' if key in ['speed','verticalSpeed'] else '<I',u.mem_read(0x577f00+off,4))[0]
 result['seed']=struct.unpack('<I',u.mem_read(0x820454,4))[0]
 return result
rng=random.Random(2002);rows=[]
for _ in range(5000):
 q=dict(speed=rng.randrange(10000),heading=rng.randrange(2**32),verticalSpeed=rng.randrange(1000),flags=rng.choice([0,128,256,384]),professional=bool(rng.randrange(2)),luck=rng.randrange(16),seed=rng.randrange(2**32),skillMask=rng.randrange(8),facing=rng.randrange(8),terrainCode=rng.choice([2,12,17]),boundaryFlags=rng.randrange(2),terrainFlags=rng.choice([0,32]),centre=bool(rng.randrange(2)),mode=rng.randrange(3),slopes=[rng.randrange(-3,4) for _ in range(3)])
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-candidate-impact.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalCandidateImpact}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const slopes=[...q.slopes];const a=originalCandidateImpact({...q,slopeAt:()=>slopes.shift()});
for(const key of Object.keys(e))if(a[key]!==e[key])throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} original impact responses and RNG states match x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
