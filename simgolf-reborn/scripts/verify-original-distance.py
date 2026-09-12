"""Check original distance and route helper against x86; requires pefile/unicorn/Node."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root / "resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
for address in [0x40a000,0x40c000,0x4a5000]:u.mem_map(address,4096)
u.mem_map(0x100000,8192)
for address,size in [(0x40a9f0,0x81),(0x40c1a0,0x42),(0x4a57a0,0x27)]:
 offset=p.get_offset_from_rva(address-0x400000);u.mem_write(address,p.__data__[offset:offset+size])
u.reg_write(UC_X86_REG_FPCW,0x37f)
def run(address,args):
 u.mem_write(0x101000,struct.pack('<'+'I'*(len(args)+1),0x40afff,*[a&0xffffffff for a in args]))
 u.reg_write(UC_X86_REG_ESP,0x101000);u.emu_start(address,0x40afff,count=200)
 return u.reg_read(UC_X86_REG_EAX)
rng=random.Random(2002)
vectors=[(x,z) for x in [-51200,-16385,-16384,0,16384,16385,51200] for z in [-51200,-16385,-16384,0,16384,16385,51200]]
vectors += [(rng.randint(-51200,51200),rng.randint(-51200,51200)) for _ in range(10000)]
rows=[[x,z,run(0x40a9f0,[x,z])] for x,z in vectors]
segments=[]
for _ in range(1000):
 args=[rng.randint(0,51200),rng.randint(0,51200),rng.randrange(50),rng.randrange(50)]
 segments.append(args+[run(0x40c1a0,args)])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-distance.js').as_uri()
script='''import {readFileSync} from 'node:fs';
const {originalMapDistance,originalRouteSegment}=await import(MODULE);
const {rows,segments}=JSON.parse(readFileSync(0,'utf8'));
for(const [x,z,result] of rows)if(originalMapDistance(x,z)!==result)throw Error(`Distance mismatch ${x},${z}`);
for(const [x,z,tx,tz,result] of segments)if(originalRouteSegment({x,z},{x:tx,z:tz})!==result)throw Error(`Route mismatch ${x},${z},${tx},${tz}`);
console.log(`${rows.length} distances and ${segments.length} route segments match original x86.`);
'''.replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(dict(rows=rows,segments=segments)),text=True,check=True)
