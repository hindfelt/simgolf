"""Execute original direct-approach branch with supplied original terrain classes."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EAX,UC_X86_REG_EBP,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for address,size in [(0x4239f7,0x16f),(0x466a00,0x1d),(0x4c1870,64)]:
 offset=p.get_offset_from_rva(address-0x400000);u.mem_write(address,p.__data__[offset:offset+size])
def write(a,v,size=4):u.mem_write(a,(v&((1<<(size*8))-1)).to_bytes(size,'little'))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def run(q):
 write(0x577fd4,25);write(0x577fd8,25)
 write(0x102014,q['terrainCode']);write(0x102010,q['distance'])
 write(0x576dc2+48*q['terrainCode'],q['currentShotClass'],1)
 for i,((x,z),value) in enumerate(zip([(0,-1),(1,0),(0,1),(-1,0)],q['classes'])):
  write(0x570d38+(25+x)*50+25+z,i+2,1);write(0x576dc2+48*(i+2),value,1)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_ESI,0)
 u.reg_write(UC_X86_REG_EAX,q['facing']);u.reg_write(UC_X86_REG_EBP,q['distance'])
 u.emu_start(0x4239f7,0x423b66,count=300)
 return dict(distance=read(0x102010),landing=dict(x=read(0x5a7270),z=read(0x5a7278)))
rng=random.Random(2002);rows=[]
for _ in range(5000):
 q=dict(distance=rng.randint(0,350),facing=rng.randrange(8),target=dict(x=25,z=25),terrainCode=rng.randrange(2),currentShotClass=rng.randrange(-1,5),classes=[rng.randrange(-1,6) for _ in range(4)])
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-shot-approach.js').as_uri()
script='''import {readFileSync} from 'node:fs';
const {originalShotApproach}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));
for(const [q,expected] of rows){
 const cells=new Map(['25,24','26,25','25,26','24,25'].map((key,i)=>[key,q.classes[i]]));
 const actual=originalShotApproach({...q,shotClassAt:p=>cells.get(`${p.x},${p.z}`)});
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(JSON.stringify({q,expected,actual}));
}
console.log(`${rows.length} direct approaches match original x86.`);
'''.replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-shot-approach.json').write_text(json.dumps(rows[:40],indent=2)+'\n')
