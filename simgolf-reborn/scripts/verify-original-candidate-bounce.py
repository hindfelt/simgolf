"""Verify candidate contact coefficient and rebound against original x86."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_EDX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x422110,0xb9),(0x466a00,0x1d)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v,size=4):u.mem_write(a,(v&((1<<(size*8))-1)).to_bytes(size,'little'))
def run(q):
 u.mem_write(0x102000,bytes(256))
 for offset,key in [(0x34,'subX'),(0x10,'subZ'),(0x38,'boundaryFlags')]:write(0x102000+offset,q[key])
 write(0x102030,2);write(0x10203c,25);write(0x5a870c,q['mode'])
 write(0x576dc0+96,q['bounceCoefficient'],1);write(0x53ba00+2*(25*50+25),q['terrainFlags'],2)
 write(0x577fe4,q['height']);u.reg_write(UC_X86_REG_EDX,q['verticalSpeed']&0xffffffff)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,25)
 u.emu_start(0x422110,0x4221c9,count=200)
 return struct.unpack('<i',u.mem_read(0x577ff0,4))[0]
rng=random.Random(2002);rows=[]
for _ in range(5000):
 q=dict(height=rng.randrange(-100,1),verticalSpeed=-rng.randrange(1,100001),bounceCoefficient=rng.randrange(-2,8),mode=rng.randrange(3),boundaryFlags=rng.randrange(2),terrainFlags=rng.choice([0,32]),subX=rng.randrange(16),subZ=rng.randrange(16))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-candidate-bounce.js').as_uri()
script='''import {readFileSync} from 'node:fs';const {originalCandidateBounce}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const a=originalCandidateBounce(q);if(a.verticalSpeed!==e)throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} candidate rebounds match original x86.`);
'''.replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
