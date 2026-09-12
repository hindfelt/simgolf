"""Compare the complete short automatic approach branch with golf.exe."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBP,UC_X86_REG_EAX,UC_X86_REG_EIP
root=Path(__file__).resolve().parents[2]
exe=root/'resources/sim golf/Sid Meier\'s SimGolf/golf.exe'
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x4239f7,0x16f),(0x466a00,0x1d),(0x4c1870,64)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def run(q):
 sp=0x102000
 for a,v in [(0x577fd4,q['target']['x']),(0x577fd8,q['target']['z']),(sp+0x14,q['terrainCode']),(sp+0x10,q['distance']),(0x5a5b88,77),(0x5a7270,123),(0x5a7278,456)]:write(a,v)
 u.mem_write(0x570d38,bytes(2500))
 for x,z,code in q['cells']:u.mem_write(0x570d38+x*50+z,bytes([code]))
 for code,value in enumerate(q['classes']):u.mem_write(0x576dc2+code*48,bytes([value&255]))
 signed=struct.unpack('<i',struct.pack('<I',q['heading']))[0]
 facing=(((signed>>28)+1)>>1)&7
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp)
 u.reg_write(UC_X86_REG_EBP,q['distance']);u.reg_write(UC_X86_REG_EAX,facing)
 u.emu_start(0x4239f7,0x423b66,count=1000)
 assert u.reg_read(UC_X86_REG_EIP)==0x423b66
 return dict(distance=read(sp+0x10),landing=dict(x=read(0x5a7270),z=read(0x5a7278)),diagnostics=read(0x5a5b88))
rng=random.Random(2002);rows=[]
for i in range(5000):
 x=rng.randrange(1,49);z=rng.randrange(1,49)
 q=dict(target=dict(x=x,z=z),heading=rng.randrange(2**32),distance=[0,25,26,48,72,75][i%6],terrainCode=i%21,
  cells=[[x+dx,z+dz,rng.randrange(21)] for dx,dz in [(0,-1),(1,0),(0,1),(-1,0)]],classes=[rng.randrange(-8,33) for _ in range(21)])
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-auto-approach.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalAutoApproach}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){
 const a=originalAutoApproach(q,{terrainAt:(x,z)=>q.cells.find(c=>c[0]===x&&c[1]===z)?.[2]??0,shotClassAt:code=>q.classes[code]});
 if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));
}console.log('5000 original short automatic approach cases match executable.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-auto-approach.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
