"""Execute original candidate-ground branch; supply directional slope helper results."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x421f48,0x1ac),(0x466a00,0x1d)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v,size=4):u.mem_write(a,(v&((1<<(size*8))-1)).to_bytes(size,'little'))
slopes=[]
def hook(u,a,s,d):
 if a==0x40c140:
  sp=u.reg_read(UC_X86_REG_ESP);ret=struct.unpack('<I',u.mem_read(sp,4))[0]
  u.reg_write(UC_X86_REG_EAX,slopes.pop(0)&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4);u.reg_write(UC_X86_REG_EIP,ret)
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 slopes[:]=([q['forwardSlope']] if q['skillMask']&4 else [])+[q['crossSlope']]
 u.mem_write(0x102000,bytes(256))
 for offset,key in [(0x30,'terrainCode'),(0x38,'boundaryFlags'),(0x34,'subX'),(0x10,'subZ'),(0x20,'stepX'),(0x24,'stepCosine')]:write(0x102000+offset,q[key])
 write(0x10203c,25);write(0x4c1e0c,q['skillMask']);write(0x576dc1+48*q['terrainCode'],q['rollCoefficient'],1)
 write(0x5608b0+25*50+25,q['wallFlags'],1)
 write(0x577fec,q['speed']);write(0x577fe8,q['heading'])
 write(0x577fdc,(25+int(q['crossedX']))*1024);write(0x577fe0,(25+int(q['crossedZ']))*1024)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,25);u.reg_write(UC_X86_REG_EDI,0)
 u.emu_start(0x421f48,0x4220f4,count=300)
 return dict(speed=struct.unpack('<i',u.mem_read(0x577fec,4))[0],heading=struct.unpack('<I',u.mem_read(0x577fe8,4))[0])
rng=random.Random(2002);rows=[]
for _ in range(5000):
 q=dict(speed=rng.randrange(20000),heading=rng.randrange(2**32),skillMask=rng.randrange(8),rollCoefficient=rng.randrange(-2,8),forwardSlope=rng.randrange(-5,6),crossSlope=rng.randrange(-5,6),boundaryFlags=rng.randrange(2),terrainCode=rng.choice([2,10,17]),subX=rng.randrange(16),subZ=rng.randrange(16),crossedX=bool(rng.randrange(2)),crossedZ=bool(rng.randrange(2)),stepX=rng.choice([-1,0,1]),stepCosine=rng.choice([-1,0,1]),wallFlags=rng.randrange(256))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-candidate-ground.js').as_uri()
script='''import {readFileSync} from 'node:fs';const {originalCandidateGround}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const a=originalCandidateGround(q);
if(a.speed!==e.speed||a.heading!==e.heading)throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} candidate ground responses match original x86.`);
'''.replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
